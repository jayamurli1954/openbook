// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 5 — Structure Studio empty-matter copy and outline firewall.
 * Messages stay out of React so they remain unit-testable.
 * A stored outline or table of contents is not part of the Book.
 */
import type { MatterKind } from "@openbook/book-model";

export const STRUCTURE_STUDIO_EMPTY_FRONT =
  "No front matter yet. Add a preface, title page, or other opening section. The Book keeps the order.";

export const STRUCTURE_STUDIO_EMPTY_MAIN =
  "No chapters yet. Add a chapter. The Book needs at least one.";

export const STRUCTURE_STUDIO_EMPTY_BACK =
  "No back matter yet. Add notes, an appendix, or another closing section. The Book keeps the order.";

const EMPTY_MATTER_COPY: Record<MatterKind, string> = {
  front: STRUCTURE_STUDIO_EMPTY_FRONT,
  main: STRUCTURE_STUDIO_EMPTY_MAIN,
  back: STRUCTURE_STUDIO_EMPTY_BACK,
};

export function structureStudioEmptyMatterCopy(matter: MatterKind): string {
  return EMPTY_MATTER_COPY[matter];
}

const STORED_OUTLINE_KEYS = ["outline", "toc", "tableOfContents"] as const;

/**
 * Walk a persisted Book / package payload. An outline or table-of-contents
 * key means a second structure document was stored beside the Book.
 */
export function findStoredOutlineLeak(value: unknown, path = "$"): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findStoredOutlineLeak(value[index], `${path}[${index}]`);
      if (hit) return hit;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of STORED_OUTLINE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return `${path}.${key}`;
    }
  }
  for (const [key, child] of Object.entries(record)) {
    const hit = findStoredOutlineLeak(child, `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}
