// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 7 — plain-language errors.
 *
 * Authors never see raw exception text, error codes, or library names
 * (ADR-0039 invariant 7). Each failure becomes a short message for what
 * the author was doing; the original text is kept for Diagnostics.
 */
import { findInternalTerms } from "./studioShellGuide.js";

export type StudioErrorContext =
  | "save"
  | "open"
  | "start"
  | "import"
  | "edit"
  | "check"
  | "export";

export interface StudioAuthorError {
  /** Shown to the author. */
  readonly message: string;
  /** Original text, for the Diagnostics drawer only. */
  readonly detail: string;
}

const FALLBACK: Record<StudioErrorContext, string> = {
  save: "Couldn’t save your book. Your work is still here; try Save again.",
  open: "Couldn’t open that book. Nothing in your current book was changed.",
  start: "Couldn’t start that book. Your current book was not replaced.",
  import: "Couldn’t add that text. Check that it is a Markdown or plain-text file and try again.",
  edit: "That change didn’t go through. Your book is unchanged.",
  check: "The book check couldn’t finish. Try again in a moment.",
  export: "Couldn’t export your book. Try again, or choose a different folder.",
};

/** Known codes with a clearer message than the context fallback. */
const BY_CODE: Record<string, string> = {
  NO_PROJECT_NAME: "Give your book a name to save it.",
  NO_PROJECT_SELECTED: "Choose a book to open.",
  PACKAGE_ROOT_INVALID: "Choose a folder for your book.",
  PACKAGE_SAVE_FAILED: "Couldn’t save to your book’s folder. Check the folder still exists and you can write to it.",
  PACKAGE_OPEN_FAILED: "Couldn’t open that book folder. It may be missing or damaged.",
  PACKAGE_RECOVERY_REQUIRED: "This book needs to be restored from its backup before it can open.",
  PACKAGE_RECOVERY_AMBIGUOUS: "There is more than one backup of this book. Choose which one to restore.",
  PACKAGE_RECOVERY_UNAVAILABLE: "No backup of this book was found.",
  PACKAGE_RECOVERY_FAILED: "Couldn’t restore this book from its backup.",
  IMPORT_FAILED: "Couldn’t read that text. Check that it is Markdown or plain text.",
  UNSUPPORTED_FORMAT: "That kind of file can’t be imported. Use Markdown (.md) or plain text (.txt).",
  IMPORT_NOT_PERMITTED: "Importing a whole new book happens from the start screen.",
  SECTION_NOT_FOUND: "That part of the book no longer exists. Pick another from the outline.",
  INVALID_STRUCTURE: "That change would break the book’s structure, so it wasn’t made.",
  DOMAIN_VALIDATION: "That change would leave the book incomplete, so it wasn’t made.",
  VALIDATION_FAILED: "The book check couldn’t finish. Try again in a moment.",
  PREPUBLISH_VALIDATION_FAILED: "Check your book before exporting. Press Check my book.",
  PUBLISH_NOT_PERMITTED: "Check your book before exporting. Press Check my book.",
  CONFORMANCE_CHECK_FAILED: "The ebook didn’t pass the store-readiness check. Press Check my book to see what to fix.",
  RENDERER_COMPILER_FAILED: "Couldn’t make the PDF. Try again; if it keeps happening, open Diagnostics.",
  OPERATION_ABORTED: "Export was stopped. Nothing was saved.",
  EXPORT_CANCELLED: "Export cancelled. Nothing was saved.",
  EXPORT_OVERWRITE_DECLINED: "Export cancelled. The existing file was kept.",
  EXPORT_DESTINATION_INVALID: "Choose a folder and file name for the export.",
  EXPORT_DESTINATION_UNWRITABLE: "OpenBook can’t write to that folder. Choose another one.",
  EXPORT_WRITE_FAILED: "Couldn’t write the exported file. Choose another folder and try again.",
};

/** The desktop host (SQLite, file dialogs) only exists inside the OpenBook app window. */
const DESKTOP_ONLY =
  /reading 'invoke'|__TAURI|window\.__TAURI|tauri is not defined|ipc/i;

const DESKTOP_ONLY_MESSAGE: Partial<Record<StudioErrorContext, string>> = {
  save: "Saving needs the OpenBook desktop app. This preview window can’t save books.",
  open: "Opening saved books needs the OpenBook desktop app.",
  start: "Creating books needs the OpenBook desktop app. This preview window can’t save them.",
  export: "Exporting needs the OpenBook desktop app.",
};

const RAW_ERROR = /\b(TypeError|ReferenceError|SyntaxError|Cannot read propert|undefined|null|stack|at\s+\w+\s*\()/;

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** True when the text is safe and helpful to show an author as-is. */
export function isAuthorSafeText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 200) return false;
  if (findInternalTerms(trimmed).length > 0) return false;
  if (RAW_ERROR.test(trimmed)) return false;
  if (/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/.test(trimmed)) return false; // ERROR_CODE style
  if (/[\\/][\w.-]+[\\/]/.test(trimmed) && /\.(ts|js|rs)\b/.test(trimmed)) return false;
  return true;
}

export function toAuthorError(err: unknown, context: StudioErrorContext): StudioAuthorError {
  const detail = errorText(err);
  const code = errorCode(err) ?? /^([A-Z][A-Z0-9_]+):/.exec(detail)?.[1];
  if (DESKTOP_ONLY.test(detail) && DESKTOP_ONLY_MESSAGE[context]) {
    return { message: DESKTOP_ONLY_MESSAGE[context]!, detail };
  }
  if (code && BY_CODE[code]) return { message: BY_CODE[code], detail };
  return { message: FALLBACK[context], detail };
}

/** Message-only convenience for places that show a single line. */
export function toAuthorMessage(err: unknown, context: StudioErrorContext): string {
  return toAuthorError(err, context).message;
}
