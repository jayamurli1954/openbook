// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBook,
  serializeBook,
  validateBook,
  type ContentBlock,
} from "@openbook/book-model";
import {
  BookSession,
  DomainValidationError,
  InvalidStructureOperationError,
  SectionNotFoundError,
} from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function baseBook() {
  const book = createBook({
    title: "Authoring Fixture",
    language: "en",
    authors: ["OpenBook"],
  });
  book.metadata.publishedAt = "";
  // Stabilize createBook's random UUIDs for deterministic fixtures.
  book.chapters[0]!.id = "fixed-chapter-1";
  book.chapters[0]!.blocks[0]!.id = "fixed-block-1";
  return book;
}

test("INV-1: session methods expose a valid Book as sole content model", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "inv1" });
  const book = session.getBook();
  assert.equal(book.schemaVersion, 1);
  assert.equal(validateBook(book).filter((i) => i.severity === "error").length, 0);
  session.addSection({ matter: "main", title: "Chapter 2" });
  assert.equal(
    validateBook(session.getBook()).filter((i) => i.severity === "error").length,
    0,
  );
});

test("INV-2: mutating returned getBook() snapshot does not alter session", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "inv2" });
  const snap = session.getBook();
  snap.metadata.title = "HACKED";
  snap.chapters[0]!.title = "HACKED CHAPTER";
  assert.equal(session.getBook().metadata.title, "Authoring Fixture");
  assert.notEqual(session.getBook().chapters[0]?.title, "HACKED CHAPTER");
});

test("INV-3: cannot delete the last main chapter", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "inv3" });
  const onlyId = session.getBook().chapters[0]!.id;
  const before = serializeBook(session.getBook());
  assert.throws(
    () => session.removeSection(onlyId),
    (err: unknown) => err instanceof InvalidStructureOperationError,
  );
  assert.equal(serializeBook(session.getBook()), before);
  assert.equal(session.getState().revision, 0);
});

test("INV-4: caller-supplied IDs are replaced on addSection/insertBlock", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "inv4" });
  const callerBlock: ContentBlock = {
    type: "paragraph",
    id: "caller-block-id",
    inlines: [{ type: "text", text: "Hello" }],
  };
  const section = session.addSection({
    matter: "main",
    title: "New",
    initialBlocks: [callerBlock],
  });
  assert.notEqual(section.id, "caller-section");
  assert.notEqual(section.blocks[0]?.id, "caller-block-id");
  assert.match(section.id, /^auth-/);
  assert.match(section.blocks[0]!.id, /^auth-/);

  const inserted = session.insertBlock(section.id, 0, {
    type: "paragraph",
    id: "another-caller-id",
    inlines: [{ type: "text", text: "X" }],
  });
  assert.notEqual(inserted.id, "another-caller-id");
});

test("INV-5: identical seed + mutation sequence yields identical Book JSON", () => {
  const run = () => {
    const session = new BookSession({ book: baseBook(), idSeed: "inv5-seed" });
    session.updateMetadata({ title: "Deterministic" });
    session.addSection({ matter: "main", title: "Two" });
    session.updateSectionTitle(session.getBook().chapters[0]!.id, "One");
    const ch2 = session.getBook().chapters[1]!.id;
    session.insertBlock(ch2, 0, {
      type: "paragraph",
      id: "ignored",
      inlines: [{ type: "text", text: "ಕನ್ನಡ" }],
    });
    return serializeBook(session.getBook());
  };
  assert.equal(run(), run());
});

test("INV-6: every successful mutation keeps validateBook error-free", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "inv6" });
  const ops = [
    () => session.addSection({ matter: "front", title: "Preface", role: "preface" }),
    () => session.updateMetadata({ subtitle: "Sub" }),
    () => {
      const id = session.getBook().chapters[0]!.id;
      session.setSectionBlocks(id, [
        {
          type: "paragraph",
          id: "x",
          inlines: [{ type: "text", text: "Body" }],
        },
      ]);
    },
  ];
  for (const op of ops) {
    op();
    assert.equal(
      validateBook(session.getBook()).filter((i) => i.severity === "error").length,
      0,
    );
  }
});

test("INV-7: Kannada Unicode survives insert/update/reorder", () => {
  const kannada = "ಕ್ಷಮೆ ಜ್ಞಾನ ಸ್ತ್ರೀ ಶ್ರೀರಾಮ";
  const book = createBook({ title: "ಕನ್ನಡ ಪುಸ್ತಕ", language: "kn" });
  book.chapters[0]!.id = "kn-chapter-1";
  book.chapters[0]!.blocks[0]!.id = "kn-block-1";
  const session = new BookSession({
    book,
    idSeed: "inv7",
  });
  const chapterId = session.getBook().chapters[0]!.id;
  session.updateSectionTitle(chapterId, "ಅಧ್ಯಾಯ ೧");
  const block = session.insertBlock(chapterId, 0, {
    type: "paragraph",
    id: "x",
    inlines: [{ type: "text", text: kannada }],
  });
  session.updateBlock(chapterId, block.id, {
    type: "paragraph",
    id: "changed",
    inlines: [
      { type: "emphasis", children: [{ type: "text", text: kannada }] },
    ],
  });
  session.addSection({ matter: "main", title: "ಎರಡು" });
  session.reorderSection("main", 0, 1);

  const json = serializeBook(session.getBook());
  assert.match(json, new RegExp(kannada));
  assert.match(json, /ಕನ್ನಡ ಪುಸ್ತಕ/);
  assert.match(json, /ಅಧ್ಯಾಯ ೧/);
});

