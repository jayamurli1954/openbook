// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createBook, type StructuralSection } from "@openbook/book-model";
import { buildEpubPackage } from "./epub-builder.js";
import { UnsupportedContentError } from "./types.js";

describe("@openbook/epub: EPUB 3.3 Engine Gate 1", () => {
  it("generates minimum conforming EPUB 3.3 package structure", () => {
    const book = createBook({
      title: "Conforming Minimal Book",
      authors: ["Author One"],
      language: "en",
    });

    const pkg = buildEpubPackage(book);

    // Verify in-memory files structure
    assert.ok(Array.isArray(pkg.files));
    assert.ok(pkg.files.length >= 5);

    // 1. mimetype
    const mimetypeFile = pkg.files.find((f) => f.path === "mimetype");
    assert.ok(mimetypeFile, "mimetype file must exist");
    assert.equal(mimetypeFile.mediaType, "text/plain");
    assert.equal(mimetypeFile.content, "application/epub+zip");
    assert.equal(
      typeof mimetypeFile.content === "string" ? mimetypeFile.content.length : 0,
      20,
      "mimetype content must be exactly 20 bytes",
    );

    // 2. META-INF/container.xml
    const containerFile = pkg.files.find((f) => f.path === "META-INF/container.xml");
    assert.ok(containerFile, "META-INF/container.xml must exist");
    assert.match(String(containerFile.content), /full-path="EPUB\/package\.opf"/);
    assert.match(String(containerFile.content), /media-type="application\/oebps-package\+xml"/);

    // 3. EPUB/package.opf
    const opfFile = pkg.files.find((f) => f.path === "EPUB/package.opf");
    assert.ok(opfFile, "EPUB/package.opf must exist");
    assert.equal(opfFile.mediaType, "application/oebps-package+xml");
    assert.match(String(opfFile.content), /<package[^>]+version="3\.0"/);

    // 4. EPUB/nav.xhtml
    const navFile = pkg.files.find((f) => f.path === "EPUB/nav.xhtml");
    assert.ok(navFile, "EPUB/nav.xhtml must exist");
    assert.equal(navFile.mediaType, "application/xhtml+xml");
    assert.match(String(navFile.content), /epub:type="toc"/);

    // 5. EPUB/styles/openbook.css
    const cssFile = pkg.files.find((f) => f.path === "EPUB/styles/openbook.css");
    assert.ok(cssFile, "EPUB/styles/openbook.css must exist");
    assert.equal(cssFile.mediaType, "text/css");
    assert.match(String(cssFile.content), /line-height:\s*1\.55/);

    // 6. Content document
    const chapterFile = pkg.files.find((f) => f.path === "EPUB/text/ch_001.xhtml");
    assert.ok(chapterFile, "EPUB/text/ch_001.xhtml must exist");
    assert.equal(chapterFile.mediaType, "application/xhtml+xml");

    // Manifest check
    const navManifest = pkg.manifest.find((m) => m.id === "nav");
    assert.ok(navManifest);
    assert.equal(navManifest.properties, "nav");

    // Spine check
    assert.ok(pkg.spine.includes("sec-ch-001"));
  });

  it("maps Book Model metadata to Dublin Core in package.opf", () => {
    const book = createBook({
      title: "Metadata Test Volume",
      authors: ["Jane Doe", "John Smith"],
      language: "en-US",
    });
    book.metadata.identifier = "urn:isbn:978-0-123456-47-2";
    book.metadata.description = "A test book description.";
    book.metadata.publisher = "OpenBook Press";
    book.metadata.rights = "CC BY 4.0";
    book.metadata.publishedAt = "2026-05-15T12:00:00Z";

    const pkg = buildEpubPackage(book);
    const opfFile = pkg.files.find((f) => f.path === "EPUB/package.opf");
    assert.ok(opfFile);
    const opf = String(opfFile.content);

    assert.match(opf, /<dc:title id="title">Metadata Test Volume<\/dc:title>/);
    assert.match(opf, /<dc:language>en-US<\/dc:language>/);
    assert.match(opf, /<dc:identifier id="pub-id">urn:isbn:978-0-123456-47-2<\/dc:identifier>/);
    assert.match(opf, /<dc:creator id="creator-1">Jane Doe<\/dc:creator>/);
    assert.match(opf, /<dc:creator id="creator-2">John Smith<\/dc:creator>/);
    assert.match(opf, /<dc:description>A test book description\.<\/dc:description>/);
    assert.match(opf, /<dc:publisher>OpenBook Press<\/dc:publisher>/);
    assert.match(opf, /<dc:rights>CC BY 4\.0<\/dc:rights>/);
    assert.match(opf, /<meta property="dcterms:modified">2026-05-15T12:00:00Z<\/meta>/);
  });

  it("maps content blocks and inline formatting to semantic XHTML5", () => {
    const book = createBook({
      title: "Rich Formatting Test",
      language: "en",
      withOpeningChapter: false,
    });

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

    const pkg = buildEpubPackage(book);
    const chapterFile = pkg.files.find((f) => f.path === "EPUB/text/ch_001.xhtml");
    assert.ok(chapterFile);
    const xhtml = String(chapterFile.content);

    // Headings
    assert.match(xhtml, /<h1 class="section-title">Formatted Chapter<\/h1>/);
    assert.match(xhtml, /<h2 id="h-sub1">Subheading Level 2<\/h2>/);

    // Inlines
    assert.match(xhtml, /<p id="p-formatted">Plain text, <em>emphasized text<\/em>, <strong>strong text<\/strong>, and a <a href="https:\/\/example\.com\/ref">hyperlink<\/a>\.<\/p>/);

    // Quote
    assert.match(xhtml, /<blockquote id="q-1"><p>A memorable blockquote\.<\/p><\/blockquote>/);

    // Lists
    assert.match(xhtml, /<ol id="list-ord">\s*<li>First item<\/li>\s*<li>Second item<\/li>\s*<\/ol>/);
    assert.match(xhtml, /<ul id="list-unord">\s*<li>Bullet A<\/li>\s*<li>Bullet B<\/li>\s*<\/ul>/);
  });

  it("preserves English, Kannada, and mixed Unicode code points without entity corruption", () => {
    const kannadaTitle = "ಕನ್ನಡ ಕಾವ್ಯ ಸಂಗ್ರಹ";
    const kannadaHeading = "ಮೊದಲನೆಯ ಅಧ್ಯಾಯ: ಆರಂಭ";
    const kannadaParagraph = "ಕನ್ನಡ ನಾಡು ಮತ್ತು ನುಡಿ ಅತ್ಯಂತ ಶ್ರೀಮಂತ ಪರಂಪರೆಯನ್ನು ಹೊಂದಿದೆ.";
    const mixedText = "OpenBook — ಆಧುನಿಕ ಡಿಜಿಟಲ್ ಪುಸ್ತಕ ಮುದ್ರಣ ವ್ಯವಸ್ಥೆ.";

    const book = createBook({
      title: kannadaTitle,
      authors: ["ಕವಿ"],
      language: "kn",
      withOpeningChapter: false,
    });

    const chapter: StructuralSection = {
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
    };

    book.chapters = [chapter];

    const pkg = buildEpubPackage(book);

    // 1. Check OPF preserves Kannada title and language
    const opf = String(pkg.files.find((f) => f.path === "EPUB/package.opf")?.content);
    assert.match(opf, new RegExp(kannadaTitle));
    assert.match(opf, /<dc:language>kn<\/dc:language>/);
    assert.match(opf, /<dc:creator id="creator-1">ಕವಿ<\/dc:creator>/);

    // 2. Check Nav preserves Kannada titles
    const nav = String(pkg.files.find((f) => f.path === "EPUB/nav.xhtml")?.content);
    assert.match(nav, new RegExp(kannadaHeading));
    assert.match(nav, /xml:lang="kn"/);
    assert.match(nav, /lang="kn"/);

    // 3. Check Chapter XHTML preserves exact Kannada characters as native UTF-8
    const chapterFile = pkg.files.find((f) => f.path === "EPUB/text/ch_001.xhtml");
    assert.ok(chapterFile);
    const xhtml = String(chapterFile.content);

    assert.match(xhtml, /xml:lang="kn"/);
    assert.match(xhtml, /lang="kn"/);
    assert.ok(xhtml.includes(kannadaHeading), "Heading must contain literal Kannada Unicode characters");
    assert.ok(xhtml.includes(kannadaParagraph), "Paragraph must contain literal Kannada Unicode characters");
    assert.ok(xhtml.includes(mixedText), "Mixed English/Kannada text must contain literal Unicode characters");
    assert.match(xhtml, /<strong> ಮುಖ್ಯ ಅಂಶ<\/strong>/);

    // Ensure NO numeric character reference corruption (e.g. &#x0C85; or &#3205;)
    assert.doesNotMatch(xhtml, /&#x0C[0-9A-Fa-f]{2};/, "Must not escape Indic characters to hex entities");
    assert.doesNotMatch(xhtml, /&#32[0-9]{2};/, "Must not escape Indic characters to decimal entities");
  });

  it("safely escapes XML and HTML special characters in content and attributes", () => {
    const book = createBook({
      title: "Tom & Jerry <Adventures> & \"Legends\"",
      authors: ["O'Connor & Sons"],
      language: "en",
      withOpeningChapter: false,
    });

    const chapter: StructuralSection = {
      id: "ch-special",
      kind: "main",
      role: "chapter",
      title: "Rock & Roll: A <Tale> of 'Glory'",
      blocks: [
        {
          type: "paragraph",
          id: "p-special",
          inlines: [
            { type: "text", text: "5 < 10 & 20 > 15; \"quotes\" and 'apostrophes'." },
            {
              type: "link",
              href: "https://example.com/search?q=a&b=c&title=\"test\"",
              children: [{ type: "text", text: "Link with & and quotes" }],
            },
          ],
        },
      ],
    };

    book.chapters = [chapter];

    const pkg = buildEpubPackage(book);

    // OPF escaping
    const opf = String(pkg.files.find((f) => f.path === "EPUB/package.opf")?.content);
    assert.match(opf, /<dc:title id="title">Tom &amp; Jerry &lt;Adventures&gt; &amp; &quot;Legends&quot;<\/dc:title>/);
    assert.match(opf, /<dc:creator id="creator-1">O&apos;Connor &amp; Sons<\/dc:creator>/);

    // Chapter XHTML escaping
    const chapterXhtml = String(pkg.files.find((f) => f.path === "EPUB/text/ch_001.xhtml")?.content);
    assert.match(chapterXhtml, /Rock &amp; Roll: A &lt;Tale&gt; of &apos;Glory&apos;/);
    assert.match(chapterXhtml, /5 &lt; 10 &amp; 20 &gt; 15; &quot;quotes&quot; and &apos;apostrophes&apos;\./);
    assert.match(chapterXhtml, /href="https:\/\/example\.com\/search\?q=a&amp;b=c&amp;title=&quot;test&quot;"/);
  });

  it("strictly preserves Book Model immutability and causes zero reverse bleed", () => {
    const book = createBook({
      title: "Immutability Test",
      language: "en",
    });

    // Deep freeze snapshot before building EPUB
    const snapshotBefore = JSON.stringify(book);

    const pkg = buildEpubPackage(book);
    assert.ok(pkg);

    const snapshotAfter = JSON.stringify(book);
    assert.equal(snapshotBefore, snapshotAfter, "Canonical Book Model must not be mutated");

    // Explicit check that no EPUB packaging keys were injected
    const rawBook = book as unknown as Record<string, unknown>;
    assert.equal(rawBook["manifest"], undefined);
    assert.equal(rawBook["spine"], undefined);
    assert.equal(rawBook["opf"], undefined);
    assert.equal(rawBook["container"], undefined);
    assert.equal(rawBook["nav"], undefined);
    assert.equal(rawBook["ncx"], undefined);
  });

  it("guarantees deterministic output without relying on runtime system clock", () => {
    const book = createBook({
      title: "Determinism Verification",
      authors: ["Fixed Author"],
      language: "en",
      withOpeningChapter: true,
    });
    book.metadata.publishedAt = "2026-06-01T00:00:00Z";

    // Run 1
    const pkg1 = buildEpubPackage(book);

    // Run 2 (without passing explicit modifiedDate, verifying no clock dependency)
    const pkg2 = buildEpubPackage(book);

    assert.equal(pkg1.files.length, pkg2.files.length);
    for (let i = 0; i < pkg1.files.length; i++) {
      const file1 = pkg1.files[i]!;
      const file2 = pkg2.files[i]!;
      assert.equal(file1.path, file2.path);
      assert.equal(file1.mediaType, file2.mediaType);
      assert.equal(String(file1.content), String(file2.content));
    }

    assert.deepEqual(pkg1.manifest, pkg2.manifest);
    assert.deepEqual(pkg1.spine, pkg2.spine);
    assert.deepEqual(pkg1.metadata, pkg2.metadata);
  });

  it("handles navigation and landmarks without generating NCX by default", () => {
    const book = createBook({
      title: "Navigation & Landmarks Book",
      language: "en",
      withOpeningChapter: false,
    });

    // Add front matter title-page
    book.frontMatter = [
      {
        id: "sec-front-tp",
        kind: "front",
        role: "title-page",
        title: "Title Page",
        blocks: [{ type: "paragraph", id: "p-tp", inlines: [{ type: "text", text: "Title" }] }],
      },
    ];

    // Add main chapter
    book.chapters = [
      {
        id: "sec-main-ch1",
        kind: "main",
        role: "chapter",
        title: "Chapter One",
        blocks: [{ type: "paragraph", id: "p-c1", inlines: [{ type: "text", text: "Story starts here." }] }],
      },
    ];

    const pkg = buildEpubPackage(book);

    // 1. Navigation document check
    const navFile = pkg.files.find((f) => f.path === "EPUB/nav.xhtml");
    assert.ok(navFile);
    const nav = String(navFile.content);

    // TOC entries
    assert.match(nav, /<nav epub:type="toc" id="toc" role="doc-toc">/);
    assert.match(nav, /<a href="text\/front_001\.xhtml">Title Page<\/a>/);
    assert.match(nav, /<a href="text\/ch_001\.xhtml">Chapter One<\/a>/);

    // Landmarks supported by actual Book Model semantics
    assert.match(nav, /<nav epub:type="landmarks" id="landmarks" hidden="">/);
    assert.match(nav, /<a epub:type="titlepage" href="text\/front_001\.xhtml">Title Page<\/a>/);
    assert.match(nav, /<a epub:type="bodymatter" href="text\/ch_001\.xhtml">Chapter One<\/a>/);

    // 2. NO NCX anywhere
    const ncxFile = pkg.files.find((f) => f.path.includes("ncx"));
    assert.equal(ncxFile, undefined, "toc.ncx must not be generated by default");

    const ncxManifest = pkg.manifest.find((m) => m.id.includes("ncx") || m.href.includes("ncx"));
    assert.equal(ncxManifest, undefined, "NCX must not be listed in manifest");

    const opf = String(pkg.files.find((f) => f.path === "EPUB/package.opf")?.content);
    assert.doesNotMatch(opf, /toc="ncx"/, "Spine must not declare toc attribute for NCX");
  });

  it("explicitly and deterministically rejects Book containing unsupported image blocks", () => {
    const book = createBook({
      title: "Book With Image",
      language: "en",
      withOpeningChapter: false,
    });

    book.chapters = [
      {
        id: "ch-img",
        kind: "main",
        role: "chapter",
        title: "Chapter With Image",
        blocks: [
          {
            type: "paragraph",
            id: "p-before",
            inlines: [{ type: "text", text: "Before image." }],
          },
          {
            type: "image",
            id: "img-1",
            assetId: "asset-cover-art",
            caption: [{ type: "text", text: "Cover illustration" }],
          },
        ],
      },
    ];

    assert.throws(
      () => buildEpubPackage(book),
      (err: unknown) => {
        assert.ok(err instanceof UnsupportedContentError, "Error must be instance of UnsupportedContentError");
        assert.equal(err.blockType, "image");
        assert.equal(err.blockId, "img-1");
        assert.match(err.message, /image.*not supported in EPUB Gate 1/i);
        return true;
      },
    );
  });
});
