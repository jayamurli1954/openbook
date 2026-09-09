// SPDX-License-Identifier: Apache-2.0
import type { AssetRef } from "@openbook/book-model";
import type { AssetRegistry } from "./registry.js";
import type { IAssetStore } from "./store.js";
import type { AssetResolver } from "./types.js";

/**
 * Store-backed AssetResolver compatible with ADR-0010/0011/0013/0017 (INV-6).
 */
export class StoreBackedAssetResolver implements AssetResolver {
  readonly #store: IAssetStore;
  readonly #registry: AssetRegistry;

  constructor(store: IAssetStore, registry: AssetRegistry) {
    this.#store = store;
    this.#registry = registry;
  }

  async resolve(asset: AssetRef): Promise<Uint8Array> {
    const sha256 = this.#registry.getSha256(asset.id);
    if (!sha256) {
      throw new Error(
        `AssetResolver: no storage binding for asset id "${asset.id}".`,
      );
    }
    const bytes = await this.#store.get(sha256);
    if (!bytes || bytes.byteLength === 0) {
      throw new Error(
        `AssetResolver: missing or empty payload for asset id "${asset.id}" (sha256=${sha256}).`,
      );
    }
    return bytes;
  }
}
