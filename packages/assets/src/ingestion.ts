// SPDX-License-Identifier: Apache-2.0
import type { AssetRef } from "@openbook/book-model";
import { sha256Hex, synthesizeAssetId } from "./hash.js";
import { detectAssetType, isKindCompatible } from "./magic.js";
import type { AssetRegistry } from "./registry.js";
import type { IAssetStore } from "./store.js";
import { findUnsafeSvgConstructs, isSvgMediaType } from "./svg-security.js";
import {
  DEFAULT_ASSET_SIZE_LIMIT_BYTES,
  type AssetIngestInput,
  type AssetIngestionOptions,
  type AssetIngestResult,
  type AssetIssue,
} from "./types.js";

function sizeLimitFor(
  kind: AssetIngestInput["kind"],
  options?: AssetIngestionOptions,
): number {
  const configured =
    kind === "image" ? options?.sizeLimits?.image : options?.sizeLimits?.font;
  return configured ?? DEFAULT_ASSET_SIZE_LIMIT_BYTES;
}

/**
 * Basename for AssetRef.fileName metadata only.
 * Never used for storage paths or CAS keys (INV-3 / ADR-0017 §2.9).
 */
export function metadataFileName(originalFilename: string): string {
  const normalized = originalFilename.replace(/\\/g, "/");
  const parts = normalized.split("/");
  const base = parts[parts.length - 1] ?? "";
  const cleaned = base.replace(/[^\w.\-()+ ]+/g, "_").trim();
  return cleaned.length > 0 ? cleaned : "asset.bin";
}

/**
 * Asset ingestion pipeline (ADR-0017 §2.6.B).
 * Never mutates a canonical Book (INV-7).
 */
export class AssetIngestionPipeline {
  readonly #store: IAssetStore;
  readonly #registry: AssetRegistry;
  readonly #options: AssetIngestionOptions;

  constructor(
    store: IAssetStore,
    registry: AssetRegistry,
    options: AssetIngestionOptions = {},
  ) {
    this.#store = store;
    this.#registry = registry;
    this.#options = options;
  }

  async ingest(input: AssetIngestInput): Promise<AssetIngestResult> {
    const issues: AssetIssue[] = [];
    const byteLength = input.content.byteLength;
    const limit = sizeLimitFor(input.kind, this.#options);

    if (byteLength === 0) {
      return {
        success: false,
        byteLength,
        issues: [
          {
            code: "EMPTY_CONTENT",
            severity: "fatal",
            message: "Asset content is empty.",
          },
        ],
      };
    }

    if (byteLength > limit) {
      return {
        success: false,
        byteLength,
        issues: [
          {
            code: "SIZE_LIMIT_EXCEEDED",
            severity: "error",
            message: `Asset exceeds size limit of ${limit} bytes for kind "${input.kind}" (${byteLength} bytes).`,
          },
        ],
      };
    }

    const detected = detectAssetType(input.content);
    if (!detected) {
      return {
        success: false,
        byteLength,
        issues: [
          {
            code: "UNKNOWN_TYPE",
            severity: "error",
            message:
              "Unable to detect a supported asset type from file content (magic bytes). Filename extension is ignored.",
          },
        ],
      };
    }

    if (!isKindCompatible(input.kind, detected)) {
      return {
        success: false,
        byteLength,
        issues: [
          {
            code: "KIND_MISMATCH",
            severity: "error",
            message: `Declared kind "${input.kind}" is incompatible with detected type "${detected.mediaType}" (${detected.format}).`,
          },
        ],
      };
    }

    if (isSvgMediaType(detected.mediaType)) {
      const svgFindings = findUnsafeSvgConstructs(input.content);
      for (const finding of svgFindings) {
        issues.push({
          code: finding.code,
          severity: "error",
          message: finding.message,
        });
      }
      if (svgFindings.length > 0) {
        return { success: false, byteLength, issues };
      }
    }

    const digest = sha256Hex(input.content);
    const idSeed = input.idSeed ?? "default";
    const assetId = synthesizeAssetId(idSeed, digest);

    // CAS put uses SHA-256 only — originalFilename never influences the key.
    await this.#store.put(digest, input.content);
    this.#registry.register(assetId, digest);

    const assetRef: AssetRef = {
      id: assetId,
      kind: input.kind === "font" ? "font" : "image",
      fileName: metadataFileName(input.originalFilename),
      mediaType: detected.mediaType,
      altText: input.altText ?? "",
      licence: input.licence ?? "",
    };

    return {
      success: true,
      assetRef,
      sha256: digest,
      byteLength,
      issues,
    };
  }
}
