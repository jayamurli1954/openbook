// SPDX-License-Identifier: Apache-2.0

/**
 * Binary content-addressed storage (ADR-0017 §2.6.A).
 * Keys are SHA-256 hex digests — never original filenames.
 */
export interface IAssetStore {
  put(sha256: string, content: Uint8Array): Promise<void>;
  get(sha256: string): Promise<Uint8Array | undefined>;
  has(sha256: string): Promise<boolean>;
  delete(sha256: string): Promise<boolean>;
  listHashes(): Promise<string[]>;
}

const SHA256_HEX = /^[a-f0-9]{64}$/;

/** Reject non-hex / path-like keys so store paths cannot be influenced by callers. */
export function assertSha256Key(sha256: string): string {
  const normalized = sha256.trim().toLowerCase();
  if (!SHA256_HEX.test(normalized)) {
    throw new Error(
      `Invalid SHA-256 storage key "${sha256}": expected 64 lowercase hex characters.`,
    );
  }
  return normalized;
}
