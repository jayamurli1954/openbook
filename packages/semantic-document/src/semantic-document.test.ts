// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { validateBook } from "@openbook/book-model";
import {
  SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  bookToSemanticDocument,
  semanticDocumentToBook,
  validateSemanticDocument,
  type SemanticDocument,
} from "./index.js";

const here = dirname(fileURLToPath(import.meta.url));

function emptyMetadata(
  overrides: Partial<SemanticDocument["metadata"]> = {},
): SemanticDocument["metadata"] {
  return {
    title: "",
    subtitle: "",
    authors: [],
    contributors: [],
    language: "",
    identifier: "",
    publisher: "",
    publishedAt: "",
    copyright: "",
    description: "",
    subjects: [],
    rights: "",
    ...overrides,
  };
}

function englishDoc(): SemanticDocument {
  return {
    schemaVersion: SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    metadata: emptyMetadata({
      title: "OpenBook Semantic Contract",
      authors: ["Ada Author"],
      language: "en",
    }),
    sections: [
      {
        id: "sec-preface",
        matter: "front",
        role: "preface",
        title: "Preface",
        blocks: [
          {
            type: "paragraph",
            id: "p-preface",
            inlines: [{ type: "text", text: "A short preface." }],
          },
        ],
      },
      {
        id: "sec-ch1",
        matter: "main",
        role: "chapter",
        title: "Chapter One",
        blocks: [
          {
            type: "heading",
            id: "h-ch1",
            level: 2,
            inlines: [{ type: "text", text: "Opening" }],
          },
          {
            type: "paragraph",
            id: "p-ch1",
            inlines: [
              { type: "text", text: "Hello " },
              {
                type: "emphasis",
                children: [{ type: "text", text: "world" }],
              },
              { type: "text", text: " with a " },
              {
                type: "link",
                href: "https://example.com",
                children: [{ type: "text", text: "link" }],
              },
              { type: "text", text: "." },
            ],
          },
          {
            type: "list",
            id: "l-ch1",
            ordered: false,
            items: [
              [{ type: "text", text: "Alpha" }],
              [
                {
                  type: "strong",
                  children: [{ type: "text", text: "Beta" }],
                },
              ],
            ],
          },
          {
            type: "quote",
            id: "q-ch1",
            inlines: [{ type: "text", text: "Quoted English." }],
          },
          {
            type: "image",
            id: "img-ch1",
            assetId: "asset-cover",
            caption: [{ type: "text", text: "Cover image" }],
          },
        ],
      },
      {
        id: "sec-appendix",
        matter: "back",
        role: "appendix",
        title: "Appendix A",
        blocks: [
          {
            type: "paragraph",
            id: "p-app",
            inlines: [{ type: "text", text: "Notes." }],
          },
        ],
      },
    ],
    assets: [
      {
        id: "asset-cover",
        kind: "image",
        fileName: "cover.png",
        mediaType: "image/png",
        altText: "Cover",
        licence: "CC-BY-4.0",
      },
    ],
  };
}

function kannadaDoc(): SemanticDocument {
  return {
    schemaVersion: SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    metadata: emptyMetadata({
      title: "ಕನ್ನಡ ಕಥೆ",
      authors: ["ಲೇಖಕಿ"],
      language: "kn",
    }),
    sections: [
      {
        id: "sec-kn-1",
        matter: "main",
        role: "chapter",
        title: "ಅಧ್ಯಾಯ ಒಂದು",
        blocks: [
          {
            type: "heading",
            id: "h-kn-1",
            level: 1,
            inlines: [{ type: "text", text: "ಪ್ರಾರಂಭ" }],
          },
          {
            type: "paragraph",
            id: "p-kn-1",
            inlines: [
              { type: "text", text: "ನಮಸ್ಕಾರ, " },
              {
                type: "emphasis",
                children: [{ type: "text", text: "ಜಗತ್ತು" }],
              },
              { type: "text", text: "!" },
            ],
          },
          {
            type: "list",
            id: "l-kn-1",
            ordered: true,
            items: [
              [{ type: "text", text: "ಮೊದಲನೆಯದು" }],
              [{ type: "text", text: "ಎರಡನೆಯದು" }],
            ],
          },
        ],
      },
    ],
    assets: [],
  };
}

