// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import type { Book, ContentBlock } from "@openbook/book-model";
import { createWritingStudioQueryAdapter } from "./writingStudioQueryAdapter.js";

function paragraph(id: string, text: string): ContentBlock {
  return { type: "paragraph", id, inlines: [{ type: "text", text }] };
}

function bookWithBlocks(blocks: ContentBlock[]): Book {
  const book = createBook({ title: "Demo", language: "en", authors: ["Ada"] });
  const chapter = book.chapters[0];
  assert.ok(chapter);
  return {
    ...book,
    chapters: [{ ...chapter, title: "Chapter One", blocks: [...blocks] }],
  };
}

test("query adapter word counts come from Book Model, not TipTap", () => {
  let book = bookWithBlocks([
    paragraph("p1", "one two three"),
    paragraph("p2", "four five"),
  ]);
  const adapter = createWritingStudioQueryAdapter({
    bookSource: { getBook: () => book },
  });

  const snap = adapter.getWordCounts(book.chapters[0]!.id);
  assert.equal(snap.bookWordCount, 5);
  assert.equal(snap.sectionWordCount, 5);
  assert.equal(snap.sectionId, book.chapters[0]!.id);

  book = bookWithBlocks([paragraph("p1", "ನಮಸ್ಕಾರ ಪರೀಕ್ಷೆ")]);
  const kn = adapter.getWordCounts(book.chapters[0]!.id);
  assert.equal(kn.bookWordCount, 2);
  assert.equal(kn.sectionWordCount, 2);
});

test("searchDocument fails closed on empty query without scanning the book", () => {
  let reads = 0;
  const book = bookWithBlocks([paragraph("p1", "hello world")]);
  const adapter = createWritingStudioQueryAdapter({
    bookSource: {
      getBook: () => {
        reads += 1;
        return book;
      },
    },
  });

  const empty = adapter.searchDocument("   ");
  assert.equal(empty.ok, false);
  if (empty.ok) return;
  assert.equal(empty.code, "EMPTY_QUERY");
  assert.deepEqual(empty.hits, []);
  assert.equal(reads, 0);

  assert.deepEqual(adapter.search(""), []);
  assert.equal(reads, 0);
});

test("searchDocument finds EN and KN hits from Book text", () => {
  const book = bookWithBlocks([
    paragraph("p-en", "The quick brown fox"),
    paragraph("p-kn", "ಕನ್ನಡ ಪುಸ್ತಕ ಬರವಣಿಗೆ"),
  ]);
  const adapter = createWritingStudioQueryAdapter({
    bookSource: { getBook: () => book },
  });

  const en = adapter.searchDocument("QUICK");
  assert.equal(en.ok, true);
  if (!en.ok) return;
  assert.equal(en.hits.length, 1);
  assert.equal(en.hits[0]?.blockId, "p-en");
  assert.equal(en.hits[0]?.sectionTitle, "Chapter One");

  const kn = adapter.searchDocument("ಪುಸ್ತಕ");
  assert.equal(kn.ok, true);
  if (!kn.ok) return;
  assert.equal(kn.hits.length, 1);
  assert.equal(kn.hits[0]?.blockId, "p-kn");
});

test("adapter surface stays free of TipTap persistence APIs", () => {
  const adapter = createWritingStudioQueryAdapter({
    bookSource: {
      getBook: () => createBook({ title: "X", language: "en" }),
    },
  });
  assert.equal(typeof adapter.getWordCounts, "function");
  assert.equal(typeof adapter.searchDocument, "function");
  assert.equal(
    Object.prototype.hasOwnProperty.call(adapter, "countFromTipTap"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(adapter, "searchTipTap"),
    false,
  );
});
