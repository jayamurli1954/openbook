// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 2 — top-bar save status and step snapshot.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import type { BookValidationReport } from "@openbook/book-doctor";
import type { AutosaveStatus } from "../../persistence/autosaveController.js";
import { deriveStudioStepStatuses } from "./studioShellContract.js";
import { findInternalTerms } from "./studioShellGuide.js";
import {
  buildStudioShellSnapshot,
  describeSaveStatus,
  shellBookTitle,
} from "./studioShellStatus.js";

const idle: AutosaveStatus = { state: "idle", dirty: false };

test("save status reads plainly in every state", () => {
  assert.deepEqual(describeSaveStatus({ hasSaveLocation: false, isDirty: false, autosave: idle }), {
    tone: "new",
    text: "New book",
  });
  assert.deepEqual(describeSaveStatus({ hasSaveLocation: false, isDirty: true, autosave: idle }), {
    tone: "new",
    text: "Not saved yet",
  });
  assert.deepEqual(describeSaveStatus({ hasSaveLocation: true, isDirty: false, autosave: idle }), {
    tone: "saved",
    text: "Saved",
  });
  assert.deepEqual(describeSaveStatus({ hasSaveLocation: true, isDirty: true, autosave: idle }), {
    tone: "unsaved",
    text: "Unsaved changes",
  });
  assert.deepEqual(
    describeSaveStatus({
      hasSaveLocation: true,
      isDirty: true,
      autosave: { state: "scheduled", dirty: true },
    }),
    { tone: "saving", text: "Saving soon" },
  );
  assert.deepEqual(
    describeSaveStatus({
      hasSaveLocation: true,
      isDirty: true,
      autosave: { state: "saving", dirty: true },
    }),
    { tone: "saving", text: "Saving…" },
  );
  const failed = describeSaveStatus({
    hasSaveLocation: true,
    isDirty: true,
    autosave: {
      state: "error",
      dirty: true,
      error: { code: "AUTOSAVE_THROWN", message: "EPERM: operation not permitted" },
    },
  });
  assert.deepEqual(failed, { tone: "error", text: "Couldn’t save" });
  assert.doesNotMatch(failed.text, /EPERM|AUTOSAVE/);
});

test("snapshot counts fatal and error findings as things to fix", () => {
  const book = createBook({ title: "The River Book", language: "en", authors: ["Ada"] });
  const report: BookValidationReport = {
    diagnostics: [],
    summary: { totalFatal: 1, totalErrors: 2, totalWarnings: 4, totalInfos: 0, isClean: false },
  };
  const snapshot = buildStudioShellSnapshot({
    book,
    bookWordCount: 42,
    validationReport: report,
    cover: "unavailable",
  });
  assert.deepEqual(snapshot.validation, { errors: 3, warnings: 4 });
  const publish = deriveStudioStepStatuses(snapshot).find((step) => step.id === "publish");
  assert.equal(publish!.text, "3 things to fix");

  const unchecked = buildStudioShellSnapshot({
    book,
    bookWordCount: 0,
    validationReport: null,
    cover: "unavailable",
  });
  assert.equal(unchecked.validation, null);
});

test("top-bar title is never blank and keeps Kannada", () => {
  assert.equal(shellBookTitle(createBook({ title: "  ", language: "en" })), "Untitled book");
  assert.equal(shellBookTitle(createBook({ title: "ನದಿಯ ಪುಸ್ತಕ", language: "kn" })), "ನದಿಯ ಪುಸ್ತಕ");
});

test("save messages contain no internal terms", () => {
  const states: AutosaveStatus[] = [
    idle,
    { state: "dirty", dirty: true },
    { state: "scheduled", dirty: true },
    { state: "saving", dirty: true },
    { state: "error", dirty: true, error: { code: "X", message: "sqlite json undefined" } },
  ];
  for (const autosave of states) {
    for (const hasSaveLocation of [true, false]) {
      for (const isDirty of [true, false]) {
        const { text } = describeSaveStatus({ hasSaveLocation, isDirty, autosave });
        assert.deepEqual(findInternalTerms(text), [], text);
      }
    }
  }
});