test("English semantic document maps to a valid Book with partitioned matter", () => {
  const doc = englishDoc();
  const book = semanticDocumentToBook(doc);
  assert.equal(book.schemaVersion, 1);
  assert.equal(book.metadata.title, "OpenBook Semantic Contract");
  assert.equal(book.metadata.language, "en");
  assert.equal(book.frontMatter.length, 1);
  assert.equal(book.chapters.length, 1);
  assert.equal(book.backMatter.length, 1);
  assert.equal(book.publishing.intendedOutputs.length, 0);
  assert.equal(book.assets[0]?.fileName, "cover.png");

  const chapter = book.chapters[0];
  assert.ok(chapter);
  assert.equal(chapter.blocks.length, 5);
  assert.equal(chapter.blocks[1]?.type, "paragraph");
  assert.equal(chapter.blocks[2]?.type, "list");

  const issues = validateBook(book);
  assert.equal(
    issues.filter((i) => i.severity === "error").length,
    0,
    JSON.stringify(issues, null, 2),
  );
});

test("Kannada semantic document preserves Unicode through mapping", () => {
  const doc = kannadaDoc();
  const book = semanticDocumentToBook(doc);
  assert.equal(book.metadata.title, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(book.metadata.language, "kn");
  assert.equal(book.chapters[0]?.title, "ಅಧ್ಯಾಯ ಒಂದು");

  const para = book.chapters[0]?.blocks.find((b) => b.type === "paragraph");
  assert.ok(para && para.type === "paragraph");
  const texts = para.inlines.flatMap((span) => {
    if (span.type === "text") return [span.text];
    if (span.type === "emphasis") {
      return span.children.flatMap((c) => (c.type === "text" ? [c.text] : []));
    }
    return [];
  });
  assert.ok(texts.some((t) => t.includes("ನಮಸ್ಕಾರ")));
  assert.ok(texts.some((t) => t.includes("ಜಗತ್ತು")));

  const issues = validateBook(book);
  assert.equal(issues.filter((i) => i.severity === "error").length, 0);
});

test("nested/structured content round-trips SDM → Book → SDM for content", () => {
  const doc = englishDoc();
  const book = semanticDocumentToBook(doc);
  const roundTripped = bookToSemanticDocument(book);

  assert.equal(roundTripped.schemaVersion, SEMANTIC_DOCUMENT_SCHEMA_VERSION);
  assert.deepEqual(roundTripped.metadata, doc.metadata);
  assert.deepEqual(roundTripped.sections, doc.sections);
  assert.deepEqual(roundTripped.assets, doc.assets);
});

test("mapping is deterministic for identical input", () => {
  const a = semanticDocumentToBook(englishDoc());
  const b = semanticDocumentToBook(englishDoc());
  assert.deepEqual(a, b);
});

test("EPUB packaging keys on a SemanticDocument are contract errors", () => {
  const leaky = {
    ...englishDoc(),
    manifest: { items: [] },
  } as SemanticDocument;
  const issues = validateSemanticDocument(leaky);
  assert.ok(issues.some((i) => i.code === "epub-authoring-leak"));
  assert.throws(() => semanticDocumentToBook(leaky));
});

test("missing language is an error; empty title is a warning", () => {
  const doc: SemanticDocument = {
    ...englishDoc(),
    metadata: emptyMetadata({ title: "", language: "" }),
  };
  const issues = validateSemanticDocument(doc);
  assert.ok(issues.some((i) => i.code === "missing-language" && i.severity === "error"));
  assert.ok(issues.some((i) => i.code === "empty-title" && i.severity === "warning"));
});

test("duplicate ids are contract errors", () => {
  const doc = englishDoc();
  doc.sections[1]!.blocks[0]!.id = "dup";
  doc.sections[1]!.blocks[1]!.id = "dup";
  const issues = validateSemanticDocument(doc);
  assert.ok(issues.some((i) => i.code === "duplicate-id"));
});

test("English and Kannada JSON fixtures map without domain errors", () => {
  const fixturesDir = join(here, "..", "..", "..", "tests", "fixtures", "semantic-document");
  for (const name of ["english-nested.json", "kannada-chapter.json"]) {
    const raw = JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as SemanticDocument;
    const book = semanticDocumentToBook(raw);
    const errors = validateBook(book).filter((i) => i.severity === "error");
    assert.equal(errors.length, 0, `${name}: ${JSON.stringify(errors)}`);
  }
});
