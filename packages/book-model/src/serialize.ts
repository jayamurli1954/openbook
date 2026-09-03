import type { Book } from "./types.js";

export function serializeBook(book: Book): string {
  return `${JSON.stringify(book, null, 2)}\n`;
}

export function parseBook(json: string): Book {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value)) {
    throw new Error("Book JSON must be an object.");
  }
  if (value.schemaVersion !== 1) {
    throw new Error(
      `Unsupported schemaVersion ${String(value.schemaVersion)}. OpenBook currently reads schemaVersion 1 only.`,
    );
  }
  return value as unknown as Book;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
