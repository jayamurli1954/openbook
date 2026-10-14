// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 2 — top-bar save status and step snapshot.
 *
 * Turns coordinator facts into the short save message shown in the top
 * bar, and assembles the Slice 1 step snapshot. Pure; no React.
 */
import type { Book } from "@openbook/book-model";
import type { BookValidationReport } from "@openbook/book-doctor";
import type { AutosaveStatus } from "../../persistence/autosaveController.js";
import type { StudioCoverState, StudioShellSnapshot } from "./studioShellContract.js";

export type StudioSaveTone = "saved" | "saving" | "unsaved" | "new" | "error";

export interface StudioSaveStatus {
  readonly tone: StudioSaveTone;
  readonly text: string;
}

export interface StudioSaveFacts {
  /** True when the book has been saved somewhere (project or folder). */
  readonly hasSaveLocation: boolean;
  readonly isDirty: boolean;
  readonly autosave: AutosaveStatus;
}

export function describeSaveStatus(facts: StudioSaveFacts): StudioSaveStatus {
  if (facts.autosave.state === "error") return { tone: "error", text: "Couldn’t save" };
  if (facts.autosave.state === "saving") return { tone: "saving", text: "Saving…" };
  if (!facts.hasSaveLocation) {
    return facts.isDirty
      ? { tone: "new", text: "Not saved yet" }
      : { tone: "new", text: "New book" };
  }
  if (facts.autosave.state === "scheduled") return { tone: "saving", text: "Saving soon" };
  if (facts.isDirty) return { tone: "unsaved", text: "Unsaved changes" };
  return { tone: "saved", text: "Saved" };
}

export function buildStudioShellSnapshot(input: {
  readonly book: Book;
  readonly bookWordCount: number;
  readonly validationReport: BookValidationReport | null;
  readonly cover: StudioCoverState;
}): StudioShellSnapshot {
  const summary = input.validationReport?.summary;
  return {
    book: input.book,
    bookWordCount: input.bookWordCount,
    validation: summary
      ? { errors: summary.totalFatal + summary.totalErrors, warnings: summary.totalWarnings }
      : null,
    cover: input.cover,
  };
}

/** Book title for the top bar; never blank. */
export function shellBookTitle(book: Book): string {
  return book.metadata.title.trim() || "Untitled book";
}
