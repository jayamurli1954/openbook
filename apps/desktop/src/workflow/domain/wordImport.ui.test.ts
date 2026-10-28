// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0040 Slice 4 — Word import surfaces: start screen, Write, Guide panel, host.
 * Source checks, in the style of the other ADR-0039 UI tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

test("the start screen offers Import a Word file and shows its result", () => {
  const start = read("ui", "StudioStartScreen.tsx");
  assert.match(start, /data-testid="studio-start-import-word"/);
  assert.match(start, /"Import a Word file"/);
  assert.match(start, /disabled=\{wordImportBusy\}/);
  assert.match(start, /data-testid="studio-start-import-word-status"/);
  assert.doesNotMatch(start, /DesktopStudioCoordinator|@tauri-apps/);
});

test("Write offers Add chapters from a Word file, appending to the open book", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /data-testid="writing-studio-import-word"/);
  assert.match(editor, /"Add chapters from a Word file"/);
  assert.match(editor, /runWordImport\("append-sections"\)/);
  assert.match(editor, /onImportWord=\{\(\) => void runWordImport\("new-project"\)\}/);
  assert.match(editor, /importWordFile\(coordinator, wordPicker, mode\)/);
  assert.match(editor, /createWordFilePickPort\(\)/);
});

test("the Guide panel shows the import summary until the author dismisses it", () => {
  const panel = read("ui", "StudioGuidePanel.tsx");
  assert.match(panel, /data-testid="studio-guide-import-summary"/);
  assert.match(panel, /Your Word file/);
  assert.match(panel, /Please check/);
  assert.match(panel, /Good to know/);
  assert.match(panel, /data-testid="studio-guide-import-dismiss"/);
  assert.doesNotMatch(panel, /DesktopStudioCoordinator|@tauri-apps/);

  const editor = read("EditorSurface.tsx");
  assert.match(editor, /importSummary=\{wordImportSummary\}/);
  assert.match(editor, /onDismissImportSummary=\{\(\) => setWordImportSummary\(null\)\}/);
  assert.match(editor, /setGuideOpen\(true\)/);
});

test("the host checks the size before reading and reads only .docx", () => {
  const host = read("host", "createWordFilePickPort.ts");
  assert.match(host, /extensions: \["docx"\]/);
  assert.match(host, /invoke<ArrayBuffer>\("docx_read_bytes"/);
  assert.match(host, /DOCX_TOO_LARGE/);
  // Browser fallback: the size is checked before arrayBuffer() reads the file.
  assert.ok(host.indexOf("file.size > WORD_IMPORT_MAX_FILE_BYTES") < host.indexOf(".arrayBuffer()"));

  const rust = readFileSync(join(repoSrc, "..", "src-tauri", "src", "lib.rs"), "utf8");
  const command = rust.slice(rust.indexOf("fn docx_read_bytes"));
  assert.ok(command.indexOf("metadata.len() > DOCX_MAX_FILE_BYTES") < command.indexOf("fs::read(&candidate)"));
  assert.match(rust, /tauri::ipc::Response::new\(bytes\)/);
  assert.match(rust, /docx_read_bytes\s*\]\)/);

  const permissions = readFileSync(join(repoSrc, "..", "src-tauri", "permissions", "export.toml"), "utf8");
  assert.match(permissions, /commands\.allow = \["docx_read_bytes"\]/);
  const capability = readFileSync(join(repoSrc, "..", "src-tauri", "capabilities", "default.json"), "utf8");
  assert.match(capability, /"allow-docx-read-bytes"/);
});

test("the Word import flow stays free of React, Tauri, and the file system", () => {
  const flow = read("workflow", "domain", "wordImport.ts");
  assert.doesNotMatch(flow, /from ["']react|@tauri-apps|node:fs|window\./);
});
