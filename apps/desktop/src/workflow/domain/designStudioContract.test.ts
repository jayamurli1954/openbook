// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 1 — design contract tests. No React chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import {
  DESIGN_STUDIO_CAPABILITIES,
  executeDesignCommand,
  getDesignStudioCapability,
  isDesignStudioCommandType,
  readBookDesign,
} from "./designStudioContract.js";

function session(): BookSession {
  return new BookSession({
    book: createBook({
      title: "Design",
      language: "en",
      authors: ["Ada"],
    }),
    idSeed: "design-slice-1",
  });
}

test("capability matrix covers ROADMAP §3.5 and defers unrepresentable choices", () => {
  const ids = DESIGN_STUDIO_CAPABILITIES.map((capability) => capability.id);
  assert.deepEqual(ids, [
    "book-theme",
    "typography",
    "heading-style",
    "paragraph-spacing",
    "image-treatment",
    "chapter-opening",
  ]);
  assert.equal(getDesignStudioCapability("book-theme")?.status, "in-scope");
  assert.equal(getDesignStudioCapability("typography")?.status, "in-scope");
  assert.equal(getDesignStudioCapability("heading-style")?.status, "in-scope");
  assert.equal(getDesignStudioCapability("paragraph-spacing")?.status, "deferred");
  assert.equal(getDesignStudioCapability("image-treatment")?.status, "deferred");
  assert.equal(getDesignStudioCapability("chapter-opening")?.status, "deferred");
  assert.equal(
    DESIGN_STUDIO_CAPABILITIES.some(
      (capability) =>
        (capability.id as string) === "ai-theme" ||
        (capability.id as string) === "css",
    ),
    false,
  );
  assert.equal(isDesignStudioCommandType("set-theme"), true);
  assert.equal(isDesignStudioCommandType("set-typography"), true);
  assert.equal(isDesignStudioCommandType("persist-css"), false);
});

test("readBookDesign copies theme and typography from the Book", () => {
  const book = session().getBook();
  const design = readBookDesign(book);
  assert.equal(design.theme.id, "default");
  assert.equal(design.theme.name, "Default");
  assert.equal(design.typography.bodySizePt, 11);
  assert.equal(design.typography.lineHeight, 1.4);
  design.theme.name = "Changed";
  assert.equal(book.theme.name, "Default");
});

test("set-theme and set-typography update the Book and keep Kannada names", () => {
  const studio = session();
  const theme = executeDesignCommand(studio, {
    type: "set-theme",
    id: "  kannada ",
    name: " ಕನ್ನಡ ",
  });
  assert.equal(theme.ok, true);
  const type = executeDesignCommand(studio, {
    type: "set-typography",
    bodyFontFamily: "  ",
    headingFontFamily: "",
    bodySizePt: 11,
    lineHeight: 1.4,
  });
  assert.equal(type.ok, true);
  assert.equal(readBookDesign(studio.getBook()).typography.bodyFontFamily, "");

  const named = executeDesignCommand(studio, {
    type: "set-typography",
    bodyFontFamily: " Noto Sans Kannada ",
    headingFontFamily: "Noto Serif Kannada",
    bodySizePt: 12.5,
    lineHeight: 1.6,
  });
  assert.equal(named.ok, true);
  const design = readBookDesign(studio.getBook());
  assert.deepEqual(design.theme, { id: "kannada", name: "ಕನ್ನಡ" });
  assert.equal(design.typography.bodyFontFamily, "Noto Sans Kannada");
  assert.equal(design.typography.headingFontFamily, "Noto Serif Kannada");
  assert.equal(design.typography.bodySizePt, 12.5);
  assert.equal(design.typography.lineHeight, 1.6);
});

test("blank theme and non-positive measures fail closed", () => {
  const studio = session();
  const before = JSON.stringify(studio.getBook());
  const blank = executeDesignCommand(studio, {
    type: "set-theme",
    id: " ",
    name: "Plain",
  });
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.equal(blank.code, "EMPTY_THEME");

  for (const bodySizePt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const size = executeDesignCommand(studio, {
      type: "set-typography",
      bodyFontFamily: "Noto Sans",
      headingFontFamily: "Noto Serif",
      bodySizePt,
      lineHeight: 1.4,
    });
    assert.equal(size.ok, false);
    if (!size.ok) assert.equal(size.code, "INVALID_SIZE");
  }

  const leading = executeDesignCommand(studio, {
    type: "set-typography",
    bodyFontFamily: "",
    headingFontFamily: "",
    bodySizePt: 11,
    lineHeight: 0,
  });
  assert.equal(leading.ok, false);
  if (!leading.ok) assert.equal(leading.code, "INVALID_LINE_HEIGHT");
  assert.equal(JSON.stringify(studio.getBook()), before);
});

test("contract surface stays free of stylesheets, TipTap, and React", () => {
  const source = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "src",
      "workflow",
      "domain",
      "designStudioContract.ts",
    ),
    "utf8",
  );
  assert.match(source, /executeDesignCommand/);
  assert.match(source, /updateTheme/);
  assert.match(source, /updateTypography/);
  assert.doesNotMatch(
    source,
    /from ["']@tiptap|from ["']react["']|from ["']@openbook\/epub|stylesheet|persistCss|localStorage|plugin-fs/,
  );
});
