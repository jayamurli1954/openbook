// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 4 — navigation preview is a read-only Book projection.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import { projectBookNavigation } from "./structureStudioNavPreview.js";

function session(): BookSession {
  return new BookSession({
    book: createBook({
      title: "Nav",
      language: "en",
      authors: ["Ada"],
    }),
    idSeed: "nav-preview",
  });
}

test("navigation preview follows front, main, then back and keeps titles", () => {
  const studio = session();
  studio.addSection({ matter: "front", title: "ಮುನ್ನುಡಿ" });
  studio.addSection({ matter: "back", title: "Notes", role: "notes" });
  const before = JSON.stringify(studio.getBook());

  const entries = projectBookNavigation(studio.getBook());

  assert.deepEqual(
    entries.map((entry) => entry.matter),
    ["front", "main", "back"],
  );
  assert.deepEqual(
    entries.map((entry) => entry.order),
    [1, 2, 3],
  );
  assert.equal(entries[0]?.title, "ಮುನ್ನುಡಿ");
  assert.equal(entries[0]?.role, "custom");
  assert.equal(entries[1]?.title, "Chapter 1");
  assert.equal(entries[1]?.role, "chapter");
  assert.equal(entries[2]?.title, "Notes");
  assert.equal(entries[2]?.role, "notes");
  assert.equal(JSON.stringify(studio.getBook()), before);
});

test("navigation preview follows a later Book order and stores nothing", () => {
  const studio = session();
  studio.addSection({ matter: "main", title: "Second" });
  const first = studio.getBook().chapters[0]?.title;
  studio.reorderSection("main", 0, 1);

  const entries = projectBookNavigation(studio.getBook());
  assert.deepEqual(
    entries.map((entry) => entry.title),
    ["Second", first],
  );
  assert.equal("navigation" in studio.getBook(), false);
  assert.equal("toc" in studio.getBook(), false);
});
