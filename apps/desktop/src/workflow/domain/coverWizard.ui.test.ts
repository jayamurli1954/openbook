// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 3 — source-shape guards for the Cover Wizard chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { findInternalTerms } from "./studioShellGuide.js";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

test("the Cover step renders the wizard, not the placeholder", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /<CoverWizard fields=\{coverFields\}/);
  assert.match(editor, /studio-cover-step/);
  assert.doesNotMatch(editor, /Adding a cover image is coming soon/);
  assert.match(editor, /cover: readCover\(shellBook\) \? "set" : "none"/);
  assert.doesNotMatch(editor, /cover: "unavailable"/);
});

test("the wizard changes the Book only through the fields port", () => {
  const ui = read("ui", "CoverWizard.tsx");
  for (const call of ["fields.read", "fields.choose", "fields.apply", "fields.updateDescription", "fields.remove"]) {
    assert.match(ui, new RegExp(call.replace(".", "\\.")), call);
  }
  assert.doesNotMatch(ui, /getSession|setCover|clearCover|removeAsset|ingestAsset|@tauri-apps|node:fs/);
  for (const id of [
    "cover-wizard-choose",
    "cover-wizard-apply",
    "cover-wizard-cancel",
    "cover-wizard-alt-text",
    "cover-wizard-replace",
    "cover-wizard-remove",
    "cover-wizard-update-description",
    "cover-wizard-preview",
  ]) {
    assert.match(ui, new RegExp(id), id);
  }
  // Use as cover stays disabled until the cover is described.
  assert.match(ui, /disabled=\{busy \|\| descriptionMissing\}/);
});

test("the preview uses a revoked blob URL and writes nothing to disk", () => {
  const ui = read("ui", "CoverWizard.tsx");
  assert.match(ui, /URL\.createObjectURL/);
  assert.match(ui, /URL\.revokeObjectURL/);
  assert.doesNotMatch(ui, /writeFile|localStorage|data:image/);
});

test("the cover picker offers only JPEG and PNG and adds no host command", () => {
  const host = read("host", "createCoverImagePickPort.ts");
  assert.match(host, /\["png", "jpg", "jpeg"\]/);
  assert.match(host, /image\/png,image\/jpeg/);
  assert.doesNotMatch(host, /gif|webp/i);
  assert.match(host, /readAssetBytesFromPath/);
  assert.doesNotMatch(host, /invoke\(/);
});

test("wizard copy uses plain language", () => {
  const ui = read("ui", "CoverWizard.tsx");
  const strings = [...ui.matchAll(/>\s*([^<>{}]*[A-Za-z][^<>{}]*)\s*</g)].map((m) => m[1]!.trim());
  assert.ok(strings.length >= 8);
  for (const text of strings) {
    assert.deepEqual(findInternalTerms(text), [], text);
    assert.doesNotMatch(text, /asset|coming soon/i, text);
  }
});

test("the Cover guide ticks off once a cover is set and no longer says coming soon", async () => {
  const { createBook } = await import("@openbook/book-model");
  const { evaluateStudioGuideChecklist, STUDIO_GUIDE } = await import("./studioShellGuide.js");
  const { deriveStudioStepStatuses } = await import("./studioShellContract.js");
  const book = createBook({ title: "Guide", language: "en" });
  const snapshot = (cover: "none" | "set") => ({ book, bookWordCount: 0, validation: null, cover });

  const pending = evaluateStudioGuideChecklist("cover", snapshot("none"));
  assert.equal(pending.find((item) => item.id === "add-cover")?.done, false);
  const done = evaluateStudioGuideChecklist("cover", snapshot("set"));
  assert.equal(done.find((item) => item.id === "add-cover")?.done, true);

  const statuses = (cover: "none" | "set") =>
    deriveStudioStepStatuses(snapshot(cover)).find((step) => step.id === "cover")!.text;
  assert.equal(statuses("none"), "Not added");
  assert.equal(statuses("set"), "Added");

  const copy = JSON.stringify(STUDIO_GUIDE.cover);
  assert.doesNotMatch(copy, /coming soon/i);
});
