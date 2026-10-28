// SPDX-License-Identifier: Apache-2.0
import { Inflate } from "fflate";
import { DocxReadError } from "./errors.js";
import type { DocxLimits } from "./limits.js";

/**
 * Read-only ZIP layer for `.docx` (ADR-0040 §3, §5).
 *
 * The ZIP structure is parsed here so every limit is checked against the central
 * directory before anything is inflated. `fflate` is used only for raw DEFLATE, in
 * small chunks, so actual output is counted and decompression stops at the limit.
 * Entry names are lookup keys only; nothing is written to disk.
 */

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const EOCD_MIN_LENGTH = 22;
const MAX_EOCD_COMMENT = 0xffff;

const FLAG_ENCRYPTED = 0x0001;
const FLAG_STRONG_ENCRYPTION = 0x0040;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

/** Compressed bytes handed to the inflater per push; bounds output overshoot past a limit. */
const INFLATE_CHUNK_BYTES = 4096;

const CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];

export interface ZipEntry {
  readonly name: string;
  readonly method: number;
  readonly crc32: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly dataOffset: number;
}

export class ZipArchive {
  readonly #bytes: Uint8Array;
  readonly #limits: DocxLimits;
  readonly #byKey: Map<string, ZipEntry>;
  readonly entries: readonly ZipEntry[];
  #inflatedTotal = 0;

  private constructor(bytes: Uint8Array, limits: DocxLimits, entries: ZipEntry[]) {
    this.#bytes = bytes;
    this.#limits = limits;
    this.entries = entries;
    this.#byKey = new Map(entries.map((entry) => [entryKey(entry.name), entry]));
  }

  static open(bytes: Uint8Array, limits: DocxLimits): ZipArchive {
    checkSignature(bytes, limits);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const eocd = findEndOfCentralDirectory(bytes, view);
    const entries = readCentralDirectory(bytes, view, eocd, limits);
    return new ZipArchive(bytes, limits, entries);
  }

  /** Entry lookup. OPC part names are case-insensitive. */
  find(name: string): ZipEntry | undefined {
    return this.#byKey.get(entryKey(name));
  }

