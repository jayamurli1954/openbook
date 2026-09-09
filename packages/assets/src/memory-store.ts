// SPDX-License-Identifier: Apache-2.0
import { assertSha256Key, type IAssetStore } from "./store.js";

/** In-memory content-addressed asset store (ADR-0017). */
export class MemoryAssetStore implements IAssetStore {
  readonly #blobs = new Map<string, Uint8Array>();

  async put(sha256: string, content: Uint8Array): Promise<void> {
    const key = assertSha256Key(sha256);
    this.#blobs.set(key, new Uint8Array(content));
  }

  async get(sha256: string): Promise<Uint8Array | undefined> {
    const key = assertSha256Key(sha256);
    const found = this.#blobs.get(key);
    return found ? new Uint8Array(found) : undefined;
  }

  async has(sha256: string): Promise<boolean> {
    return this.#blobs.has(assertSha256Key(sha256));
  }

  async delete(sha256: string): Promise<boolean> {
    return this.#blobs.delete(assertSha256Key(sha256));
  }

  async listHashes(): Promise<string[]> {
    return [...this.#blobs.keys()].sort();
  }
}
