// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 4 — source-shape guards for image insertion chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("WritingStudioImageButton stays free of Tauri, FS, and coordinator calls", () => {
  const button = readFileSync(
    join(repoSrc, "ui", "WritingStudioImageButton.tsx"),
    "utf8",
  );
  const adapter = readFileSync(
    join(repoSrc, "workflow", "domain", "writingStudioImageAdapter.ts"),
    "utf8",
  );
  const pick = readFileSync(
    join(repoSrc, "host", "createWritingStudioImagePickPort.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");
  const rust = readFileSync(
    join(repoSrc, "..", "src-tauri", "src", "lib.rs"),
    "utf8",
  );

  assert.match(button, /IWritingStudioImageAdapter/);
  assert.match(button, /writing-studio-insert-image/);
  assert.doesNotMatch(
    button,
    /DesktopStudioCoordinator|plugin-dialog|plugin-fs|invoke\(|child_process|Ollama/,
  );

  assert.match(adapter, /insertImageBlock/);
  assert.match(adapter, /CANCELLED/);
  assert.match(adapter, /ensureAssetsStage/);
  assert.doesNotMatch(adapter, /from ["']@tiptap|persistTipTap|plugin-dialog/);

  assert.match(pick, /createTauriWritingStudioImagePickPort|asset_read_bytes/);
  assert.match(pick, /plugin-dialog/);
  assert.doesNotMatch(pick, /plugin-fs|child_process/);

  assert.match(editor, /WritingStudioImageButton/);
  assert.match(editor, /createWritingStudioImageAdapter/);

  assert.match(rust, /asset_read_bytes/);
  assert.match(rust, /is_safe_dialog_path/);
});
