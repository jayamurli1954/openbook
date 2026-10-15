// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 5 — Guide panel guards and live checklist behaviour.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import { STUDIO_STEPS, nextStudioStep } from "./studioShellContract.js";
import {
  STUDIO_GUIDE,
  allStudioGuideCopy,
  evaluateStudioGuideChecklist,
  findInternalTerms,
} from "./studioShellGuide.js";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

test("guide panel renders the checklist, tips, questions, and next step only", () => {
  const panel = read("ui", "StudioGuidePanel.tsx");
  assert.match(panel, /What to do here/);
  assert.match(panel, /Tips/);
  assert.match(panel, /Stuck\?/);
  assert.match(panel, /<details/);
  assert.match(panel, /<summary>\{entry\.question\}<\/summary>/);
  assert.match(panel, /Next: \{nextLabel\} →/);
  assert.match(panel, /\{requiredDone\} of \{required\.length\} done/);
  assert.doesNotMatch(
    panel,
    /DesktopStudioCoordinator|getSession\(|from ["']@tauri-apps|localStorage|STUDIO_GUIDE\[/,
  );
});

test("editor surface shows the guide for the current step and hides it in Focus", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /const \[guideOpen, setGuideOpen\] = useState\(true\)/);
  assert.match(editor, /focusMode \|\| !guideOpen \? undefined : \(\s*<StudioGuidePanel/);
  assert.match(editor, /guide=\{STUDIO_GUIDE\[activeStep\]\}/);
  assert.match(editor, /evaluateStudioGuideChecklist\(activeStep, shellSnapshot\)/);
  assert.match(editor, /onToggleGuide=\{\(\) => setGuideOpen\(\(open\) => !open\)\}/);

  const frame = read("ui", "StudioShellFrame.tsx");
  assert.match(frame, /data-testid="studio-guide-toggle"/);
  assert.match(frame, /\{guideOpen \? "Hide guide" : "Help"\}/);
});

test("every step but Publish offers a next step", () => {
  for (const step of STUDIO_STEPS) {
    const next = nextStudioStep(step.id);
    assert.equal(next === null, step.id === "publish", step.id);
  }
});

test("checklists update as the book changes", () => {
  const empty = {
    book: createBook({ title: "Guide", language: "en", authors: [] }),
    bookWordCount: 0,
    validation: null,
    cover: "unavailable" as const,
  };
  const before = evaluateStudioGuideChecklist("write", empty);
  assert.equal(before.find((item) => item.id === "first-words")!.done, false);
  const after = evaluateStudioGuideChecklist("write", { ...empty, bookWordCount: 3 });
  assert.equal(after.find((item) => item.id === "first-words")!.done, true);

  const publish = evaluateStudioGuideChecklist("publish", {
    ...empty,
    validation: { errors: 0, warnings: 1 },
  });
  assert.deepEqual(
    publish.map((item) => [item.text, item.done]),
    [
      ["Press Check my book", true],
      ["Fix anything the check says must be fixed", true],
      ["Export your ebook", false],
    ],
  );
});

test("guide copy matches the shell and stays plain", () => {
  const copy = allStudioGuideCopy().join("\n");
  assert.match(copy, /Check again, then export again/);
  assert.match(copy, /Kannada look/);
  assert.doesNotMatch(copy, /Run the book check|Export again whenever/);
  for (const text of allStudioGuideCopy()) {
    assert.deepEqual(findInternalTerms(text), [], text);
  }
  for (const step of STUDIO_STEPS) {
    assert.ok(STUDIO_GUIDE[step.id].questions.length >= 1, step.id);
  }
});
