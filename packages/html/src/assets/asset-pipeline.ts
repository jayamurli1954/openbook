// SPDX-License-Identifier: Apache-2.0
import type { AssetRef, Book } from "@openbook/book-model";
import {
  AssetResolutionError,
  AssetValidationError,
  type AssetResolver,
  type HtmlPublicationFile,
  type PublishingDiagnostic,
} from "../types.js";

export const SUPPORTED_IMAGE_MIME_TYPES: Readonly<Record<string, string>> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export interface ResolvedImageMetadata {
  asset: AssetRef;
  publicationPath: string;
  htmlSrc: string;
  content: Uint8Array;
}

export interface AssetProcessingResult {
  files: HtmlPublicationFile[];
  resolvedImagesByAssetId: Map<string, ResolvedImageMetadata>;
  diagnostics: PublishingDiagnostic[];
}

/**
 * Validates that an asset ID is safe and will not permit directory traversal.
 */
export function validateAndSanitizeAssetId(assetId: string): string {
  if (!assetId || typeof assetId !== "string" || assetId.trim().length === 0) {
    throw new AssetValidationError(
      "UNSAFE_ASSET_ID",
      "Asset ID must be a non-empty string.",
      assetId,
    );
  }

  const trimmed = assetId.trim();

  if (
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed.includes("\0") ||
    /^[a-zA-Z]:/.test(trimmed) ||
    // eslint-disable-next-line no-control-regex
    /[\x00-\x1f\x7f]/.test(trimmed)
  ) {
    throw new AssetValidationError(
      "UNSAFE_ASSET_ID",
      `Unsafe asset ID "${assetId}": contains path separators, traversal sequences, or control characters.`,
      assetId,
    );
  }

  if (!/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(trimmed)) {
    throw new AssetValidationError(
      "UNSAFE_ASSET_ID",
      `Unsafe asset ID "${assetId}": must contain only alphanumeric characters, dashes, underscores, or periods.`,
      assetId,
    );
  }

  return trimmed;
}

/**
 * Processes and resolves image assets referenced by the Book for HTML publication.
 */
export async function processBookAssets(
  book: Readonly<Book>,
  resolver?: AssetResolver,
  onDiagnostic?: (diagnostic: PublishingDiagnostic) => void,
): Promise<AssetProcessingResult> {
  const diagnostics: PublishingDiagnostic[] = [];
  const emitDiagnostic = (diag: PublishingDiagnostic) => {
    diagnostics.push(diag);
    onDiagnostic?.(diag);
  };

  const assetMap = new Map<string, AssetRef>();
  for (const asset of book.assets ?? []) {
    validateAndSanitizeAssetId(asset.id);
    if (assetMap.has(asset.id)) {
      throw new AssetValidationError(
        "DUPLICATE_ASSET_ID",
        `Duplicate asset ID "${asset.id}" found in Book.assets.`,
        asset.id,
      );
    }
    assetMap.set(asset.id, asset);
  }

  const referencedAssetIds = new Set<string>();
  const allSections = [
    ...(book.frontMatter ?? []),
    ...(book.chapters ?? []),
    ...(book.backMatter ?? []),
  ];

  for (const section of allSections) {
    for (const block of section.blocks ?? []) {
      if (block.type === "image") {
        if (!block.assetId || block.assetId.trim().length === 0) {
          throw new AssetValidationError(
            "MISSING_ASSET_REFERENCE",
            `Image block (id: "${block.id}") has no assetId specified.`,
          );
        }
        referencedAssetIds.add(block.assetId.trim());
      }
    }
  }

  if (referencedAssetIds.size === 0) {
    return {
      files: [],
      resolvedImagesByAssetId: new Map(),
      diagnostics,
    };
  }

  if (!resolver) {
    throw new AssetResolutionError(
      "MISSING_RESOLVER",
      `Book contains ${referencedAssetIds.size} referenced image block(s), but no AssetResolver was provided in HtmlBuildOptions.`,
      "",
    );
  }

  const referencedAssets: AssetRef[] = [];
  for (const assetId of referencedAssetIds) {
    const asset = assetMap.get(assetId);
    if (!asset) {
      throw new AssetValidationError(
        "MISSING_ASSET_REFERENCE",
        `Image block references asset "${assetId}", which does not exist in Book.assets.`,
        assetId,
      );
    }

    if (asset.kind !== "image") {
      throw new AssetValidationError(
        "NON_IMAGE_ASSET_KIND",
        `Asset "${assetId}" has unsupported kind "${asset.kind}". HTML publishing supports image assets only.`,
        assetId,
      );
    }

    if (!SUPPORTED_IMAGE_MIME_TYPES[asset.mediaType]) {
      throw new AssetValidationError(
        "UNSUPPORTED_MEDIA_TYPE",
        `Asset "${assetId}" has unsupported media type "${asset.mediaType}". Supported image types: ${Object.keys(SUPPORTED_IMAGE_MIME_TYPES).join(", ")}.`,
        assetId,
      );
    }

    referencedAssets.push(asset);
  }

  referencedAssets.sort((a, b) => a.id.localeCompare(b.id));

  const resolvedImagesByAssetId = new Map<string, ResolvedImageMetadata>();
  const packagePathsUsed = new Map<string, string>();
  const files: HtmlPublicationFile[] = [];

  for (const asset of referencedAssets) {
    const safeId = validateAndSanitizeAssetId(asset.id);
    const ext = SUPPORTED_IMAGE_MIME_TYPES[asset.mediaType] ?? "";
    const fileName = `${safeId}${ext}`;
    const publicationPath = `assets/${fileName}`;
    const htmlSrc = `assets/${fileName}`;

    const normalizedPath = publicationPath.toLowerCase();
    if (packagePathsUsed.has(normalizedPath)) {
      const priorAssetId = packagePathsUsed.get(normalizedPath);
      throw new AssetValidationError(
        "PATH_COLLISION",
        `Output path collision: assets "${asset.id}" and "${priorAssetId}" both map to "${publicationPath}".`,
        asset.id,
      );
    }
    packagePathsUsed.set(normalizedPath, asset.id);

    if (!asset.altText || asset.altText.trim().length === 0) {
      emitDiagnostic({
        code: "MISSING_ALT_TEXT",
        severity: "warning",
        message: `Image asset "${asset.id}" has empty or missing altText. Emitting empty alt attribute per fallback policy.`,
        assetId: asset.id,
      });
    }

    let bytes: Uint8Array;
    try {
      bytes = await resolver.resolve(asset);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new AssetResolutionError(
        "RESOLUTION_FAILED",
        `Failed to resolve bytes for asset "${asset.id}": ${msg}`,
        asset.id,
        { cause: err },
      );
    }

    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new AssetResolutionError(
        "EMPTY_ASSET_DATA",
        `AssetResolver returned invalid or empty bytes for asset "${asset.id}".`,
        asset.id,
      );
    }

    resolvedImagesByAssetId.set(asset.id, {
      asset,
      publicationPath,
      htmlSrc,
      content: bytes,
    });

    files.push({
      path: publicationPath,
      mediaType: asset.mediaType,
      content: bytes,
    });
  }

  return {
    files,
    resolvedImagesByAssetId,
    diagnostics,
  };
}
