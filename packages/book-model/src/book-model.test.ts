// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  addChapter,
  BOOK_MODEL_SCHEMA_VERSION,
  createBook,
  parseBook,
  serializeBook,
  validateBook,
  type Book,
} from "./index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("createBook uses schema v1 and semantic structure, not EPUB package fields", () => {
  const book = createBook({ title: "A Test Book", language: "en", authors: ["Ada"] });
  assert.equal(book.schemaVersion, BOOK_MODEL_SCHEMA_VERSION);
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0]?.role, "chapter");
  const keys = Object.keys(book);
  for (const forbidden of [
    "opf",
    "manifest",
    "spine",
    "ncx",
    "nav",
    "navDoc",
    "container",
    "packageDocument",
  ]) {
    assert.equal(keys.includes(forbidden), false, `must not store ${forbidden}`);
  }
});

test("createBook is format-neutral: no implicit publishing output (not EPUB)", () => {
  const book = createBook({ title: "Neutral", language: "en" });
  assert.equal(book.publishing.intendedOutputs.length, 0);
  assert.equal(book.publishing.intendedOutputs.includes("epub"), false);
});

test("createBook preserves explicitly supplied intendedOutputs", () => {
  const book = createBook({ language: "en", intendedOutputs: ["pdf", "html"] });
  assert.deepEqual(book.publishing.intendedOutputs, ["pdf", "html"]);
});

test("missing language is a domain error; empty title is a warning", () => {
  const book = createBook({ title: "", language: "" });
  const issues = validateBook(book);
  assert.equal(issues.some((i) => i.code === "missing-language" && i.severity === "error"), true);
  assert.equal(issues.some((i) => i.code === "missing-title" && i.severity === "warning"), true);
});

test("addChapter appends a main-matter chapter", () => {
  const book = addChapter(createBook({ language: "en", withOpeningChapter: false }), "Two");
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0]?.title, "Two");
  assert.equal(book.chapters[0]?.kind, "main");
});

test("serialize/parse round-trip preserves Kannada text", () => {
  let book = createBook({
    title: "ಕನ್ನಡ ಕಥೆ",
    language: "kn",
    authors: ["ಲೇಖಕಿ"],
  });
  const paragraph = book.chapters[0]?.blocks[0];
  assert.ok(paragraph && paragraph.type === "paragraph");
  paragraph.inlines = [{ type: "text", text: "ನಮಸ್ಕಾರ. ಇದು ಪರೀಕ್ಷೆ." }];
  const again = parseBook(serializeBook(book));
  assert.equal(again.metadata.title, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(again.metadata.language, "kn");
  const block = again.chapters[0]?.blocks[0];
  assert.ok(block && block.type === "paragraph");
  assert.equal(block.inlines[0] && block.inlines[0].type === "text" ? block.inlines[0].text : "", "ನಮಸ್ಕಾರ. ಇದು ಪರೀಕ್ಷೆ.");
});

test("English and Kannada fixture files parse as schema v1", () => {
  const en = parseBook(readFileSync(join(repoRoot, "tests/fixtures/simple-english.json"), "utf8"));
  const kn = parseBook(readFileSync(join(repoRoot, "tests/fixtures/kannada-indic.json"), "utf8"));
  assert.equal(en.schemaVersion, 1);
  assert.equal(kn.metadata.language, "kn");
  assert.equal(validateBook(en).filter((i) => i.severity === "error").length, 0);
  assert.equal(validateBook(kn).filter((i) => i.severity === "error").length, 0);
});

test("PDF bake-off fixtures parse as schema v1 Book Models with no domain errors", () => {
  const names = [
    "english-prose.json",
    "kannada-prose.json",
    "mixed-english-kannada.json",
    "indic-conjunct-shaping.json",
  ];
  const forbidden = [
    "opf",
    "manifest",
    "spine",
    "ncx",
    "nav",
    "navDoc",
    "container",
    "packageDocument",
  ];
  for (const name of names) {
    const book = parseBook(
      readFileSync(join(repoRoot, "tests/fixtures/pdf-bakeoff", name), "utf8"),
    );
    assert.equal(book.schemaVersion, 1, `${name} schemaVersion`);
    assert.equal(
      validateBook(book).filter((i) => i.severity === "error").length,
      0,
      `${name} must have zero validation errors`,
    );
    for (const key of forbidden) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(book, key),
        false,
        `${name} must not contain EPUB packaging key ${key}`,
      );
    }
  }
  const kn = parseBook(
    readFileSync(join(repoRoot, "tests/fixtures/pdf-bakeoff/kannada-prose.json"), "utf8"),
  );
  assert.equal(kn.metadata.language, "kn");
  assert.match(kn.metadata.title, /ನದಿಯ/);
  const conj = parseBook(
    readFileSync(
      join(repoRoot, "tests/fixtures/pdf-bakeoff/indic-conjunct-shaping.json"),
      "utf8",
    ),
  );
  const body = conj.chapters[0]?.blocks.find((b) => b.type === "paragraph");
  assert.ok(body && body.type === "paragraph");
  const text = body.inlines[0] && body.inlines[0].type === "text" ? body.inlines[0].text : "";
  assert.match(text, /ಕ್ಷಮೆ/);
  assert.match(text, /ಜ್ಞಾನ/);
});

test("EPUB packaging/container/navigation keys on a Book are domain errors", () => {
  for (const leak of ["opf", "manifest", "spine", "ncx", "nav", "navDoc", "container", "packageDocument"]) {
    const book = createBook({ language: "en", title: "Leak" }) as Book & Record<string, unknown>;
    book[leak] = { injected: true };
    const issues = validateBook(book);
    assert.equal(
      issues.some((i) => i.code === "epub-authoring-leak" && i.path === leak),
      true,
      `validateBook must flag EPUB key "${leak}"`,
    );
  }
});

test("parseBook rejects unknown schemaVersion", () => {
  assert.throws(() => parseBook(JSON.stringify({ schemaVersion: 99 })), /Unsupported schemaVersion/);
});

test("duplicate section or block ids are domain errors", () => {
  const book = createBook({ language: "en", title: "Ids", withOpeningChapter: false });
  const cloned = structuredClone(book);
  cloned.chapters = [
    {
      id: "same",
      kind: "main",
      role: "chapter",
      title: "One",
      blocks: [{ type: "paragraph", id: "block-a", inlines: [] }],
    },
    {
      id: "same",
      kind: "main",
      role: "chapter",
      title: "Two",
      blocks: [{ type: "paragraph", id: "block-a", inlines: [] }],
    },
  ];
  const issues = validateBook(cloned);
  assert.equal(issues.filter((i) => i.code === "duplicate-id").length >= 2, true);
});
