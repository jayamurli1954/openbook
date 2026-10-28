// SPDX-License-Identifier: Apache-2.0

/**
 * Security limits for reading a Word `.docx` package (ADR-0040 §5).
 * Every limit fails the import closed; none is a warning.
 */
export interface DocxLimits {
  /** Whole `.docx` file, before any decompression. */
  readonly maxFileBytes: number;
  /** Number of ZIP entries, directories included. */
  readonly maxEntries: number;
  /** Uncompressed size of one XML or relationships part. */
  readonly maxXmlPartBytes: number;
  /** Uncompressed size of any other entry (media and everything else). */
  readonly maxBinaryPartBytes: number;
  /** Sum of all declared uncompressed entry sizes, and of all bytes actually inflated. */
  readonly maxTotalUncompressedBytes: number;
  /** Largest uncompressed : compressed ratio allowed for one entry... */
  readonly maxCompressionRatio: number;
  /** ...once that entry is larger than this many uncompressed bytes. */
  readonly compressionRatioThresholdBytes: number;
  /** Element nesting depth in any XML part. */
  readonly maxXmlDepth: number;
  /** Attributes on one XML element, namespace declarations included. */
  readonly maxXmlAttributes: number;
}

const MB = 1024 * 1024;

export const DEFAULT_DOCX_LIMITS: DocxLimits = Object.freeze({
  maxFileBytes: 200 * MB,
  maxEntries: 2000,
  maxXmlPartBytes: 32 * MB,
  // Same as the ADR-0017 default image limit; the importer does not depend on @openbook/assets.
  maxBinaryPartBytes: 50 * MB,
  maxTotalUncompressedBytes: 512 * MB,
  // ADR-0040 §5: real WordprocessingML is usually 5–30 : 1. Slice 1 measurements may tune this.
  maxCompressionRatio: 1000,
  compressionRatioThresholdBytes: 1 * MB,
  maxXmlDepth: 256,
  maxXmlAttributes: 64,
});

/**
 * Applies overrides to the defaults. An override left `undefined` keeps the default;
 * anything that is not a positive finite number is a programming error, never a disabled limit.
 */
export function resolveDocxLimits(overrides?: Partial<DocxLimits>): DocxLimits {
  const resolved: Record<string, number> = { ...DEFAULT_DOCX_LIMITS };
  for (const [key, value] of Object.entries(overrides ?? {})) {
    if (value === undefined) continue;
    if (!(key in DEFAULT_DOCX_LIMITS)) {
      throw new TypeError(`Unknown .docx limit "${key}".`);
    }
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new TypeError(`.docx limit "${key}" must be a positive finite number.`);
    }
    resolved[key] = value;
  }
  return Object.freeze(resolved) as unknown as DocxLimits;
}
