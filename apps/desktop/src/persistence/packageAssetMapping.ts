// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 3: asset/package relationship for the project package.
 *
 * Persists the logical AssetRef.id ↔ SHA-256 CAS binding that Book and
 * AssetRegistry keep separate. Does not read/write asset bytes, call
 * IAssetStore, change SQLite schema, or perform atomic Save/Open.
 */
import { assertSha256Key } from "@openbook/assets";
import type { Book, ContentBlock } from "@openbook/book-model";
import type { ProjectPackageCompatibility } from "./manifest.js";

/** One content-addressed package asset entry (logical; not filesystem). */
export interface PackageAssetEntry {
  assetId: string;
  sha256: string;
}

/** Package-facing asset index (id → CAS key). */
export interface PackageAssetManifest {
  assets: PackageAssetEntry[];
}

export type PackageAssetBinding =
  | Map<string, string>
  | ReadonlyArray<{ readonly assetId: string; readonly sha256: string }>;

export interface PackageAssetMappingError {
  code:
    | "MALFORMED_PACKAGE_ASSETS"
    | "INVALID_ASSET_ID"
    | "INVALID_SHA256"
    | "DUPLICATE_ASSET_ID"
    | "DUPLICATE_BINDING_CONFLICT"
    | "MISSING_PACKAGE_ASSET"
    | "ORPHAN_PACKAGE_ASSET"
    | "DANGLING_IMAGE_REFERENCE";
  message: string;
  assetId?: string;
}

export interface PackageAssetValidationResult {
  compatibility: ProjectPackageCompatibility;
  errors: PackageAssetMappingError[];
  manifest?: PackageAssetManifest;
}

const ALLOWED_TOP_LEVEL = ["assets"] as const;
const ALLOWED_ENTRY_KEYS = ["assetId", "sha256"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key));

const isNonEmptyPathSafeId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0 && !/[\\/]/u.test(value);

function normalizeSha256(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return assertSha256Key(value);
  } catch {
    return undefined;
  }
}

function bindingsToMap(bindings: PackageAssetBinding): Map<string, string> {
  if (bindings instanceof Map) {
    return new Map(bindings);
  }
  const map = new Map<string, string>();
  for (const entry of bindings) {
    map.set(entry.assetId, entry.sha256);
  }
  return map;
}

function collectImageAssetIds(book: Book): string[] {
  const ids: string[] = [];
  const walk = (blocks: readonly ContentBlock[]): void => {
    for (const block of blocks) {
      if (block.type === "image") ids.push(block.assetId);
    }
  };
  for (const section of [...book.frontMatter, ...book.chapters, ...book.backMatter]) {
    walk(section.blocks);
  }
  return ids;
}

function sortManifest(manifest: PackageAssetManifest): PackageAssetManifest {
  return {
    assets: [...manifest.assets].sort((a, b) => a.assetId.localeCompare(b.assetId)),
  };
}

/**
 * Validate an unknown package asset manifest shape (closed schema).
 * Does not cross-check against a Book — use `validatePackageAssetsAgainstBook`.
 */
export function validatePackageAssetManifest(input: unknown): PackageAssetValidationResult {
  if (!isRecord(input)) {
    return {
      compatibility: "malformed",
      errors: [
        {
          code: "MALFORMED_PACKAGE_ASSETS",
          message: "Package asset manifest must be an object.",
        },
      ],
    };
  }

  const errors: PackageAssetMappingError[] = [];

  if (!hasOnlyKeys(input, ALLOWED_TOP_LEVEL)) {
    errors.push({
      code: "MALFORMED_PACKAGE_ASSETS",
      message: "Package asset manifest contains unsupported fields.",
    });
  }

  if (!Array.isArray(input.assets)) {
    errors.push({
      code: "MALFORMED_PACKAGE_ASSETS",
      message: "assets must be an array.",
    });
    return { compatibility: "malformed", errors };
  }

  const seenIds = new Map<string, string>();
  const entries: PackageAssetEntry[] = [];

  for (const [index, raw] of input.assets.entries()) {
    if (!isRecord(raw) || !hasOnlyKeys(raw, ALLOWED_ENTRY_KEYS)) {
      errors.push({
        code: "MALFORMED_PACKAGE_ASSETS",
        message: `assets[${String(index)}] must contain only assetId and sha256.`,
      });
      continue;
    }

    if (!isNonEmptyPathSafeId(raw.assetId)) {
      errors.push({
        code: "INVALID_ASSET_ID",
        message: `assets[${String(index)}].assetId must be a non-empty path-safe string.`,
      });
      continue;
    }

    const sha256 = normalizeSha256(raw.sha256);
    if (!sha256) {
      errors.push({
        code: "INVALID_SHA256",
        message: `assets[${String(index)}].sha256 must be a 64-character lowercase hex SHA-256 key.`,
        assetId: raw.assetId,
      });
      continue;
    }

    const previous = seenIds.get(raw.assetId);
    if (previous !== undefined) {
      if (previous !== sha256) {
        errors.push({
          code: "DUPLICATE_BINDING_CONFLICT",
          message: `Asset "${raw.assetId}" is bound to conflicting SHA-256 digests.`,
          assetId: raw.assetId,
        });
      } else {
        errors.push({
          code: "DUPLICATE_ASSET_ID",
          message: `Asset "${raw.assetId}" appears more than once in the package asset manifest.`,
          assetId: raw.assetId,
        });
      }
      continue;
    }

    seenIds.set(raw.assetId, sha256);
    entries.push({ assetId: raw.assetId, sha256 });
  }

  if (errors.length > 0) {
    return { compatibility: "malformed", errors };
  }

  return {
    compatibility: "compatible",
    errors: [],
    manifest: sortManifest({ assets: entries }),
  };
}

