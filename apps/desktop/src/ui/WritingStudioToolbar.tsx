/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0034 Slice 2 — Writing Studio formatting toolbar chrome.
 * Delegates commands to WritingStudioToolbarAdapter. No BookSession,
 * persistence, or Tauri calls live here.
 */
import {
  WRITING_STUDIO_TOOLBAR_COMMANDS,
  type WritingStudioToolbarCommand,
} from "../workflow/domain/writingStudioContract.js";
import type { IWritingStudioToolbarAdapter } from "../workflow/domain/writingStudioToolbarAdapter.js";
import { DEFAULT_LESSON_BOX_TITLE } from "../workflow/domain/lessonBoxEditing.js";

export interface WritingStudioToolbarProps {
  readonly toolbar: IWritingStudioToolbarAdapter;
  readonly disabled?: boolean;
  /** Optional href prompt for set-link (defaults to window.prompt). */
  readonly promptLinkHref?: () => string | null;
  /** ADR-0041: title a new lesson box starts with (the last one used in the book). */
  readonly newLessonBoxTitle?: string;
  /** ADR-0041: title of the lesson box at the cursor, or null when the cursor isn't in one. */
  readonly lessonBoxTitle?: string | null;
  /** Called after the author changes a box title, so the next new box can reuse it. */
  readonly onLessonBoxTitleChange?: (title: string) => void;
  /** Plain-language message when a command can't run where the cursor is. */
  readonly onStatus?: (message: string, kind: "ok" | "error") => void;
}

const COMMAND_LABELS: Record<WritingStudioToolbarCommand, string> = {
  "toggle-bold": "Bold",
  "toggle-italic": "Italic",
  "toggle-heading-1": "H1",
  "toggle-heading-2": "H2",
  "toggle-heading-3": "H3",
  "toggle-heading-4": "H4",
  "toggle-heading-5": "H5",
  "toggle-heading-6": "H6",
  "toggle-bullet-list": "Bullets",
  "toggle-ordered-list": "Numbers",
  "toggle-blockquote": "Quote",
  "toggle-lesson-box": "Lesson box",
  "set-lesson-box-title": "Box title",
  "set-link": "Link",
  "unset-link": "Unlink",
  undo: "Undo",
  redo: "Redo",
};

/** Product chrome order — contract still enumerates the full command set.
 * "set-lesson-box-title" is the Box title field, not a button. */
const TOOLBAR_ORDER: readonly WritingStudioToolbarCommand[] = [
  "toggle-bold",
  "toggle-italic",
  "toggle-heading-1",
  "toggle-heading-2",
  "toggle-heading-3",
  "toggle-heading-4",
  "toggle-heading-5",
  "toggle-heading-6",
  "toggle-bullet-list",
  "toggle-ordered-list",
  "toggle-blockquote",
  "toggle-lesson-box",
  "set-link",
  "unset-link",
  "undo",
  "redo",
];

function defaultPromptLinkHref(): string | null {
  if (typeof window === "undefined" || typeof window.prompt !== "function") {
    return null;
  }
  const value = window.prompt("Link URL");
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export default function WritingStudioToolbar({
  toolbar,
  disabled = false,
  promptLinkHref = defaultPromptLinkHref,
  newLessonBoxTitle = DEFAULT_LESSON_BOX_TITLE,
  lessonBoxTitle = null,
  onLessonBoxTitleChange,
  onStatus,
}: WritingStudioToolbarProps) {
  const onCommand = (command: WritingStudioToolbarCommand) => {
    if (command === "set-link") {
      const href = promptLinkHref();
      if (href === null) return;
      toolbar.executeCommand(command, { href });
      return;
    }
    if (command === "toggle-lesson-box") {
      const result = toolbar.executeCommand(command, { title: newLessonBoxTitle });
      if (!result.ok) onStatus?.(result.message, "error");
      return;
    }
    toolbar.executeCommand(command);
  };

  const onTitleChange = (title: string) => {
    const result = toolbar.executeCommand("set-lesson-box-title", { title });
    if (!result.ok) {
      onStatus?.(result.message, "error");
      return;
    }
    if (title.trim()) onLessonBoxTitleChange?.(title.trim());
  };

  return (
    <div
      className="editor-toolbar writing-studio-toolbar"
      role="toolbar"
      aria-label="Writing Studio formatting"
      data-testid="writing-studio-toolbar"
    >
      {TOOLBAR_ORDER.map((command) => {
        assertContractIncludes(command);
        return (
          <button
            key={command}
            type="button"
            disabled={disabled}
            data-testid={`writing-studio-cmd-${command}`}
            data-command={command}
            onClick={() => onCommand(command)}
          >
            {COMMAND_LABELS[command]}
          </button>
        );
      })}
      {lessonBoxTitle !== null ? (
        <label className="writing-studio-box-title" data-testid="writing-studio-box-title">
          Box title
          <input
            type="text"
            aria-label="Box title"
            data-testid="writing-studio-box-title-input"
            value={lessonBoxTitle}
            placeholder="No title"
            disabled={disabled}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </label>
      ) : null}
    </div>
  );
}

function assertContractIncludes(command: WritingStudioToolbarCommand): void {
  if (!WRITING_STUDIO_TOOLBAR_COMMANDS.includes(command)) {
    throw new Error(`Toolbar chrome command missing from contract: ${command}`);
  }
}
