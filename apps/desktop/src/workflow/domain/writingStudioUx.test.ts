// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 5 — empty-state / failure copy and TipTap persistence guard.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import {
  WRITING_STUDIO_EDITOR_UNAVAILABLE,
  WRITING_STUDIO_EMPTY_CHAPTERS,
  WRITING_STUDIO_NO_SECTION,
  WRITING_STUDIO_SEARCH_NO_MATCHES,
  findTipTapCanonicalLeak,
  formatWritingStudioImageFailure,
  formatWritingStudioImageInserted,
  formatWritingStudioSearchFailure,
  writingStudioStatusClass,
} from "./writingStudioUx.js";

test("search and image failure copy stays plain language", () => {
  assert.match(formatWritingStudioSearchFailure("EMPTY_QUERY"), /empty search/i);
  assert.doesNotMatch(formatWritingStudioSearchFailure("EMPTY_QUERY"), /TipTap|tiptap/i);
  assert.match(formatWritingStudioSearchFailure("OTHER"), /Could not search/);

  const cancelled = formatWritingStudioImageFailure("CANCELLED");
  assert.equal(cancelled.kind, "info");
  assert.match(cancelled.message, /not changed/);

  const missing = formatWritingStudioImageFailure("SECTION_REQUIRED");
  assert.equal(missing.message, WRITING_STUDIO_NO_SECTION);

  const failed = formatWritingStudioImageFailure("INSERT_FAILED", "bad bytes");
  assert.equal(failed.kind, "error");
  assert.match(failed.message, /bad bytes/);
  assert.match(failed.message, /not changed/);

  assert.match(formatWritingStudioImageInserted("  photo.png  "), /photo\.png/);
  assert.equal(writingStudioStatusClass("error"), "status status-error");
  assert.equal(writingStudioStatusClass("info"), "status status-idle");
});

test("empty-state copy does not invite saving editor JSON", () => {
  for (const line of [
    WRITING_STUDIO_EMPTY_CHAPTERS,
    WRITING_STUDIO_NO_SECTION,
    WRITING_STUDIO_EDITOR_UNAVAILABLE,
    WRITING_STUDIO_SEARCH_NO_MATCHES,
  ]) {
    assert.ok(line.length > 0);
    assert.doesNotMatch(line, /save TipTap|persist TipTap|editor JSON as/i);
  }
  assert.match(WRITING_STUDIO_NO_SECTION, /Book/);
});

test("Book Model payloads are not flagged as TipTap canonical storage", () => {
  const book = createBook({
    title: "ಕನ್ನಡ ಕಥೆ",
    language: "kn",
    authors: ["ಲೇಖಕ"],
  });
  assert.equal(findTipTapCanonicalLeak(book), null);
  assert.equal(
    findTipTapCanonicalLeak({
      bookModelVersion: 1,
      book,
    }),
    null,
  );
});

test("TipTap documents and editor-state keys are canonical leaks", () => {
  assert.match(
    findTipTapCanonicalLeak({
      type: "doc",
      content: [{ type: "paragraph", content: [] }],
    }) ?? "",
    /TipTap doc/,
  );
  assert.match(
    findTipTapCanonicalLeak({
      schemaVersion: 1,
      editorState: { type: "doc", content: [] },
    }) ?? "",
    /editorState/,
  );
  assert.match(
    findTipTapCanonicalLeak({ metadata: { tiptap: true } }) ?? "",
    /tiptap/,
  );
});
