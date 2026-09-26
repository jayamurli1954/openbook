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

export interface WritingStudioToolbarProps {
  readonly toolbar: IWritingStudioToolbarAdapter;
  readonly disabled?: boolean;
  /** Optional href prompt for set-link (defaults to window.prompt). */
  readonly promptLinkHref?: () => string | null;
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
  "set-link": "Link",
  "unset-link": "Unlink",
  undo: "Undo",
  redo: "Redo",
};

/** Product chrome order — contract still enumerates the full command set. */
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
}: WritingStudioToolbarProps) {
  const onCommand = (command: WritingStudioToolbarCommand) => {
    if (command === "set-link") {
      const href = promptLinkHref();
      if (href === null) return;
      toolbar.executeCommand(command, { href });
      return;
    }
    toolbar.executeCommand(command);
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
    </div>
  );
}

function assertContractIncludes(command: WritingStudioToolbarCommand): void {
  if (!WRITING_STUDIO_TOOLBAR_COMMANDS.includes(command)) {
    throw new Error(`Toolbar chrome command missing from contract: ${command}`);
  }
}
