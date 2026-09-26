// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 3 — source-shape guards for word count + find chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("WritingStudioFindPanel stays free of TipTap JSON, Tauri, and coordinator calls", () => {
  const panel = readFileSync(
    join(repoSrc, "ui", "WritingStudioFindPanel.tsx"),
    "utf8",
  );
  const adapter = readFileSync(
    join(repoSrc, "workflow", "domain", "writingStudioQueryAdapter.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(panel, /IWritingStudioQueryAdapter/);
  assert.match(panel, /writing-studio-find-panel/);
  assert.match(panel, /writing-studio-word-count/);
  assert.match(panel, /searchDocument/);
  assert.match(panel, /EMPTY_QUERY|outcome\.message/);
  assert.doesNotMatch(
    panel,
    /DesktopStudioCoordinator|getJSON\(|applyActiveSectionTipTap|plugin-dialog|plugin-fs|child_process|Ollama/,
  );

  assert.match(adapter, /wordCountSnapshotForBook|searchBookText/);
  assert.match(adapter, /EMPTY_QUERY/);
  assert.doesNotMatch(adapter, /from ["']@tiptap|getJSON\(|persistTipTap/);

  assert.match(editor, /WritingStudioFindPanel/);
  assert.match(editor, /createWritingStudioQueryAdapter/);
});
