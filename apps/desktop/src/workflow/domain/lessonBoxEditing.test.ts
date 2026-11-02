// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 Slice 3 — lesson-box editing rules and the Write controls' shape.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createBook, type ContentBlock } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { DEFAULT_LESSON_BOX_TITLE, lastLessonBoxTitle, lessonBoxToParagraph } from "./lessonBoxEditing.js";
import { STUDIO_GUIDE, findInternalTerms } from "./studioShellGuide.js";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(src, ...parts), "utf8");

test("a new box starts with the last title used in the book, or the default", () => {
  const book = createBook({ title: "T", language: "en" });
  assert.equal(lastLessonBoxTitle(book), DEFAULT_LESSON_BOX_TITLE);
  assert.equal(DEFAULT_LESSON_BOX_TITLE, "What We Learned");
  book.chapters[0]!.blocks = [
    { type: "callout", id: "a", title: "Remember", inlines: [{ type: "text", text: "x" }] },
    { type: "callout", id: "b", title: "", inlines: [{ type: "text", text: "untitled" }] },
  ];
  book.backMatter = [
    {
      id: "back",
      kind: "back",
      role: "afterword",
      title: "After",
      blocks: [{ type: "callout", id: "c", title: "ನಾವು ಕಲಿತದ್ದು", inlines: [{ type: "text", text: "y" }] }],
    },
  ];
  assert.equal(lastLessonBoxTitle(book), "ನಾವು ಕಲಿತದ್ದು");
  book.backMatter = [];
  assert.equal(lastLessonBoxTitle(book), "Remember", "untitled boxes don't count");
});

test("turning a box back keeps the title as bold text and keeps the formatting", () => {
  const paragraph = lessonBoxToParagraph({
    type: "openbookCallout",
    attrs: { title: " What We Learned " },
    content: [
      { type: "text", text: "Be " },
      { type: "text", text: "honest", marks: [{ type: "italic" }] },
      { type: "text", text: "." },
    ],
  });
  assert.deepEqual(paragraph, {
    type: "paragraph",
    content: [
      { type: "text", text: "What We Learned: ", marks: [{ type: "bold" }] },
      { type: "text", text: "Be " },
      { type: "text", text: "honest", marks: [{ type: "italic" }] },
      { type: "text", text: "." },
    ],
  });
  assert.deepEqual(lessonBoxToParagraph({ type: "openbookCallout", attrs: { title: "" }, content: [{ type: "text", text: "Plain." }] }), {
    type: "paragraph",
    content: [{ type: "text", text: "Plain." }],
  });
});

test("make and unmake reach the Book through the editor path, with Kannada kept", () => {
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "lesson-box-editing",
  });
  const text = [{ type: "text", text: "ಸತ್ಯವೇ " }, { type: "text", text: "ಬೆಳಕು", marks: [{ type: "bold" }] }];
  // What the Lesson box button does to the editor content: paragraph → openbookCallout.
  coordinator.applyActiveSectionTipTap({
    type: "doc",
    content: [{ type: "openbookCallout", attrs: { title: "ನಾವು ಕಲಿತದ್ದು" }, content: text }],
  });
  const made = coordinator.getBook().chapters[0]!.blocks[0] as Extract<ContentBlock, { type: "callout" }>;
  assert.equal(made.type, "callout");
  assert.equal(made.title, "ನಾವು ಕಲಿತದ್ದು");
  assert.deepEqual(made.inlines, [{ type: "text", text: "ಸತ್ಯವೇ " }, { type: "strong", children: [{ type: "text", text: "ಬೆಳಕು" }] }]);

  // Pressing it again: openbookCallout → paragraph with the bold title in front.
  const box = coordinator.activeSectionToTipTap().doc.content![0]!;
  coordinator.applyActiveSectionTipTap({ type: "doc", content: [lessonBoxToParagraph(box)] });
  const back = coordinator.getBook().chapters[0]!.blocks[0]!;
  assert.equal(back.type, "paragraph");
  if (back.type === "paragraph") {
    assert.deepEqual(back.inlines[0], { type: "strong", children: [{ type: "text", text: "ನಾವು ಕಲಿತದ್ದು: " }] });
  }
  void coordinator.close();
});

test("the Write toolbar has a Lesson box button and a Box title field", () => {
  const toolbar = read("ui", "WritingStudioToolbar.tsx");
  assert.match(toolbar, /"toggle-lesson-box": "Lesson box"/);
  assert.match(toolbar, /data-testid="writing-studio-box-title-input"/);
  assert.match(toolbar, /executeCommand\("set-lesson-box-title", \{ title \}\)/);
  const node = read("ui", "openbookCalloutNode.ts");
  for (const command of ["setLessonBox", "unsetLessonBox", "setLessonBoxTitle", "Backspace"]) {
    assert.match(node, new RegExp(command), command);
  }
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /lastLessonBoxTitle\(coordinator\.getBook\(\)\)/);
  assert.match(editor, /editor\.isActive\("openbookCallout"\)/);
});

test("the Write guide explains lesson boxes in plain language", () => {
  const tip = STUDIO_GUIDE.write.tips.find((t) => /Lesson box/.test(t));
  assert.ok(tip);
  assert.deepEqual(findInternalTerms(tip!), []);
  for (const message of ["Put the cursor in a paragraph to make a lesson box.", "Put the cursor in a lesson box to change its title.", "Box title", "Lesson box"]) {
    assert.deepEqual(findInternalTerms(message), [], message);
  }
});
