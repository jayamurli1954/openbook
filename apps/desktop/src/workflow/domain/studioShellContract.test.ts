// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 1 — step model and guide content tests. No React chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createBook, type Book } from "@openbook/book-model";
import {
  STUDIO_STEPS,
  deriveStudioProgress,
  deriveStudioStepStatuses,
  isStudioStepId,
  nextStudioStep,
  type StudioShellSnapshot,
} from "./studioShellContract.js";
import {
  STUDIO_GUIDE,
  allStudioGuideCopy,
  evaluateStudioGuideChecklist,
  findInternalTerms,
} from "./studioShellGuide.js";

function snapshot(overrides: Partial<StudioShellSnapshot> = {}): StudioShellSnapshot {
  return {
    book: createBook({ title: "The River Book", language: "en", authors: [] }),
    bookWordCount: 0,
    validation: null,
    cover: "unavailable",
    ...overrides,
  };
}

function finishedBook(): Book {
  const book = createBook({ title: "ನದಿಯ ಪುಸ್ತಕ", language: "kn", authors: ["ಲೇಖಕ"] });
  return {
    ...book,
    metadata: { ...book.metadata, description: "ಒಂದು ವಿವರಣೆ", subjects: ["ಕಥೆ"] },
    theme: { id: "kannada", name: "ಕನ್ನಡ" },
  };
}

test("six steps in the agreed order, each reachable by id", () => {
  assert.deepEqual(
    STUDIO_STEPS.map((step) => step.id),
    ["write", "structure", "design", "details", "cover", "publish"],
  );
  assert.equal(isStudioStepId("cover"), true);
  assert.equal(isStudioStepId("import"), false);
  assert.equal(nextStudioStep("write")?.id, "structure");
  assert.equal(nextStudioStep("cover")?.id, "publish");
  assert.equal(nextStudioStep("publish"), null);
});

test("a new book reads as just started", () => {
  const statuses = deriveStudioStepStatuses(snapshot());
  const byId = Object.fromEntries(statuses.map((status) => [status.id, status]));
  assert.deepEqual(byId.write, { id: "write", label: "Write", state: "not-started", text: "Not started" });
  assert.equal(byId.design!.text, "Default look");
  assert.equal(byId.details!.state, "in-progress");
  assert.equal(byId.details!.text, "2 to fill");
  assert.equal(byId.cover!.state, "coming-soon");
  assert.equal(byId.publish!.text, "Not checked");
  assert.deepEqual(deriveStudioProgress(statuses), { done: 1, total: 5 });
});

test("a finished Kannada book reads as ready", () => {
  const statuses = deriveStudioStepStatuses(
    snapshot({
      book: finishedBook(),
      bookWordCount: 8930,
      validation: { errors: 0, warnings: 0 },
      cover: "set",
    }),
  );
  const byId = Object.fromEntries(statuses.map((status) => [status.id, status]));
  assert.equal(byId.write!.text, "8,930 words");
  assert.equal(byId.design!.text, "ಕನ್ನಡ");
  assert.equal(byId.details!.text, "Complete");
  assert.equal(byId.cover!.text, "Added");
  assert.equal(byId.publish!.text, "Ready");
  assert.deepEqual(deriveStudioProgress(statuses), { done: 5, total: 6 });
});

test("problems surface as attention with a plain count", () => {
  const book = createBook({ title: "", language: "en", authors: ["Ada"] });
  const untitled: Book = {
    ...book,
    chapters: book.chapters.map((chapter) => ({ ...chapter, title: "  " })),
  };
  const statuses = deriveStudioStepStatuses(
    snapshot({ book: untitled, bookWordCount: 1, validation: { errors: 1, warnings: 3 } }),
  );
  const byId = Object.fromEntries(statuses.map((status) => [status.id, status]));
  assert.equal(byId.write!.text, "1 word");
  assert.equal(byId.structure!.state, "attention");
  assert.match(byId.structure!.text, /^\d+ untitled$/);
  assert.equal(byId.details!.text, "Title or language missing");
  assert.equal(byId.publish!.text, "1 thing to fix");

  const warningsOnly = deriveStudioStepStatuses(
    snapshot({ validation: { errors: 0, warnings: 2 } }),
  ).find((status) => status.id === "publish");
  assert.deepEqual(
    { state: warningsOnly!.state, text: warningsOnly!.text },
    { state: "in-progress", text: "2 warnings" },
  );
});

test("every step has a guide with a checklist, tips, and questions", () => {
  for (const step of STUDIO_STEPS) {
    const guide = STUDIO_GUIDE[step.id];
    assert.ok(guide.intro.trim().length > 0, step.id);
    assert.ok(guide.checklist.length >= 1, step.id);
    assert.ok(guide.tips.length >= 1, step.id);
    assert.ok(guide.questions.length >= 1, step.id);
    const ids = guide.checklist.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length, `${step.id} checklist ids are unique`);
  }
});

test("checklists tick themselves off from the Book", () => {
  const fresh = evaluateStudioGuideChecklist("details", snapshot());
  assert.deepEqual(
    fresh.map((item) => [item.id, item.done, item.optional]),
    [
      ["title-language", true, false],
      ["author", false, false],
      ["description", false, false],
      ["subjects", false, true],
    ],
  );
  const done = evaluateStudioGuideChecklist(
    "details",
    snapshot({ book: finishedBook() }),
  );
  assert.equal(done.every((item) => item.done), true);

  const publish = evaluateStudioGuideChecklist(
    "publish",
    snapshot({ validation: { errors: 2, warnings: 0 } }),
  );
  assert.deepEqual(
    publish.map((item) => item.done),
    [true, false, false],
  );
  const write = evaluateStudioGuideChecklist("write", snapshot({ bookWordCount: 12 }));
  assert.equal(write[0]!.done, true);
});

test("guide copy is plain language with no internal terms", () => {
  for (const text of allStudioGuideCopy()) {
    assert.deepEqual(findInternalTerms(text), [], text);
    assert.doesNotMatch(text, /\b(invalid|illegal|fatal|failed)\b/i, text);
  }
  for (const step of deriveStudioStepStatuses(snapshot())) {
    assert.deepEqual(findInternalTerms(`${step.label} ${step.text}`), []);
  }
});

test("the internal-term check catches leaks and ignores ordinary words", () => {
  assert.deepEqual(findInternalTerms("Saved through SQLite"), ["sqlite"]);
  assert.deepEqual(findInternalTerms("Tiptap JSON is never saved"), ["tiptap", "json"]);
  assert.deepEqual(findInternalTerms("Gate 8 Slice 2"), ["slice", "gate"]);
  assert.deepEqual(findInternalTerms("Cannot read properties of undefined"), ["undefined"]);
  assert.deepEqual(findInternalTerms("Navigate to the gateway; slices of bread"), []);
});

test("shell domain modules stay free of React, Tauri, and editor internals", () => {
  const here = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src", "workflow", "domain");
  for (const file of ["studioShellContract.ts", "studioShellGuide.ts"]) {
    const source = readFileSync(join(here, file), "utf8");
    assert.doesNotMatch(
      source,
      /from ["']react["']|from ["']@tauri-apps|from ["']@tiptap|from ["']node:fs|localStorage|DesktopStudioCoordinator/,
      file,
    );
  }
});
