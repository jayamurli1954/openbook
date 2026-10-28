// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0040 Slice 4 — Word import flow: pick, size check, import, summary.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { PICTURE_BOOK } from "../../domain/wordDocxTestFixture.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { findInternalTerms } from "./studioShellGuide.js";
import {
  WORD_IMPORT_MAX_FILE_BYTES,
  WORD_IMPORT_NEEDS_FRESH_BOOK,
  importWordFile,
  type WordFilePick,
  type WordFilePickPort,
} from "./wordImport.js";

function freshCoordinator(idSeed = "word-import") {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed,
  });
}

function picker(pick: WordFilePick): WordFilePickPort & { calls: number } {
  const port = {
    calls: 0,
    async pickWordFile() {
      port.calls += 1;
      return pick;
    },
  };
  return port;
}

const BOOK_FILE: WordFilePick = { kind: "bytes", content: PICTURE_BOOK, originalFilename: "Little Krishna.docx" };

test("imports a Word file as a new book and summarises it for the Guide", async () => {
  const coordinator = freshCoordinator();
  const outcome = await importWordFile(coordinator, picker(BOOK_FILE), "new-project");
  assert.equal(outcome.kind, "imported");
  if (outcome.kind !== "imported") return;
  const { summary } = outcome;
  assert.equal(summary.mode, "new-project");
  assert.equal(summary.chapters, 2);
  assert.equal(summary.pictures, 1);
  assert.equal(summary.headline, `Imported “Little Krishna”: 2 chapters, ${summary.words} words and 1 picture.`);
  assert.ok(summary.toCheck.some((message) => /could not be used/.test(message)), "the refused EMF is listed to check");
  assert.ok(summary.goodToKnow.some((message) => /fonts, sizes, colours/.test(message)));
  assert.ok(![...summary.toCheck, ...summary.goodToKnow].some((message) => /Applied default language/.test(message)));
  assert.equal(coordinator.getState().stage, "STRUCTURE");
});

test("adds a Word file's chapters to the open book from Write", async () => {
  const coordinator = freshCoordinator("word-append");
  await coordinator.importContent({ format: "markdown", content: "# Opening\n\nHello." });
  const outcome = await importWordFile(coordinator, picker(BOOK_FILE), "append-sections");
  assert.equal(outcome.kind, "imported");
  if (outcome.kind !== "imported") return;
  assert.equal(outcome.summary.chapters, 2, "counts only the new chapters");
  assert.equal(outcome.summary.pictures, 1);
  assert.match(outcome.summary.headline, /^Added 2 chapters, \d+ words and 1 picture to your book\.$/);
  assert.equal(coordinator.getBook().chapters.length, 3);
});

test("cancelling the file chooser changes nothing", async () => {
  const coordinator = freshCoordinator("word-cancel");
  const before = JSON.stringify(coordinator.getBook());
  assert.deepEqual(await importWordFile(coordinator, picker({ kind: "cancelled" }), "new-project"), { kind: "cancelled" });
  assert.equal(JSON.stringify(coordinator.getBook()), before);
});

test("refuses a file over the size limit before importing it", async () => {
  const coordinator = freshCoordinator("word-large");
  const before = JSON.stringify(coordinator.getBook());
  const tooBig = await importWordFile(coordinator, picker({ kind: "too-large", sizeBytes: 250 * 1024 * 1024 }), "new-project");
  assert.equal(tooBig.kind, "failed");
  if (tooBig.kind === "failed") {
    assert.match(tooBig.message, /250 MB, larger than OpenBook can import \(200 MB\)/);
    assert.match(tooBig.message, /Compress Pictures/);
  }
  // A host that could not check the size first is still refused.
  const oversized = new Uint8Array(WORD_IMPORT_MAX_FILE_BYTES + 1);
  const late = await importWordFile(
    coordinator,
    picker({ kind: "bytes", content: oversized, originalFilename: "huge.docx" }),
    "new-project",
  );
  assert.equal(late.kind, "failed");
  assert.equal(JSON.stringify(coordinator.getBook()), before);
});

test("shows the reader's plain message for a damaged file and keeps the details for Diagnostics", async () => {
  const coordinator = freshCoordinator("word-damaged");
  const outcome = await importWordFile(
    coordinator,
    picker({ kind: "bytes", content: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]), originalFilename: "broken.docx" }),
    "new-project",
  );
  assert.equal(outcome.kind, "failed");
  if (outcome.kind === "failed") {
    assert.equal(outcome.message, "This Word file is damaged and cannot be read.");
    assert.ok(outcome.detail.length > 0);
  }
  const legacy = await importWordFile(
    coordinator,
    picker({ kind: "bytes", content: new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0]), originalFilename: "old.doc" }),
    "new-project",
  );
  assert.ok(legacy.kind === "failed" && /older \.doc file or a password-protected document/.test(legacy.message));
});

test("a new book from Word needs a fresh book; it never replaces work in progress", async () => {
  const coordinator = freshCoordinator("word-stage");
  await coordinator.importContent({ format: "markdown", content: "# Started\n\nWork in progress." });
  const before = JSON.stringify(coordinator.getBook());
  const port = picker(BOOK_FILE);
  const outcome = await importWordFile(coordinator, port, "new-project");
  assert.deepEqual(outcome, { kind: "failed", message: WORD_IMPORT_NEEDS_FRESH_BOOK, detail: "IMPORT_NOT_PERMITTED" });
  assert.equal(port.calls, 0, "the file chooser is not even opened");
  assert.equal(JSON.stringify(coordinator.getBook()), before);
});

test("a picker failure becomes a plain message", async () => {
  const coordinator = freshCoordinator("word-picker");
  const outcome = await importWordFile(coordinator, picker({ kind: "failed", detail: "Cannot read document C:\\x.docx: denied" }), "new-project");
  assert.ok(outcome.kind === "failed" && /Couldn’t import that Word file/.test(outcome.message));
});

test("messages shown to authors use no internal terms", async () => {
  const coordinator = freshCoordinator("word-terms");
  const outcome = await importWordFile(coordinator, picker(BOOK_FILE), "new-project");
  assert.equal(outcome.kind, "imported");
  if (outcome.kind !== "imported") return;
  for (const text of [outcome.summary.headline, WORD_IMPORT_NEEDS_FRESH_BOOK]) {
    assert.deepEqual(findInternalTerms(text), [], text);
  }
});
