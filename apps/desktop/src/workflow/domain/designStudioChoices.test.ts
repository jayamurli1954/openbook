// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 2 — guided choices over the design port.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import { createDesignStudioChoices } from "./designStudioChoices.js";

function choices() {
  const session = new BookSession({
    book: createBook({ title: "Choices", language: "en", authors: ["Ada"] }),
    idSeed: "design-choices",
  });
  return { session, choices: createDesignStudioChoices(session) };
}

test("guided choices read the Book theme and typography", () => {
  const { choices: studio } = choices();
  const design = studio.read();
  assert.equal(design.theme.name, "Default");
  assert.equal(design.typography.bodySizePt, 11);
  assert.equal(design.typography.lineHeight, 1.4);
});

test("guided choices set theme and typefaces and keep Kannada names", () => {
  const { session, choices: studio } = choices();
  const theme = studio.setTheme(" kannada ", " ಕನ್ನಡ ");
  assert.equal(theme.ok, true);
  const type = studio.setTypography({
    bodyFontFamily: " Noto Sans Kannada ",
    headingFontFamily: "Noto Serif Kannada",
    bodySizePt: 12,
    lineHeight: 1.5,
  });
  assert.equal(type.ok, true);
  const book = session.getBook();
  assert.equal(book.theme.id, "kannada");
  assert.equal(book.theme.name, "ಕನ್ನಡ");
  assert.equal(book.typography.bodyFontFamily, "Noto Sans Kannada");
  assert.equal(book.typography.headingFontFamily, "Noto Serif Kannada");
  assert.equal(book.typography.bodySizePt, 12);
});

test("a non-positive body size does not change the Book", () => {
  const { session, choices: studio } = choices();
  const before = JSON.stringify(session.getBook());
  const result = studio.setTypography({
    bodyFontFamily: "Noto Sans",
    headingFontFamily: "Noto Serif",
    bodySizePt: 0,
    lineHeight: 1.4,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "INVALID_SIZE");
  assert.equal(JSON.stringify(session.getBook()), before);
});
