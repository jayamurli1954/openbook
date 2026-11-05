// SPDX-License-Identifier: Apache-2.0

/**
 * ADR-0042 §2.2 — how sharp each picture prints in a paperback PDF.
 *
 * The printed size comes from the rendered PDF itself: Typst scales pictures to fit the text
 * width and the space left on the page, so pixel sizes alone can't tell. This module reads the
 * PDFs Typst 0.15.1 writes (plain objects, Flate content streams), follows each page's drawing
 * commands, and records every picture drawn with its printed size. No PDF library is used.
 */
import { inflateSync } from "node:zlib";
import type { Book, ContentBlock, StructuralSection } from "@openbook/book-model";
import type { ResolvedImageMetadata } from "./assets/asset-pipeline.js";
import type { PublishingDiagnostic } from "./types.js";

/** Below this the picture may print blurry (warning). */
export const PRINT_IMAGE_MIN_DPI = 200;
/** Below this the picture prints acceptably but not ideally (note). */
export const PRINT_IMAGE_IDEAL_DPI = 300;

export interface PlacedImage {
  /** 1-based page number. */
  readonly page: number;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly widthIn: number;
  readonly heightIn: number;
  /** Lower of the two directions, rounded. */
  readonly dpi: number;
}

// --- PDF objects -----------------------------------------------------------------------------

interface PdfObject {
  readonly dict: string;
  readonly stream?: Uint8Array;
}

function readObjects(pdf: Uint8Array): Map<number, PdfObject> {
  const text = Buffer.from(pdf.buffer, pdf.byteOffset, pdf.byteLength).toString("latin1");
  const objects = new Map<number, PdfObject>();
  const header = /(?:^|\n)(\d+) 0 obj\s*/g;
  for (let m = header.exec(text); m; m = header.exec(text)) {
    const start = m.index + m[0].length;
    const end = text.indexOf("endobj", start);
    if (end < 0) break;
    let body = text.slice(start, end);
    const streamAt = body.search(/stream\r?\n/);
    let stream: Uint8Array | undefined;
    if (streamAt >= 0 && body.slice(0, streamAt).trimEnd().endsWith(">>")) {
      const dict = body.slice(0, streamAt);
      const length = /\/Length (\d+)(?![\d ]*R)/.exec(dict);
      const dataStart = start + streamAt + (/stream\r\n/.test(body.slice(streamAt, streamAt + 8)) ? 8 : 7);
      if (length) {
        stream = pdf.subarray(dataStart, dataStart + Number(length[1]));
        header.lastIndex = text.indexOf("endobj", dataStart + Number(length[1])) + 6;
      }
      body = dict;
    } else {
      header.lastIndex = end + 6;
    }
    objects.set(Number(m[1]), { dict: body.trim(), stream });
  }
  return objects;
}

/** The value text of `/Key` in a dictionary: a reference, a nested dictionary, an array, or a token. */
function dictValue(dict: string, key: string): string | undefined {
  const at = new RegExp(`/${key}(?![A-Za-z0-9])`).exec(dict);
  if (!at) return undefined;
  let i = at.index + at[0].length;
  while (/\s/.test(dict[i] ?? "")) i++;
  if (dict.startsWith("<<", i)) return balanced(dict, i, "<<", ">>");
  if (dict[i] === "[") return balanced(dict, i, "[", "]");
  const ref = /^(\d+) 0 R/.exec(dict.slice(i));
  if (ref) return ref[0];
  return /^[^\s/<>[\]]+|^\/[^\s/<>[\]]+/.exec(dict.slice(i))?.[0];
}

function balanced(text: string, from: number, open: string, close: string): string {
  let depth = 0;
  for (let i = from; i < text.length; ) {
    if (text.startsWith(open, i)) {
      depth++;
      i += open.length;
    } else if (text.startsWith(close, i)) {
      depth--;
      i += close.length;
      if (depth === 0) return text.slice(from, i);
    } else {
      i++;
    }
  }
  return text.slice(from);
}

function deref(objects: Map<number, PdfObject>, value: string | undefined): PdfObject | undefined {
  if (!value) return undefined;
  const ref = /^(\d+) 0 R$/.exec(value.trim());
  return ref ? objects.get(Number(ref[1])) : { dict: value };
}

