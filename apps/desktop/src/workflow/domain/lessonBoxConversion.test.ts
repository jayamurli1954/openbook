// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 Slice 4 — turning labelled paragraphs into lesson boxes, and the Write panel's shape.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createBook, serializeBook, type Book, type ContentBlock, type InlineSpan } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import {
  convertLabelledParagraphs,
  findLabelledParagraphs,
  lessonBoxTitleFromLabel,
} from "./lessonBoxConversion.js";
import { findInternalTerms } from "./studioShellGuide.js";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(src, ...parts), "utf8");

const text = (t: string): InlineSpan => ({ type: "text", text: t });
const strong = (...children: InlineSpan[]): InlineSpan => ({ type: "strong", children });
const paragraph = (id: string, ...inlines: InlineSpan[]): ContentBlock => ({ type: "paragraph", id, inlines });

function bookWith(...chapters: ContentBlock[][]): Book {
  const book = createBook({ title: "T", language: "en" });
  const first = book.chapters[0]!;
  book.chapters = chapters.map((blocks, i) => ({ ...first, id: `ch${i + 1}`, title: `Story ${i + 1}`, blocks }));
  return book;
}

test("the box title is the label as typed, without its colon", () => {
  assert.equal(lessonBoxTitleFromLabel(" What We Learned: "), "What We Learned");
  assert.equal(lessonBoxTitleFromLabel("Remember"), "Remember");
  assert.equal(lessonBoxTitleFromLabel("ನಾವು ಕಲಿತದ್ದು："), "ನಾವು ಕಲಿತದ್ದು");
});

test("matching ignores case, quote style, the colon, and leading spaces; only paragraphs match", () => {
  const book = bookWith(
    [
      paragraph("a", strong(text("What We Learned:")), text(" Be honest.")),
      paragraph("b", text("  what we learned — kindness")),
      paragraph("c", text("WHAT WE LEARNED")),
      paragraph("d", text("What We Learnedness is not a match.")),
      paragraph("e", text("We learned nothing here.")),
      { type: "heading", id: "h", level: 2, inlines: [text("What We Learned: heading")] },
      { type: "quote", id: "q", inlines: [text("What We Learned: quote")] },
      { type: "callout", id: "box", title: "What We Learned", inlines: [text("Already boxed.")] },
    ],
    [paragraph("f", text("Krishna’s Lesson: share")), paragraph("g", text("ನಾವು ಕಲಿತದ್ದು: ಸತ್ಯ"))],
  );
  const found = findLabelledParagraphs(book, "What We Learned:");
  assert.deepEqual(
    found.map((m) => [m.blockId, m.sectionTitle, m.excerpt]),
    [
      ["a", "Story 1", "Be honest."],
      ["b", "Story 1", "— kindness"],
      ["c", "Story 1", ""],
    ],
  );
  assert.equal(findLabelledParagraphs(book, "What We Learned").length, 3, "the colon is optional");
  assert.deepEqual(findLabelledParagraphs(book, "krishna's lesson").map((m) => m.blockId), ["f"]);
  assert.deepEqual(findLabelledParagraphs(book, "ನಾವು ಕಲಿತದ್ದು".normalize("NFD")).map((m) => m.blockId), ["g"]);
  assert.deepEqual(findLabelledParagraphs(book, " : "), []);
});

test("conversion keeps the remaining text's formatting, even inside a shared run", () => {
  const book = bookWith([
    paragraph("a", strong(text("What We Learned:")), text(" Be "), { type: "emphasis", children: [text("honest")] }, text(".")),
    paragraph("b", strong(text("What We Learned: Share")), text(" always.")),
    paragraph("c", { type: "link", href: "https://example.org", children: [text("What we learned: read more")] }),
    paragraph("d", text("What We Learned:")),
    paragraph("keep", text("Untouched.")),
  ]);
  const before = serializeBook(book);
  const { count, changes } = convertLabelledParagraphs(book, "What We Learned:");
  assert.equal(serializeBook(book), before, "the book passed in is not changed");
  assert.equal(count, 4);
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0]!.blocks, [
    { type: "callout", id: "a", title: "What We Learned", inlines: [text("Be "), { type: "emphasis", children: [text("honest")] }, text(".")] },
    { type: "callout", id: "b", title: "What We Learned", inlines: [strong(text("Share")), text(" always.")] },
    { type: "callout", id: "c", title: "What We Learned", inlines: [{ type: "link", href: "https://example.org", children: [text("read more")] }] },
    { type: "callout", id: "d", title: "What We Learned", inlines: [] },
    paragraph("keep", text("Untouched.")),
  ]);
  assert.deepEqual(convertLabelledParagraphs(book, "Remember:"), { count: 0, changes: [] });
});

test("the whole conversion is one Book change that one undo restores", () => {
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "lesson-box-conversion",
  });
  const session = coordinator.getSession();
  session.setSectionBlocks(coordinator.getBook().chapters[0]!.id, [paragraph("p1", text("What We Learned: One."))]);
  const second = session.addSection({ matter: "main", title: "Two" });
  session.setSectionBlocks(second.id, [paragraph("p2", text("Intro.")), paragraph("p3", text("What We Learned: Two."))]);
  const before = serializeBook(coordinator.getBook());

  const { count, changes } = convertLabelledParagraphs(coordinator.getBook(), "What We Learned:");
  assert.equal(count, 2);
  session.replaceSectionsBlocks(changes);
  const boxes = coordinator.getBook().chapters.flatMap((c) => c.blocks).filter((b) => b.type === "callout");
  assert.equal(boxes.length, 2);
  assert.equal(session.undo(), true);
  assert.equal(serializeBook(coordinator.getBook()), before);
  void coordinator.close();
});

test("the Write step has a panel to find labelled paragraphs and box them, with Undo", () => {
  const panel = read("ui", "LessonBoxConversionPanel.tsx");
  assert.match(panel, /findLabelledParagraphs/);
  assert.match(panel, /convertLabelledParagraphs/);
  assert.match(panel, /replaceSectionsBlocks/);
  assert.match(panel, /data-testid="lesson-box-conversion-label"/);
  assert.match(panel, /Turn into lesson boxes/);
  assert.match(panel, /className="studio-btn lesson-box-conversion-convert"/);
  assert.match(read("App.css"), /\.lesson-box-conversion-row input\[type="text"\] \{/);
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /<LessonBoxConversionPanel/);
  for (const message of [
    "Lesson boxes from labelled paragraphs",
    "Label",
    "Find",
    "Turn into lesson boxes",
    "25 paragraphs start with “What We Learned:”",
    "Turned 25 paragraphs into lesson boxes.",
    "No paragraphs start with “Remember:”.",
    "Undo",
  ]) {
    assert.deepEqual(findInternalTerms(message), [], message);
  }
});
