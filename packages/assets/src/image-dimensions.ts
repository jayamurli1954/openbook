// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 2 — pixel dimensions from PNG and JPEG headers.
 *
 * Reads headers only; never decodes pixels and never modifies the bytes.
 * Malformed or truncated input returns undefined instead of throwing.
 */

export interface ImageDimensions {
  readonly format: "png" | "jpeg";
  /** Width as displayed (after any EXIF quarter-turn rotation). */
  readonly width: number;
  /** Height as displayed (after any EXIF quarter-turn rotation). */
  readonly height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EXIF_ORIENTATION_TAG = 0x0112;

export function readImageDimensions(bytes: Uint8Array): ImageDimensions | undefined {
  if (hasPrefix(bytes, PNG_SIGNATURE)) return readPng(bytes);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return readJpeg(bytes);
  }
  return undefined;
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  if (bytes.length < prefix.length) return false;
  return prefix.every((value, index) => bytes[index] === value);
}

function u16be(bytes: Uint8Array, at: number): number {
  return (bytes[at]! << 8) | bytes[at + 1]!;
}

function u32be(bytes: Uint8Array, at: number): number {
  return ((bytes[at]! << 24) | (bytes[at + 1]! << 16) | (bytes[at + 2]! << 8) | bytes[at + 3]!) >>> 0;
}

function readPng(bytes: Uint8Array): ImageDimensions | undefined {
  // IHDR must be the first chunk: length(4) "IHDR"(4) width(4) height(4).
  if (bytes.length < 24) return undefined;
  if (u32be(bytes, 8) !== 13) return undefined;
  if (String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!) !== "IHDR") {
    return undefined;
  }
  return sized("png", u32be(bytes, 16), u32be(bytes, 20), false);
}

function isStartOfFrame(marker: number): boolean {
  // SOF0–SOF15, excluding DHT (C4), JPG (C8), and DAC (CC).
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function readJpeg(bytes: Uint8Array): ImageDimensions | undefined {
  let quarterTurn = false;
  let at = 2;
  while (at + 4 <= bytes.length) {
    if (bytes[at] !== 0xff) return undefined;
    const marker = bytes[at + 1]!;
    if (marker === 0xff) {
      at += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      at += 2; // standalone marker, no length
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return undefined; // EOI or scan before a frame
    const length = u16be(bytes, at + 2);
    const end = at + 2 + length;
    if (length < 2 || end > bytes.length) return undefined;
    if (isStartOfFrame(marker)) {
      if (length < 7) return undefined;
      return sized("jpeg", u16be(bytes, at + 7), u16be(bytes, at + 5), quarterTurn);
    }
    if (marker === 0xe1) {
      const orientation = readExifOrientation(bytes, at + 4, end);
      if (orientation !== undefined) quarterTurn = orientation >= 5 && orientation <= 8;
    }
    at = end;
  }
  return undefined;
}

/** EXIF orientation from an APP1 segment payload [start, end), if present. */
function readExifOrientation(bytes: Uint8Array, start: number, end: number): number | undefined {
  const header = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"
  if (end - start < header.length + 8) return undefined;
  if (!header.every((value, index) => bytes[start + index] === value)) return undefined;
  const tiff = start + header.length;
  const order = String.fromCharCode(bytes[tiff]!, bytes[tiff + 1]!);
  if (order !== "II" && order !== "MM") return undefined;
  const little = order === "II";
  const read16 = (at: number) =>
    little ? bytes[at]! | (bytes[at + 1]! << 8) : u16be(bytes, at);
  const read32 = (at: number) =>
    little
      ? (bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16) | (bytes[at + 3]! << 24)) >>> 0
      : u32be(bytes, at);
  if (read16(tiff + 2) !== 42) return undefined;
  const ifd = tiff + read32(tiff + 4);
  if (ifd + 2 > end) return undefined;
  const count = read16(ifd);
  for (let index = 0; index < count; index += 1) {
    const entry = ifd + 2 + index * 12;
    if (entry + 12 > end) return undefined;
    if (read16(entry) === EXIF_ORIENTATION_TAG) return read16(entry + 8);
  }
  return undefined;
}

function sized(
  format: ImageDimensions["format"],
  width: number,
  height: number,
  quarterTurn: boolean,
): ImageDimensions | undefined {
  if (width <= 0 || height <= 0) return undefined;
  return quarterTurn ? { format, width: height, height: width } : { format, width, height };
}
