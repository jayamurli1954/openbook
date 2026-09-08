// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBook, type AssetRef, type StructuralSection } from "@openbook/book-model";
import {
  AssetResolutionError,
  AssetValidationError,
  buildHtml,
  isSafeHref,
  sanitizeHref,
  UnsupportedContentError,
  UnsafeUrlError,
  type AssetResolver,
  type PublishingDiagnostic,
} from "./index.js";

const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function createTestAsset(
  id: string,
  mediaType: string,
  overrides: Partial<AssetRef> = {},
): AssetRef {
  return {
    id,
    kind: "image",
    mediaType,
    fileName: `${id}.dat`,
    altText: overrides.altText ?? "Test image",
    licence: "CC0",
    ...overrides,
  };
}

function createMemoryResolver(assetMap: Record<string, Uint8Array>): AssetResolver {
  return {
    resolve: async (asset) => {
      const data = assetMap[asset.id];
      if (!data) {
        throw new Error(`Asset not found: ${asset.id}`);
      }
      return data;
    },
  };
}

describe("@openbook/html: Gate 4 HTML Publishing Engine", () => {
  describe("canonical-to-HTML mapping", () => {
    it("projects Book metadata, headings, paragraphs, emphasis, strong, links, lists, and quotes", async () => {
      const book = createBook({
        title: "Rich Formatting Test",
        authors: ["Jane Doe"],
        language: "en",
        withOpeningChapter: false,
      });
      book.metadata.description = "A description of the book.";

      const chapter: StructuralSection = {
        id: "ch-formatted",
        kind: "main",
        role: "chapter",
        title: "Formatted Chapter",
        blocks: [
          {
            type: "heading",
            id: "h-sub1",
            level: 2,
            inlines: [{ type: "text", text: "Subheading Level 2" }],
          },
          {
            type: "paragraph",
            id: "p-formatted",
            inlines: [
              { type: "text", text: "Plain text, " },
              {
                type: "emphasis",
                children: [{ type: "text", text: "emphasized text" }],
              },
              { type: "text", text: ", " },
              {
                type: "strong",
                children: [{ type: "text", text: "strong text" }],
              },
              { type: "text", text: ", and a " },
              {
                type: "link",
                href: "https://example.com/ref",
                children: [{ type: "text", text: "hyperlink" }],
              },
              { type: "text", text: "." },
            ],
          },
          {
            type: "quote",
            id: "q-1",
            inlines: [{ type: "text", text: "A memorable blockquote." }],
          },
          {
            type: "list",
            id: "list-ord",
            ordered: true,
            items: [
              [{ type: "text", text: "First item" }],
              [{ type: "text", text: "Second item" }],
            ],
          },
          {
            type: "list",
            id: "list-unord",
            ordered: false,
            items: [
              [{ type: "text", text: "Bullet A" }],
              [{ type: "text", text: "Bullet B" }],
            ],
          },
        ],
      };

      book.chapters = [chapter];

      const publication = await buildHtml(book);
      const html = publication.html;

      assert.match(html, /^<!DOCTYPE html>\n<html lang="en" dir="ltr">/);
      assert.match(html, /<meta charset="utf-8">/);
      assert.match(html, /<title>Rich Formatting Test<\/title>/);
      assert.match(html, /<meta name="author" content="Jane Doe">/);
      assert.match(html, /<meta name="description" content="A description of the book.">/);
      assert.match(html, /<h1 class="book-title">Rich Formatting Test<\/h1>/);
      assert.match(html, /<p class="authors">Jane Doe<\/p>/);
      assert.match(html, /<nav class="toc" aria-label="Table of contents">/);
      assert.match(html, /<a href="#ch-formatted">Formatted Chapter<\/a>/);
      assert.match(html, /<section class="chapter" data-role="chapter" id="ch-formatted">/);
      assert.match(html, /<h1 class="section-title">Formatted Chapter<\/h1>/);
      assert.match(html, /<h2 id="h-sub1">Subheading Level 2<\/h2>/);
      assert.match(
        html,
        /<p id="p-formatted">Plain text, <em>emphasized text<\/em>, <strong>strong text<\/strong>, and a <a href="https:\/\/example\.com\/ref">hyperlink<\/a>\.<\/p>/,
      );
      assert.match(
        html,
        /<blockquote id="q-1"><p>A memorable blockquote\.<\/p><\/blockquote>/,
      );
      assert.match(
        html,
        /<ol id="list-ord">\s*<li>First item<\/li>\s*<li>Second item<\/li>\s*<\/ol>/,
      );
      assert.match(
        html,
        /<ul id="list-unord">\s*<li>Bullet A<\/li>\s*<li>Bullet B<\/li>\s*<\/ul>/,
      );
      assert.doesNotMatch(html, /<script\b/i);
      assert.match(html, /<style>\s*html \{/);
      assert.match(html, /line-height:\s*1\.55/);
    });

    it("projects front, main, and back matter in reading order without mutating the Book", async () => {
      const book = createBook({
        title: "Matter Order",
        language: "en",
        withOpeningChapter: false,
      });
      book.frontMatter = [
        {
          id: "fm-preface",
          kind: "front",
          role: "preface",
          title: "Preface",
          blocks: [
            {
              type: "paragraph",
              id: "p-preface",
              inlines: [{ type: "text", text: "Front." }],
            },
          ],
        },
      ];
      book.chapters = [
        {
          id: "ch-1",
          kind: "main",
          role: "chapter",
          title: "Chapter One",
          blocks: [
            {
              type: "paragraph",
              id: "p-ch",
              inlines: [{ type: "text", text: "Body." }],
            },
          ],
        },
      ];
      book.backMatter = [
        {
          id: "bm-notes",
          kind: "back",
          role: "notes",
          title: "Notes",
          blocks: [
            {
              type: "paragraph",
              id: "p-notes",
              inlines: [{ type: "text", text: "Back." }],
            },
          ],
        },
      ];

      const snapshotBefore = JSON.stringify(book);
      const publication = await buildHtml(book);
      assert.equal(JSON.stringify(book), snapshotBefore);

      const html = publication.html;
      const prefaceAt = html.indexOf('id="fm-preface"');
      const chapterAt = html.indexOf('id="ch-1"');
      const notesAt = html.indexOf('id="bm-notes"');
      assert.ok(prefaceAt > 0 && chapterAt > prefaceAt && notesAt > chapterAt);
      assert.match(html, /<section class="front-matter" data-role="preface"/);
      assert.match(html, /<section class="back-matter" data-role="notes"/);

      const rawBook = book as unknown as Record<string, unknown>;
      assert.equal(rawBook["html"], undefined);
      assert.equal(rawBook["files"], undefined);
      assert.equal(rawBook["manifest"], undefined);
    });

    it("rejects unsupported content blocks deterministically", async () => {
      const book = createBook({
        title: "Unsupported",
        language: "en",
        withOpeningChapter: false,
      });
      book.chapters = [
        {
          id: "ch-bad",
          kind: "main",
          role: "chapter",
          title: "Bad",
          blocks: [
            {
              type: "table",
              id: "tbl-1",
            } as unknown as StructuralSection["blocks"][number],
          ],
        },
      ];

      await assert.rejects(
        () => buildHtml(book),
        (err: unknown) => {
          assert.ok(err instanceof UnsupportedContentError);
          assert.equal(err.blockType, "table");
          return true;
        },
      );
    });
  });

  describe("Unicode and Kannada", () => {
    it("preserves English, Kannada, and mixed Unicode without entity corruption", async () => {
      const kannadaTitle = "ಕನ್ನಡ ಕಾವ್ಯ ಸಂಗ್ರಹ";
      const kannadaHeading = "ಮೊದಲನೆಯ ಅಧ್ಯಾಯ: ಆರಂಭ";
      const kannadaParagraph =
        "ಕನ್ನಡ ನಾಡು ಮತ್ತು ನುಡಿ ಅತ್ಯಂತ ಶ್ರೀಮಂತ ಪರಂಪರೆಯನ್ನು ಹೊಂದಿದೆ.";
      const mixedText = "OpenBook — ಆಧುನಿಕ ಡಿಜಿಟಲ್ ಪುಸ್ತಕ ಮುದ್ರಣ ವ್ಯವಸ್ಥೆ.";

      const book = createBook({
        title: kannadaTitle,
        authors: ["ಕವಿ"],
        language: "kn",
        withOpeningChapter: false,
      });

      book.chapters = [
        {
          id: "ch-kn-1",
          kind: "main",
          role: "chapter",
          title: kannadaHeading,
          blocks: [
            {
              type: "paragraph",
              id: "p-kn-1",
              inlines: [{ type: "text", text: kannadaParagraph }],
            },
            {
              type: "paragraph",
              id: "p-kn-mixed",
              inlines: [
                { type: "text", text: mixedText },
                {
                  type: "strong",
                  children: [{ type: "text", text: " ಮುಖ್ಯ ಅಂಶ" }],
                },
              ],
            },
          ],
        },
      ];

      const html = (await buildHtml(book)).html;

      assert.match(html, /lang="kn"/);
      assert.ok(html.includes(kannadaTitle));
      assert.ok(html.includes(kannadaHeading));
      assert.ok(html.includes(kannadaParagraph));
      assert.ok(html.includes(mixedText));
      assert.ok(html.includes("ಕವಿ"));
      assert.match(html, /<strong> ಮುಖ್ಯ ಅಂಶ<\/strong>/);
      assert.doesNotMatch(html, /&#x0C[0-9A-Fa-f]{2};/);
      assert.doesNotMatch(html, /&#32[0-9]{2};/);
    });
  });

  describe("HTML and attribute escaping", () => {
    it("escapes special characters in text and attributes", async () => {
      const book = createBook({
        title: "Tom & Jerry <Adventures> & \"Legends\"",
        authors: ["O'Connor & Sons"],
        language: "en",
        withOpeningChapter: false,
      });

      book.chapters = [
        {
          id: "ch-special",
          kind: "main",
          role: "chapter",
          title: "Rock & Roll: A <Tale> of 'Glory'",
          blocks: [
            {
              type: "paragraph",
              id: "p-special",
              inlines: [
                {
                  type: "text",
                  text: "5 < 10 & 20 > 15; \"quotes\" and 'apostrophes'.",
                },
                {
                  type: "link",
                  href: "https://example.com/search?q=a&b=c&title=\"test\"",
                  children: [{ type: "text", text: "Link with & and quotes" }],
                },
              ],
            },
          ],
        },
      ];

      const html = (await buildHtml(book)).html;

      assert.match(
        html,
        /<title>Tom &amp; Jerry &lt;Adventures&gt; &amp; &quot;Legends&quot;<\/title>/,
      );
      assert.match(html, /<meta name="author" content="O&#39;Connor &amp; Sons">/);
      assert.match(
        html,
        /Rock &amp; Roll: A &lt;Tale&gt; of &#39;Glory&#39;/,
      );
      assert.match(
        html,
        /5 &lt; 10 &amp; 20 &gt; 15; &quot;quotes&quot; and &#39;apostrophes&#39;\./,
      );
      assert.match(
        html,
        /href="https:\/\/example\.com\/search\?q=a&amp;b=c&amp;title=&quot;test&quot;"/,
      );
      assert.doesNotMatch(html, /<script\b/i);
    });
  });

  describe("URL handling", () => {
    it("allows http, https, mailto, fragments, and relative paths", () => {
      assert.equal(sanitizeHref("https://example.com/ref"), "https://example.com/ref");
      assert.equal(sanitizeHref("http://example.com"), "http://example.com");
      assert.equal(sanitizeHref("mailto:author@example.com"), "mailto:author@example.com");
      assert.equal(sanitizeHref("#ch-1"), "#ch-1");
      assert.equal(sanitizeHref("./notes.html"), "./notes.html");
      assert.equal(sanitizeHref("assets/cover.png"), "assets/cover.png");
      assert.equal(isSafeHref("HTTPS://Example.COM/A"), true);
    });

    it("rejects javascript, data, and other unsafe schemes", () => {
      const rejected = [
        "javascript:alert(1)",
        "JAVASCRIPT:alert(1)",
        " data:text/html,<script>alert(1)</script>",
        "vbscript:msgbox(1)",
        "file:///etc/passwd",
        "blob:https://example.com/uuid",
        "about:blank",
        "//evil.example",
        "java\nscript:alert(1)",
        "https://example.com/a b",
        "",
        "   ",
        "relative\\windows",
      ];

      for (const href of rejected) {
        assert.equal(isSafeHref(href), false, `expected unsafe: ${JSON.stringify(href)}`);
        assert.throws(() => sanitizeHref(href), UnsafeUrlError);
      }
    });

    it("fails the publication when a Book link uses an unsafe href", async () => {
      const book = createBook({
        title: "Unsafe Link Book",
        language: "en",
        withOpeningChapter: false,
      });
      book.chapters = [
        {
          id: "ch-js",
          kind: "main",
          role: "chapter",
          title: "Chapter",
          blocks: [
            {
              type: "paragraph",
              id: "p-js",
              inlines: [
                {
                  type: "link",
                  href: "javascript:alert(1)",
                  children: [{ type: "text", text: "click" }],
                },
              ],
            },
          ],
        },
      ];

      await assert.rejects(
        () => buildHtml(book),
        (err: unknown) => {
          assert.ok(err instanceof UnsafeUrlError);
          assert.equal(err.code, "UNSAFE_URL");
          return true;
        },
      );
    });
  });

  describe("images, AssetResolver, figures, and captions", () => {
    it("resolves image assets and emits figure markup with alt and caption", async () => {
      const book = createBook({
        title: "Book With Image",
        language: "en",
        withOpeningChapter: false,
      });
      book.assets = [
        createTestAsset("cover-art", "image/png", { altText: "Cover illustration" }),
      ];
      book.chapters = [
        {
          id: "ch-img",
          kind: "main",
          role: "chapter",
          title: "Chapter With Image",
          blocks: [
            {
              type: "image",
              id: "img-1",
              assetId: "cover-art",
              caption: [{ type: "text", text: "Cover caption" }],
            },
          ],
        },
      ];

      const publication = await buildHtml(book, {
        assetResolver: createMemoryResolver({ "cover-art": PNG_BYTES }),
      });

      assert.match(
        publication.html,
        /<figure id="img-1">\s*<img src="assets\/cover-art\.png" alt="Cover illustration">\s*<figcaption>Cover caption<\/figcaption>\s*<\/figure>/,
      );
      const assetFile = publication.files.find((f) => f.path === "assets/cover-art.png");
      assert.ok(assetFile);
      assert.equal(assetFile.mediaType, "image/png");
      assert.ok(assetFile.content instanceof Uint8Array);
      assert.deepEqual(assetFile.content, PNG_BYTES);
    });

    it("preserves Kannada alt text and captions and emits empty alt when missing", async () => {
      const kannadaAlt = "ಚಿತ್ರ ವಿವರಣೆ - ಸುಂದರ ಪರಿಸರ";
      const kannadaCaption = "ಚಿತ್ರ ೧: ಕರ್ನಾಟಕದ ನಿಸರ್ಗ ಸೌಂದರ್ಯ";

      const book = createBook({
        title: "ಕನ್ನಡ ಚಿತ್ರ ಪುಸ್ತಕ",
        language: "kn",
        withOpeningChapter: false,
      });
      book.assets = [createTestAsset("kn-img", "image/png", { altText: kannadaAlt })];
      book.chapters = [
        {
          id: "ch-kn",
          kind: "main",
          role: "chapter",
          title: "ಅಧ್ಯಾಯ",
          blocks: [
            {
              type: "image",
              id: "img-kn",
              assetId: "kn-img",
              caption: [{ type: "text", text: kannadaCaption }],
            },
          ],
        },
      ];

      const withKannada = await buildHtml(book, {
        assetResolver: createMemoryResolver({ "kn-img": PNG_BYTES }),
      });
      assert.ok(withKannada.html.includes(kannadaAlt));
      assert.ok(withKannada.html.includes(kannadaCaption));
      assert.match(withKannada.html, new RegExp(`<figcaption>${kannadaCaption}</figcaption>`));

      const missingAltBook = createBook({
        title: "Missing Alt",
        language: "en",
        withOpeningChapter: false,
      });
      missingAltBook.assets = [createTestAsset("no-alt-img", "image/png", { altText: "" })];
      missingAltBook.chapters = [
        {
          id: "ch1",
          kind: "main",
          role: "chapter",
          title: "Chapter 1",
          blocks: [{ type: "image", id: "img-blk-1", assetId: "no-alt-img", caption: [] }],
        },
      ];

      const diagnostics: PublishingDiagnostic[] = [];
      const publication = await buildHtml(missingAltBook, {
        assetResolver: createMemoryResolver({ "no-alt-img": PNG_BYTES }),
        onDiagnostic: (d) => diagnostics.push(d),
      });

      assert.equal(diagnostics.length, 1);
      assert.equal(diagnostics[0]?.code, "MISSING_ALT_TEXT");
      assert.equal(diagnostics[0]?.severity, "warning");
      assert.match(publication.html, /<img src="assets\/no-alt-img\.png" alt="">/);
      assert.doesNotMatch(publication.html, /<figcaption>/);
    });
  });

  describe("resolver failure and missing assets", () => {
    it("rejects missing AssetResolver when image blocks exist", async () => {
      const book = createBook({
        title: "Needs Resolver",
        language: "en",
        withOpeningChapter: false,
      });
      book.assets = [createTestAsset("cover-art", "image/png")];
      book.chapters = [
        {
          id: "ch-img",
          kind: "main",
          role: "chapter",
          title: "Chapter",
          blocks: [{ type: "image", id: "img-1", assetId: "cover-art", caption: [] }],
        },
      ];

      await assert.rejects(
        () => buildHtml(book),
        (err: unknown) => {
          assert.ok(err instanceof AssetResolutionError);
          assert.equal(err.code, "MISSING_RESOLVER");
          return true;
        },
      );
    });

    it("rejects missing asset references", async () => {
      const book = createBook({
        title: "Missing Asset",
        language: "en",
        withOpeningChapter: false,
      });
      book.chapters = [
        {
          id: "ch-img",
          kind: "main",
          role: "chapter",
          title: "Chapter",
          blocks: [{ type: "image", id: "img-1", assetId: "missing-id", caption: [] }],
        },
      ];

      await assert.rejects(
        () => buildHtml(book, { assetResolver: createMemoryResolver({}) }),
        (err: unknown) => {
          assert.ok(err instanceof AssetValidationError);
          assert.equal(err.code, "MISSING_ASSET_REFERENCE");
          return true;
        },
      );
    });

    it("rejects resolver failure and empty asset bytes", async () => {
      const book = createBook({
        title: "Resolver Failures",
        language: "en",
        withOpeningChapter: false,
      });
      book.assets = [createTestAsset("cover-art", "image/png")];
      book.chapters = [
        {
          id: "ch-img",
          kind: "main",
          role: "chapter",
          title: "Chapter",
          blocks: [{ type: "image", id: "img-1", assetId: "cover-art", caption: [] }],
        },
      ];

      await assert.rejects(
        () =>
          buildHtml(book, {
            assetResolver: {
              resolve: async () => {
                throw new Error("disk missing");
              },
            },
          }),
        (err: unknown) => {
          assert.ok(err instanceof AssetResolutionError);
          assert.equal(err.code, "RESOLUTION_FAILED");
          return true;
        },
      );

      await assert.rejects(
        () =>
          buildHtml(book, {
            assetResolver: { resolve: async () => new Uint8Array() },
          }),
        (err: unknown) => {
          assert.ok(err instanceof AssetResolutionError);
          assert.equal(err.code, "EMPTY_ASSET_DATA");
          return true;
        },
      );
    });

    it("rejects unsafe asset IDs", async () => {
      const book = createBook({
        title: "Unsafe Asset",
        language: "en",
        withOpeningChapter: false,
      });
      book.assets = [createTestAsset("../escape", "image/png")];
      book.chapters = [
        {
          id: "ch-img",
          kind: "main",
          role: "chapter",
          title: "Chapter",
          blocks: [{ type: "image", id: "img-1", assetId: "../escape", caption: [] }],
        },
      ];

      await assert.rejects(
        () => buildHtml(book, { assetResolver: createMemoryResolver({}) }),
        (err: unknown) => {
          assert.ok(err instanceof AssetValidationError);
          assert.equal(err.code, "UNSAFE_ASSET_ID");
          return true;
        },
      );
    });
  });

  describe("deterministic output", () => {
    it("produces identical HTML and files for the same Book, assets, and options", async () => {
      const book = createBook({
        title: "Determinism Book",
        authors: ["Ada"],
        language: "en",
        withOpeningChapter: false,
      });
      book.assets = [createTestAsset("cover-art", "image/png", { altText: "Cover" })];
      book.chapters = [
        {
          id: "ch-1",
          kind: "main",
          role: "chapter",
          title: "One",
          blocks: [
            {
              type: "paragraph",
              id: "p-1",
              inlines: [{ type: "text", text: "Hello." }],
            },
            {
              type: "image",
              id: "img-1",
              assetId: "cover-art",
              caption: [{ type: "text", text: "Cover" }],
            },
          ],
        },
      ];

      const options = {
        assetResolver: createMemoryResolver({ "cover-art": PNG_BYTES }),
      };

      const first = await buildHtml(book, options);
      const second = await buildHtml(book, options);

      assert.equal(first.html, second.html);
      assert.deepEqual(
        first.files.map((f) => f.path),
        second.files.map((f) => f.path),
      );
      assert.equal(first.files[0]?.content, second.files[0]?.content);
      assert.deepEqual(first.files[1]?.content, second.files[1]?.content);
      assert.doesNotMatch(first.html, /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });
});