function decodedStream(object: PdfObject): string {
  if (!object.stream) return "";
  const data = /\/Filter\s*\/FlateDecode/.test(object.dict) ? inflateSync(object.stream) : object.stream;
  return Buffer.from(data).toString("latin1");
}

function pageObjects(objects: Map<number, PdfObject>): PdfObject[] {
  const catalog = [...objects.values()].find((o) => /\/Type\s*\/Catalog/.test(o.dict));
  const root = deref(objects, catalog && dictValue(catalog.dict, "Pages"));
  const pages: PdfObject[] = [];
  const walk = (node: PdfObject | undefined) => {
    if (!node) return;
    if (/\/Type\s*\/Pages/.test(node.dict)) {
      const kids = dictValue(node.dict, "Kids") ?? "";
      for (const ref of kids.matchAll(/(\d+) 0 R/g)) walk(objects.get(Number(ref[1])));
    } else if (/\/Type\s*\/Page/.test(node.dict)) {
      pages.push(node);
    }
  };
  walk(root);
  return pages;
}

// --- Content streams -------------------------------------------------------------------------

type Matrix = [number, number, number, number, number, number];

function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

/** Numbers, names, and operators of a content stream; strings and arrays are skipped. */
function* tokens(content: string): Generator<string> {
  let i = 0;
  while (i < content.length) {
    const c = content[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if (c === "%") {
      while (i < content.length && content[i] !== "\n") i++;
    } else if (c === "(") {
      let depth = 0;
      for (; i < content.length; i++) {
        if (content[i] === "\\") i++;
        else if (content[i] === "(") depth++;
        else if (content[i] === ")" && --depth === 0) break;
      }
      i++;
      yield "(string)";
    } else if (c === "<" && content[i + 1] === "<") {
      i = i + balanced(content, i, "<<", ">>").length;
      yield "<<dict>>";
    } else if (c === "<") {
      i = content.indexOf(">", i) + 1 || content.length;
      yield "(string)";
    } else if (c === "[" || c === "]" || c === "{" || c === "}") {
      i++;
      yield c;
    } else {
      const m = /^\/?[^\s()<>[\]{}/%]*/.exec(content.slice(i, i + 64))!;
      const token = m[0] || c;
      i += token.length;
      yield token;
    }
  }
}

function collectPlacements(
  objects: Map<number, PdfObject>,
  content: string,
  resources: PdfObject | undefined,
  start: Matrix,
  page: number,
  out: PlacedImage[],
): void {
  const xobjects = deref(objects, resources && dictValue(resources.dict, "XObject"));
  let ctm = start;
  const saved: Matrix[] = [];
  const operands: string[] = [];
  for (const token of tokens(content)) {
    if (/^[-+.\d]/.test(token) || token.startsWith("/") || token === "(string)" || token === "<<dict>>") {
      operands.push(token);
      continue;
    }
    if (token === "q") saved.push(ctm);
    else if (token === "Q") ctm = saved.pop() ?? start;
    else if (token === "cm" && operands.length >= 6) {
      ctm = multiply(operands.slice(-6).map(Number) as Matrix, ctm);
    } else if (token === "Do" && operands.length > 0 && xobjects) {
      const name = operands[operands.length - 1]!.slice(1);
      const target = deref(objects, dictValue(xobjects.dict, name));
      if (target && /\/Subtype\s*\/Image/.test(target.dict)) {
        const pixelWidth = Number(dictValue(target.dict, "Width"));
        const pixelHeight = Number(dictValue(target.dict, "Height"));
        const widthIn = Math.hypot(ctm[0], ctm[1]) / 72;
        const heightIn = Math.hypot(ctm[2], ctm[3]) / 72;
        if (widthIn > 0 && heightIn > 0) {
          out.push({
            page,
            pixelWidth,
            pixelHeight,
            widthIn,
            heightIn,
            dpi: Math.round(Math.min(pixelWidth / widthIn, pixelHeight / heightIn)),
          });
        }
      } else if (target && /\/Subtype\s*\/Form/.test(target.dict)) {
        const matrix = /\/Matrix\s*\[([^\]]*)\]/.exec(target.dict)?.[1]?.trim().split(/\s+/).map(Number);
        const formCtm = matrix?.length === 6 ? multiply(matrix as Matrix, ctm) : ctm;
        collectPlacements(objects, decodedStream(target), deref(objects, dictValue(target.dict, "Resources")) ?? resources, formCtm, page, out);
      }
    }
    operands.length = 0;
  }
}

