// SPDX-License-Identifier: Apache-2.0
/**
 * Save/Open workflow tests: canonical Book → ProjectPersistence → Book.
 * Tiptap JSON is never written to SQLite.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import type { Book, ContentBlock } from "@openbook/book-model";
import {
  bookMetadataToSemantic,
  createDesktopDraftBook,
  sectionBlocksToTipTap,
  tipTapJsonToContentBlocks,
} from "../domain/editorSessionAdapter.js";
import {
  normalizeTipTapDoc,
  type TipTapDocJSON,
} from "../domain/editorAdapter.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";
import {
  buildOpenBookProjectFromBook,
  openBookProject,
  saveBookProject,
} from "./projectWorkflow.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "..", "..", "..", "..", "tests", "fixtures", "editor");

function loadTipTap(name: string): TipTapDocJSON {
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
    if (block.type === "list") for (const item of block.items) walk(item);
  }
  return out;
}

function chapterText(book: Book, chapterId: string): string {
  const section = book.chapters.find((c) => c.id === chapterId);
  if (!section) return "";
  return collectText(section.blocks);
}

function applyTipTap(session: BookSession, tipTap: TipTapDocJSON, title: string): void {
  const sectionId = session.getState().selectedSectionId;
  session.updateSectionTitle(sectionId, title);
  const blocks = tipTapJsonToContentBlocks(tipTap, {
    metadata: bookMetadataToSemantic(session.getBook()),
    sectionId,
    sectionTitle: title,
    matter: "main",
    role: "chapter",
    createId: sequentialIds(),
  }).blocks;
  session.setSectionBlocks(sectionId, blocks);
}

async function freshPersistence() {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const init = await persistence.initialize();
  assert.equal(init.ok, true);
  return persistence;
}

test("save/open round-trip preserves English and Kannada chapter content", async () => {
  const persistence = await freshPersistence();
  const en = loadTipTap("english-tiptap.json");
  const kn = loadTipTap("kannada-tiptap.json");

  const session = new BookSession({
    book: createDesktopDraftBook({ title: "Bilingual Save Book", language: "en" }),
    idSeed: "bilingual",
  });
  const enId = session.getState().selectedSectionId;
  applyTipTap(session, en, "English");
  const knSection = session.addSection({ matter: "main", title: "ಕನ್ನಡ" });
  const knBlocks = tipTapJsonToContentBlocks(kn, {
    metadata: bookMetadataToSemantic(session.getBook()),
    sectionId: knSection.id,
    sectionTitle: "ಕನ್ನಡ",
    matter: "main",
    role: "chapter",
    createId: sequentialIds(),
  }).blocks;
  session.setSectionBlocks(knSection.id, knBlocks);

  const saved = await saveBookProject({
    persistence,
    book: session.getBook(),
    binding: null,
    projectName: "Bilingual Project",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.message.code, "SAVE_OK");
  assert.match(saved.message.text, /Saved project/);

  const built = buildOpenBookProjectFromBook(
    session.getBook(),
    saved.value.binding,
    "Bilingual Project",
  );
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.notEqual((built.value.book as { type?: string }).type, "doc");
  assert.equal(built.value.book.schemaVersion, 1);
  assert.ok(!("manifest" in built.value.book));

  const opened = await openBookProject({
    persistence,
    projectId: saved.value.binding.projectId,
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  assert.equal(opened.message.code, "OPEN_OK");
  assert.ok(chapterText(opened.value.book, enId).includes("strong"));
  assert.ok(chapterText(opened.value.book, knSection.id).includes("ಕನ್ನಡ"));
  assert.ok(chapterText(opened.value.book, knSection.id).includes("ಗುರುತು"));

  const rebuilt = new BookSession({
    book: opened.value.book,
    idSeed: "rebuilt",
    initialSelectedSectionId: knSection.id,
  });
  assert.equal(rebuilt.getState().selectedSectionId, knSection.id);
  const tipKn = sectionBlocksToTipTap(rebuilt.getBook(), knSection.id);
  assert.deepEqual(normalizeTipTapDoc(tipKn.doc), normalizeTipTapDoc(kn));
});

test("edits survive Save → Open", async () => {
  const persistence = await freshPersistence();
  const session = new BookSession({
    book: createDesktopDraftBook({ title: "Edit Survive", language: "en" }),
    idSeed: "edit-survive",
  });
  session.updateSectionTitle(session.getState().selectedSectionId, "One");
  session.addSection({ matter: "main", title: "Two" });

  const firstSave = await saveBookProject({
    persistence,
    book: session.getBook(),
    binding: null,
    projectName: "Edit Survive Project",
  });
  assert.equal(firstSave.ok, true);
  if (!firstSave.ok) return;

  const twoId = session.getBook().chapters[1]!.id;
  session.selectSection(twoId);
  const edited: TipTapDocJSON = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Edited after first save" }],
      },
    ],
  };
  session.setSectionBlocks(
    twoId,
    tipTapJsonToContentBlocks(edited, {
      metadata: bookMetadataToSemantic(session.getBook()),
      sectionId: twoId,
      sectionTitle: "Two",
      matter: "main",
      role: "chapter",
    }).blocks,
  );

  const secondSave = await saveBookProject({
    persistence,
    book: session.getBook(),
    binding: firstSave.value.binding,
  });
  assert.equal(secondSave.ok, true);
  if (!secondSave.ok) return;

  const opened = await openBookProject({
    persistence,
    projectId: firstSave.value.binding.projectId,
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  assert.equal(chapterText(opened.value.book, twoId), "Edited after first save");
  const rebuilt = new BookSession({
    book: opened.value.book,
    initialSelectedSectionId: twoId,
  });
  assert.deepEqual(
    normalizeTipTapDoc(sectionBlocksToTipTap(rebuilt.getBook(), twoId).doc),
    normalizeTipTapDoc(edited),
  );
});

test("Kannada Unicode survives Save → edit → Save → Open", async () => {
  const persistence = await freshPersistence();
  const kn = loadTipTap("kannada-tiptap.json");
  const session = new BookSession({
    book: createDesktopDraftBook({ title: "ಕನ್ನಡ ಉಳಿಕೆ", language: "kn" }),
    idSeed: "kn-persist",
  });
  const mainId = session.getState().selectedSectionId;
  applyTipTap(session, kn, "ಮುಖ್ಯ");

  const saved = await saveBookProject({
    persistence,
    book: session.getBook(),
    binding: null,
    projectName: "Kannada Project",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;

  const more: TipTapDocJSON = {
    type: "doc",
    content: [
      ...(kn.content ?? []),
      {
        type: "paragraph",
        content: [{ type: "text", text: "ಹೊಸ ವಾಕ್ಯ" }],
      },
    ],
  };
  session.setSectionBlocks(
    mainId,
    tipTapJsonToContentBlocks(more, {
      metadata: bookMetadataToSemantic(session.getBook()),
      sectionId: mainId,
      sectionTitle: "ಮುಖ್ಯ",
      matter: "main",
      role: "chapter",
    }).blocks,
  );

  const saved2 = await saveBookProject({
    persistence,
    book: session.getBook(),
    binding: saved.value.binding,
  });
  assert.equal(saved2.ok, true);
  if (!saved2.ok) return;

  const opened = await openBookProject({
    persistence,
    projectId: saved.value.binding.projectId,
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  const text = chapterText(opened.value.book, mainId);
  assert.ok(text.includes("ಕನ್ನಡ"));
  assert.ok(text.includes("ಹೊಸ ವಾಕ್ಯ"));
});

test("missing project and empty selection produce deterministic errors", async () => {
  const persistence = await freshPersistence();

  const noId = await openBookProject({ persistence, projectId: "   " });
  assert.equal(noId.ok, false);
  if (noId.ok) return;
  assert.equal(noId.message.code, "NO_PROJECT_SELECTED");

  const missing = await openBookProject({
    persistence,
    projectId: "proj-does-not-exist-000",
  });
  assert.equal(missing.ok, false);
  if (missing.ok) return;
  assert.equal(missing.message.code, "NOT_FOUND");

  const session = new BookSession({
    book: createDesktopDraftBook({ title: "Nameless", language: "en" }),
    idSeed: "nameless",
  });

  const noName = await saveBookProject({
    persistence,
    book: session.getBook(),
    binding: null,
    projectName: "  ",
  });
  assert.equal(noName.ok, false);
  if (noName.ok) return;
  assert.ok(
    noName.message.code === "NO_PROJECT_SELECTED" ||
      noName.message.code === "NO_PROJECT_NAME",
  );
});

test("corrupt persistence payload is rejected on open path via loadProject", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  await persistence.initialize();

  const now = new Date().toISOString();
  await driver.execute(
    "INSERT INTO projects (id, name, created_at, updated_at, schema_version) VALUES (?, ?, ?, ?, ?)",
    ["proj-corrupt-001", "Corrupt", now, now, 1],
  );
  await driver.execute(
    "INSERT INTO project_documents (project_id, book_payload, book_schema_version, updated_at) VALUES (?, ?, ?, ?)",
    ["proj-corrupt-001", "{not-json", 1, now],
  );

  const opened = await openBookProject({
    persistence,
    projectId: "proj-corrupt-001",
  });
  assert.equal(opened.ok, false);
  if (opened.ok) return;
  assert.equal(opened.message.code, "CORRUPT_DATA");
});

test("opened Book restores preferred chapter when BookSession is reconstructed", () => {
  const en = loadTipTap("english-tiptap.json");
  const session = new BookSession({
    book: createDesktopDraftBook({ title: "From Book", language: "en" }),
    idSeed: "from-book",
  });
  applyTipTap(session, en, "A");
  const b = session.addSection({ matter: "main", title: "B" });

  const projected = buildOpenBookProjectFromBook(
    session.getBook(),
    null,
    "From Book Project",
  );
  assert.equal(projected.ok, true);
  if (!projected.ok) return;

  const rebuilt = new BookSession({
    book: projected.value.book,
    initialSelectedSectionId: b.id,
  });
  assert.equal(rebuilt.getState().selectedSectionId, b.id);
  assert.equal(rebuilt.getBook().chapters.length, 2);

  const fallback = new BookSession({ book: projected.value.book });
  assert.equal(fallback.getState().selectedSectionId, session.getBook().chapters[0]!.id);
});
