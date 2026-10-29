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
  upgradeBook,
  validateBook,
  type Book,
  type ContentBlock,
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

test("version-1 English and Kannada fixture files parse and upgrade to the current version", () => {
  const en = parseBook(readFileSync(join(repoRoot, "tests/fixtures/simple-english.json"), "utf8"));
  const kn = parseBook(readFileSync(join(repoRoot, "tests/fixtures/kannada-indic.json"), "utf8"));
  assert.equal(en.schemaVersion, BOOK_MODEL_SCHEMA_VERSION);
  assert.equal(kn.metadata.language, "kn");
  assert.equal(validateBook(en).filter((i) => i.severity === "error").length, 0);
  assert.equal(validateBook(kn).filter((i) => i.severity === "error").length, 0);
});

test("version-1 PDF bake-off fixtures upgrade to the current version with no domain errors", () => {
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
    assert.equal(book.schemaVersion, BOOK_MODEL_SCHEMA_VERSION, `${name} schemaVersion`);
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

function bookWithCoverAsset(overrides: Partial<Book["assets"][number]> = {}): Book {
  const book = createBook({ language: "kn", title: "ಮುಖಪುಟ", withOpeningChapter: false });
  book.assets = [
    {
      id: "asset-cover",
      kind: "image",
      fileName: "cover.jpg",
      mediaType: "image/jpeg",
      altText: "ಪುಸ್ತಕದ ಮುಖಪುಟ",
      licence: "CC-BY-4.0",
      ...overrides,
    },
  ];
  book.publishing.coverAssetId = "asset-cover";
  return book;
}

const coverCodes = (book: Book): string[] =>
  validateBook(book)
    .filter((i) => i.code.startsWith("cover-"))
    .map((i) => `${i.code}:${i.severity}`);

test("a Book without coverAssetId has no cover issues", () => {
  const book = createBook({ language: "en", title: "No cover" });
  assert.equal("coverAssetId" in book.publishing, false);
  assert.deepEqual(coverCodes(book), []);
});

test("a JPEG or PNG cover with alt text is valid and round-trips", () => {
  for (const mediaType of ["image/jpeg", "image/png"]) {
    const book = bookWithCoverAsset({ mediaType });
    assert.deepEqual(coverCodes(book), []);
    const parsed = parseBook(serializeBook(book));
    assert.equal(parsed.publishing.coverAssetId, "asset-cover");
    assert.equal(parsed.assets[0]?.altText, "ಪುಸ್ತಕದ ಮುಖಪುಟ");
  }
});

test("a cover naming no asset is a domain error", () => {
  const book = bookWithCoverAsset();
  book.assets = [];
  assert.deepEqual(coverCodes(book), ["cover-asset-missing:error"]);
});

test("a cover that is not a JPEG or PNG image is a domain error", () => {
  for (const overrides of [
    { kind: "font" as const, mediaType: "font/woff" },
    { mediaType: "image/svg+xml" },
    { mediaType: "image/webp" },
    { mediaType: "image/gif" },
  ]) {
    assert.deepEqual(coverCodes(bookWithCoverAsset(overrides)), ["cover-asset-not-image:error"]);
  }
});

test("a cover with blank alt text is a domain error", () => {
  assert.deepEqual(coverCodes(bookWithCoverAsset({ altText: "  " })), [
    "cover-alt-text-missing:error",
  ]);
});

// --- ADR-0041 Slice 1: callout block and schema version 2 ----------------------

test("BOOK_MODEL_SCHEMA_VERSION is 2 and createBook uses it", () => {
  assert.equal(BOOK_MODEL_SCHEMA_VERSION, 2);
  assert.equal(createBook({ language: "en" }).schemaVersion, 2);
});

test("upgradeBook turns a version-1 Book into version 2 and changes nothing else", () => {
  const v2 = createBook({ language: "kn", title: "ಪುಟ್ಟ ಕೃಷ್ಣ" });
  const v1 = { ...structuredClone(v2), schemaVersion: 1 };
  const before = JSON.stringify(v1);
  const upgraded = upgradeBook(v1);
  assert.equal(upgraded.upgradedFrom, 1);
  assert.deepEqual(upgraded.book, v2);
  assert.equal(JSON.stringify(v1), before, "input not mutated");
  assert.deepEqual(validateBook(v1 as Book).filter((i) => i.code === "schema-version").length, 1);

  const same = upgradeBook(v2);
  assert.equal(same.upgradedFrom, undefined);
  assert.equal(same.book, v2);
  for (const version of [0, 3, 99, "2", undefined]) {
    assert.throws(() => upgradeBook({ ...v2, schemaVersion: version }), /Unsupported schemaVersion/);
  }
  assert.throws(() => upgradeBook([]), /must be an object/);
});

test("parseBook reads versions 1 and 2 and returns version 2", () => {
  const book = createBook({ language: "en", title: "Versions" });
  assert.equal(parseBook(JSON.stringify({ ...book, schemaVersion: 1 })).schemaVersion, 2);
  assert.equal(parseBook(serializeBook(book)).schemaVersion, 2);
});

function withBlock(block: ContentBlock): Book {
  const book = createBook({ language: "kn", title: "ಕಥೆ" });
  book.chapters[0]!.blocks = [block];
  return book;
}

const calloutCodes = (book: Book) =>
  validateBook(book).filter((i) => i.code.includes("callout")).map((i) => i.code);

test("a callout with a title and Kannada text is valid and round-trips", () => {
  const block: ContentBlock = {
    type: "callout",
    id: "lesson-1",
    title: "ನಾವು ಕಲಿತದ್ದು",
    inlines: [{ type: "text", text: "ಸತ್ಯವು " }, { type: "strong", children: [{ type: "text", text: "ಬೆಳಕು" }] }],
  };
  const book = withBlock(block);
  assert.deepEqual(calloutCodes(book), []);
  assert.deepEqual(parseBook(serializeBook(book)).chapters[0]!.blocks[0], block);
});

test("a callout needs a text title, an inline array, and some visible text", () => {
  const base = { type: "callout" as const, id: "c", title: "What We Learned", inlines: [] };
  assert.deepEqual(calloutCodes(withBlock(base)), [], "title alone is enough");
  assert.deepEqual(calloutCodes(withBlock({ ...base, title: "", inlines: [{ type: "text", text: "Be kind." }] })), []);
  assert.deepEqual(calloutCodes(withBlock({ ...base, title: "  ", inlines: [{ type: "text", text: " " }] })), ["empty-callout"]);
  assert.deepEqual(calloutCodes(withBlock({ ...base, title: 7 as unknown as string })), ["callout-title-not-text"]);
  assert.deepEqual(calloutCodes(withBlock({ ...base, inlines: "x" as unknown as [] })), ["callout-inlines-not-array"]);
});

test("callout ids take part in the duplicate-id check", () => {
  const book = withBlock({ type: "callout", id: "dup", title: "T", inlines: [] });
  book.chapters[0]!.blocks.push({ type: "paragraph", id: "dup", inlines: [] });
  assert.equal(validateBook(book).some((i) => i.code === "duplicate-id"), true);
});
