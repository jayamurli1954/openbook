// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0040 Slice 4 — importing a Word (.docx) file from the studio.
 *
 * Picks a file through a host port, refuses one over the size limit before it
 * is read, runs the import through the coordinator, and turns the result into
 * a plain-language summary for the Guide panel. No React, Tauri, or file system.
 */
import type { Book } from "@openbook/book-model";
import { DEFAULT_DOCX_LIMITS, type ImportIssue } from "@openbook/importer";
import type { StudioImportMode, StudioImportResult } from "../../domain/desktopStudioCoordinator.js";
import { isAuthorSafeText } from "./studioShellErrors.js";

/** ADR-0040 §5: the same cap the importer enforces, checked before reading. */
export const WORD_IMPORT_MAX_FILE_BYTES = DEFAULT_DOCX_LIMITS.maxFileBytes;

export type WordFilePick =
  | { readonly kind: "cancelled" }
  /** The host saw the size before reading and refused the file. */
  | { readonly kind: "too-large"; readonly sizeBytes: number }
  | { readonly kind: "bytes"; readonly content: Uint8Array; readonly originalFilename: string }
  | { readonly kind: "failed"; readonly detail: string };

export interface WordFilePickPort {
  pickWordFile(): Promise<WordFilePick>;
}

export interface WordImportCoordinatorPort {
  importContent(
    source: { readonly format: "docx"; readonly bytes: Uint8Array; readonly filename?: string },
    options?: { readonly mode?: StudioImportMode },
  ): Promise<StudioImportResult>;
  getBook(): Book;
  getState(): { readonly stage: string };
}

export interface WordImportSummary {
  readonly mode: StudioImportMode;
  /** One sentence: what came in. */
  readonly headline: string;
  readonly chapters: number;
  readonly frontSections: number;
  readonly words: number;
  readonly pictures: number;
  /** Warnings the author should look at, in plain language. */
  readonly toCheck: readonly string[];
  /** Things worth knowing that need no action. */
  readonly goodToKnow: readonly string[];
}

export type WordImportOutcome =
  | { readonly kind: "cancelled" }
  | { readonly kind: "imported"; readonly summary: WordImportSummary }
  /** `message` is for the author; `detail` is for Diagnostics only. */
  | { readonly kind: "failed"; readonly message: string; readonly detail: string };

export const WORD_IMPORT_NEEDS_FRESH_BOOK =
  "To bring in a Word file as a new book, start from a fresh book: choose New blank book, then Import a Word file. To add a Word file's chapters to this book instead, use Add chapters from a Word file in Write.";

const WORD_IMPORT_FALLBACK =
  "Couldn’t import that Word file. Check that it opens in Word and is saved as .docx, then try again.";

/** Importer notes that are technical rather than useful to an author. */
const HIDDEN_ISSUE_CODES = new Set(["DEFAULT_LANGUAGE", "DEFAULT_TITLE"]);

export async function importWordFile(
  coordinator: WordImportCoordinatorPort,
  picker: WordFilePickPort,
  mode: StudioImportMode,
): Promise<WordImportOutcome> {
  // A whole new book can only be imported before the current one has moved on (ADR-0020 INV-6).
  if (mode === "new-project" && coordinator.getState().stage !== "IMPORT") {
    return { kind: "failed", message: WORD_IMPORT_NEEDS_FRESH_BOOK, detail: "IMPORT_NOT_PERMITTED" };
  }

  let picked: WordFilePick;
  try {
    picked = await picker.pickWordFile();
  } catch (err) {
    return { kind: "failed", message: WORD_IMPORT_FALLBACK, detail: err instanceof Error ? err.message : String(err) };
  }
  if (picked.kind === "cancelled") return { kind: "cancelled" };
  if (picked.kind === "too-large") return tooLarge(picked.sizeBytes);
  if (picked.kind === "failed") {
    return { kind: "failed", message: WORD_IMPORT_FALLBACK, detail: picked.detail };
  }
  // A host that could not check the size first still never passes an oversized file on.
  if (picked.content.byteLength > WORD_IMPORT_MAX_FILE_BYTES) return tooLarge(picked.content.byteLength);

  const before = coordinator.getBook();
  try {
    const result = await coordinator.importContent(
      { format: "docx", bytes: picked.content, filename: picked.originalFilename },
      { mode },
    );
    return { kind: "imported", summary: summarizeWordImport(result, before, coordinator.getBook()) };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // The reader's own messages are written for authors; show them when they are safe.
    const firstSentence = detail.split(/;\s|\n/)[0]?.trim() ?? "";
    return {
      kind: "failed",
      message: isAuthorSafeText(firstSentence) ? firstSentence : WORD_IMPORT_FALLBACK,
      detail,
    };
  }
}

export function summarizeWordImport(result: StudioImportResult, before: Book, after: Book): WordImportSummary {
  const isNew = result.mode === "new-project";
  const chapters = isNew ? after.chapters.length : after.chapters.length - before.chapters.length;
  const frontSections = isNew ? after.frontMatter.length : after.frontMatter.length - before.frontMatter.length;
  const pictures = isNew ? after.assets.length : after.assets.length - before.assets.length;
  const words = result.wordCount;

  const parts = [
    plural(chapters, "chapter"),
    ...(frontSections > 0 ? [plural(frontSections, "front-matter section")] : []),
    plural(words, "word"),
    plural(pictures, "picture"),
  ];
  const headline = isNew
    ? `Imported “${after.metadata.title}”: ${joinList(parts)}.`
    : `Added ${joinList(parts)} to your book.`;

  const shown = (issue: ImportIssue): boolean => !HIDDEN_ISSUE_CODES.has(issue.code) && !issue.code.startsWith("DOMAIN_");
  const toCheck = result.issues
    .filter((issue) => shown(issue) && (issue.severity === "warning" || issue.severity === "error"))
    .map((issue) => issue.message);
  const goodToKnow = result.issues
    .filter((issue) => shown(issue) && issue.severity === "info")
    .map((issue) => issue.message);

  return { mode: result.mode, headline, chapters, frontSections, words, pictures, toCheck, goodToKnow };
}

function tooLarge(sizeBytes: number): WordImportOutcome {
  return {
    kind: "failed",
    message: `That Word file is ${formatMegabytes(sizeBytes)}, larger than OpenBook can import (${formatMegabytes(WORD_IMPORT_MAX_FILE_BYTES)}). Try compressing its pictures in Word (File › Compress Pictures), save, and import again.`,
    detail: `DOCX_TOO_LARGE:${sizeBytes}`,
  };
}

function plural(count: number, noun: string): string {
  return `${count.toLocaleString("en")} ${count === 1 ? noun : `${noun}s`}`;
}

function joinList(parts: readonly string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
