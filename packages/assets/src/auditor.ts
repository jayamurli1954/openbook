// SPDX-License-Identifier: Apache-2.0
import type { AssetRef, Book, ContentBlock } from "@openbook/book-model";
import { sha256Hex } from "./hash.js";
import type { AssetRegistry } from "./registry.js";
import type { IAssetStore } from "./store.js";
import { findUnsafeSvgConstructs, isSvgMediaType } from "./svg-security.js";
import type { AssetIssue } from "./types.js";

function allBlocks(book: Book): ContentBlock[] {
  return [
    ...book.frontMatter.flatMap((s) => s.blocks),
    ...book.chapters.flatMap((s) => s.blocks),
    ...book.backMatter.flatMap((s) => s.blocks),
  ];
}

export interface AssetAuditResult {
  readonly issues: readonly AssetIssue[];
}

/**
 * Audits Book asset references against store + registry (ADR-0017 §2.6.D / INV-5).
 * Does not mutate the Book.
 */
export class AssetAuditor {
  readonly #store: IAssetStore;
  readonly #registry: AssetRegistry;

  constructor(store: IAssetStore, registry: AssetRegistry) {
    this.#store = store;
    this.#registry = registry;
  }

  async audit(book: Book): Promise<AssetAuditResult> {
    const issues: AssetIssue[] = [];
    const assetsById = new Map<string, AssetRef>();
    for (const asset of book.assets) {
      assetsById.set(asset.id, asset);
    }

    // Image blocks referencing unknown AssetRef entries → dangling.
    for (const block of allBlocks(book)) {
      if (block.type !== "image") continue;
      if (!assetsById.has(block.assetId)) {
        issues.push({
          code: "DANGLING_REFERENCE",
          severity: "error",
          message: `Image block "${block.id}" references missing AssetRef "${block.assetId}".`,
          assetId: block.assetId,
        });
      }
    }

    for (const asset of book.assets) {
      if (asset.kind === "image" && asset.altText.trim() === "") {
        issues.push({
          code: "MISSING_ALT_TEXT",
          severity: "warning",
          message: `Asset "${asset.id}" is missing alt text.`,
          assetId: asset.id,
        });
      }

      const sha256 = this.#registry.getSha256(asset.id);
      if (!sha256) {
        issues.push({
          code: "MISSING_PAYLOAD",
          severity: "error",
          message: `Asset "${asset.id}" has no registered storage binding.`,
          assetId: asset.id,
        });
        continue;
      }

      const bytes = await this.#store.get(sha256);
      if (!bytes) {
        issues.push({
          code: "MISSING_PAYLOAD",
          severity: "error",
          message: `Asset "${asset.id}" payload missing from store (sha256=${sha256}).`,
          assetId: asset.id,
        });
        continue;
      }

      const actual = sha256Hex(bytes);
      if (actual !== sha256) {
        issues.push({
          code: "CORRUPT_PAYLOAD",
          severity: "error",
          message: `Asset "${asset.id}" payload hash mismatch (expected ${sha256}, got ${actual}).`,
          assetId: asset.id,
        });
      }

      if (isSvgMediaType(asset.mediaType)) {
        const findings = findUnsafeSvgConstructs(bytes);
        for (const finding of findings) {
          issues.push({
            code: finding.code,
            severity: "error",
            message: `Unsafe SVG in asset "${asset.id}": ${finding.message}`,
            assetId: asset.id,
          });
        }
      }
    }

    const stored = await this.#store.listHashes();
    for (const hash of stored) {
      const boundToBookAsset = book.assets.some(
        (a) => this.#registry.getSha256(a.id) === hash,
      );
      if (!boundToBookAsset) {
        issues.push({
          code: "ORPHANED_ASSET",
          severity: "warning",
          message: `Stored asset sha256=${hash} is not referenced by Book.assets.`,
        });
      }
    }

    return { issues };
  }
}
