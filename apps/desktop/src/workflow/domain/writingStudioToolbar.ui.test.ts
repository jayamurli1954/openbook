// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 2 — source-shape guards for Writing Studio formatting chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("WritingStudioToolbar stays free of coordinator, Tauri, and TipTap persistence", () => {
  const toolbar = readFileSync(
    join(repoSrc, "ui", "WritingStudioToolbar.tsx"),
    "utf8",
  );
  const tipTapPort = readFileSync(
    join(repoSrc, "host", "createTipTapEditorCommandPort.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");
  const adapter = readFileSync(
    join(repoSrc, "workflow", "domain", "writingStudioToolbarAdapter.ts"),
    "utf8",
  );

  assert.match(toolbar, /IWritingStudioToolbarAdapter/);
  assert.match(toolbar, /WRITING_STUDIO_TOOLBAR_COMMANDS/);
  assert.match(toolbar, /writing-studio-toolbar/);
  assert.match(toolbar, /toggle-heading-1/);
  assert.match(toolbar, /set-link/);
  assert.match(toolbar, /toggle-ordered-list/);
  assert.doesNotMatch(
    toolbar,
    /DesktopStudioCoordinator|applyActiveSectionTipTap|writeFile|plugin-dialog|plugin-fs|child_process/,
  );
  assert.doesNotMatch(toolbar, /\bOllama\b|insert-table/);

  assert.match(tipTapPort, /createTipTapEditorCommandPort/);
  assert.match(tipTapPort, /toggleHeading/);
  assert.match(tipTapPort, /setLink/);
  assert.doesNotMatch(tipTapPort, /BookSession|persistTipTap|localStorage/);

  assert.match(adapter, /WritingStudioEditorCommandPort/);
  assert.match(adapter, /LINK_HREF_REQUIRED|EDITOR_UNAVAILABLE/);
  assert.doesNotMatch(adapter, /from ["']@tiptap|from ["']react["']|from ["']@tiptap\//);
  assert.doesNotMatch(adapter, /persistTipTap|localStorage|plugin-fs|plugin-dialog/);

  assert.match(editor, /WritingStudioToolbar/);
  assert.match(editor, /createWritingStudioToolbarAdapter/);
  assert.match(editor, /createTipTapEditorCommandPort/);
  assert.doesNotMatch(editor, /toggleBold\(\)\.run\(\)/);
});
