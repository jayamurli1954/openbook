// SPDX-License-Identifier: Apache-2.0
/**
 * Save/Open workflow tests (PR #17).
 * Session → Book → ProjectPersistence → Book → Session; never Tiptap in SQLite.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyTipTapToSelectedChapter,
  createEditorBookSession,
  createEditorBookSessionFromBook,
  listSessionChapters,
  selectChapter,
  selectedChapterToTipTap,
  type EditorBookSession,
} from "../domain/editorBookSession.js";
import {
  normalizeTipTapDoc,
  type TipTapDocJSON,
} from "../domain/editorAdapter.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";
import {
  buildOpenBookProjectFromSession,
  openEditorProject,
  saveEditorSession,
} from "./projectWorkflow.js";

const here = dirname(fileURLToPath(import.meta.url));
// Compiled to dist-workflow/workflow/; four levels up reaches the repo root.
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

function metadata(language: string, title: string) {
  return {
    title,
    subtitle: "",
    authors: ["OpenBook"],
    contributors: [] as string[],
    language,
    identifier: `wf-${language}`,
    publisher: "",
    publishedAt: "",
    copyright: "",
    description: "",
    subjects: [] as string[],
    rights: "",
  };
}

function chapterText(session: EditorBookSession, chapterId: string): string {
  const section = session.document.sections.find((s) => s.id === chapterId);
  if (!section) return "";
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
  for (const block of section.blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") {
      walk(block.inlines);
    }
    if (block.type === "list") for (const item of block.items) walk(item);
  }
  return out;
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
  const createId = sequentialIds();

  const started = createEditorBookSession({
    metadata: metadata("en", "Bilingual Save Book"),
    chapters: [
      { id: "ch-en", title: "English", tipTap: en },
      { id: "ch-kn", title: "ಕನ್ನಡ", tipTap: kn },
    ],
    createId,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const saved = await saveEditorSession({
    persistence,
    session: started.session,
    binding: null,
    projectName: "Bilingual Project",
  });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  assert.equal(saved.message.code, "SAVE_OK");
  assert.match(saved.message.text, /Saved project/);

  const built = buildOpenBookProjectFromSession(
    started.session,
    saved.value.binding,
    "Bilingual Project",
  );
  assert.equal(built.ok, true);
  if (!built.ok) return;
  assert.notEqual((built.value.book as { type?: string }).type, "doc");
  assert.equal(built.value.book.schemaVersion, 1);
  assert.ok(!("manifest" in built.value.book));

  const opened = await openEditorProject({
    persistence,
    projectId: saved.value.binding.projectId,
    preferredChapterId: "ch-kn",
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  assert.equal(opened.message.code, "OPEN_OK");
  assert.equal(opened.value.session.selectedChapterId, "ch-kn");
  assert.ok(chapterText(opened.value.session, "ch-en").includes("strong"));
  assert.ok(chapterText(opened.value.session, "ch-kn").includes("ಕನ್ನಡ"));
  assert.ok(chapterText(opened.value.session, "ch-kn").includes("ಗುರುತು"));

  const tipKn = selectedChapterToTipTap(opened.value.session);
  assert.deepEqual(normalizeTipTapDoc(tipKn.doc), normalizeTipTapDoc(kn));
});

test("edits survive Save → Open", async () => {
  const persistence = await freshPersistence();
  const createId = sequentialIds();
  const started = createEditorBookSession({
    metadata: metadata("en", "Edit Survive"),
    chapters: [
      { id: "c1", title: "One" },
      { id: "c2", title: "Two" },
    ],
    createId,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  let session = started.session;
  const firstSave = await saveEditorSession({
    persistence,
    session,
    binding: null,
    projectName: "Edit Survive Project",
  });
  assert.equal(firstSave.ok, true);
  if (!firstSave.ok) return;

  const toTwo = selectChapter(session, "c2");
  assert.equal(toTwo.ok, true);
  if (!toTwo.ok) return;
  session = toTwo.session;

  const edited: TipTapDocJSON = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "Edited after first save" }],
      },
    ],
  };
  const applied = applyTipTapToSelectedChapter(session, edited, createId);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;
  session = applied.session;

  const secondSave = await saveEditorSession({
    persistence,
    session,
    binding: firstSave.value.binding,
  });
  assert.equal(secondSave.ok, true);
  if (!secondSave.ok) return;

  const opened = await openEditorProject({
    persistence,
    projectId: firstSave.value.binding.projectId,
    preferredChapterId: "c2",
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  assert.equal(chapterText(opened.value.session, "c2"), "Edited after first save");
  assert.deepEqual(
    normalizeTipTapDoc(selectedChapterToTipTap(opened.value.session).doc),
    normalizeTipTapDoc(edited),
  );
});

test("Kannada Unicode survives Save → edit → Save → Open", async () => {
  const persistence = await freshPersistence();
  const kn = loadTipTap("kannada-tiptap.json");
  const createId = sequentialIds();
  const started = createEditorBookSession({
    metadata: metadata("kn", "ಕನ್ನಡ ಉಳಿಕೆ"),
    chapters: [{ id: "kn-main", title: "ಮುಖ್ಯ", tipTap: kn }],
    createId,
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const saved = await saveEditorSession({
    persistence,
    session: started.session,
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
  const applied = applyTipTapToSelectedChapter(started.session, more, createId);
  assert.equal(applied.ok, true);
  if (!applied.ok) return;

  const saved2 = await saveEditorSession({
    persistence,
    session: applied.session,
    binding: saved.value.binding,
  });
  assert.equal(saved2.ok, true);
  if (!saved2.ok) return;

  const opened = await openEditorProject({
    persistence,
    projectId: saved.value.binding.projectId,
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  const text = chapterText(opened.value.session, "kn-main");
  assert.ok(text.includes("ಕನ್ನಡ"));
  assert.ok(text.includes("ಹೊಸ ವಾಕ್ಯ"));
});

test("missing project and empty selection produce deterministic errors", async () => {
  const persistence = await freshPersistence();

  const noId = await openEditorProject({ persistence, projectId: "   " });
  assert.equal(noId.ok, false);
  if (noId.ok) return;
  assert.equal(noId.message.code, "NO_PROJECT_SELECTED");

  const missing = await openEditorProject({
    persistence,
    projectId: "proj-does-not-exist-000",
  });
  assert.equal(missing.ok, false);
  if (missing.ok) return;
  assert.equal(missing.message.code, "NOT_FOUND");

  const started = createEditorBookSession({
    metadata: metadata("en", "Nameless"),
    chapters: [{ id: "only", title: "Only" }],
    createId: sequentialIds(),
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const noName = await saveEditorSession({
    persistence,
    session: started.session,
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

  const opened = await openEditorProject({
    persistence,
    projectId: "proj-corrupt-001",
  });
  assert.equal(opened.ok, false);
  if (opened.ok) return;
  assert.equal(opened.message.code, "CORRUPT_DATA");
});

test("createEditorBookSessionFromBook restores preferred chapter safely", () => {
  const en = loadTipTap("english-tiptap.json");
  const started = createEditorBookSession({
    metadata: metadata("en", "From Book"),
    chapters: [
      { id: "a", title: "A", tipTap: en },
      { id: "b", title: "B" },
    ],
    createId: sequentialIds(),
  });
  assert.equal(started.ok, true);
  if (!started.ok) return;

  const projected = buildOpenBookProjectFromSession(
    started.session,
    null,
    "From Book Project",
  );
  assert.equal(projected.ok, true);
  if (!projected.ok) return;

  const rebuilt = createEditorBookSessionFromBook(projected.value.book, "b");
  assert.equal(rebuilt.ok, true);
  if (!rebuilt.ok) return;
  assert.equal(rebuilt.session.selectedChapterId, "b");
  assert.equal(listSessionChapters(rebuilt.session).length, 2);

  const fallback = createEditorBookSessionFromBook(projected.value.book, "missing");
  assert.equal(fallback.ok, true);
  if (!fallback.ok) return;
  assert.equal(fallback.session.selectedChapterId, "a");
});
