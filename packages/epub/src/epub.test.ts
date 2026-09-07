// SPDX-License-Identifier: Apache-2.0

import assert from "node:assert/strict";
import * as nodeFs from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createBook, type StructuralSection } from "@openbook/book-model";
import { EpubCheckSubprocessAdapter } from "@openbook/validator";
import { unzipSync } from "fflate";
import {
  buildEpub,
  buildEpubArchive,
  buildEpubPackage,
  normalizeDateForZip,
  UnsupportedContentError,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");
const spikeDir = path.join(rootDir, ".cache", "spike");
const javaExe =
  process.platform === "win32"
    ? path.join(spikeDir, "temurin-21-minimal-runtime", "bin", "java.exe")
    : path.join(spikeDir, "temurin-21-minimal-runtime", "bin", "java");
const epubcheckJar = path.join(spikeDir, "epubcheck-5.3.0", "epubcheck.jar");
const hasSpikeRuntime =
  nodeFs.existsSync(javaExe) && nodeFs.existsSync(epubcheckJar);

describe("@openbook/epub: EPUB 3.3 Engine Gate 1 (In-Memory Package)", () => {
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
      typeof mimetypeFile.content === "string"
        ? mimetypeFile.content.length
        : 0,
      20,
      "mimetype content must be exactly 20 bytes",
    );

    // 2. META-INF/container.xml
    const containerFile = pkg.files.find(
      (f) => f.path === "META-INF/container.xml",
    );
    assert.ok(containerFile, "META-INF/container.xml must exist");
    assert.match(
      String(containerFile.content),
      /full-path="EPUB\/package\.opf"/,
    );
    assert.match(
      String(containerFile.content),
      /media-type="application\/oebps-package\+xml"/,
    );

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
    const cssFile = pkg.files.find(
      (f) => f.path === "EPUB/styles/openbook.css",
    );
    assert.ok(cssFile, "EPUB/styles/openbook.css must exist");
    assert.equal(cssFile.mediaType, "text/css");
    assert.match(String(cssFile.content), /line-height:\s*1\.55/);

    // 6. Content document
    const chapterFile = pkg.files.find(
      (f) => f.path === "EPUB/text/ch_001.xhtml",
    );
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
    assert.match(
      opf,
      /<dc:identifier id="pub-id">urn:isbn:978-0-123456-47-2<\/dc:identifier>/,
    );
    assert.match(opf, /<dc:creator id="creator-1">Jane Doe<\/dc:creator>/);
    assert.match(opf, /<dc:creator id="creator-2">John Smith<\/dc:creator>/);
    assert.match(
      opf,
      /<dc:description>A test book description\.<\/dc:description>/,
    );
    assert.match(opf, /<dc:publisher>OpenBook Press<\/dc:publisher>/);
    assert.match(opf, /<dc:rights>CC BY 4\.0<\/dc:rights>/);
    assert.match(
      opf,
      /<meta property="dcterms:modified">2026-05-15T12:00:00Z<\/meta>/,
    );
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
    const chapterFile = pkg.files.find(
      (f) => f.path === "EPUB/text/ch_001.xhtml",
    );
    assert.ok(chapterFile);
    const xhtml = String(chapterFile.content);

    // Headings
    assert.match(xhtml, /<h1 class="section-title">Formatted Chapter<\/h1>/);
    assert.match(xhtml, /<h2 id="h-sub1">Subheading Level 2<\/h2>/);

    // Inlines
    assert.match(
      xhtml,
      /<p id="p-formatted">Plain text, <em>emphasized text<\/em>, <strong>strong text<\/strong>, and a <a href="https:\/\/example\.com\/ref">hyperlink<\/a>\.<\/p>/,
    );

    // Quote
    assert.match(
      xhtml,
      /<blockquote id="q-1"><p>A memorable blockquote\.<\/p><\/blockquote>/,
    );

    // Lists
    assert.match(
      xhtml,
      /<ol id="list-ord">\s*<li>First item<\/li>\s*<li>Second item<\/li>\s*<\/ol>/,
    );
    assert.match(
      xhtml,
      /<ul id="list-unord">\s*<li>Bullet A<\/li>\s*<li>Bullet B<\/li>\s*<\/ul>/,
    );
  });

  it("preserves English, Kannada, and mixed Unicode code points without entity corruption", () => {
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
    const opf = String(
      pkg.files.find((f) => f.path === "EPUB/package.opf")?.content,
    );
    assert.match(opf, new RegExp(kannadaTitle));
    assert.match(opf, /<dc:language>kn<\/dc:language>/);
    assert.match(opf, /<dc:creator id="creator-1">ಕವಿ<\/dc:creator>/);

    // 2. Check Nav preserves Kannada titles
    const nav = String(
      pkg.files.find((f) => f.path === "EPUB/nav.xhtml")?.content,
    );
    assert.match(nav, new RegExp(kannadaHeading));
    assert.match(nav, /xml:lang="kn"/);
    assert.match(nav, /lang="kn"/);

    // 3. Check Chapter XHTML preserves exact Kannada characters as native UTF-8
    const chapterFile = pkg.files.find(
      (f) => f.path === "EPUB/text/ch_001.xhtml",
    );
    assert.ok(chapterFile);
    const xhtml = String(chapterFile.content);

    assert.match(xhtml, /xml:lang="kn"/);
    assert.match(xhtml, /lang="kn"/);
    assert.ok(
      xhtml.includes(kannadaHeading),
      "Heading must contain literal Kannada Unicode characters",
    );
    assert.ok(
      xhtml.includes(kannadaParagraph),
      "Paragraph must contain literal Kannada Unicode characters",
    );
    assert.ok(
      xhtml.includes(mixedText),
      "Mixed English/Kannada text must contain literal Unicode characters",
    );
    assert.match(xhtml, /<strong> ಮುಖ್ಯ ಅಂಶ<\/strong>/);

    // Ensure NO numeric character reference corruption (e.g. &#x0C85; or &#3205;)
    assert.doesNotMatch(
      xhtml,
      /&#x0C[0-9A-Fa-f]{2};/,
      "Must not escape Indic characters to hex entities",
    );
    assert.doesNotMatch(
      xhtml,
      /&#32[0-9]{2};/,
      "Must not escape Indic characters to decimal entities",
    );
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
    };

    book.chapters = [chapter];

    const pkg = buildEpubPackage(book);

    // OPF escaping
    const opf = String(
      pkg.files.find((f) => f.path === "EPUB/package.opf")?.content,
    );
    assert.match(
      opf,
      /<dc:title id="title">Tom &amp; Jerry &lt;Adventures&gt; &amp; &quot;Legends&quot;<\/dc:title>/,
    );
    assert.match(
      opf,
      /<dc:creator id="creator-1">O&apos;Connor &amp; Sons<\/dc:creator>/,
    );

    // Chapter XHTML escaping
    const chapterXhtml = String(
      pkg.files.find((f) => f.path === "EPUB/text/ch_001.xhtml")?.content,
    );
    assert.match(
      chapterXhtml,
      /Rock &amp; Roll: A &lt;Tale&gt; of &apos;Glory&apos;/,
    );
    assert.match(
      chapterXhtml,
      /5 &lt; 10 &amp; 20 &gt; 15; &quot;quotes&quot; and &apos;apostrophes&apos;\./,
    );
    assert.match(
      chapterXhtml,
      /href="https:\/\/example\.com\/search\?q=a&amp;b=c&amp;title=&quot;test&quot;"/,
    );
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
    assert.equal(
      snapshotBefore,
      snapshotAfter,
      "Canonical Book Model must not be mutated",
    );

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
        blocks: [
          {
            type: "paragraph",
            id: "p-tp",
            inlines: [{ type: "text", text: "Title" }],
          },
        ],
      },
    ];

    // Add main chapter
    book.chapters = [
      {
        id: "sec-main-ch1",
        kind: "main",
        role: "chapter",
        title: "Chapter One",
        blocks: [
          {
            type: "paragraph",
            id: "p-c1",
            inlines: [{ type: "text", text: "Story starts here." }],
          },
        ],
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
    assert.match(
      nav,
      /<a epub:type="titlepage" href="text\/front_001\.xhtml">Title Page<\/a>/,
    );
    assert.match(
      nav,
      /<a epub:type="bodymatter" href="text\/ch_001\.xhtml">Chapter One<\/a>/,
    );

    // 2. NO NCX anywhere
    const ncxFile = pkg.files.find((f) => f.path.includes("ncx"));
    assert.equal(ncxFile, undefined, "toc.ncx must not be generated by default");

    const ncxManifest = pkg.manifest.find(
      (m) => m.id.includes("ncx") || m.href.includes("ncx"),
    );
    assert.equal(ncxManifest, undefined, "NCX must not be listed in manifest");

    const opf = String(
      pkg.files.find((f) => f.path === "EPUB/package.opf")?.content,
    );
    assert.doesNotMatch(
      opf,
      /toc="ncx"/,
      "Spine must not declare toc attribute for NCX",
    );
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
        assert.ok(
          err instanceof UnsupportedContentError,
          "Error must be instance of UnsupportedContentError",
        );
        assert.equal(err.blockType, "image");
        assert.equal(err.blockId, "img-1");
        assert.match(err.message, /image.*not supported in EPUB Gate 1/i);
        return true;
      },
    );
  });
});

