// SPDX-License-Identifier: Apache-2.0

import type { AssetRef, Book, ContentBlock } from "@openbook/book-model";
import {
  AssetResolutionError,
  AssetValidationError,
  type AssetResolver,
  type EpubManifestItem,
  type EpubPackageFile,
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
  packagePath: string; // e.g. "EPUB/images/img-1.png"
  manifestHref: string; // e.g. "images/img-1.png"
  xhtmlHref: string; // e.g. "../images/img-1.png"
  manifestId: string; // e.g. "img-img-1"
  content: Uint8Array;
}

export interface AssetProcessingResult {
  files: EpubPackageFile[];
  manifestItems: EpubManifestItem[];
  resolvedImagesByAssetId: Map<string, ResolvedImageMetadata>;
  diagnostics: PublishingDiagnostic[];
}

/**
 * Validates that an asset ID is safe and will not permit directory traversal
 * or invalid package paths per ADR-0010 §8.
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

  // Check for path traversal, separators, control characters, Windows drive letters, null bytes
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

  // Canonical safe ID: alphanumeric, dash, underscore, dot
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
 * Processes, resolves, and packages image assets referenced by the Book.
 *
 * Enforces all invariants of ADR-0010:
 * 1. Rejects duplicate asset IDs in Book.assets.
 * 2. Rejects image blocks referencing nonexistent assets.
 * 3. Requires an AssetResolver if image blocks are present.
 * 4. Rejects unsupported asset kinds (non-image) or unsupported image media types.
 * 5. Rejects unsafe asset IDs (path traversal).
 * 6. Omits unreferenced assets from the EPUB package.
 * 7. Emits a deterministic diagnostic when altText is missing.
 * 8. Ensures resolved bytes are non-empty Uint8Array without alteration.
 * 9. Detects canonical output path collisions.
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

  // 1. Validate Book.assets for duplicate IDs and unsafe IDs
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

  // 2. Scan all structural sections to collect referenced image asset IDs
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

  // If there are no image references, return immediately
  if (referencedAssetIds.size === 0) {
    return {
      files: [],
      manifestItems: [],
      resolvedImagesByAssetId: new Map(),
      diagnostics,
    };
  }

  // 3. If image blocks exist, an AssetResolver must be provided
  if (!resolver) {
    throw new AssetResolutionError(
      "MISSING_RESOLVER",
      `Book contains ${referencedAssetIds.size} referenced image block(s), but no AssetResolver was provided in EpubBuildOptions.`,
      "",
    );
  }

  // 4. Validate referenced assets exist in Book.assets and have supported image media types
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
        `Asset "${assetId}" has unsupported kind "${asset.kind}". Gate 3 supports image assets only.`,
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

  // 5. Sort referenced assets deterministically by ID
  referencedAssets.sort((a, b) => a.id.localeCompare(b.id));

  // 6. Resolve bytes and generate canonical paths
  const resolvedImagesByAssetId = new Map<string, ResolvedImageMetadata>();
  const packagePathsUsed = new Map<string, string>(); // lowercase path -> assetId
  const files: EpubPackageFile[] = [];
  const manifestItems: EpubManifestItem[] = [];

  for (const asset of referencedAssets) {
    const safeId = validateAndSanitizeAssetId(asset.id);
    const ext = SUPPORTED_IMAGE_MIME_TYPES[asset.mediaType];
    const fileName = `${safeId}${ext}`;
    const packagePath = `EPUB/images/${fileName}`;
    const manifestHref = `images/${fileName}`;
    const xhtmlHref = `../images/${fileName}`;
    const manifestId = `img-${safeId}`;

    // Collision check (case-insensitive check to prevent filesystem/archive collisions per ADR-0010 §8.4)
    const normalizedPath = packagePath.toLowerCase();
    if (packagePathsUsed.has(normalizedPath)) {
      const priorAssetId = packagePathsUsed.get(normalizedPath);
      throw new AssetValidationError(
        "PATH_COLLISION",
        `Output path collision: assets "${asset.id}" and "${priorAssetId}" both map to "${packagePath}".`,
        asset.id,
      );
    }
    packagePathsUsed.set(normalizedPath, asset.id);

    // Diagnostics policy for altText (ADR-0010 §11)
    if (!asset.altText || asset.altText.trim().length === 0) {
      emitDiagnostic({
        code: "MISSING_ALT_TEXT",
        severity: "warning",
        message: `Image asset "${asset.id}" has empty or missing altText. Emitting empty alt attribute per fallback policy.`,
        assetId: asset.id,
      });
    }

    // Resolve binary bytes via injected resolver
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

    const resolvedMeta: ResolvedImageMetadata = {
      asset,
      packagePath,
      manifestHref,
      xhtmlHref,
      manifestId,
      content: bytes,
    };

    resolvedImagesByAssetId.set(asset.id, resolvedMeta);

    files.push({
      path: packagePath,
      mediaType: asset.mediaType,
      content: bytes,
    });

    manifestItems.push({
      id: manifestId,
      href: manifestHref,
      mediaType: asset.mediaType,
    });
  }

  return {
    files,
    manifestItems,
    resolvedImagesByAssetId,
    diagnostics,
  };
}
