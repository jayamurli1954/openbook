// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 1 — structure contract tests. No React chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import { BookSession } from "@openbook/authoring";
import {
  STRUCTURE_STUDIO_CAPABILITIES,
  executeStructureCommand,
  getStructureStudioCapability,
  isStructureStudioCommandType,
  listBookStructure,
} from "./structureStudioContract.js";

function session(): BookSession {
  return new BookSession({
    book: createBook({
      title: "Structure",
      language: "en",
      authors: ["Ada"],
    }),
    idSeed: "structure-slice-1",
  });
}

test("capability matrix covers ROADMAP §3.4 and defers nested hierarchy", () => {
  const ids = STRUCTURE_STUDIO_CAPABILITIES.map((capability) => capability.id);
  assert.deepEqual(ids, [
    "front-matter",
    "main-matter",
    "back-matter",
    "chapter-ordering",
    "section-hierarchy",
    "navigation-preview",
    "autosave",
  ]);
  assert.equal(getStructureStudioCapability("section-hierarchy")?.status, "deferred");
  assert.equal(getStructureStudioCapability("autosave")?.status, "reuse-existing");
  assert.equal(getStructureStudioCapability("front-matter")?.status, "in-scope");
  assert.equal(
    STRUCTURE_STUDIO_CAPABILITIES.some(
      (capability) => (capability.id as string) === "ai-outline",
    ),
    false,
  );
  assert.equal(isStructureStudioCommandType("add"), true);
  assert.equal(isStructureStudioCommandType("persist-outline"), false);
});

test("listBookStructure groups front, main, and back from the Book", () => {
  const book = session().getBook();
  const groups = listBookStructure(book);
  assert.deepEqual(
    groups.map((group) => group.matter),
    ["front", "main", "back"],
  );
  assert.equal(groups[0]?.sections.length, 0);
  assert.equal(groups[1]?.sections.length, 1);
  assert.equal(groups[1]?.sections[0]?.role, "chapter");
  assert.equal(groups[2]?.sections.length, 0);
});

test("add, rename, and reorder mutate Book sections and preserve Kannada titles", () => {
  const studio = session();
  const added = executeStructureCommand(studio, {
    type: "add",
    matter: "front",
    title: "  ಮುನ್ನುಡಿ  ",
    role: "preface",
  });
  assert.equal(added.ok, true);
  const preface = studio.getBook().frontMatter[0];
  assert.ok(preface);
  assert.equal(preface.title, "ಮುನ್ನುಡಿ");
  assert.equal(preface.role, "preface");

  const renamed = executeStructureCommand(studio, {
    type: "rename",
    sectionId: preface.id,
    title: "ಕನ್ನಡ ಮುನ್ನುಡಿ",
  });
  assert.equal(renamed.ok, true);
  assert.equal(studio.getBook().frontMatter[0]?.title, "ಕನ್ನಡ ಮುನ್ನುಡಿ");

  const second = executeStructureCommand(studio, {
    type: "add",
    matter: "main",
    title: "Second",
  });
  assert.equal(second.ok, true);
  const before = studio.getBook().chapters.map((chapter) => chapter.title);
  const reordered = executeStructureCommand(studio, {
    type: "reorder",
    matter: "main",
    fromIndex: 0,
    toIndex: 1,
  });
  assert.equal(reordered.ok, true);
  assert.deepEqual(
    studio.getBook().chapters.map((chapter) => chapter.title),
    [before[1], before[0]],
  );
});

test("empty title, invalid role, and missing section fail closed", () => {
  const studio = session();
  const before = JSON.stringify(studio.getBook());

  const empty = executeStructureCommand(studio, {
    type: "add",
    matter: "back",
    title: "   ",
    role: "appendix",
  });
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.equal(empty.code, "EMPTY_TITLE");

  const role = executeStructureCommand(studio, {
    type: "add",
    matter: "front",
    title: "Not a chapter role",
    role: "chapter",
  });
  assert.equal(role.ok, false);
  if (!role.ok) assert.equal(role.code, "INVALID_ROLE");

  const chapterId = studio.getBook().chapters[0]?.id;
  assert.ok(chapterId);
  const badRole = executeStructureCommand(studio, {
    type: "set-role",
    sectionId: chapterId,
    role: "appendix",
  });
  assert.equal(badRole.ok, false);
  if (!badRole.ok) assert.equal(badRole.code, "INVALID_ROLE");
  assert.equal(studio.getBook().chapters[0]?.role, "chapter");

  const missing = executeStructureCommand(studio, {
    type: "rename",
    sectionId: "missing",
    title: "Nope",
  });
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.code, "SECTION_NOT_FOUND");

  assert.equal(JSON.stringify(studio.getBook()), before);
});

test("last main chapter cannot be removed or moved out", () => {
  const studio = session();
  const chapterId = studio.getBook().chapters[0]?.id;
  assert.ok(chapterId);
  const before = JSON.stringify(studio.getBook());

  const removed = executeStructureCommand(studio, {
    type: "remove",
    sectionId: chapterId,
  });
  assert.equal(removed.ok, false);
  if (!removed.ok) assert.equal(removed.code, "LAST_MAIN_CHAPTER");

  const moved = executeStructureCommand(studio, {
    type: "move",
    sectionId: chapterId,
    targetMatter: "back",
  });
  assert.equal(moved.ok, false);
  if (!moved.ok) assert.equal(moved.code, "LAST_MAIN_CHAPTER");
  assert.equal(JSON.stringify(studio.getBook()), before);
});

test("a chapter role cannot move into back matter when another chapter remains", () => {
  const studio = session();
  const added = executeStructureCommand(studio, {
    type: "add",
    matter: "main",
    title: "Keep",
  });
  assert.equal(added.ok, true);
  const firstId = studio.getBook().chapters[0]?.id;
  assert.ok(firstId);
  const before = studio.getBook().chapters.length;

  const moved = executeStructureCommand(studio, {
    type: "move",
    sectionId: firstId,
    targetMatter: "back",
  });
  assert.equal(moved.ok, false);
  if (!moved.ok) assert.equal(moved.code, "INVALID_ROLE");
  assert.equal(studio.getBook().chapters.length, before);
  assert.equal(studio.getBook().backMatter.length, 0);
});

test("reorder fails closed on an empty matter list", () => {
  const studio = session();
  const result = executeStructureCommand(studio, {
    type: "reorder",
    matter: "front",
    fromIndex: 0,
    toIndex: 0,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INDEX_OUT_OF_BOUNDS");
});

test("contract surface stays free of TipTap persistence and React", () => {
  const source = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "src",
      "workflow",
      "domain",
      "structureStudioContract.ts",
    ),
    "utf8",
  );
  assert.match(source, /executeStructureCommand/);
  assert.match(source, /isRoleValidForMatter/);
  assert.doesNotMatch(
    source,
    /from ["']@tiptap|from ["']react["']|persistTipTap|persistOutline|localStorage|plugin-fs/,
  );
});
