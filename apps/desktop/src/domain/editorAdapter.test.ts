// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { bookToSemanticDocument } from "@openbook/semantic-document";
import {
  normalizeTipTapDoc,
  semanticDocumentToTipTapJson,
  tipTapJsonToSemanticDocument,
  type TipTapDocJSON,
} from "./editorAdapter.js";
import { projectSemanticDocumentToBook } from "./semanticDocumentBoundary.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "..", "..", "..", "tests", "fixtures", "editor");

function loadTipTapFixture(name: string): TipTapDocJSON {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as TipTapDocJSON;
}

function sequentialIds() {
  let n = 0;
  return (prefix: string) => {
    n += 1;
    return `${prefix}-${n}`;
  };
}

function emptyMetadata(
  overrides: Partial<{
    title: string;
    language: string;
    authors: string[];
    identifier: string;
  }>,
) {
  return {
    title: "",
    subtitle: "",
    authors: [] as string[],
    contributors: [] as string[],
    language: "",
    identifier: "",
    publisher: "",
    publishedAt: "",
    copyright: "",
    description: "",
    subjects: [] as string[],
    rights: "",
    ...overrides,
  };
}

function collectText(inlines: { type: string; text?: string; children?: unknown[] }[]): string {
  let out = "";
  for (const inline of inlines) {
    if (inline.type === "text" && inline.text) out += inline.text;
    if (
      (inline.type === "emphasis" || inline.type === "strong" || inline.type === "link") &&
      Array.isArray(inline.children)
    ) {
      out += collectText(inline.children as { type: string; text?: string; children?: unknown[] }[]);
    }
  }
  return out;
}

test("English editor content converts correctly to SDM", () => {
  const tipTap = loadTipTapFixture("english-tiptap.json");
  const { document, warnings } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "English Editor Fixture",
      language: "en",
      authors: ["Editor Author"],
      identifier: "fixture-en-editor-1",
    }),
    sectionId: "sec-en-1",
    sectionTitle: "Structures",
    createId: sequentialIds(),
  });

  assert.equal(warnings.length, 0);
  assert.equal(document.metadata.language, "en");
  assert.equal(document.sections.length, 1);
  const blocks = document.sections[0]!.blocks;
  assert.equal(blocks[0]?.type, "heading");
  assert.equal(blocks[1]?.type, "paragraph");
  assert.equal(blocks[2]?.type, "list");
  assert.equal(blocks[3]?.type, "quote");
  assert.equal(blocks[4]?.type, "list");

  const para = blocks[1];
  assert.ok(para && para.type === "paragraph");
  assert.ok(para.inlines.some((i) => i.type === "strong"));
  assert.ok(para.inlines.some((i) => i.type === "emphasis"));
  assert.ok(para.inlines.some((i) => i.type === "link"));
  const link = para.inlines.find((i) => i.type === "link");
  assert.ok(link && link.type === "link");
  assert.equal(link.href, "https://example.org");
});

test("Kannada editor content converts correctly to SDM and preserves Unicode", () => {
  const tipTap = loadTipTapFixture("kannada-tiptap.json");
  const { document, warnings } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "ಕನ್ನಡ ಉದಾಹರಣೆ",
      language: "kn",
      authors: ["ಲೇಖಕ"],
      identifier: "fixture-kn-editor-1",
    }),
    sectionId: "sec-kn-1",
    sectionTitle: "ಮೊದಲ ಅಧ್ಯಾಯ",
    createId: sequentialIds(),
  });

  assert.equal(warnings.length, 0);
  assert.equal(document.metadata.title, "ಕನ್ನಡ ಉದಾಹರಣೆ");
  assert.equal(document.metadata.language, "kn");

  const para = document.sections[0]!.blocks.find((b) => b.type === "paragraph");
  assert.ok(para && para.type === "paragraph");
  const text = collectText(para.inlines);
  assert.ok(text.includes("ಕನ್ನಡ"));
  assert.ok(text.includes("ಗುರುತು"));
  assert.ok(text.includes("ದಪ್ಪ"));
  assert.ok(text.includes("ಕೊಂಡಿ"));
});

test("SDM from editor projects through desktop boundary into Book", () => {
  const tipTap = loadTipTapFixture("english-tiptap.json");
  const { document } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "Boundary Projection",
      language: "en",
      authors: ["OpenBook"],
      identifier: "editor-boundary-1",
    }),
    sectionId: "sec-1",
    createId: sequentialIds(),
  });

  const result = projectSemanticDocumentToBook(document);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.book.metadata.title, "Boundary Projection");
  assert.equal(result.book.chapters.length, 1);
  assert.equal(result.book.publishing.intendedOutputs.length, 0);
  assert.ok(!("manifest" in result.book));
  assert.ok(!("spine" in result.book));
  assert.ok(!("opf" in result.book));
});

test("full editor round-trip: Tiptap → SDM → Book → SDM → Tiptap", () => {
  const tipTap = loadTipTapFixture("english-tiptap.json");
  const { document: sdm1 } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "Round Trip EN",
      language: "en",
      authors: ["RT"],
      identifier: "rt-en-1",
    }),
    sectionId: "sec-rt",
    sectionTitle: "Chapter",
    createId: sequentialIds(),
  });

  const projected = projectSemanticDocumentToBook(sdm1);
  assert.equal(projected.ok, true);
  if (!projected.ok) return;

  const sdm2 = bookToSemanticDocument(projected.book);
  const { doc: tipTap2, warnings } = semanticDocumentToTipTapJson(sdm2);
  assert.equal(warnings.length, 0);
  assert.deepEqual(normalizeTipTapDoc(tipTap2), normalizeTipTapDoc(tipTap));
});

