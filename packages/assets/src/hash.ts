// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";

export function sha256Hex(content: Uint8Array): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Deterministic semantic AssetRef.id (format unfrozen; ADR-0017 §2.7).
 * Identical seed + identical content digest ⇒ identical id.
 */
export function synthesizeAssetId(idSeed: string, contentSha256: string): string {
  const digest = createHash("sha256")
    .update(`asset-id|${idSeed}|${contentSha256}`, "utf8")
    .digest("hex");
  return `asset-${digest.slice(0, 16)}`;
}
