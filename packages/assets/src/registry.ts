// SPDX-License-Identifier: Apache-2.0

/**
 * Maps semantic AssetRef.id → SHA-256 storage key.
 * Kept outside the canonical Book (ADR-0017 identity separation).
 */
export class AssetRegistry {
  readonly #idToSha256 = new Map<string, string>();

  register(assetId: string, sha256: string): void {
    this.#idToSha256.set(assetId, sha256.toLowerCase());
  }

  getSha256(assetId: string): string | undefined {
    return this.#idToSha256.get(assetId);
  }

  has(assetId: string): boolean {
    return this.#idToSha256.has(assetId);
  }

  /** Asset IDs currently bound to a storage hash. */
  listAssetIds(): string[] {
    return [...this.#idToSha256.keys()].sort();
  }

  /** Unique SHA-256 digests referenced by registered assets. */
  listBoundHashes(): string[] {
    return [...new Set(this.#idToSha256.values())].sort();
  }
}
