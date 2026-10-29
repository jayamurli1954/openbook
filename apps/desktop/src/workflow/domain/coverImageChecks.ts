// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 2 — cover image checks.
 *
 * Reads the stored bytes and reports plain-language issues. Never changes the
 * image (ADR-0038 §2.3, invariant 6). Thresholds live only in this module.
 */
import type { AssetRef } from "@openbook/book-model";
import {
  DEFAULT_ASSET_SIZE_LIMIT_BYTES,
  detectAssetType,
  readImageDimensions,
} from "@openbook/assets";

/** Covers look sharpest with at least this many pixels on the long side. */
export const COVER_MIN_LONGEST_SIDE_PX = 1600;
/** Height ÷ width range most stores expect for a portrait cover. */
export const COVER_MIN_RATIO = 1.3;
export const COVER_MAX_RATIO = 1.8;

/** Errors: the picture cannot be the cover. */
export type CoverImageErrorCode =
  | "COVER_NOT_JPEG_OR_PNG"
  | "COVER_SIZE_UNREADABLE"
  | "COVER_FILE_TOO_LARGE";

/** Warnings: the picture can be the cover but may not look its best. */
export type CoverImageWarningCode = "COVER_LOW_RESOLUTION" | "COVER_UNUSUAL_SHAPE";

export type CoverImageIssue =
  | { readonly code: CoverImageErrorCode; readonly severity: "error"; readonly message: string }
  | { readonly code: CoverImageWarningCode; readonly severity: "warning"; readonly message: string };

export type CoverImageError = Extract<CoverImageIssue, { severity: "error" }>;

export interface CoverImageReport {
  readonly assetId: string;
  /** Displayed pixel size, when it could be read. */
  readonly width?: number;
  readonly height?: number;
  readonly issues: readonly CoverImageIssue[];
}

export function hasCoverImageErrors(report: CoverImageReport): boolean {
  return firstCoverImageError(report) !== undefined;
}

export function firstCoverImageError(report: CoverImageReport): CoverImageError | undefined {
  return report.issues.find((issue): issue is CoverImageError => issue.severity === "error");
}

export function checkCoverImage(
  asset: AssetRef,
  bytes: Uint8Array,
  sizeLimitBytes: number = DEFAULT_ASSET_SIZE_LIMIT_BYTES,
): CoverImageReport {
  if (bytes.length > sizeLimitBytes) {
    return {
      assetId: asset.id,
      issues: [
        {
          code: "COVER_FILE_TOO_LARGE",
          severity: "error",
          message: `This picture is too large to use (${formatMegabytes(bytes.length)}). Use a file under ${formatMegabytes(sizeLimitBytes)}.`,
        },
      ],
    };
  }

  const detected = detectAssetType(bytes);
  if (detected?.format !== "jpeg" && detected?.format !== "png") {
    return {
      assetId: asset.id,
      issues: [
        {
          code: "COVER_NOT_JPEG_OR_PNG",
          severity: "error",
          message: "A cover must be a JPEG or PNG picture.",
        },
      ],
    };
  }

  const size = readImageDimensions(bytes);
  if (!size) {
    return {
      assetId: asset.id,
      issues: [
        {
          code: "COVER_SIZE_UNREADABLE",
          severity: "error",
          message: "OpenBook could not read this picture's size. The file may be damaged; try saving it again.",
        },
      ],
    };
  }

  const { width, height } = size;
  const issues: CoverImageIssue[] = [];
  if (Math.max(width, height) < COVER_MIN_LONGEST_SIDE_PX) {
    issues.push({
      code: "COVER_LOW_RESOLUTION",
      severity: "warning",
      message: `This picture is ${String(width)} × ${String(height)} pixels. Covers look sharpest at ${String(COVER_MIN_LONGEST_SIDE_PX)} pixels or more on the long side; it may look blurry on large screens.`,
    });
  }
  const ratio = height / width;
  if (ratio < COVER_MIN_RATIO || ratio > COVER_MAX_RATIO) {
    issues.push({
      code: "COVER_UNUSUAL_SHAPE",
      severity: "warning",
      message: `This picture is ${String(width)} × ${String(height)} pixels. Most stores expect a tall cover, about 1.6 times as high as it is wide.`,
    });
  }
  return { assetId: asset.id, width, height, issues };
}

function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
