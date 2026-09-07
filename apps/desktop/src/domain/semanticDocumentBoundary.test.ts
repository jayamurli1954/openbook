// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BOOK_MODEL_SCHEMA_VERSION } from "@openbook/book-model";
import { SEMANTIC_DOCUMENT_SCHEMA_VERSION } from "@openbook/semantic-document";
import {
  createSemanticDocument,
  loadAndProjectSemanticDocument,
  loadSemanticDocument,
  projectSemanticDocumentToBook,
} from "./semanticDocumentBoundary.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(
  here,
  "..",
  "..",
  "..",
  "tests",
  "fixtures",
  "semantic-document",
);

test("desktop boundary creates an English SemanticDocument and projects to Book", () => {
  const doc = createSemanticDocument({
    title: "Desktop English Boundary",
    language: "en",
    authors: ["Boundary Author"],
    chapterTitle: "First Chapter",
    openingParagraph: "Hello from the desktop domain boundary.",
  });

  assert.equal(doc.schemaVersion, SEMANTIC_DOCUMENT_SCHEMA_VERSION);
  assert.equal(doc.metadata.language, "en");

  const result = projectSemanticDocumentToBook(doc);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.book.schemaVersion, BOOK_MODEL_SCHEMA_VERSION);
  assert.equal(result.book.metadata.title, "Desktop English Boundary");
  assert.equal(result.book.chapters.length, 1);
  assert.equal(result.book.publishing.intendedOutputs.length, 0);
  assert.equal(result.bookIssues.filter((i) => i.severity === "error").length, 0);
});

test("desktop boundary creates a Kannada SemanticDocument and preserves Unicode in Book", () => {
  const doc = createSemanticDocument({
    title: "ಕನ್ನಡ ಗಡಿ",
    language: "kn",
    authors: ["ಲೇಖಕ"],
    chapterTitle: "ಅಧ್ಯಾಯ",
    openingParagraph: "ನಮಸ್ಕಾರ ಜಗತ್ತು",
  });

  const result = projectSemanticDocumentToBook(doc);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.book.metadata.title, "ಕನ್ನಡ ಗಡಿ");
  assert.equal(result.book.metadata.language, "kn");
  const para = result.book.chapters[0]?.blocks[0];
  assert.ok(para && para.type === "paragraph");
  assert.equal(para.inlines[0]?.type, "text");
  if (para.inlines[0]?.type === "text") {
    assert.equal(para.inlines[0].text, "ನಮಸ್ಕಾರ ಜಗತ್ತು");
  }
});

test("desktop boundary loads English fixture and projects Desktop → SDM → Book", () => {
  const raw = JSON.parse(
    readFileSync(join(fixturesDir, "english-nested.json"), "utf8"),
  ) as unknown;
  const loaded = loadSemanticDocument(raw);
  const result = projectSemanticDocumentToBook(loaded);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.book.metadata.language, "en");
  assert.equal(result.book.frontMatter.length, 1);
  assert.equal(result.book.chapters.length, 1);
  assert.ok(result.book.chapters[0]?.blocks.some((b) => b.type === "list"));
});

test("desktop boundary loads Kannada fixture via loadAndProject helper", () => {
  const raw = JSON.parse(
    readFileSync(join(fixturesDir, "kannada-chapter.json"), "utf8"),
  ) as unknown;
  const result = loadAndProjectSemanticDocument(raw);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.document.metadata.language, "kn");
  assert.equal(result.book.metadata.title, "ಕನ್ನಡ ಉದಾಹರಣೆ");
  assert.equal(result.book.chapters[0]?.title, "ಮೊದಲ ಅಧ್ಯಾಯ");
});

test("desktop boundary rejects EPUB packaging leaks before mapping", () => {
  const raw = {
    ...JSON.parse(readFileSync(join(fixturesDir, "english-nested.json"), "utf8")),
    spine: [],
  };
  const result = loadAndProjectSemanticDocument(raw);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.stage, "validate-document");
});
