// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 3 — Metadata Wizard package-document firewall.
 * An EPUB OPF package document or ONIX record is not part of the Book.
 * Publishing metadata stays a publish-time projection in the engines.
 */
const STORED_METADATA_DOCUMENT_KEYS = [
  "opf",
  "packageDocument",
  "onix",
  "onixRecord",
] as const;

/**
 * Walk a persisted Book / package payload. An OPF or ONIX key means a
 * second metadata document was stored beside the Book.
 */
export function findStoredMetadataDocumentLeak(value: unknown, path = "$"): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findStoredMetadataDocumentLeak(value[index], `${path}[${index}]`);
      if (hit) return hit;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of STORED_METADATA_DOCUMENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return `${path}.${key}`;
    }
  }
  for (const [key, child] of Object.entries(record)) {
    const hit = findStoredMetadataDocumentLeak(child, `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}
