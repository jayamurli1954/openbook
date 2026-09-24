// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 5 — guided-start failure UX and empty-state copy.
 * Keeps user-facing messages out of React so they stay unit-testable.
 */
import type { GuidedStartHostErrorCode } from "./guidedStartHostAdapter.js";
import type { GuidedStartPath } from "./guidedStartContract.js";

export type GuidedStartStatusKind = "idle" | "ok" | "error" | "busy";

export const GUIDED_START_HUB_STATUS =
  "Choose how you want to start — New Book, Import, Open Recent, or Continue.";

export const GUIDED_START_EMPTY_RECENT =
  "No recent packages yet. Open a package root below to add one to this list.";

export const GUIDED_START_CONTINUE_HINT =
  "Continue opens the last package you successfully opened. If that package is missing but one backup exists, OpenBook restores it through the existing recovery path — it will not invent a new project.";

export const GUIDED_START_IMPORT_EMPTY =
  "Paste manuscript text before importing. Markdown and plain text are supported.";

export const GUIDED_START_OPEN_ROOT_EMPTY =
  "Enter a package folder path, or choose a recent package above.";

const FAILURE_COPY: Record<GuidedStartHostErrorCode, string> = {
  TITLE_REQUIRED: "Enter a book title to continue.",
  LANGUAGE_REQUIRED: "Enter a language code (for example, en or kn).",
  PROJECT_ROOT_REQUIRED: "Enter a package folder path to open.",
  CONTINUE_UNAVAILABLE:
    "Nothing to continue yet. Open a package first, or fix recovery before retrying.",
  CANCELLED: "Start was cancelled. No project changes were made.",
  COORDINATOR_FAILED:
    "Could not complete that start step. The project was not silently replaced.",
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
      return "New Book — title and language are required. Other fields are optional.";
    case "import":
      return "Import — paste Markdown or plain text. Existing importer contracts are reused.";
    case "open-recent":
      return "Open Recent — pick a remembered package or enter a package folder path.";
    case "continue":
      return "Continue — resume the last opened package through recovery discovery.";
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
