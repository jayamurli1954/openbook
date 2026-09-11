// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 8 Slice 2: DesktopStudioCoordinator import/ingestion tests (ADR-0020).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { InvalidStructureOperationError } from "@openbook/authoring";
import type { ImportSource } from "@openbook/importer";
import type { ContentBlock, StructuralSection } from "@openbook/book-model";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
} from "./desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

const KANNADA_MARKDOWN = `---
title: ನದಿಯ ಬೆಳಗು
authors: [ಮಾಧವಿ ರಾವ್]
language: kn
---

# ಮುನ್ನುಡಿ

ಪರಿಚಯದ ಪ್ಯಾರಾ.

# ಅಧ್ಯಾಯ ೧

ದೇಹದ ಪ್ಯಾರಾ with *emphasis* and **strong**.
`;

function freshCoordinator(idSeed = "import-studio") {
  const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
  return new DesktopStudioCoordinator({ persistence, idSeed });
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

test("markdown import with frontmatter and headings produces a BookSession", async () => {
  const coordinator = freshCoordinator("md");
  const result = await coordinator.importContent(
    { format: "markdown", content: KANNADA_MARKDOWN, filename: "book.md" },
    { idSeed: "md-slice-2" },
  );
  assert.equal(result.success, true);
  assert.equal(result.mode, "new-project");
  assert.equal(result.sectionCount, 2);
  const book = coordinator.getBook();
  assert.equal(book.metadata.title, "ನದಿಯ ಬೆಳಗು");
  assert.equal(book.metadata.language, "kn");
  assert.equal(book.metadata.publishedAt, "");
  assert.deepEqual(book.metadata.authors, ["ಮಾಧವಿ ರಾವ್"]);
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0]?.title, "ಮುನ್ನುಡಿ");
  assert.equal(book.chapters[1]?.title, "ಅಧ್ಯಾಯ ೧");
  assert.equal(coordinator.getState().selectedSectionId, book.chapters[0]?.id);
  assert.equal(coordinator.getState().binding, null);
  assert.equal(coordinator.getState().isDirty, true);
  assert.ok(coordinator.getState().revision >= 1);
});

test("plain text import produces a single-chapter BookSession with paragraphs", async () => {
  const coordinator = freshCoordinator("txt");
  const result = await coordinator.importContent(
    {
      format: "text",
      content: "First paragraph.\n\nSecond paragraph.",
      filename: "notes.txt",
    },
    { idSeed: "text-slice-2" },
  );
  assert.equal(result.success, true);
  assert.equal(coordinator.getBook().chapters.length, 1);
  assert.equal(coordinator.getBook().chapters[0]?.blocks.length, 2);
  assert.equal(coordinator.getBook().metadata.title, "notes");
  assert.equal(coordinator.getBook().metadata.publishedAt, "");
});

test("unsupported format rejects with UNSUPPORTED_FORMAT and leaves IMPORT/failed", async () => {
  const coordinator = freshCoordinator("html");
  const before = JSON.stringify(coordinator.getBook());
  await assert.rejects(
    () =>
      coordinator.importContent({
        format: "html" as ImportSource["format"],
        content: "<p>nope</p>",
      }),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "UNSUPPORTED_FORMAT",
  );
  assert.equal(coordinator.getState().stage, "IMPORT");
  assert.equal(coordinator.getState().jobStatus, "failed");
  assert.equal(JSON.stringify(coordinator.getBook()), before);
});

test("empty markdown fails the job and stays on IMPORT", async () => {
  const coordinator = freshCoordinator("empty");
  await assert.rejects(
    () => coordinator.importContent({ format: "markdown", content: "   \n" }),
    (err: unknown) => err instanceof DesktopStudioError && err.code === "IMPORT_FAILED",
  );
  assert.equal(coordinator.getState().stage, "IMPORT");
  assert.equal(coordinator.getState().jobStatus, "failed");
});

test("successful new-project import runs idle→running→succeeded→idle and advances to STRUCTURE", async () => {
  const coordinator = freshCoordinator("wf");
  assert.equal(coordinator.getState().jobStatus, "idle");
  const result = await coordinator.importContent(
    { format: "markdown", content: "# One\n\nBody.\n\n# Two\n\nMore." },
    { idSeed: "wf-slice-2" },
  );
  assert.equal(result.success, true);
  const state = coordinator.getState();
  assert.equal(state.jobStatus, "idle");
  assert.equal(state.stage, "STRUCTURE");
  assert.equal(state.activeJobId, undefined);
});

test("new-project import is refused after leaving IMPORT", async () => {
  const coordinator = freshCoordinator("stage");
  coordinator.transitionStage("STRUCTURE");
  await assert.rejects(
    () =>
      coordinator.importContent({
        format: "text",
        content: "Later.",
      }),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "IMPORT_NOT_PERMITTED",
  );
  assert.equal(coordinator.getState().stage, "STRUCTURE");
  assert.equal(coordinator.getState().jobStatus, "idle");
});

test("Kannada Unicode survives import through BookSession and EditorAdapter", async () => {
  const coordinator = freshCoordinator("kn");
  await coordinator.importContent(
    { format: "markdown", content: KANNADA_MARKDOWN, filename: "kn.md" },
    { idSeed: "kn-slice-2" },
  );
  const bookText = coordinator.getBook().chapters.map((c) => collectText(c.blocks)).join("\n");
  assert.ok(bookText.includes("ಪರಿಚಯದ ಪ್ಯಾರಾ"));
  assert.ok(bookText.includes("ದೇಹದ ಪ್ಯಾರಾ"));
  const tipTap = coordinator.activeSectionToTipTap();
  const json = JSON.stringify(tipTap.doc);
  assert.ok(json.includes("ಪರಿಚಯದ ಪ್ಯಾರಾ"));
});

