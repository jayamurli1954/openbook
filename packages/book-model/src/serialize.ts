// SPDX-License-Identifier: Apache-2.0
import type { Book } from "./types.js";
import { upgradeBook } from "./upgrade-book.js";

export function serializeBook(book: Book): string {
  return `${JSON.stringify(book, null, 2)}\n`;
}

export function parseBook(json: string): Book {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value)) {
    throw new Error("Book JSON must be an object.");
  }
  // Older versions are upgraded in memory (ADR-0041 §6); anything else is refused.
  return upgradeBook(value).book;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