  /** Inflates one entry, enforcing its declared size, CRC, and the running total. */
  read(name: string): Uint8Array {
    const entry = this.find(name);
    if (!entry) {
      throw new DocxReadError("DOCX_PART_MISSING", `This Word file is missing a required part.`, name);
    }
    const remaining = this.#limits.maxTotalUncompressedBytes - this.#inflatedTotal;
    if (entry.uncompressedSize > remaining) {
      throw totalTooLarge(this.#limits);
    }

    const compressed = this.#bytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    const out = entry.method === METHOD_STORED ? compressed.slice() : inflateBounded(entry, compressed);

    if (crc32(out) !== entry.crc32) {
      throw corrupt(entry.name);
    }
    this.#inflatedTotal += out.length;
    return out;
  }
}

function checkSignature(bytes: Uint8Array, limits: DocxLimits): void {
  if (bytes.length === 0) {
    throw new DocxReadError("DOCX_EMPTY", "This file is empty.");
  }
  if (bytes.length > limits.maxFileBytes) {
    throw new DocxReadError(
      "DOCX_FILE_TOO_LARGE",
      `This file is larger than OpenBook can import (${formatMegabytes(limits.maxFileBytes)}).`,
    );
  }
  if (CFB_SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw new DocxReadError(
      "DOCX_LEGACY_OR_PROTECTED",
      "This looks like an older .doc file or a password-protected document. Save it as .docx in Word and try again.",
    );
  }
  if (bytes.length < 4 || readU32(bytes, 0) !== LOCAL_HEADER_SIG) {
    throw new DocxReadError("DOCX_NOT_ZIP", "This file is not a Word .docx document.");
  }
}

interface EndOfCentralDirectory {
  readonly entryCount: number;
  readonly size: number;
  readonly offset: number;
}

function findEndOfCentralDirectory(bytes: Uint8Array, view: DataView): EndOfCentralDirectory {
  const lowest = Math.max(0, bytes.length - EOCD_MIN_LENGTH - MAX_EOCD_COMMENT);
  for (let pos = bytes.length - EOCD_MIN_LENGTH; pos >= lowest; pos -= 1) {
    if (view.getUint32(pos, true) !== EOCD_SIG) continue;
    const commentLength = view.getUint16(pos + 20, true);
    if (pos + EOCD_MIN_LENGTH + commentLength !== bytes.length) continue;

    const diskNumber = view.getUint16(pos + 4, true);
    const centralDirectoryDisk = view.getUint16(pos + 6, true);
    const entriesOnDisk = view.getUint16(pos + 8, true);
    const entryCount = view.getUint16(pos + 10, true);
    const size = view.getUint32(pos + 12, true);
    const offset = view.getUint32(pos + 16, true);

    if (entryCount === 0xffff || size === 0xffffffff || offset === 0xffffffff) {
      throw new DocxReadError("DOCX_ZIP_UNSUPPORTED", "This file uses a ZIP format OpenBook does not read.");
    }
    if (diskNumber !== 0 || centralDirectoryDisk !== 0 || entriesOnDisk !== entryCount) {
      throw new DocxReadError("DOCX_ZIP_UNSUPPORTED", "This file is split across several parts, which OpenBook does not read.");
    }
    if (offset + size > pos) {
      throw corrupt();
    }
    return { entryCount, size, offset };
  }
  throw corrupt();
}

function readCentralDirectory(
  bytes: Uint8Array,
  view: DataView,
  eocd: EndOfCentralDirectory,
  limits: DocxLimits,
): ZipEntry[] {
  if (eocd.entryCount > limits.maxEntries) {
    throw new DocxReadError(
      "DOCX_TOO_MANY_ENTRIES",
      `This file contains more than ${limits.maxEntries} parts, more than any book needs.`,
    );
  }

  const entries: ZipEntry[] = [];
  const keys = new Set<string>();
  const spans: Array<{ start: number; end: number; name: string }> = [];
  let declaredTotal = 0;
  let pos = eocd.offset;
  const end = eocd.offset + eocd.size;

  for (let index = 0; index < eocd.entryCount; index += 1) {
    if (pos + 46 > end || view.getUint32(pos, true) !== CENTRAL_HEADER_SIG) {
      throw corrupt();
    }
    const flags = view.getUint16(pos + 8, true);
    const method = view.getUint16(pos + 10, true);
    const crc = view.getUint32(pos + 16, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const uncompressedSize = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const startDisk = view.getUint16(pos + 34, true);
    const localHeaderOffset = view.getUint32(pos + 42, true);
    const nameEnd = pos + 46 + nameLength;
    if (nameEnd > end) {
      throw corrupt();
    }
    const name = decodeEntryName(bytes.subarray(pos + 46, nameEnd));
    pos = nameEnd + extraLength + commentLength;
    if (pos > end) {
      throw corrupt(name);
    }

    if ((flags & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION)) !== 0) {
      throw new DocxReadError(
        "DOCX_ENCRYPTED",
        "This document is password-protected. Remove the password in Word and try again.",
        name,
      );
    }
    if (startDisk !== 0) {
      throw new DocxReadError("DOCX_ZIP_UNSUPPORTED", "This file is split across several parts, which OpenBook does not read.", name);
    }
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localHeaderOffset === 0xffffffff) {
      throw new DocxReadError("DOCX_ZIP_UNSUPPORTED", "This file uses a ZIP format OpenBook does not read.", name);
    }
    if (method !== METHOD_STORED && method !== METHOD_DEFLATE) {
      throw new DocxReadError("DOCX_ZIP_UNSUPPORTED", "This file uses a compression method OpenBook does not read.", name);
    }
    if (method === METHOD_STORED && compressedSize !== uncompressedSize) {
      throw corrupt(name);
    }

    const key = entryKey(name);
    if (keys.has(key)) {
      throw new DocxReadError("DOCX_DUPLICATE_ENTRY", "This file contains the same part twice.", name);
    }
    keys.add(key);

    const partLimit = isXmlPart(name) ? limits.maxXmlPartBytes : limits.maxBinaryPartBytes;
    if (uncompressedSize > partLimit) {
      throw new DocxReadError(
        "DOCX_ENTRY_TOO_LARGE",
        `One part of this file is larger than OpenBook allows (${formatMegabytes(partLimit)}).`,
        name,
      );
    }
    if (
      uncompressedSize > limits.compressionRatioThresholdBytes &&
      uncompressedSize > compressedSize * limits.maxCompressionRatio
    ) {
      throw compressionRatio(name);
    }
    declaredTotal += uncompressedSize;
    if (declaredTotal > limits.maxTotalUncompressedBytes) {
      throw totalTooLarge(limits);
    }

    const dataOffset = readLocalHeader(bytes, view, localHeaderOffset, name, eocd.offset);
    const dataEnd = dataOffset + compressedSize;
    if (dataEnd > eocd.offset) {
      throw corrupt(name);
    }
    spans.push({ start: localHeaderOffset, end: dataEnd, name });
    entries.push({ name, method, crc32: crc, compressedSize, uncompressedSize, dataOffset });
  }

