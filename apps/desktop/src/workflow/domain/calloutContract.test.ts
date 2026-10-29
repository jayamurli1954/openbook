// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 Slice 1 — the callout block across the Semantic Document, Writing Studio counts,
 * and the engines (which still refuse callouts until Slice 2).
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook, type Book, type ContentBlock } from "@openbook/book-model";
import { buildEpubPackage } from "@openbook/epub";
import { buildHtml } from "@openbook/html";
import { serializeBookToTypst } from "@openbook/pdf";
import { bookToSemanticDocument, semanticDocumentToBook } from "@openbook/semantic-document";
import { countWordsFromContentBlock, plainTextFromContentBlock } from "./writingStudioContract.js";

const LESSON: ContentBlock = {
  type: "callout",
  id: "lesson-1",
  title: "What We Learned",
  inlines: [
    { type: "text", text: "Honesty makes our " },
    { type: "emphasis", children: [{ type: "text", text: "heart" }] },
    { type: "text", text: " shine." },
  ],
};

function bookWith(blocks: ContentBlock[]): Book {
  const book = createBook({ title: "Lessons", language: "en" });
  book.chapters[0]!.blocks = blocks;
  return book;
}

test("callouts map one to one through the Semantic Document", () => {
  const kannada: ContentBlock = { type: "callout", id: "kn-1", title: "ನಾವು ಕಲಿತದ್ದು", inlines: [{ type: "text", text: "ಸತ್ಯವೇ ಬೆಳಕು." }] };
  const book = bookWith([LESSON, kannada]);
  const sdm = bookToSemanticDocument(book);
  assert.deepEqual(sdm.sections.find((s) => s.id === book.chapters[0]!.id)!.blocks, [LESSON, kannada]);
  const back = semanticDocumentToBook(sdm);
  assert.deepEqual(back.chapters[0]!.blocks, [LESSON, kannada]);
});

test("BookSession accepts callouts through the block operations", () => {
  const session = new BookSession({ book: createBook({ title: "S", language: "en" }), idSeed: "callout-session" });
  const chapterId = session.getBook().chapters[0]!.id;
  const inserted = session.insertBlock(chapterId, 0, { ...LESSON, id: "pending" });
  assert.equal(inserted.type, "callout");
  session.updateBlock(chapterId, inserted.id, { ...LESSON, id: inserted.id, title: "Remember" });
  assert.equal((session.getBook().chapters[0]!.blocks[0] as { title: string }).title, "Remember");
  assert.throws(() =>
    session.updateBlock(chapterId, inserted.id, { type: "callout", id: inserted.id, title: " ", inlines: [] }),
  );
  session.removeBlock(chapterId, inserted.id);
  assert.equal(session.getBook().chapters[0]!.blocks.some((b) => b.type === "callout"), false);
});

test("word counts and search text include the callout title and body", () => {
  assert.equal(countWordsFromContentBlock(LESSON), 8);
  assert.equal(plainTextFromContentBlock(LESSON), "What We Learned Honesty makes our heart shine.");
  assert.equal(plainTextFromContentBlock({ ...LESSON, title: "" }), "Honesty makes our heart shine.");
});

test("until Slice 2, every engine refuses a book with a callout", async () => {
  const book = bookWith([LESSON]);
  await assert.rejects(buildEpubPackage(book), (err: unknown) => err instanceof Error && err.name === "UnsupportedContentError");
  await assert.rejects(buildHtml(book), (err: unknown) => err instanceof Error && err.name === "UnsupportedContentError");
  assert.throws(() => serializeBookToTypst(book), (err: unknown) => err instanceof Error && err.name === "UnsupportedContentError");
});
