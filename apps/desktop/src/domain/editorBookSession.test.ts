// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { bookToSemanticDocument } from "@openbook/semantic-document";
import {
  normalizeTipTapDoc,
  semanticDocumentToTipTapJson,
  type TipTapDocJSON,
} from "./editorAdapter.js";
import {
  applyTipTapToSelectedChapter,
  createChapter,
  createEditorBookSession,
  deleteChapter,
  listSessionChapters,
  projectSessionToBook,
  renameChapter,
  selectChapter,
  selectedChapterToTipTap,
  type EditorBookSession,
} from "./editorBookSession.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "..", "..", "..", "tests", "fixtures", "editor");

function loadTipTapFixture(name: string): TipTapDocJSON {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as TipTapDocJSON;
}

function sequentialIds() {
  let n = 0;
  return (prefix: string) => {
    n += 1;
    return `${prefix}-${n}`;
  };
}

function metadata(language: string, title: string) {
  return {
    title,
    subtitle: "",
    authors: ["OpenBook"],
    contributors: [] as string[],
    language,
    identifier: `session-${language}`,
    publisher: "",
    publishedAt: "",
    copyright: "",
    description: "",
    subjects: [] as string[],
    rights: "",
  };
}

function collectText(blocks: EditorBookSession["document"]["sections"][0]["blocks"]): string {
  let out = "";
  const walk = (inlines: { type: string; text?: string; children?: unknown[] }[]) => {
    for (const inline of inlines) {
      if (inline.type === "text" && inline.text) out += inline.text;
      if (
        (inline.type === "emphasis" || inline.type === "strong" || inline.type === "link") &&
        Array.isArray(inline.children)
      ) {
        walk(inline.children as { type: string; text?: string; children?: unknown[] }[]);
      }
    }
  };
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") {
      walk(block.inlines);
    }
    if (block.type === "list") {
      for (const item of block.items) walk(item);
    }
  }
  return out;
}

test("create/rename/delete/select chapter operations work with unique ids and order", () => {
  const createId = sequentialIds();
  const started = createEditorBookSession({
    metadata: metadata("en", "Chapter Ops EN"),
    chapters: [{ id: "sec-a", title: "Alpha" }, { id: "sec-b", title: "Beta" }],
    createId,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  let session = started.session;
  assert.deepEqual(
    listSessionChapters(session).map((c) => c.title),
    ["Alpha", "Beta"],
  );

  const created = createChapter(session, "Gamma", createId);
  assert.equal(created.ok, true);
  if (!created.ok) return;
  session = created.session;
  const chapters = listSessionChapters(session);
  assert.equal(chapters.length, 3);
  assert.equal(chapters[2]?.title, "Gamma");
  assert.equal(chapters[2]?.index, 2);
  assert.equal(session.selectedChapterId, chapters[2]?.id);
  assert.equal(new Set(chapters.map((c) => c.id)).size, 3);

  const renamed = renameChapter(session, chapters[2]!.id, "Gamma Renamed");
  assert.equal(renamed.ok, true);
  if (!renamed.ok) return;
  session = renamed.session;
  assert.equal(listSessionChapters(session)[2]?.title, "Gamma Renamed");

  const selected = selectChapter(session, "sec-a");
  assert.equal(selected.ok, true);
  if (!selected.ok) return;
  session = selected.session;
  assert.equal(session.selectedChapterId, "sec-a");

  const deleted = deleteChapter(session, "sec-b");
  assert.equal(deleted.ok, true);
  if (!deleted.ok) return;
  session = deleted.session;
  assert.deepEqual(
    listSessionChapters(session).map((c) => c.title),
    ["Alpha", "Gamma Renamed"],
  );
});

test("deleting the last chapter is refused (safe editor session behavior)", () => {
  const started = createEditorBookSession({
    metadata: metadata("en", "Last Chapter Guard"),
    chapters: [{ id: "only", title: "Only" }],
    createId: sequentialIds(),
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const deleted = deleteChapter(started.session, "only");
  assert.equal(deleted.ok, false);
  if (deleted.ok) return;
  assert.equal(deleted.code, "last-chapter");
  assert.equal(listSessionChapters(deleted.session).length, 1);
});

test("English chapter content survives chapter switching", () => {
  const en = loadTipTapFixture("english-tiptap.json");
  const createId = sequentialIds();
  const started = createEditorBookSession({
    metadata: metadata("en", "Switch EN"),
    chapters: [
      { id: "ch-1", title: "One", tipTap: en },
      { id: "ch-2", title: "Two" },
    ],
    createId,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  let session = started.session;
  const before = selectedChapterToTipTap(session);
  assert.deepEqual(normalizeTipTapDoc(before.doc), normalizeTipTapDoc(en));

  // Switch away without mutating chapter 1, then back.
  const toTwo = selectChapter(session, "ch-2");
  assert.equal(toTwo.ok, true);
  if (!toTwo.ok) return;
  session = toTwo.session;

  const editedTwo: TipTapDocJSON = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Chapter two body" }],
      },
    ],
  };
  const applied = applyTipTapToSelectedChapter(session, editedTwo, createId);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  session = applied.session;

  const back = selectChapter(session, "ch-1");
  assert.equal(back.ok, true);
  if (!back.ok) return;
  session = back.session;

  const again = selectedChapterToTipTap(session);
  assert.deepEqual(normalizeTipTapDoc(again.doc), normalizeTipTapDoc(en));

  const two = selectChapter(session, "ch-2");
  assert.equal(two.ok, true);
  if (!two.ok) return;
  const twoDoc = selectedChapterToTipTap(two.session);
  assert.deepEqual(normalizeTipTapDoc(twoDoc.doc), normalizeTipTapDoc(editedTwo));
});

test("Kannada chapter content survives chapter switching and Unicode is intact", () => {
  const kn = loadTipTapFixture("kannada-tiptap.json");
  const createId = sequentialIds();
  const started = createEditorBookSession({
    metadata: metadata("kn", "ಕನ್ನಡ ಪುಸ್ತಕ"),
    chapters: [
      { id: "kn-1", title: "ಅಧ್ಯಾಯ ಒಂದು", tipTap: kn },
      { id: "kn-2", title: "ಅಧ್ಯಾಯ ಎರಡು" },
    ],
    createId,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  let session = started.session;
  const text = collectText(session.document.sections[0]!.blocks);
  assert.ok(text.includes("ಕನ್ನಡ"));
  assert.ok(text.includes("ಗುರುತು"));

  const toTwo = selectChapter(session, "kn-2");
  assert.equal(toTwo.ok, true);
  if (!toTwo.ok) return;
  session = toTwo.session;

  const knTwo: TipTapDocJSON = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "ಎರಡನೇ ಅಧ್ಯಾಯದ ಪಠ್ಯ" }],
      },
    ],
  };
  const applied = applyTipTapToSelectedChapter(session, knTwo, createId);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  session = applied.session;

  const back = selectChapter(session, "kn-1");
  assert.equal(back.ok, true);
  if (!back.ok) return;
  const restored = selectedChapterToTipTap(back.session);
  assert.deepEqual(normalizeTipTapDoc(restored.doc), normalizeTipTapDoc(kn));
  assert.ok(JSON.stringify(restored.doc).includes("ಉಲ್ಲೇಖ"));
});