  // Overlapping entries let a few compressed bytes stand for many parts.
  spans.sort((a, b) => a.start - b.start);
  for (let index = 1; index < spans.length; index += 1) {
    const previous = spans[index - 1]!;
    const current = spans[index]!;
    if (current.start < previous.end) {
      throw corrupt(current.name);
    }
  }
  return entries;
}

function readLocalHeader(
  bytes: Uint8Array,
  view: DataView,
  offset: number,
  name: string,
  centralDirectoryOffset: number,
): number {
  if (offset + 30 > centralDirectoryOffset || view.getUint32(offset, true) !== LOCAL_HEADER_SIG) {
    throw corrupt(name);
  }
  const flags = view.getUint16(offset + 6, true);
  if ((flags & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION)) !== 0) {
    throw new DocxReadError(
      "DOCX_ENCRYPTED",
      "This document is password-protected. Remove the password in Word and try again.",
      name,
    );
  }
  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const nameStart = offset + 30;
  const dataOffset = nameStart + nameLength + extraLength;
  if (dataOffset > centralDirectoryOffset) {
    throw corrupt(name);
  }
  if (decodeEntryName(bytes.subarray(nameStart, nameStart + nameLength)) !== name) {
    throw corrupt(name);
  }
  return dataOffset;
}

function inflateBounded(entry: ZipEntry, compressed: Uint8Array): Uint8Array {
  const out = new Uint8Array(entry.uncompressedSize);
  let written = 0;
  let overflow = false;
  const inflater = new Inflate((chunk) => {
    if (written + chunk.length > out.length) {
      overflow = true;
      throw new DocxReadError(
        "DOCX_COMPRESSION_RATIO",
        "Part of this file expands to more than it says it contains. It may be damaged or unsafe.",
        entry.name,
      );
    }
    out.set(chunk, written);
    written += chunk.length;
  });

  try {
    if (compressed.length === 0) {
      inflater.push(new Uint8Array(0), true);
    }
    for (let offset = 0; offset < compressed.length; offset += INFLATE_CHUNK_BYTES) {
      const next = Math.min(offset + INFLATE_CHUNK_BYTES, compressed.length);
      inflater.push(compressed.subarray(offset, next), next === compressed.length);
    }
  } catch (err) {
    if (overflow && err instanceof DocxReadError) {
      throw err;
    }
    throw corrupt(entry.name);
  }
  if (written !== out.length) {
    throw corrupt(entry.name);
  }
  return out;
}

const NAME_DECODER = new TextDecoder("utf-8", { fatal: true });

function decodeEntryName(raw: Uint8Array): string {
  let name: string;
  try {
    name = NAME_DECODER.decode(raw);
  } catch {
    throw corrupt();
  }
  if (name.length === 0 || name.includes("\0")) {
    throw corrupt();
  }
  return name;
}

function entryKey(name: string): string {
  return name.replace(/^\/+/, "").toLowerCase();
}

export function isXmlPart(name: string): boolean {
  return /\.(xml|rels)$/i.test(name);
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset]! | (bytes[offset + 1]! << 8) | (bytes[offset + 2]! << 16) | (bytes[offset + 3]! << 24)) >>> 0
  );
}

function corrupt(part?: string): DocxReadError {
  return new DocxReadError("DOCX_ZIP_CORRUPT", "This Word file is damaged and cannot be read.", part);
}

function compressionRatio(part: string): DocxReadError {
  return new DocxReadError(
    "DOCX_COMPRESSION_RATIO",
    "Part of this file expands far more than any real document does. It may be damaged or unsafe.",
    part,
  );
}

function totalTooLarge(limits: DocxLimits): DocxReadError {
  return new DocxReadError(
    "DOCX_TOTAL_TOO_LARGE",
    `This file expands to more than OpenBook can import (${formatMegabytes(limits.maxTotalUncompressedBytes)}).`,
  );
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let index = 0; index < data.length; index += 1) {
    crc = CRC_TABLE[(crc ^ data[index]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
