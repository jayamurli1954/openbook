// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 3 — stored-stylesheet guard.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import { findStoredStylesheetLeak } from "./designStudioUx.js";

test("a Book payload is not flagged as a stored stylesheet", () => {
  const book = createBook({
    title: "ಕನ್ನಡ ವಿನ್ಯಾಸ",
    language: "kn",
    authors: ["ಲೇಖಕ"],
  });
  book.theme = { id: "kannada", name: "ಕನ್ನಡ" };
  book.typography = {
    bodyFontFamily: "Noto Sans Kannada",
    headingFontFamily: "ನೋಟೋ ಸೆರಿಫ್",
    bodySizePt: 12,
    lineHeight: 1.5,
  };
  book.styles.paragraphStyles.push({ id: "body", name: "css" });
  assert.equal(findStoredStylesheetLeak(book), null);
  assert.equal(
    findStoredStylesheetLeak({
      bookModelVersion: 1,
      book,
    }),
    null,
  );
});

test("stylesheet and theme-file keys are stored-design leaks", () => {
  assert.equal(findStoredStylesheetLeak({ stylesheet: "body{}" }), "$.stylesheet");
  assert.equal(findStoredStylesheetLeak({ css: "h1{}" }), "$.css");
  assert.equal(
    findStoredStylesheetLeak({ design: { typstTheme: { body: "11pt" } } }),
    "$.design.typstTheme",
  );
  assert.equal(
    findStoredStylesheetLeak({ metadata: { themeCss: "p{}" } }),
    "$.metadata.themeCss",
  );
  assert.equal(
    findStoredStylesheetLeak([{ title: "Classic" }, { css: "p{}" }]),
    "$[1].css",
  );
});
