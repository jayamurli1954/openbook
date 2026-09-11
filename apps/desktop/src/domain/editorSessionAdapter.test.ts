// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { bookToSemanticDocument } from "@openbook/semantic-document";
import type { ContentBlock } from "@openbook/book-model";
import {
  normalizeTipTapDoc,
  semanticDocumentToTipTapJson,
  type TipTapDocJSON,
} from "./editorAdapter.js";
import {
  bookMetadataToSemantic,
  createDesktopDraftBook,
  listMainChapters,
  sectionBlocksToTipTap,
  tipTapJsonToContentBlocks,
} from "./editorSessionAdapter.js";

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

function collectText(blocks: ContentBlock[]): string {
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

function sessionFromDraft(title: string, idSeed: string): BookSession {
  return new BookSession({
    book: createDesktopDraftBook({ title, language: "en" }),
    idSeed,
  });
}

test("create/rename/delete/select chapter operations work with unique ids and order", () => {
  const session = sessionFromDraft("Chapter Ops EN", "ops");
  const firstId = session.getState().selectedSectionId;
  session.updateSectionTitle(firstId, "Alpha");
  session.addSection({ matter: "main", title: "Beta" });

  assert.deepEqual(
    listMainChapters(session.getBook()).map((c) => c.title),
    ["Alpha", "Beta"],
  );

  const gamma = session.addSection({ matter: "main", title: "Gamma" });
  const chapters = listMainChapters(session.getBook());
  assert.equal(chapters.length, 3);
  assert.equal(chapters[2]?.title, "Gamma");
  assert.equal(chapters[2]?.index, 2);
  assert.equal(session.getState().selectedSectionId, gamma.id);
  assert.equal(new Set(chapters.map((c) => c.id)).size, 3);

  session.updateSectionTitle(gamma.id, "Gamma Renamed");
  assert.equal(listMainChapters(session.getBook())[2]?.title, "Gamma Renamed");

  session.selectSection(firstId);
  assert.equal(session.getState().selectedSectionId, firstId);

  const betaId = listMainChapters(session.getBook())[1]!.id;
  session.removeSection(betaId);
  assert.deepEqual(
    listMainChapters(session.getBook()).map((c) => c.title),
    ["Alpha", "Gamma Renamed"],
  );
});

test("deleting the last chapter is refused (BookSession guardrail)", () => {
  const session = sessionFromDraft("Last Chapter Guard", "last");
  const onlyId = session.getState().selectedSectionId;
  assert.throws(() => session.removeSection(onlyId));
  assert.equal(listMainChapters(session.getBook()).length, 1);
});

test("English chapter content survives chapter switching", () => {
  const en = loadTipTapFixture("english-tiptap.json");
  const createId = sequentialIds();
  const session = sessionFromDraft("Switch EN", "switch-en");
  const oneId = session.getState().selectedSectionId;
  session.updateSectionTitle(oneId, "One");
  const converted = tipTapJsonToContentBlocks(en, {
    metadata: bookMetadataToSemantic(session.getBook()),
    sectionId: oneId,
    sectionTitle: "One",
    matter: "main",
    role: "chapter",
    createId,
  });
  session.setSectionBlocks(oneId, converted.blocks);
  session.addSection({ matter: "main", title: "Two" });
  session.selectSection(oneId);

  const before = sectionBlocksToTipTap(session.getBook(), oneId);
  assert.deepEqual(normalizeTipTapDoc(before.doc), normalizeTipTapDoc(en));

  const twoId = listMainChapters(session.getBook())[1]!.id;
  session.selectSection(twoId);
  const editedTwo: TipTapDocJSON = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Chapter two body" }],
      },
    ],
  };
  const applied = tipTapJsonToContentBlocks(editedTwo, {
    metadata: bookMetadataToSemantic(session.getBook()),
    sectionId: twoId,
    sectionTitle: "Two",
    matter: "main",
    role: "chapter",
    createId,
  });
  session.setSectionBlocks(twoId, applied.blocks);

  session.selectSection(oneId);
  const again = sectionBlocksToTipTap(session.getBook(), oneId);
  assert.deepEqual(normalizeTipTapDoc(again.doc), normalizeTipTapDoc(en));

  session.selectSection(twoId);
  const twoDoc = sectionBlocksToTipTap(session.getBook(), twoId);
  assert.deepEqual(normalizeTipTapDoc(twoDoc.doc), normalizeTipTapDoc(editedTwo));
});