/**
 * Build package asset entries from Book AssetRefs + id→sha256 bindings
 * (typically an AssetRegistry snapshot). Does not touch IAssetStore.
 */
export function mapAssetRefsToPackageEntries(
  book: Book,
  bindings: PackageAssetBinding,
): PackageAssetValidationResult {
  const bindingMap = bindingsToMap(bindings);
  const errors: PackageAssetMappingError[] = [];
  const entries: PackageAssetEntry[] = [];

  for (const asset of book.assets) {
    if (!isNonEmptyPathSafeId(asset.id)) {
      errors.push({
        code: "INVALID_ASSET_ID",
        message: `Book AssetRef id "${asset.id}" is not a path-safe identifier.`,
        assetId: asset.id,
      });
      continue;
    }

    const rawSha = bindingMap.get(asset.id);
    if (rawSha === undefined) {
      errors.push({
        code: "MISSING_PACKAGE_ASSET",
        message: `Book AssetRef "${asset.id}" has no package SHA-256 binding.`,
        assetId: asset.id,
      });
      continue;
    }

    const sha256 = normalizeSha256(rawSha);
    if (!sha256) {
      errors.push({
        code: "INVALID_SHA256",
        message: `Binding for asset "${asset.id}" is not a valid SHA-256 storage key.`,
        assetId: asset.id,
      });
      continue;
    }

    entries.push({ assetId: asset.id, sha256 });
  }

  for (const imageAssetId of collectImageAssetIds(book)) {
    if (!book.assets.some((asset) => asset.id === imageAssetId)) {
      errors.push({
        code: "DANGLING_IMAGE_REFERENCE",
        message: `Image block references missing AssetRef "${imageAssetId}".`,
        assetId: imageAssetId,
      });
    }
  }

  if (errors.length > 0) {
    return { compatibility: "malformed", errors };
  }

  return {
    compatibility: "compatible",
    errors: [],
    manifest: sortManifest({ assets: entries }),
  };
}

/**
 * Cross-check Book.assets (+ image block refs) against package asset entries.
 * Byte presence in IAssetStore is reserved for later slices.
 */
export function validatePackageAssetsAgainstBook(
  book: Book,
  manifest: PackageAssetManifest,
): PackageAssetValidationResult {
  const shape = validatePackageAssetManifest(manifest);
  if (shape.compatibility !== "compatible" || !shape.manifest) {
    return shape;
  }

  const errors: PackageAssetMappingError[] = [];
  const byId = new Map(shape.manifest.assets.map((entry) => [entry.assetId, entry.sha256]));
  const bookIds = new Set(book.assets.map((asset) => asset.id));

  for (const asset of book.assets) {
    if (!byId.has(asset.id)) {
      errors.push({
        code: "MISSING_PACKAGE_ASSET",
        message: `Book AssetRef "${asset.id}" has no package asset entry.`,
        assetId: asset.id,
      });
    }
  }

  for (const entry of shape.manifest.assets) {
    if (!bookIds.has(entry.assetId)) {
      errors.push({
        code: "ORPHAN_PACKAGE_ASSET",
        message: `Package asset entry "${entry.assetId}" is not referenced by Book.assets.`,
        assetId: entry.assetId,
      });
    }
  }

  for (const imageAssetId of collectImageAssetIds(book)) {
    if (!bookIds.has(imageAssetId)) {
      errors.push({
        code: "DANGLING_IMAGE_REFERENCE",
        message: `Image block references missing AssetRef "${imageAssetId}".`,
        assetId: imageAssetId,
      });
    }
  }

  if (errors.length > 0) {
    return { compatibility: "malformed", errors, manifest: shape.manifest };
  }

  return {
    compatibility: "compatible",
    errors: [],
    manifest: shape.manifest,
  };
}

/** Rebuild an AssetRegistry-compatible id→sha256 map without mutating Book. */
export function packageEntriesToBindings(
  manifest: PackageAssetManifest,
): Map<string, string> {
  const shape = validatePackageAssetManifest(manifest);
  if (shape.compatibility !== "compatible" || !shape.manifest) {
    throw new Error(shape.errors.map((error) => error.message).join(" "));
  }
  return new Map(shape.manifest.assets.map((entry) => [entry.assetId, entry.sha256]));
}

export function serializePackageAssetManifest(manifest: PackageAssetManifest): string {
  const result = validatePackageAssetManifest(manifest);
  if (result.compatibility !== "compatible" || !result.manifest) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }
  return `${JSON.stringify(result.manifest, null, 2)}\n`;
}

export function parsePackageAssetManifest(serialized: string): PackageAssetValidationResult {
  try {
    return validatePackageAssetManifest(JSON.parse(serialized) as unknown);
  } catch {
    return {
      compatibility: "malformed",
      errors: [
        {
          code: "MALFORMED_PACKAGE_ASSETS",
          message: "Package asset manifest is not valid JSON.",
        },
      ],
    };
  }
}
