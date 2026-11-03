// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 §6 — Book Model version upgrades.
 *
 * Version 2 added the `callout` block. A version-1 Book is otherwise identical, so the
 * 1 → 2 upgrade only changes `schemaVersion`. The input is never mutated.
 */
import { BOOK_MODEL_SCHEMA_VERSION, type Book } from "./types.js";

export interface UpgradedBook {
  readonly book: Book;
  /** Set when the input was an older version and has been upgraded in memory. */
  readonly upgradedFrom?: 1;
}

export function upgradeBook(value: unknown): UpgradedBook {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Book JSON must be an object.");
  }
  const version = (value as { schemaVersion?: unknown }).schemaVersion;
  if (version === BOOK_MODEL_SCHEMA_VERSION) {
    return { book: value as Book };
  }
  if (version === 1) {
    return {
      book: { ...(value as Book), schemaVersion: BOOK_MODEL_SCHEMA_VERSION },
      upgradedFrom: 1,
    };
  }
  throw new Error(
    `Unsupported schemaVersion ${String(version)}. OpenBook reads schemaVersion 1 and ${String(BOOK_MODEL_SCHEMA_VERSION)}.`,
  );
}