test("Kannada Unicode survives full editor round-trip", () => {
  const tipTap = loadTipTapFixture("kannada-tiptap.json");
  const { document: sdm1 } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "ಕನ್ನಡ ರೌಂಡ್ ಟ್ರಿಪ್",
      language: "kn",
      authors: ["ಲೇಖಕ"],
      identifier: "rt-kn-1",
    }),
    sectionId: "sec-kn-rt",
    sectionTitle: "ಮೊದಲ ಅಧ್ಯಾಯ",
    createId: sequentialIds(),
  });

  const projected = projectSemanticDocumentToBook(sdm1);
  assert.equal(projected.ok, true);
  if (!projected.ok) return;

  assert.equal(projected.book.metadata.title, "ಕನ್ನಡ ರೌಂಡ್ ಟ್ರಿಪ್");
  const sdm2 = bookToSemanticDocument(projected.book);
  const { doc: tipTap2 } = semanticDocumentToTipTapJson(sdm2);
  assert.deepEqual(normalizeTipTapDoc(tipTap2), normalizeTipTapDoc(tipTap));

  const blob = JSON.stringify(tipTap2);
  assert.ok(blob.includes("ಕನ್ನಡ"));
  assert.ok(blob.includes("ಗುರುತು"));
  assert.ok(blob.includes("ಉಲ್ಲೇಖ"));
});

test("supported formatting survives SDM → Tiptap → SDM content shape", () => {
  const tipTap = loadTipTapFixture("english-tiptap.json");
  const createId = sequentialIds();
  const { document: first } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "Format Survive",
      language: "en",
      authors: ["A"],
      identifier: "fmt-1",
    }),
    sectionId: "sec-fmt",
    createId,
  });

  const { doc } = semanticDocumentToTipTapJson(first);
  const { document: second } = tipTapJsonToSemanticDocument(doc, {
    metadata: first.metadata,
    sectionId: "sec-fmt",
    sectionTitle: first.sections[0]!.title,
    createId: sequentialIds(),
  });

  const stripIds = (blocks: typeof first.sections[0]["blocks"]) =>
    blocks.map((b) => {
      if (b.type === "list") {
        return { type: b.type, ordered: b.ordered, items: b.items };
      }
      if (b.type === "heading") {
        return { type: b.type, level: b.level, inlines: b.inlines };
      }
      if (b.type === "image") {
        return { type: b.type, assetId: b.assetId, caption: b.caption };
      }
      return { type: b.type, inlines: b.inlines };
    });

  assert.deepEqual(
    stripIds(second.sections[0]!.blocks),
    stripIds(first.sections[0]!.blocks),
  );
});

test("no EPUB packaging fields are introduced by editor adapter", () => {
  const tipTap = loadTipTapFixture("english-tiptap.json");
  const { document } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "No EPUB",
      language: "en",
      authors: ["A"],
      identifier: "no-epub-1",
    }),
    createId: sequentialIds(),
  });

  const serialized = JSON.stringify(document);
  for (const leak of ["opf", "manifest", "spine", "ncx", "navDoc", "container", "packageDocument"]) {
    assert.equal(serialized.includes(`"${leak}"`), false, `leak key ${leak}`);
  }

  const result = projectSemanticDocumentToBook(document);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.book.publishing.intendedOutputs.length, 0);
});

test("unsupported editor constructs are handled deterministically", () => {
  const tipTap: TipTapDocJSON = {
    type: "doc",
    content: [
      {
        type: "codeBlock",
        content: [{ type: "text", text: "const x = 1;" }],
      },
      { type: "horizontalRule" },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [{ type: "strike" }, { type: "bold" }],
            text: "kept",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "outer" }],
              },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "nested" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const { document, warnings } = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "Unsupported",
      language: "en",
      authors: ["A"],
      identifier: "unsup-1",
    }),
    sectionId: "sec-u",
    createId: sequentialIds(),
  });

  assert.ok(warnings.some((w) => w.code === "unsupported-block"));
  assert.ok(warnings.some((w) => w.code === "unsupported-mark"));
  assert.ok(warnings.some((w) => w.code === "unsupported-nested-list"));

  const blocks = document.sections[0]!.blocks;
  assert.equal(blocks[0]?.type, "paragraph");
  if (blocks[0]?.type === "paragraph") {
    assert.equal(collectText(blocks[0].inlines), "const x = 1;");
  }
  // horizontalRule dropped; next is paragraph with bold (strike stripped)
  assert.equal(blocks[1]?.type, "paragraph");
  if (blocks[1]?.type === "paragraph") {
    assert.ok(blocks[1].inlines.some((i) => i.type === "strong"));
    assert.equal(collectText(blocks[1].inlines), "kept");
  }
  assert.equal(blocks[2]?.type, "list");
  if (blocks[2]?.type === "list") {
    assert.equal(collectText(blocks[2].items[0]!), "outer");
  }

  // Same input → same structure (deterministic warnings + blocks aside from new ids)
  const again = tipTapJsonToSemanticDocument(tipTap, {
    metadata: emptyMetadata({
      title: "Unsupported",
      language: "en",
      authors: ["A"],
      identifier: "unsup-1",
    }),
    sectionId: "sec-u",
    createId: sequentialIds(),
  });
  assert.deepEqual(
    again.warnings.map((w) => ({ code: w.code, path: w.path })),
    warnings.map((w) => ({ code: w.code, path: w.path })),
  );
});