describe("@openbook/epub: EPUB 3.3 Engine Gate 2 (Deterministic OCF ZIP Packaging)", () => {
  it("produces valid, non-empty EPUB Uint8Array binary via buildEpub", () => {
    const book = createBook({
      title: "Gate 2 Binary Verification",
      authors: ["Author A"],
      language: "en",
    });

    const epubBytes = buildEpub(book);
    assert.ok(epubBytes instanceof Uint8Array);
    assert.ok(epubBytes.length > 500, "EPUB binary must have substantial content");
  });

  it("enforces strict OCF mimetype requirements on the raw ZIP binary", () => {
    const book = createBook({
      title: "Mimetype OCF Verification",
      language: "en",
    });

    const epubBytes = buildEpub(book);

    // 1. Magic number: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    assert.equal(epubBytes[0], 0x50);
    assert.equal(epubBytes[1], 0x4b);
    assert.equal(epubBytes[2], 0x03);
    assert.equal(epubBytes[3], 0x04);

    // 2. Compression method: bytes 8-9 must be 0 (STORE / uncompressed)
    const compressionMethod = epubBytes[8]! | (epubBytes[9]! << 8);
    assert.equal(compressionMethod, 0, "mimetype must be uncompressed (STORE)");

    // 3. Filename length: bytes 26-27 must be 8 ("mimetype")
    const filenameLen = epubBytes[26]! | (epubBytes[27]! << 8);
    assert.equal(filenameLen, 8);

    // 4. Extra field length: bytes 28-29 must be 0 (no extra field on mimetype)
    const extraFieldLen = epubBytes[28]! | (epubBytes[29]! << 8);
    assert.equal(extraFieldLen, 0, "mimetype entry must not have an extra field");

    // 5. Filename: bytes 30-37 must be "mimetype"
    const filename = new TextDecoder("ascii").decode(epubBytes.slice(30, 38));
    assert.equal(filename, "mimetype");

    // 6. Data: bytes 38-57 must be "application/epub+zip"
    const content = new TextDecoder("ascii").decode(epubBytes.slice(38, 58));
    assert.equal(content, "application/epub+zip");
  });

  it("verifies ZIP readability and extracted OCF package structure", () => {
    const book = createBook({
      title: "Extraction Test Book",
      authors: ["Extractor"],
      language: "en",
    });

    const epubBytes = buildEpub(book);
    const unzipped = unzipSync(epubBytes);

    // Verify all core files are readable in the archive
    assert.ok(unzipped["mimetype"], "mimetype must exist in archive");
    assert.ok(
      unzipped["META-INF/container.xml"],
      "META-INF/container.xml must exist in archive",
    );
    assert.ok(
      unzipped["EPUB/package.opf"],
      "EPUB/package.opf must exist in archive",
    );
    assert.ok(
      unzipped["EPUB/nav.xhtml"],
      "EPUB/nav.xhtml must exist in archive",
    );
    assert.ok(
      unzipped["EPUB/styles/openbook.css"],
      "EPUB/styles/openbook.css must exist in archive",
    );
    assert.ok(
      unzipped["EPUB/text/ch_001.xhtml"],
      "EPUB/text/ch_001.xhtml must exist in archive",
    );

    // Check mimetype content
    assert.equal(
      new TextDecoder().decode(unzipped["mimetype"]),
      "application/epub+zip",
    );
  });

  it("verifies extracted container.xml correctly references EPUB/package.opf", () => {
    const book = createBook({ title: "Container Reference Test", language: "en" });
    const epubBytes = buildEpub(book);
    const unzipped = unzipSync(epubBytes);

    const containerXml = new TextDecoder().decode(
      unzipped["META-INF/container.xml"],
    );
    assert.match(containerXml, /full-path="EPUB\/package\.opf"/);
    assert.match(containerXml, /media-type="application\/oebps-package\+xml"/);
  });

  it("guarantees byte-for-byte deterministic output across repeated builds", () => {
    const book = createBook({
      title: "Byte Determinism Book",
      authors: ["Deterministic Author"],
      language: "en",
      withOpeningChapter: true,
    });
    book.metadata.publishedAt = "2026-06-01T00:00:00Z";

    const b1 = buildEpub(book);
    const b2 = buildEpub(book);

    assert.equal(b1.length, b2.length);
    assert.equal(
      Buffer.from(b1).equals(Buffer.from(b2)),
      true,
      "buildEpub must yield byte-for-byte identical binary output",
    );
  });

  it("guarantees deterministic output with explicit modifiedDate without system clock", () => {
    const book = createBook({
      title: "Explicit Date Determinism",
      language: "en",
    });

    const fixedDate = new Date("2026-07-15T14:30:00Z");

    const b1 = buildEpub(book, { modifiedDate: fixedDate });
    const b2 = buildEpub(book, { modifiedDate: fixedDate });

    assert.equal(Buffer.from(b1).equals(Buffer.from(b2)), true);
  });

  it("produces distinct binary outputs for different timestamps", () => {
    const book = createBook({
      title: "Distinct Timestamps Test",
      language: "en",
    });

    const b1 = buildEpub(book, { modifiedDate: "2026-01-01T00:00:00Z" });
    const b2 = buildEpub(book, { modifiedDate: "2026-02-01T00:00:00Z" });

    assert.equal(
      Buffer.from(b1).equals(Buffer.from(b2)),
      false,
      "Different timestamps must produce distinct binary outputs",
    );
  });

  it("normalizes Date objects so local getters match UTC components for fflate DOS serialization", () => {
    const isoString = "2026-07-15T14:30:45Z";
    const normalized = normalizeDateForZip(isoString);
    assert.equal(normalized.getFullYear(), 2026);
    assert.equal(normalized.getMonth(), 6); // July is index 6
    assert.equal(normalized.getDate(), 15);
    assert.equal(normalized.getHours(), 14);
    assert.equal(normalized.getMinutes(), 30);
    assert.equal(normalized.getSeconds(), 45);

    // Also with Date input
    const dateObj = new Date("2026-11-20T08:15:22Z");
    const normalizedFromObj = normalizeDateForZip(dateObj);
    assert.equal(normalizedFromObj.getFullYear(), 2026);
    assert.equal(normalizedFromObj.getMonth(), 10); // November is index 10
    assert.equal(normalizedFromObj.getDate(), 20);
    assert.equal(normalizedFromObj.getHours(), 8);
    assert.equal(normalizedFromObj.getMinutes(), 15);
    assert.equal(normalizedFromObj.getSeconds(), 22);

    // Fallback date
    const fallback = normalizeDateForZip(undefined);
    assert.equal(fallback.getFullYear(), 2026);
    assert.equal(fallback.getMonth(), 0);
    assert.equal(fallback.getDate(), 1);
    assert.equal(fallback.getHours(), 0);
    assert.equal(fallback.getMinutes(), 0);
    assert.equal(fallback.getSeconds(), 0);
  });

  it("enforces that ZIP entry MS-DOS timestamp bytes represent exact UTC values independent of host timezone", () => {
    const book = createBook({
      title: "MS-DOS Byte Check",
      language: "en",
    });

    const epubBytes = buildEpub(book, { modifiedDate: "2026-01-01T00:00:00Z" });
    // In local file header for the first entry ("mimetype"):
    // Offset 0..3: Signature 0x04034b50 (PK\x03\x04)
    // Offset 10..11: Last mod file time (little-endian uint16)
    // Offset 12..13: Last mod file date (little-endian uint16)
    // For 2026-01-01 00:00:00:
    // Time: (0 << 11) | (0 << 5) | 0 = 0 -> [0x00, 0x00]
    // Date: ((2026 - 1980) << 9) | (1 << 5) | 1 = (46 << 9) | 32 | 1 = 23585 = 0x5c21 -> [0x21, 0x5c] (33, 92)
    assert.equal(epubBytes[0], 0x50);
    assert.equal(epubBytes[1], 0x4b);
    assert.equal(epubBytes[2], 0x03);
    assert.equal(epubBytes[3], 0x04);
    assert.equal(epubBytes[10], 0x00, "Time byte 0 must be 0 for 00:00:00 UTC");
    assert.equal(epubBytes[11], 0x00, "Time byte 1 must be 0 for 00:00:00 UTC");
    assert.equal(epubBytes[12], 0x21, "Date byte 0 must be 0x21 (33) for 2026-01-01");
    assert.equal(epubBytes[13], 0x5c, "Date byte 1 must be 0x5c (92) for 2026-01-01");
  });

  it("verifies byte-for-byte binary determinism across different simulated host timezones via subprocess", () => {
    const timezones = [
      "UTC",
      "Asia/Singapore",
      "America/New_York",
      "Europe/London",
      "Asia/Kolkata",
      "Pacific/Auckland",
    ];

    const book = createBook({
      title: "Cross TZ Determinism",
      language: "en",
    });
    const bookJson = JSON.stringify(book);
    const indexJsUrl = pathToFileURL(path.join(__dirname, "index.js")).href;
    const childScript = `
      import { buildEpub } from "${indexJsUrl}";
      const book = JSON.parse(process.argv[1]);
      const bytes = buildEpub(book, { modifiedDate: "2026-01-01T00:00:00Z" });
      process.stdout.write(Buffer.from(bytes).toString("hex"));
    `;

    const outputs = new Set<string>();
    for (const tz of timezones) {
      const hex = execFileSync(
        process.execPath,
        ["--input-type=module", "-e", childScript, bookJson],
        {
          cwd: rootDir,
          env: { ...process.env, TZ: tz },
          encoding: "utf-8",
        },
      ).trim();
      outputs.add(hex);
    }

    assert.equal(
      outputs.size,
      1,
      `Expected identical binary output across all timezones, but got ${outputs.size} distinct outputs`,
    );
  });

  it("preserves Kannada and mixed Unicode text intact through the complete ZIP round-trip", () => {
    const kannadaTitle = "ಕನ್ನಡ ಕಾವ್ಯ ಪ್ರಪಂಚ";
    const kannadaBody = "ಕನ್ನಡ ಸಾಹಿತ್ಯವು ಸಾವಿರಾರು ವರ್ಷಗಳ ಇತಿಹಾಸವನ್ನು ಹೊಂದಿದೆ.";
    const mixedBody = "OpenBook ತಂತ್ರಜ್ಞಾನ ಡಿಜಿಟಲ್ ಮುದ್ರಣಕ್ಕೆ ಸಹಾಯಕ.";

    const book = createBook({
      title: kannadaTitle,
      authors: ["ಕನ್ನಡ ಲೇಖಕ"],
      language: "kn",
      withOpeningChapter: false,
    });

    book.chapters = [
      {
        id: "ch-kn-zip",
        kind: "main",
        role: "chapter",
        title: "ಅಧ್ಯಾಯ ೧",
        blocks: [
          {
            type: "paragraph",
            id: "p-kn-1",
            inlines: [{ type: "text", text: kannadaBody }],
          },
          {
            type: "paragraph",
            id: "p-kn-2",
            inlines: [{ type: "text", text: mixedBody }],
          },
        ],
      },
    ];

    const epubBytes = buildEpub(book);
    const unzipped = unzipSync(epubBytes);

    const xhtmlContent = new TextDecoder("utf-8").decode(
      unzipped["EPUB/text/ch_001.xhtml"],
    );
    assert.ok(
      xhtmlContent.includes("ಅಧ್ಯಾಯ ೧"),
      "Extracted XHTML must contain literal chapter title in Kannada",
    );
    assert.ok(
      xhtmlContent.includes(kannadaBody),
      "Extracted XHTML must contain literal body in Kannada",
    );
    assert.ok(
      xhtmlContent.includes(mixedBody),
      "Extracted XHTML must contain mixed Kannada/English text",
    );

    const opfContent = new TextDecoder("utf-8").decode(
      unzipped["EPUB/package.opf"],
    );
    assert.ok(
      opfContent.includes(kannadaTitle),
      "Extracted OPF must contain literal Kannada book title",
    );
    assert.ok(
      opfContent.includes("ಕನ್ನಡ ಲೇಖಕ"),
      "Extracted OPF must contain literal Kannada author name",
    );
  });

  it("preserves XML and HTML escaping through ZIP extraction without corruption", () => {
    const book = createBook({
      title: "Tom & Jerry <Adventures> & \"Legends\"",
      authors: ["O'Connor & Sons"],
      language: "en",
      withOpeningChapter: false,
    });

    book.chapters = [
      {
        id: "ch-escape",
        kind: "main",
        role: "chapter",
        title: "Rock & Roll <Tales>",
        blocks: [
          {
            type: "paragraph",
            id: "p-esc",
            inlines: [{ type: "text", text: "5 < 10 & 20 > 15; 'quotes'." }],
          },
        ],
      },
    ];

    const epubBytes = buildEpub(book);
    const unzipped = unzipSync(epubBytes);

    const xhtmlContent = new TextDecoder("utf-8").decode(
      unzipped["EPUB/text/ch_001.xhtml"],
    );
    assert.match(xhtmlContent, /Rock &amp; Roll &lt;Tales&gt;/);
    assert.match(xhtmlContent, /5 &lt; 10 &amp; 20 &gt; 15; &apos;quotes&apos;\./);
  });

  it("verifies no NCX file or references exist in the ZIP archive", () => {
    const book = createBook({ title: "No NCX Verification", language: "en" });
    const epubBytes = buildEpub(book);
    const unzipped = unzipSync(epubBytes);

    const paths = Object.keys(unzipped);
    const hasNcxFile = paths.some((p) => p.toLowerCase().includes("ncx"));
    assert.equal(hasNcxFile, false, "No .ncx file should exist in the archive");

    const opfContent = new TextDecoder("utf-8").decode(
      unzipped["EPUB/package.opf"],
    );
    assert.doesNotMatch(
      opfContent,
      /toc="ncx"/,
      "package.opf spine must not declare toc='ncx'",
    );
  });

  it("retains deterministic rejection of Books containing image blocks via buildEpub", () => {
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
            type: "image",
            id: "img-reject",
            assetId: "cover-art",
            caption: [],
          },
        ],
      },
    ];

    assert.throws(
      () => buildEpub(book),
      (err: unknown) => {
        assert.ok(err instanceof UnsupportedContentError);
        assert.equal(err.blockType, "image");
        assert.equal(err.blockId, "img-reject");
        return true;
      },
    );
  });

  it("buildEpubArchive consumes EpubPackage only and does not require Book", () => {
    // Manually construct an EpubPackage without any Book instance
    const manualPkg = {
      files: [
        {
          path: "mimetype",
          mediaType: "text/plain",
          content: "application/epub+zip",
        },
        {
          path: "META-INF/container.xml",
          mediaType: "application/xml",
          content:
            '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
        },
        {
          path: "EPUB/package.opf",
          mediaType: "application/oebps-package+xml",
          content:
            '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">test</dc:identifier><dc:title>T</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">2026-01-01T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine></spine></package>',
        },
        {
          path: "EPUB/nav.xhtml",
          mediaType: "application/xhtml+xml",
          content:
            '<?xml version="1.0"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>N</title></head><body><nav epub:type="toc" id="toc"><ol><li><a href="nav.xhtml">N</a></li></ol></nav></body></html>',
        },
      ],
      metadata: {
        title: "T",
        language: "en",
        identifier: "test",
        modified: "2026-01-01T00:00:00Z",
      },
      manifest: [],
      spine: [],
    };

    const zipBytes = buildEpubArchive(manualPkg);
    assert.ok(zipBytes instanceof Uint8Array);
    assert.ok(zipBytes.length > 0);

    const unzipped = unzipSync(zipBytes);
    assert.equal(
      new TextDecoder().decode(unzipped["mimetype"]),
      "application/epub+zip",
    );
  });

  it(
    "validates generated .epub with official EPUBCheck 5.3.0 and achieves zero errors and zero warnings",
    { skip: !hasSpikeRuntime },
    async () => {
      const book = createBook({
        title: "Official EPUBCheck Conformance Book",
        authors: ["OpenBook Validation Team"],
        language: "en",
        withOpeningChapter: false,
      });
      book.metadata.identifier =
        "urn:uuid:7b2432e1-4c12-4217-a021-998877665544";
      book.metadata.publishedAt = "2026-01-01T00:00:00Z";
      book.metadata.publisher = "OpenBook Press";
      book.metadata.description =
        "Conformance fixture for EPUB 3.3 Engine Gate 2.";

      // Front matter: Title Page
      book.frontMatter = [
        {
          id: "sec-front-tp",
          kind: "front",
          role: "title-page",
          title: "Title Page",
          blocks: [
            {
              type: "paragraph",
              id: "p-tp-1",
              inlines: [
                {
                  type: "text",
                  text: "Official EPUBCheck Conformance Publication",
                },
              ],
            },
          ],
        },
      ];

      // Chapter: Formatted story with headings, paragraphs, blockquotes, lists, links
      book.chapters = [
        {
          id: "sec-main-ch1",
          kind: "main",
          role: "chapter",
          title: "First Conformance Chapter",
          blocks: [
            {
              type: "heading",
              id: "h-c1-1",
              level: 2,
              inlines: [{ type: "text", text: "Overview of Conformance" }],
            },
            {
              type: "paragraph",
              id: "p-c1-1",
              inlines: [
                {
                  type: "text",
                  text: "This document is generated by OpenBook's pure TypeScript EPUB 3.3 engine. It contains ",
                },
                {
                  type: "emphasis",
                  children: [{ type: "text", text: "emphasized text" }],
                },
                { type: "text", text: " and " },
                {
                  type: "strong",
                  children: [{ type: "text", text: "strong assertions" }],
                },
                { type: "text", text: "." },
              ],
            },
            {
              type: "quote",
              id: "q-c1-1",
              inlines: [
                {
                  type: "text",
                  text: "Standards compliance is the foundation of durable digital books.",
                },
              ],
            },
            {
              type: "list",
              id: "list-c1-1",
              ordered: true,
              items: [
                [{ type: "text", text: "Deterministic OCF ZIP layout" }],
                [{ type: "text", text: "Semantic XHTML5 markup" }],
                [{ type: "text", text: "Accessible navigation" }],
              ],
            },
          ],
        },
      ];

      const epubBytes = buildEpub(book);

      const tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "openbook-gate2-test-"),
      );
      const tempEpubPath = path.join(tempDir, "conformance-test.epub");

      try {
        await fs.writeFile(tempEpubPath, epubBytes);

        const adapter = new EpubCheckSubprocessAdapter({
          javaExecutablePath: javaExe,
          epubcheckJarPath: epubcheckJar,
        });

        const report = await adapter.validateEpub(tempEpubPath);

        assert.equal(report.validatorName, "EPUBCheck");
        assert.equal(report.validatorVersion, "5.3.0");
        assert.equal(
          report.isValid,
          true,
          `EPUBCheck reported errors: ${JSON.stringify(report.messages)}`,
        );
        assert.equal(
          report.summary.totalErrors,
          0,
          `Expected 0 errors, got ${report.summary.totalErrors}`,
        );
        assert.equal(
          report.summary.totalWarnings,
          0,
          `Expected 0 warnings, got ${report.summary.totalWarnings}`,
        );
        assert.equal(report.summary.totalFatal, 0);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    },
  );
});