/** Every picture drawn in a PDF, in page order and drawing order, with its printed size. */
export function readImagePlacements(pdf: Uint8Array): PlacedImage[] {
  const objects = readObjects(pdf);
  const placed: PlacedImage[] = [];
  pageObjects(objects).forEach((page, index) => {
    const contents = dictValue(page.dict, "Contents") ?? "";
    const content = [...contents.matchAll(/(\d+) 0 R/g)]
      .map((ref) => objects.get(Number(ref[1])))
      .map((stream) => (stream ? decodedStream(stream) : ""))
      .join("\n");
    collectPlacements(objects, content, deref(objects, dictValue(page.dict, "Resources")), [1, 0, 0, 1, 0, 0], index + 1, placed);
  });
  return placed;
}

// --- Picture sizes ---------------------------------------------------------------------------

/** Pixel width and height from a PNG or JPEG header, or undefined. */
export function imagePixelSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) return undefined;
      const marker = bytes[i + 1]!;
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
      const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return { height: (bytes[i + 5]! << 8) | bytes[i + 6]!, width: (bytes[i + 7]! << 8) | bytes[i + 8]! };
      }
      i += 2 + length;
    }
  }
  return undefined;
}

// --- The check -------------------------------------------------------------------------------

export const PRINT_IMAGE_UNCHECKED_MESSAGE = "Picture sharpness could not be checked for this book.";

/**
 * Diagnostics for pictures that print under 300 dpi in a paperback PDF. Pictures are paired
 * with what was drawn, in reading order; if they don't line up, one note says the check
 * couldn't run instead of naming the wrong section.
 */
export function checkPrintImages(
  book: Readonly<Book>,
  pdf: Uint8Array,
  resolvedImages: ReadonlyMap<string, ResolvedImageMetadata>,
): PublishingDiagnostic[] {
  const blocks: { section: StructuralSection; block: Extract<ContentBlock, { type: "image" }> }[] = [];
  for (const section of [...(book.frontMatter ?? []), ...(book.chapters ?? []), ...(book.backMatter ?? [])]) {
    for (const block of section.blocks) if (block.type === "image") blocks.push({ section, block });
  }
  if (blocks.length === 0) return [];

  let placed: PlacedImage[];
  try {
    placed = readImagePlacements(pdf);
  } catch {
    placed = [];
  }
  const unchecked: PublishingDiagnostic[] = [
    { code: "PRINT_IMAGE_UNCHECKED", severity: "info", message: PRINT_IMAGE_UNCHECKED_MESSAGE },
  ];
  if (placed.length !== blocks.length) return unchecked;

  const diagnostics: PublishingDiagnostic[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const { section, block } = blocks[i]!;
    const drawn = placed[i]!;
    const resolved = resolvedImages.get(block.assetId);
    const size = resolved && imagePixelSize(resolved.content);
    const sameSize =
      size &&
      ((size.width === drawn.pixelWidth && size.height === drawn.pixelHeight) ||
        (size.width === drawn.pixelHeight && size.height === drawn.pixelWidth));
    if (!sameSize) return unchecked;
    if (drawn.dpi >= PRINT_IMAGE_IDEAL_DPI) continue;
    const where = section.title.trim() || "an untitled section";
    diagnostics.push(
      drawn.dpi < PRINT_IMAGE_MIN_DPI
        ? {
            code: "PRINT_IMAGE_LOW_RESOLUTION",
            severity: "warning",
            message: `A picture in “${where}” may print blurry (${drawn.dpi} dpi). Use a larger picture (at least 300 dpi at its printed size) for sharp print.`,
            assetId: block.assetId,
            blockId: block.id,
          }
        : {
            code: "PRINT_IMAGE_BELOW_IDEAL",
            severity: "info",
            message: `A picture in “${where}” prints at ${drawn.dpi} dpi. It should look fine; 300 dpi is ideal.`,
            assetId: block.assetId,
            blockId: block.id,
          },
    );
  }
  return diagnostics;
}
