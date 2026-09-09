// SPDX-License-Identifier: Apache-2.0
import type { AssetIngestKind, DetectedAssetType } from "./types.js";

function startsWithBytes(content: Uint8Array, sig: number[]): boolean {
  if (content.length < sig.length) return false;
  for (let i = 0; i < sig.length; i += 1) {
    if (content[i] !== sig[i]) return false;
  }
  return true;
}

function asciiAt(content: Uint8Array, offset: number, text: string): boolean {
  if (content.length < offset + text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (content[offset + i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

function looksLikeSvg(content: Uint8Array): boolean {
  // Decode a prefix as UTF-8 text for tag sniffing (SVG is XML text).
  const prefix = new TextDecoder("utf-8", { fatal: false }).decode(
    content.subarray(0, Math.min(content.length, 4096)),
  );
  const trimmed = prefix.replace(/^\uFEFF/, "").trimStart();
  if (/^<\?xml\b/i.test(trimmed)) {
    return /<svg\b/i.test(trimmed);
  }
  return /^<svg\b/i.test(trimmed);
}

/**
 * Detect asset type from magic bytes / content evidence (INV-1).
 * Filename extensions are intentionally ignored.
 */
export function detectAssetType(content: Uint8Array): DetectedAssetType | undefined {
  if (content.length === 0) return undefined;

  // PNG
  if (startsWithBytes(content, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mediaType: "image/png", kind: "image", format: "png" };
  }
  // JPEG
  if (startsWithBytes(content, [0xff, 0xd8, 0xff])) {
    return { mediaType: "image/jpeg", kind: "image", format: "jpeg" };
  }
  // GIF
  if (asciiAt(content, 0, "GIF87a") || asciiAt(content, 0, "GIF89a")) {
    return { mediaType: "image/gif", kind: "image", format: "gif" };
  }
  // WebP (RIFF....WEBP)
  if (
    asciiAt(content, 0, "RIFF") &&
    content.length >= 12 &&
    asciiAt(content, 8, "WEBP")
  ) {
    return { mediaType: "image/webp", kind: "image", format: "webp" };
  }
  // SVG (text / XML)
  if (looksLikeSvg(content)) {
    return { mediaType: "image/svg+xml", kind: "image", format: "svg" };
  }
  // WOFF
  if (asciiAt(content, 0, "wOFF")) {
    return { mediaType: "font/woff", kind: "font", format: "woff" };
  }
  // WOFF2
  if (asciiAt(content, 0, "wOF2")) {
    return { mediaType: "font/woff2", kind: "font", format: "woff2" };
  }
  // OpenType
  if (asciiAt(content, 0, "OTTO")) {
    return { mediaType: "font/otf", kind: "font", format: "otf" };
  }
  // TrueType (0x00010000) or 'true'
  if (
    startsWithBytes(content, [0x00, 0x01, 0x00, 0x00]) ||
    asciiAt(content, 0, "true")
  ) {
    return { mediaType: "font/ttf", kind: "font", format: "ttf" };
  }

  return undefined;
}

export function isKindCompatible(
  declared: AssetIngestKind,
  detected: DetectedAssetType,
): boolean {
  return declared === detected.kind;
}