test("Kannada chapter content survives chapter switching and Unicode is intact", () => {
  const kn = loadTipTapFixture("kannada-tiptap.json");
  const createId = sequentialIds();
  const book = createDesktopDraftBook({
    title: "ಕನ್ನಡ ಪುಸ್ತಕ",
    language: "kn",
  });
  const session = new BookSession({ book, idSeed: "kn-switch" });
  const oneId = session.getState().selectedSectionId;
  session.updateSectionTitle(oneId, "ಅಧ್ಯಾಯ ಒಂದು");
  const converted = tipTapJsonToContentBlocks(kn, {
    metadata: bookMetadataToSemantic(session.getBook()),
    sectionId: oneId,
    sectionTitle: "ಅಧ್ಯಾಯ ಒಂದು",
    matter: "main",
    role: "chapter",
    createId,
  });
  session.setSectionBlocks(oneId, converted.blocks);
  session.addSection({ matter: "main", title: "ಅಧ್ಯಾಯ ಎರಡು" });

  const text = collectText(session.getBook().chapters[0]!.blocks);
  assert.ok(text.includes("ಕನ್ನಡ"));
  assert.ok(text.includes("ಗುರುತು"));

  const twoId = listMainChapters(session.getBook())[1]!.id;
  session.selectSection(twoId);
  const knTwo: TipTapDocJSON = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "ಎರಡನೇ ಅಧ್ಯಾಯದ ಪಠ್ಯ" }],
      },
    ],
  };
  const applied = tipTapJsonToContentBlocks(knTwo, {
    metadata: bookMetadataToSemantic(session.getBook()),
    sectionId: twoId,
    sectionTitle: "ಅಧ್ಯಾಯ ಎರಡು",
    matter: "main",
    role: "chapter",
    createId,
  });
  session.setSectionBlocks(twoId, applied.blocks);

  session.selectSection(oneId);
  const restored = sectionBlocksToTipTap(session.getBook(), oneId);
  assert.deepEqual(normalizeTipTapDoc(restored.doc), normalizeTipTapDoc(kn));
  assert.ok(JSON.stringify(restored.doc).includes("ಉಲ್ಲೇಖ"));
});

test("session Book has no EPUB leaks and round-trips through SDM", () => {
  const en = loadTipTapFixture("english-tiptap.json");
  const kn = loadTipTapFixture("kannada-tiptap.json");
  const createId = sequentialIds();
  const session = sessionFromDraft("Projection Book", "proj");
  const enId = session.getState().selectedSectionId;
  session.updateSectionTitle(enId, "English");
  session.setSectionBlocks(
    enId,
    tipTapJsonToContentBlocks(en, {
      metadata: bookMetadataToSemantic(session.getBook()),
      sectionId: enId,
      sectionTitle: "English",
      matter: "main",
      role: "chapter",
      createId,
    }).blocks,
  );
  const knSection = session.addSection({ matter: "main", title: "ಕನ್ನಡ" });
  session.setSectionBlocks(
    knSection.id,
    tipTapJsonToContentBlocks(kn, {
      metadata: bookMetadataToSemantic(session.getBook()),
      sectionId: knSection.id,
      sectionTitle: "ಕನ್ನಡ",
      matter: "main",
      role: "chapter",
      createId,
    }).blocks,
  );

  const book = session.getBook();
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0]?.title, "English");
  assert.equal(book.chapters[1]?.title, "ಕನ್ನಡ");
  assert.equal(book.publishing.intendedOutputs.length, 0);
  assert.ok(!("manifest" in book));
  assert.ok(!("spine" in book));
  assert.ok(!("opf" in book));

  const serialized = JSON.stringify(book);
  for (const leak of ["opf", "manifest", "spine", "ncx", "navDoc", "container"]) {
    assert.equal(serialized.includes(`"${leak}"`), false);
  }

  const round = bookToSemanticDocument(book);
  assert.equal(round.sections.length, 2);
  const tipTapBack = semanticDocumentToTipTapJson({
    ...round,
    sections: [round.sections[0]!],
  });
  assert.deepEqual(normalizeTipTapDoc(tipTapBack.doc), normalizeTipTapDoc(en));
});

test("chapter create order is deterministic across repeated creates", () => {
  const session = sessionFromDraft("Order", "order");
  session.updateSectionTitle(session.getState().selectedSectionId, "C0");
  for (const title of ["C1", "C2", "C3"]) {
    session.addSection({ matter: "main", title });
  }

  assert.deepEqual(
    listMainChapters(session.getBook()).map((c) => c.title),
    ["C0", "C1", "C2", "C3"],
  );
  assert.deepEqual(
    listMainChapters(session.getBook()).map((c) => c.index),
    [0, 1, 2, 3],
  );
});
