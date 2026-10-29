// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 3 — outline model, and source guards for the outline,
 * full-width Write step, and Focus mode.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import {
  buildStudioOutline,
  formatOutlineWords,
  isOutlineChapter,
  outlineSectionTitle,
} from "./studioShellOutline.js";

function sampleBook() {
  const session = new BookSession({
    book: createBook({ title: "ನದಿಯ ಪುಸ್ತಕ", language: "kn", authors: ["ಲೇಖಕ"] }),
    idSeed: "outline-slice-3",
  });
  session.addSection({ matter: "front", title: "ಮುನ್ನುಡಿ" });
  session.addSection({ matter: "main", title: "Upstream" });
  session.addSection({ matter: "back", title: "  " });
  return session.getBook();
}

test("outline groups front matter, chapters, and back matter in book order", () => {
  const book = sampleBook();
  const words = new Map(book.chapters.map((chapter, index) => [chapter.id, index === 0 ? 1240 : 85]));
  const outline = buildStudioOutline(book, (id) => words.get(id) ?? 0);

  assert.deepEqual(
    outline.map((group) => [group.matter, group.label, group.items.length]),
    [
      ["front", "Front matter", 1],
      ["main", "Chapters", book.chapters.length],
      ["back", "Back matter", 1],
    ],
  );
  assert.equal(outline[0]!.items[0]!.title, "ಮುನ್ನುಡಿ");
  assert.equal(outline[1]!.items[0]!.title, `1 · ${book.chapters[0]!.title}`);
  assert.equal(outline[1]!.items[0]!.wordsLabel, "1.2k");
  assert.equal(outline[1]!.items.at(-1)!.title, `${book.chapters.length} · Upstream`);
  assert.equal(outline[2]!.items[0]!.title, "Untitled");
});

test("word counts read compactly", () => {
  assert.deepEqual(
    [0, 7, 999, 1000, 1240, 9950, 12400, -3].map(formatOutlineWords),
    ["0", "7", "999", "1k", "1.2k", "10k", "12k", "0"],
  );
});

test("only chapters offer rename and delete in the outline", () => {
  const book = sampleBook();
  assert.equal(isOutlineChapter(book, book.chapters[0]!.id), true);
  assert.equal(isOutlineChapter(book, book.frontMatter[0]!.id), false);
  assert.equal(isOutlineChapter(book, null), false);
});

test("the selected-section note names front matter, chapters, and back matter by title", () => {
  const session = new BookSession({
    book: createBook({ title: "Little Krishna's Wisdom Stories", language: "en", authors: ["Author"] }),
    idSeed: "imp-ce3c20b9fe55",
  });
  const note = session.addSection({ matter: "front", title: "Publisher’s Note" });
  const chapter = session.addSection({ matter: "main", title: "The Butter Thief" });
  const glossary = session.addSection({ matter: "back", title: " Glossary " });
  const untitled = session.addSection({ matter: "back", title: "  " });
  const book = session.getBook();

  assert.equal(outlineSectionTitle(book, note.id), "Publisher’s Note");
  assert.equal(outlineSectionTitle(book, chapter.id), "The Butter Thief");
  assert.equal(outlineSectionTitle(book, glossary.id), "Glossary");
  // Never an internal id, even for an untitled or unknown section.
  for (const id of [untitled.id, "imp-ce3c20b9fe55-s9999", null]) {
    const title = outlineSectionTitle(book, id);
    assert.equal(title, "Untitled section");
    assert.doesNotMatch(title, /imp-|-s\d/);
  }
});

test("Write's selection note uses the section title, not a chapter-only lookup or the id", () => {
  const editor = read("EditorSurface.tsx");
  const onSelect = editor.slice(editor.indexOf("const onSelectChapter"), editor.indexOf("const onCreateChapter"));
  assert.match(onSelect, /outlineSectionTitle\(coordinator\.getBook\(\), chapterId\)/);
  assert.doesNotMatch(onSelect, /listChapters\(\)|\?\? chapterId/);
});

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

test("one outline replaces the chapter list, and every studio keeps a home", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /outline=\{\s*focusMode \? undefined : \(\s*<StudioOutline/);
  assert.doesNotMatch(editor, /chapter-panel|editor-layout|data-testid="chapter-list"/);
  for (const [step, panel] of [
    ["structure", "<StructureStudioRail"],
    ["structure", "<StructureStudioNavPreview"],
    ["design", "<DesignStudioChoices"],
    ["details", "<MetadataWizardFields"],
  ] as const) {
    const start = editor.indexOf(`{activeStep === "${step}" ? (`);
    assert.ok(start > 0, `${step} step panel exists`);
    const end = editor.indexOf(") : null}", start);
    assert.ok(editor.slice(start, end).includes(panel), `${panel} lives in the ${step} step`);
  }
  const outline = read("ui", "StudioOutline.tsx");
  assert.match(outline, /\+ Add chapter/);
  assert.match(outline, /onRenameChapter/);
  assert.match(outline, /onDeleteChapter/);
  assert.match(outline, /aria-current=\{current \? "true" : undefined\}/);
  assert.doesNotMatch(outline, /DesktopStudioCoordinator|getSession\(|from ["']@tauri-apps|localStorage/);
});

test("Focus hides everything but the page and Esc brings it back", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /const \[focusMode, setFocusMode\] = useState\(false\)/);
  assert.match(editor, /data-testid="studio-focus-toggle"/);
  assert.match(editor, /aria-pressed=\{focusMode\}/);
  assert.match(editor, /focusMode && event\.key === "Escape"/);
  assert.match(editor, /guide=\{\s*focusMode \|\| !guideOpen \? undefined/);
  const selectStep = editor.slice(editor.indexOf("const selectStep"), editor.indexOf("const reportStatus"));
  assert.match(selectStep, /setFocusMode\(false\)/);
});
