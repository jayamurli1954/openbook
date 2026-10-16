// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 5 — guided-start failure UX and empty-state copy.
 * Keeps user-facing messages out of React so they stay unit-testable.
 */
import type { GuidedStartHostErrorCode } from "./guidedStartHostAdapter.js";
import { isAuthorSafeText, toAuthorMessage } from "./studioShellErrors.js";
import type { GuidedStartPath } from "./guidedStartContract.js";

export type GuidedStartStatusKind = "idle" | "ok" | "error" | "busy";

export const GUIDED_START_HUB_STATUS =
  "Choose how you want to start.";

export const GUIDED_START_EMPTY_RECENT =
  "No recent books yet. Open a book folder below to add one to this list.";

export const GUIDED_START_CONTINUE_HINT =
  "Continue opens the last book you opened. If that book is missing but a backup exists, OpenBook restores the backup. It never starts a new book in its place.";

export const GUIDED_START_IMPORT_EMPTY =
  "Paste manuscript text before importing. Markdown and plain text are supported.";

export const GUIDED_START_OPEN_ROOT_EMPTY =
  "Enter a book folder, or choose a recent book above.";

const FAILURE_COPY: Record<GuidedStartHostErrorCode, string> = {
  TITLE_REQUIRED: "Enter a book title to continue.",
  LANGUAGE_REQUIRED: "Enter a language code (for example, en or kn).",
  PROJECT_ROOT_REQUIRED: "Enter the book folder to open.",
  CONTINUE_UNAVAILABLE:
    "Nothing to continue yet. Open a book first.",
  CANCELLED: "Start was cancelled. No project changes were made.",
  COORDINATOR_FAILED:
    "Could not complete that step. Your current book was not replaced.",
};

export function formatGuidedStartFailure(
  code: GuidedStartHostErrorCode | string,
  detail?: string,
): string {
  const base =
    code in FAILURE_COPY
      ? FAILURE_COPY[code as GuidedStartHostErrorCode]
      : "Could not complete that start step.";
  const trimmed = detail?.trim();
  if (!trimmed || trimmed === base) return base;
  // ADR-0039 Slice 7: never show raw technical text to authors.
  if (!isAuthorSafeText(trimmed)) {
    const mapped = toAuthorMessage(trimmed, "start");
    return mapped.includes("desktop app") ? mapped : base;
  }
  // Keep structured codes out of the primary sentence; append detail when useful.
  if (code === "CONTINUE_UNAVAILABLE" || code === "COORDINATOR_FAILED") {
    return `${base} (${trimmed})`;
  }
  return base;
}

export function formatGuidedStartNewBookSuccess(
  projectName: string,
  language: string,
): string {
  return `Started “${projectName}” (${language}). You are in the writing surface with a Book Model project — not editor JSON.`;
}

export function formatGuidedStartImportSuccess(
  sectionCount: number,
  wordCount: number,
): string {
  return `Imported ${sectionCount} section(s) and ${wordCount} word(s) into a new Book Model project.`;
}

export function formatGuidedStartOpenSuccess(
  projectRoot: string,
  recovered: boolean,
): string {
  return recovered
    ? `Restored and opened package at ${projectRoot}.`
    : `Opened package at ${projectRoot}.`;
}

export function formatGuidedStartPathStatus(path: GuidedStartPath): string {
  switch (path) {
    case "new-book":
      return "New book — a title and language are all you need. Everything else is optional.";
    case "import":
      return "Import — choose a Markdown or text file, or paste the text. Headings become chapters.";
    case "open-recent":
      return "Open a recent book — pick one from the list, or enter its folder.";
    case "continue":
      return "Continue — opens the last book you worked on.";
  }
}

export function guidedStartStatusClass(
  kind: GuidedStartStatusKind,
): `status status-${"idle" | "ok" | "error" | "running"}` {
  switch (kind) {
    case "ok":
      return "status status-ok";
    case "error":
      return "status status-error";
    case "busy":
      return "status status-running";
    case "idle":
      return "status status-idle";
  }
}