test("importContent does not write SQLite; saveProject persists the imported Book", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "persist-import",
  });
  await coordinator.saveProject("Original Draft");
  const listedBefore = await coordinator.listProjects();
  assert.equal(listedBefore.length, 1);
  const originalId = coordinator.getState().binding!.projectId;
  const originalPayload = (
    await driver.select<{ book_payload: string }>(
      "SELECT book_payload FROM project_documents WHERE project_id = ?",
      [originalId],
    )
  )[0]!.book_payload;

  await coordinator.newProject("Reset Import", "en");
  await coordinator.importContent(
    {
      format: "markdown",
      content: "# Imported Chapter\n\nImported body.",
      filename: "import.md",
    },
    { projectName: "Imported Book", idSeed: "persist-imported" },
  );
  assert.equal(coordinator.getState().binding, null);
  const listedMid = await coordinator.listProjects();
  assert.equal(listedMid.length, 1);
  const stillOriginal = (
    await driver.select<{ book_payload: string }>(
      "SELECT book_payload FROM project_documents WHERE project_id = ?",
      [originalId],
    )
  )[0]!.book_payload;
  assert.equal(stillOriginal, originalPayload);
  assert.ok(!stillOriginal.includes("Imported body"));

  const saved = await coordinator.saveProject();
  assert.notEqual(saved.projectId, originalId);
  const importedRow = await driver.select<{ book_payload: string }>(
    "SELECT book_payload FROM project_documents WHERE project_id = ?",
    [saved.projectId],
  );
  const payload = JSON.parse(importedRow[0]!.book_payload) as {
    chapters: Array<{ title: string; blocks: unknown[] }>;
    type?: string;
  };
  assert.equal(payload.chapters[0]?.title, "Imported Chapter");
  assert.notEqual(payload.type, "doc");
});

test("append-sections adds chapters without advancing stage and reallocates IDs", async () => {
  const coordinator = freshCoordinator("append");
  await coordinator.importContent(
    { format: "markdown", content: "# Original\n\nKeep me." },
    { idSeed: "append-base" },
  );
  const originalIds = coordinator.getBook().chapters.map((c) => c.id);
  assert.equal(coordinator.getState().stage, "STRUCTURE");

  const result = await coordinator.importContent(
    { format: "markdown", content: "# Extra One\n\nA.\n\n# Extra Two\n\nB." },
    { mode: "append-sections", idSeed: "append-extra" },
  );
  assert.equal(result.success, true);
  assert.equal(result.mode, "append-sections");
  assert.equal(coordinator.getState().stage, "STRUCTURE");
  assert.equal(coordinator.getState().jobStatus, "idle");
  const book = coordinator.getBook();
  assert.equal(book.chapters.length, 3);
  assert.equal(book.chapters[0]?.title, "Original");
  assert.equal(book.chapters[1]?.title, "Extra One");
  assert.equal(book.chapters[2]?.title, "Extra Two");
  const newIds = book.chapters.slice(1).map((c) => c.id);
  for (const id of newIds) {
    assert.equal(originalIds.includes(id), false);
  }
  assert.equal(coordinator.getState().selectedSectionId, book.chapters[1]?.id);
});

test("append-sections rolls back the whole batch when a later section fails", async () => {
  const coordinator = freshCoordinator("rollback");
  await coordinator.importContent(
    { format: "markdown", content: "# Stay\n\nOriginal." },
    { idSeed: "rollback-base" },
  );
  const before = JSON.stringify(coordinator.getBook());
  const beforeSelected = coordinator.getState().selectedSectionId;
  const session = coordinator.getSession();
  const originalAdd = session.addSection.bind(session);
  let calls = 0;
  session.addSection = ((params: {
    matter: StructuralSection["kind"];
    title: string;
    role?: string;
    initialBlocks?: readonly ContentBlock[];
  }) => {
    calls += 1;
    if (calls === 2) {
      throw new InvalidStructureOperationError("simulated append failure");
    }
    return originalAdd(params);
  }) as typeof session.addSection;

  await assert.rejects(
    () =>
      coordinator.importContent(
        { format: "markdown", content: "# First Extra\n\nA.\n\n# Second Extra\n\nB." },
        { mode: "append-sections", idSeed: "rollback-extra" },
      ),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "IMPORT_FAILED" &&
      /Second Extra/.test(err.message) &&
      /rolled back/.test(err.message),
  );

  assert.equal(JSON.stringify(coordinator.getBook()), before);
  assert.equal(coordinator.getState().selectedSectionId, beforeSelected);
  assert.equal(coordinator.getState().jobStatus, "failed");
  assert.equal(coordinator.getState().stage, "STRUCTURE");
  assert.equal(coordinator.getBook().chapters.length, 1);
  assert.equal(coordinator.getBook().chapters[0]?.title, "Stay");
});

test("same idSeed yields deterministic imported section IDs in new-project mode", async () => {
  const a = freshCoordinator("det-a");
  const b = freshCoordinator("det-b");
  await a.importContent(
    { format: "markdown", content: "# Alpha\n\nOne." },
    { idSeed: "same-seed" },
  );
  await b.importContent(
    { format: "markdown", content: "# Alpha\n\nOne." },
    { idSeed: "same-seed" },
  );
  assert.deepEqual(
    a.getBook().chapters.map((c) => c.id),
    b.getBook().chapters.map((c) => c.id),
  );
});