test("INV-8: failed validation does not mutate session (atomic rollback)", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "inv8" });
  const before = serializeBook(session.getBook());
  const rev = session.getState().revision;
  assert.throws(
    () => session.updateMetadata({ language: "" }),
    (err: unknown) => err instanceof DomainValidationError,
  );
  assert.equal(serializeBook(session.getBook()), before);
  assert.equal(session.getState().revision, rev);
});

test("INV-9: package has no workflow/importer/publishing/sqlite deps", () => {
  const pkg = JSON.parse(
    readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
  ) as { name: string; dependencies?: Record<string, string> };
  assert.equal(pkg.name, "@openbook/authoring");
  assert.equal(pkg.dependencies?.["@openbook/book-model"], "*");
  for (const banned of [
    "@openbook/workflow",
    "@openbook/importer",
    "@openbook/epub",
    "@openbook/pdf",
    "@openbook/html",
    "@openbook/validator",
    "better-sqlite3",
    "@tauri-apps/api",
    "react",
  ]) {
    assert.equal(pkg.dependencies?.[banned], undefined, banned);
  }
});

test("structure ops: reorder, move, role, removeBlock guardrail, undo/redo", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "ops" });
  const ch1 = session.getBook().chapters[0]!.id;
  session.addSection({ matter: "main", title: "Chapter 2" });
  session.reorderSection("main", 1, 0);
  assert.equal(session.getBook().chapters[0]?.title, "Chapter 2");

  const preface = session.addSection({
    matter: "front",
    title: "Preface",
    role: "preface",
  });
  session.updateSectionRole(preface.id, "custom");
  session.moveSection(preface.id, "back", 0);
  assert.equal(session.getBook().backMatter[0]?.id, preface.id);
  assert.equal(session.getBook().backMatter[0]?.kind, "back");

  session.updateSectionRole(ch1, "introduction");
  assert.equal(
    session.getBook().chapters.find((c) => c.id === ch1)?.role,
    "introduction",
  );

  const onlyBlock = session.getBook().chapters.find((c) => c.id === ch1)!.blocks[0]!.id;
  session.removeBlock(ch1, onlyBlock);
  assert.equal(session.getBook().chapters.find((c) => c.id === ch1)!.blocks.length, 1);
  assert.equal(
    session.getBook().chapters.find((c) => c.id === ch1)!.blocks[0]?.type,
    "paragraph",
  );

  assert.equal(session.canUndo(), true);
  const mid = serializeBook(session.getBook());
  session.undo();
  assert.notEqual(serializeBook(session.getBook()), mid);
  assert.equal(session.canRedo(), true);
  session.redo();
  assert.equal(serializeBook(session.getBook()), mid);

  session.markSaved();
  assert.equal(session.getState().isDirty, false);

  assert.throws(
    () => session.selectSection("missing"),
    (err: unknown) => err instanceof SectionNotFoundError,
  );
});

test("updateBlock preserves existing block id", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "preserve-id" });
  const ch = session.getBook().chapters[0]!.id;
  const blockId = session.getBook().chapters[0]!.blocks[0]!.id;
  session.updateBlock(ch, blockId, {
    type: "paragraph",
    id: "should-be-ignored",
    inlines: [{ type: "text", text: "Updated" }],
  });
  assert.equal(session.getBook().chapters[0]!.blocks[0]!.id, blockId);
  assert.equal(
    (session.getBook().chapters[0]!.blocks[0] as { inlines: Array<{ text: string }> })
      .inlines[0]?.text,
    "Updated",
  );
});

test("deterministic ID allocation skips collisions with existing canonical IDs", () => {
  const book = baseBook();
  // Pre-occupy the first section ID the factory would emit for this seed.
  const sessionProbe = new BookSession({ book: baseBook(), idSeed: "collide-seed" });
  const firstGenerated = sessionProbe.addSection({
    matter: "main",
    title: "Probe",
  }).id;
  book.chapters[0]!.id = firstGenerated;

  const session = new BookSession({ book, idSeed: "collide-seed" });
  const added = session.addSection({ matter: "main", title: "Safe" });
  assert.notEqual(added.id, firstGenerated);
  assert.match(added.id, /-s0002$/);

  const allIds = [
    ...session.getBook().chapters.map((c) => c.id),
    ...session.getBook().chapters.flatMap((c) => c.blocks.map((b) => b.id)),
  ];
  assert.equal(new Set(allIds).size, allIds.length);
});

test("moveSection rejects roles invalid for target matter and rolls back", () => {
  const session = new BookSession({ book: baseBook(), idSeed: "role-move" });
  session.addSection({ matter: "main", title: "Keep" });
  const chapterId = session.getBook().chapters[0]!.id;
  const before = serializeBook(session.getBook());
  const rev = session.getState().revision;

  assert.throws(
    () => session.moveSection(chapterId, "front"),
    (err: unknown) =>
      err instanceof InvalidStructureOperationError &&
      /not valid for target matter "front"/.test(err.message),
  );
  assert.equal(serializeBook(session.getBook()), before);
  assert.equal(session.getState().revision, rev);

  session.updateSectionRole(chapterId, "custom");
  session.moveSection(chapterId, "front");
  assert.equal(
    session.getBook().frontMatter.find((s) => s.id === chapterId)?.kind,
    "front",
  );
});
