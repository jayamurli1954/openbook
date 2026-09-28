// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 5 — empty-matter copy and stored-outline guard.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import {
  STRUCTURE_STUDIO_EMPTY_BACK,
  STRUCTURE_STUDIO_EMPTY_FRONT,
  STRUCTURE_STUDIO_EMPTY_MAIN,
  findStoredOutlineLeak,
  structureStudioEmptyMatterCopy,
} from "./structureStudioUx.js";

test("empty matter copy names the Book and stays plain", () => {
  assert.equal(structureStudioEmptyMatterCopy("front"), STRUCTURE_STUDIO_EMPTY_FRONT);
  assert.equal(structureStudioEmptyMatterCopy("main"), STRUCTURE_STUDIO_EMPTY_MAIN);
  assert.equal(structureStudioEmptyMatterCopy("back"), STRUCTURE_STUDIO_EMPTY_BACK);
  for (const copy of [
    STRUCTURE_STUDIO_EMPTY_FRONT,
    STRUCTURE_STUDIO_EMPTY_MAIN,
    STRUCTURE_STUDIO_EMPTY_BACK,
  ]) {
    assert.match(copy, /Book/);
    assert.doesNotMatch(copy, /outline|table of contents|TipTap|nav\.xhtml/i);
  }
});

test("a Book payload is not flagged as a stored outline", () => {
  const book = createBook({ title: "Plain", language: "en", authors: ["Ada"] });
  book.frontMatter.push({
    ...book.chapters[0]!,
    id: "front-1",
    kind: "front",
    role: "custom",
    title: "outline",
  });
  assert.equal(findStoredOutlineLeak(book), null);
});

test("outline and table-of-contents keys are stored-structure leaks", () => {
  assert.equal(findStoredOutlineLeak({ outline: [] }), "$.outline");
  assert.equal(findStoredOutlineLeak({ toc: ["Chapter 1"] }), "$.toc");
  assert.equal(
    findStoredOutlineLeak({ metadata: { tableOfContents: { items: [] } } }),
    "$.metadata.tableOfContents",
  );
  assert.equal(
    findStoredOutlineLeak([{ title: "Chapter 1" }, { outline: { title: "Hidden" } }]),
    "$[1].outline",
  );
});