test("session projects through desktop boundary into Book without EPUB leaks", () => {
  const en = loadTipTapFixture("english-tiptap.json");
  const kn = loadTipTapFixture("kannada-tiptap.json");
  const started = createEditorBookSession({
    metadata: metadata("en", "Projection Book"),
    chapters: [
      { id: "en-ch", title: "English", tipTap: en },
      { id: "kn-ch", title: "ಕನ್ನಡ", tipTap: kn },
    ],
    createId: sequentialIds(),
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const result = projectSessionToBook(started.session);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.book.chapters.length, 2);
  assert.equal(result.book.chapters[0]?.title, "English");
  assert.equal(result.book.chapters[1]?.title, "ಕನ್ನಡ");
  assert.equal(result.book.publishing.intendedOutputs.length, 0);
  assert.ok(!("manifest" in result.book));
  assert.ok(!("spine" in result.book));
  assert.ok(!("opf" in result.book));

  const serialized = JSON.stringify(started.session.document);
  for (const leak of ["opf", "manifest", "spine", "ncx", "navDoc", "container"]) {
    assert.equal(serialized.includes(`"${leak}"`), false);
  }

  const round = bookToSemanticDocument(result.book);
  assert.equal(round.sections.length, 2);
  const tipTapBack = semanticDocumentToTipTapJson({
    ...round,
    sections: [round.sections[0]!],
  });
  assert.deepEqual(normalizeTipTapDoc(tipTapBack.doc), normalizeTipTapDoc(en));
});

test("chapter create order is deterministic across repeated creates", () => {
  const createId = sequentialIds();
  let started = createEditorBookSession({
    metadata: metadata("en", "Order"),
    chapters: [{ id: "c0", title: "C0" }],
    createId,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  let session = started.session;
  for (const title of ["C1", "C2", "C3"]) {
    const next = createChapter(session, title, createId);
    assert.equal(next.ok, true);
    if (!next.ok) return;
    session = next.session;
  }

  assert.deepEqual(
    listSessionChapters(session).map((c) => c.title),
    ["C0", "C1", "C2", "C3"],
  );
  assert.deepEqual(
    listSessionChapters(session).map((c) => c.index),
    [0, 1, 2, 3],
  );
});
