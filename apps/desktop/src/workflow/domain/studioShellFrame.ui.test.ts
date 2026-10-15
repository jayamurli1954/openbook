// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 2 — source-shape guards for the studio shell frame.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

test("shell frame is presentation only", () => {
  const frame = read("ui", "StudioShellFrame.tsx");
  assert.match(frame, /aria-label="Book steps"/);
  assert.match(frame, /aria-current=\{current \? "step" : undefined\}/);
  assert.match(frame, /role="status"/);
  assert.match(frame, /hidden=\{!diagnosticsOpen\}/);
  assert.doesNotMatch(
    frame,
    /DesktopStudioCoordinator|BookSession|from ["']@tauri-apps|from ["']@tiptap|localStorage|plugin-fs|getSession\(/,
  );
});

test("editor surface hosts the shell and keeps every existing panel reachable", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /<StudioShellFrame/);
  assert.match(editor, /useState<StudioStepId>\("write"\)/);
  assert.match(editor, /useState\(false\)[^\n]*\n?/);
  assert.match(editor, /const \[diagnosticsOpen, setDiagnosticsOpen\] = useState\(false\)/);
  assert.match(editor, /className="editor-section"\s+hidden=\{activeStep !== "write"\}/);
  for (const panel of [
    "<GuidedStartWizard",
    "<ExportPanel",
    "<StructureStudioRail",
    "<StructureStudioNavPreview",
    "<DesignStudioChoices",
    "<MetadataWizardFields",
    "<WritingStudioToolbar",
    "<WritingStudioFindPanel",
    "<WritingStudioImageButton",
    "<EditorContent",
  ]) {
    assert.ok(editor.includes(panel), `${panel} is still rendered`);
  }
});

test("developer details live in the diagnostics drawer, not the page", () => {
  const app = read("App.tsx");
  assert.match(app, /<EditorSurface\s+diagnostics=\{/);
  assert.doesNotMatch(app, /<h1>/);
  assert.match(app, /data-testid="sqlite-status"/);
  assert.match(app, /data-testid="sdm-status"/);

  const editor = read("EditorSurface.tsx");
  const diagnosticsStart = editor.indexOf("diagnostics={");
  const childrenStart = editor.indexOf('{activeStep === "structure" ? (');
  assert.ok(diagnosticsStart > 0 && childrenStart > diagnosticsStart);
  const drawer = editor.slice(diagnosticsStart, childrenStart);
  assert.match(drawer, /<h2>Editor \(Tiptap\)<\/h2>/);
  assert.match(drawer, /data-testid="editor-roundtrip"/);
  const page = editor.slice(childrenStart);
  assert.doesNotMatch(page, /Editor \(Tiptap\)|Tiptap → EditorAdapter/);
});
