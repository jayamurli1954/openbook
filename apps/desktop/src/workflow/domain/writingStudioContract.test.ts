// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import type { Book, ContentBlock } from "@openbook/book-model";
import {
  WRITING_STUDIO_CAPABILITIES,
  WRITING_STUDIO_TOOLBAR_COMMANDS,
  countWordsFromBook,
  countWordsFromContentBlock,
  countWordsFromInlineSpans,
  getWritingStudioCapability,
  isWritingStudioToolbarCommand,
  normalizeSearchQuery,
  searchBookText,
  wordCountSnapshotForBook,
  type WritingStudioSearchPort,
  type WritingStudioToolbarPort,
  type WritingStudioWordCountPort,
} from "./writingStudioContract.js";

function paragraph(id: string, text: string): ContentBlock {
  return { type: "paragraph", id, inlines: [{ type: "text", text }] };
}

function bookWithBlocks(blocks: ContentBlock[]): Book {
  const book = createBook({ title: "Demo", language: "en", authors: ["Ada"] });
  const chapter = book.chapters[0];
  assert.ok(chapter);
  return {
    ...book,
    chapters: [{ ...chapter, blocks: [...blocks] }],
  };
}

test("capability matrix covers ROADMAP §3.3 and defers tables", () => {
  const ids = WRITING_STUDIO_CAPABILITIES.map((c) => c.id);
  assert.ok(ids.includes("word-count"));
  assert.ok(ids.includes("document-search"));
  assert.ok(ids.includes("basic-tables"));
  assert.equal(getWritingStudioCapability("basic-tables")?.status, "deferred");
  assert.equal(getWritingStudioCapability("autosave")?.status, "reuse-existing");
  assert.equal(getWritingStudioCapability("emphasis")?.status, "in-scope");
  assert.equal(
    WRITING_STUDIO_CAPABILITIES.some(
      (c) => (c.id as string) === "ai-outline",
    ),
    false,
  );
});

test("toolbar commands exclude tables and TipTap-as-canonical ops", () => {
  assert.ok(isWritingStudioToolbarCommand("toggle-bold"));
  assert.ok(isWritingStudioToolbarCommand("set-link"));
  assert.equal(isWritingStudioToolbarCommand("insert-table"), false);
  assert.equal(isWritingStudioToolbarCommand("persist-tiptap"), false);
  assert.ok(WRITING_STUDIO_TOOLBAR_COMMANDS.includes("undo"));
  assert.ok(WRITING_STUDIO_TOOLBAR_COMMANDS.includes("toggle-heading-2"));
});

test("word count derives from Book Model inlines (EN + KN), not TipTap", () => {
  assert.equal(
    countWordsFromInlineSpans([{ type: "text", text: "  hello   world  " }]),
    2,
  );
  assert.equal(
    countWordsFromInlineSpans([
      {
        type: "strong",
        children: [
          { type: "text", text: "one" },
          {
            type: "emphasis",
            children: [{ type: "text", text: "two three" }],
          },
        ],
      },
    ]),
    3,
  );

  const list: ContentBlock = {
    type: "list",
    id: "l1",
    ordered: false,
    items: [
      [{ type: "text", text: "alpha beta" }],
      [{ type: "text", text: "gamma" }],
    ],
  };
  assert.equal(countWordsFromContentBlock(list), 3);

  const knBook = bookWithBlocks([
    paragraph("p1", "ನಮಸ್ಕಾರ ಇದು ಪರೀಕ್ಷೆ"),
    {
      type: "image",
      id: "img1",
      assetId: "a1",
      caption: [{ type: "text", text: "ಚಿತ್ರ caption" }],
    },
  ]);
  assert.equal(countWordsFromBook(knBook), 5);

  const snap = wordCountSnapshotForBook(knBook, knBook.chapters[0]!.id);
  assert.equal(snap.bookWordCount, 5);
  assert.equal(snap.sectionWordCount, 5);
  assert.equal(snap.sectionId, knBook.chapters[0]!.id);
});

test("normalizeSearchQuery fails closed on empty / whitespace", () => {
  assert.equal(normalizeSearchQuery("").ok, false);
  assert.equal(normalizeSearchQuery("   ").ok, false);
  assert.equal(
    (normalizeSearchQuery("") as { code: string }).code,
    "EMPTY_QUERY",
  );
  const ok = normalizeSearchQuery("  hello ");
  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.query, "hello");
});

test("searchBookText finds EN and KN matches in Book Model text only", () => {
  const book = bookWithBlocks([
    paragraph("p-en", "The quick brown fox"),
    paragraph("p-kn", "ಕನ್ನಡ ಪುಸ್ತಕ ಬರವಣಿಗೆ"),
  ]);

  const enQ = normalizeSearchQuery("QUICK");
  assert.equal(enQ.ok, true);
  if (!enQ.ok) return;
  const enHits = searchBookText(book, enQ);
  assert.equal(enHits.length, 1);
  assert.equal(enHits[0]?.blockId, "p-en");
  assert.equal(enHits[0]?.matter, "main");
  assert.ok(enHits[0]?.excerpt.toLowerCase().includes("quick"));

  const knQ = normalizeSearchQuery("ಪುಸ್ತಕ");
  assert.equal(knQ.ok, true);
  if (!knQ.ok) return;
  const knHits = searchBookText(book, knQ);
  assert.equal(knHits.length, 1);
  assert.equal(knHits[0]?.blockId, "p-kn");

  const miss = normalizeSearchQuery("missing-term");
  assert.equal(miss.ok, true);
  if (!miss.ok) return;
  assert.deepEqual(searchBookText(book, miss), []);
});

test("port shapes do not expose TipTap persistence or React operations", () => {
  const toolbar: WritingStudioToolbarPort = {
    executeCommand() {},
  };
  const wordCount: WritingStudioWordCountPort = {
    getWordCounts() {
      return { bookWordCount: 0, sectionWordCount: 0, sectionId: null };
    },
  };
  const search: WritingStudioSearchPort = {
    search(raw) {
      const q = normalizeSearchQuery(raw);
      if (!q.ok) return [];
      return [];
    },
  };

  assert.equal(typeof toolbar.executeCommand, "function");
  assert.equal(typeof wordCount.getWordCounts, "function");
  assert.equal(typeof search.search, "function");
  assert.equal(
    Object.prototype.hasOwnProperty.call(toolbar, "persistTipTap"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(wordCount, "countFromTipTap"),
    false,
  );
});
