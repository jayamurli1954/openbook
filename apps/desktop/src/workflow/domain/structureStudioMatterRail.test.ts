// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 2 — matter rail over BookSession add/rename/reorder.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import { createStructureStudioMatterRail } from "./structureStudioMatterRail.js";

function rail() {
  const session = new BookSession({
    book: createBook({ title: "Rail", language: "en", authors: ["Ada"] }),
    idSeed: "matter-rail",
  });
  return {
    session,
    rail: createStructureStudioMatterRail(session),
  };
}

test("matter rail lists front, main, and back", () => {
  const { rail: studio } = rail();
  const groups = studio.list();
  assert.deepEqual(
    groups.map((group) => group.matter),
    ["front", "main", "back"],
  );
  assert.equal(groups[1]?.sections.length, 1);
});

test("add, rename, and reorder stay inside one matter and keep Kannada titles", () => {
  const { session, rail: studio } = rail();
  const added = studio.add("front", "  ಮುನ್ನುಡಿ  ");
  assert.equal(added.ok, true);
  const prefaceId = session.getBook().frontMatter[0]?.id;
  assert.ok(prefaceId);
  assert.equal(session.getBook().frontMatter[0]?.title, "ಮುನ್ನುಡಿ");

  const renamed = studio.rename(prefaceId, "ಕನ್ನಡ ಮುನ್ನುಡಿ");
  assert.equal(renamed.ok, true);
  assert.equal(session.getBook().frontMatter[0]?.title, "ಕನ್ನಡ ಮುನ್ನುಡಿ");

  assert.equal(studio.add("main", "Second").ok, true);
  const firstTitle = session.getBook().chapters[0]?.title;
  const reordered = studio.reorder("main", 0, 1);
  assert.equal(reordered.ok, true);
  assert.equal(session.getBook().chapters[1]?.title, firstTitle);
  assert.equal(session.getBook().frontMatter.length, 1);
  assert.equal(session.getBook().backMatter.length, 0);
});

test("empty title and reorder bounds fail closed", () => {
  const { session, rail: studio } = rail();
  const before = JSON.stringify(session.getBook());
  const empty = studio.add("back", "   ");
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.code, "EMPTY_TITLE");
  const bounds = studio.reorder("front", 0, 0);
  assert.equal(bounds.ok, false);
  if (!bounds.ok) assert.equal(bounds.code, "INDEX_OUT_OF_BOUNDS");
  assert.equal(JSON.stringify(session.getBook()), before);
});

test("matter rail surface does not expose move, remove, or role", () => {
  const { rail: studio } = rail();
  const keys = Object.keys(studio);
  assert.deepEqual(keys.sort(), ["add", "list", "rename", "reorder"]);
});
