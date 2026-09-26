// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 2 — Writing Studio toolbar adapter.
 *
 * Maps WritingStudioToolbarCommand onto an injectable TipTap command port.
 * React chrome and TipTap Editor construction stay outside this module.
 */
import {
  isWritingStudioToolbarCommand,
  type WritingStudioToolbarCommand,
  type WritingStudioToolbarCommandArgs,
} from "./writingStudioContract.js";

export type WritingStudioHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Narrow TipTap-facing command surface. Implementations live in host/UI.
 * Domain tests use fakes — no React / @tiptap imports here.
 */
export interface WritingStudioEditorCommandPort {
  toggleBold(): void;
  toggleItalic(): void;
  toggleHeading(level: WritingStudioHeadingLevel): void;
  toggleBulletList(): void;
  toggleOrderedList(): void;
  toggleBlockquote(): void;
  setLink(href: string): void;
  unsetLink(): void;
  undo(): void;
  redo(): void;
}

export type WritingStudioToolbarErrorCode =
  | "UNKNOWN_COMMAND"
  | "LINK_HREF_REQUIRED"
  | "EDITOR_UNAVAILABLE";

export type WritingStudioToolbarResult =
  | { readonly ok: true; readonly command: WritingStudioToolbarCommand }
  | {
      readonly ok: false;
      readonly code: WritingStudioToolbarErrorCode;
      readonly message: string;
    };

export interface IWritingStudioToolbarAdapter {
  executeCommand(
    command: WritingStudioToolbarCommand,
    args?: WritingStudioToolbarCommandArgs,
  ): WritingStudioToolbarResult;
}

export interface WritingStudioToolbarAdapterDeps {
  /** Returns null when the editor is not ready. */
  getEditor(): WritingStudioEditorCommandPort | null;
}

function headingLevelFromCommand(
  command: WritingStudioToolbarCommand,
): WritingStudioHeadingLevel | null {
  switch (command) {
    case "toggle-heading-1":
      return 1;
    case "toggle-heading-2":
      return 2;
    case "toggle-heading-3":
      return 3;
    case "toggle-heading-4":
      return 4;
    case "toggle-heading-5":
      return 5;
    case "toggle-heading-6":
      return 6;
    default:
      return null;
  }
}

/**
 * Execute a toolbar command against the TipTap command port.
 * Does not mutate the Book — live editor updates stay on the existing
 * EditorSurface projection path into the coordinator.
 */
export function executeWritingStudioToolbarCommand(
  editor: WritingStudioEditorCommandPort,
  command: WritingStudioToolbarCommand,
  args?: WritingStudioToolbarCommandArgs,
): WritingStudioToolbarResult {
  if (!isWritingStudioToolbarCommand(command)) {
    return {
      ok: false,
      code: "UNKNOWN_COMMAND",
      message: `Unknown Writing Studio toolbar command: ${String(command)}`,
    };
  }

  switch (command) {
    case "toggle-bold":
      editor.toggleBold();
      return { ok: true, command };
    case "toggle-italic":
      editor.toggleItalic();
      return { ok: true, command };
    case "toggle-heading-1":
    case "toggle-heading-2":
    case "toggle-heading-3":
    case "toggle-heading-4":
    case "toggle-heading-5":
    case "toggle-heading-6": {
      const level = headingLevelFromCommand(command);
      if (level === null) {
        return {
          ok: false,
          code: "UNKNOWN_COMMAND",
          message: `Unhandled heading command: ${command}`,
        };
      }
      editor.toggleHeading(level);
      return { ok: true, command };
    }
    case "toggle-bullet-list":
      editor.toggleBulletList();
      return { ok: true, command };
    case "toggle-ordered-list":
      editor.toggleOrderedList();
      return { ok: true, command };
    case "toggle-blockquote":
      editor.toggleBlockquote();
      return { ok: true, command };
    case "set-link": {
      const href = typeof args?.href === "string" ? args.href.trim() : "";
      if (href.length === 0) {
        return {
          ok: false,
          code: "LINK_HREF_REQUIRED",
          message: "A non-empty link href is required.",
        };
      }
      editor.setLink(href);
      return { ok: true, command };
    }
    case "unset-link":
      editor.unsetLink();
      return { ok: true, command };
    case "undo":
      editor.undo();
      return { ok: true, command };
    case "redo":
      editor.redo();
      return { ok: true, command };
    default: {
      const _exhaustive: never = command;
      return {
        ok: false,
        code: "UNKNOWN_COMMAND",
        message: `Unhandled Writing Studio toolbar command: ${String(_exhaustive)}`,
      };
    }
  }
}

export class WritingStudioToolbarAdapter implements IWritingStudioToolbarAdapter {
  readonly #getEditor: () => WritingStudioEditorCommandPort | null;

  constructor(deps: WritingStudioToolbarAdapterDeps) {
    this.#getEditor = deps.getEditor;
  }

  executeCommand(
    command: WritingStudioToolbarCommand,
    args?: WritingStudioToolbarCommandArgs,
  ): WritingStudioToolbarResult {
    const editor = this.#getEditor();
    if (!editor) {
      return {
        ok: false,
        code: "EDITOR_UNAVAILABLE",
        message: "Writing Studio editor is not ready.",
      };
    }
    return executeWritingStudioToolbarCommand(editor, command, args);
  }
}

export function createWritingStudioToolbarAdapter(
  deps: WritingStudioToolbarAdapterDeps,
): IWritingStudioToolbarAdapter {
  return new WritingStudioToolbarAdapter(deps);
}
