// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 6 — start screen book types and source guards.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import { createDesignStudioChoices } from "./designStudioChoices.js";
import { readBookDesign } from "./designStudioContract.js";
import { findInternalTerms } from "./studioShellGuide.js";
import { STUDIO_BOOK_TYPES, findDesignPresetForBookType } from "./studioShellStart.js";
import {
  GUIDED_START_CONTINUE_HINT,
  GUIDED_START_EMPTY_RECENT,
  GUIDED_START_HUB_STATUS,
  GUIDED_START_OPEN_ROOT_EMPTY,
  formatGuidedStartFailure,
  formatGuidedStartPathStatus,
} from "./guidedStartUx.js";

test("book types cover the mockup and each applies a real look", () => {
  assert.deepEqual(
    STUDIO_BOOK_TYPES.map((type) => type.label),
    ["Novel", "Memoir", "How-to guide", "Poetry", "Kannada book"],
  );
  const kannada = STUDIO_BOOK_TYPES.find((type) => type.id === "kannada")!;
  assert.equal(kannada.language, "kn");
  for (const type of STUDIO_BOOK_TYPES) {
    const preset = findDesignPresetForBookType(type);
    const session = new BookSession({
      book: createBook({ title: "Start", language: type.language }),
      idSeed: `start-${type.id}`,
    });
    assert.equal(createDesignStudioChoices(session).applyPreset(preset).ok, true, type.id);
    assert.equal(readBookDesign(session.getBook()).theme.id, preset.theme.id);
    assert.deepEqual(findInternalTerms(`${type.label} ${type.description}`), []);
  }
});

test("start copy is plain language", () => {
  const copy = [
    GUIDED_START_HUB_STATUS,
    GUIDED_START_EMPTY_RECENT,
    GUIDED_START_CONTINUE_HINT,
    GUIDED_START_OPEN_ROOT_EMPTY,
    formatGuidedStartFailure("PROJECT_ROOT_REQUIRED"),
    formatGuidedStartFailure("CONTINUE_UNAVAILABLE"),
    formatGuidedStartFailure("COORDINATOR_FAILED"),
    ...(["new-book", "import", "open-recent", "continue"] as const).map(formatGuidedStartPathStatus),
  ];
  for (const text of copy) {
    assert.deepEqual(findInternalTerms(text), [], text);
    assert.doesNotMatch(text, /\bpackage\b|importer|recovery discovery/i, text);
  }
});

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

test("the app opens on the start screen, which hosts every way to begin", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /useState<"start" \| "studio">\("start"\)/);
  const startStart = editor.indexOf('{view === "start" ? (');
  const studioStart = editor.indexOf('<div className="studio-view" hidden={view !== "studio"}>');
  assert.ok(startStart > 0 && studioStart > startStart);
  const start = editor.slice(startStart, studioStart);
  assert.match(start, /<StudioStartScreen/);
  assert.match(start, /<GuidedStartWizard/);
  assert.match(start, /initialPath=\{pickedBookType \? "new-book" : null\}/);
  assert.match(start, /onClick=\{startBlankBook\}/);
  assert.match(start, /openFromLibrary/);

  const screen = read("ui", "StudioStartScreen.tsx");
  assert.match(screen, /Tell us your story/);
  assert.match(screen, /What are you writing\?/);
  assert.match(screen, /Continue: \{currentBookTitle\}/);
  assert.doesNotMatch(screen, /DesktopStudioCoordinator|getSession\(|from ["']@tauri-apps|localStorage/);
});

test("Write holds only the editor; Save and home live in the top bar; import lives in Structure", () => {
  const editor = read("EditorSurface.tsx");
  const writeStart = editor.indexOf('className="editor-section"');
  const write = editor.slice(writeStart, editor.indexOf("</StudioShellFrame>"));
  assert.doesNotMatch(write, /<GuidedStartWizard|aria-label="Import manuscript"|aria-label="Project"/);
  assert.match(write, /<EditorContent/);

  const structure = editor.slice(
    editor.indexOf('{activeStep === "structure" ? ('),
    editor.indexOf('{activeStep === "design" ? ('),
  );
  assert.match(structure, /Add chapters from a file/);
  assert.match(structure, /runImport\("append-sections"\)/);
  assert.doesNotMatch(structure, /Coordinator receives|Import as new project/);

  assert.match(editor, /onHome=\{\(\) => setView\("start"\)\}/);
  assert.match(editor, /onSave=\{\(\) => void onSaveProject\(\)\}/);
  const frame = read("ui", "StudioShellFrame.tsx");
  assert.match(frame, /data-testid="studio-home"/);
  assert.match(frame, /data-testid="studio-save"/);
});
