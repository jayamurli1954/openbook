// SPDX-License-Identifier: Apache-2.0
// ADR-0040 Slice 2 — Word `.docx` text and structure → Book.
import test from "node:test";
import * as assert from "node:assert/strict";
import { strToU8, zipSync, type Zippable } from "fflate";
import { validateBook, type Book, type ContentBlock, type InlineSpan } from "@openbook/book-model";
import { IMPORTED_IMAGE_PLACEHOLDER_PREFIX, ImportService, type ImportOptions, type ImportResult } from "../index.js";

// --- document builder ----------------------------------------------------------------------

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const M = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`;

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface RunOptions {
  readonly b?: boolean;
  readonly i?: boolean;
  readonly style?: string;
  readonly sz?: number;
  readonly font?: string;
  readonly hidden?: boolean;
}

function r(text: string, o: RunOptions = {}): string {
  const props =
    (o.style ? `<w:rStyle w:val="${o.style}"/>` : "") +
    (o.font ? `<w:rFonts w:ascii="${o.font}" w:hAnsi="${o.font}"/>` : "") +
    (o.b ? "<w:b/>" : "") +
    (o.i ? "<w:i/>" : "") +
    (o.sz ? `<w:sz w:val="${o.sz}"/>` : "") +
    (o.hidden ? "<w:vanish/>" : "");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
}

interface ParagraphOptions {
  readonly style?: string;
  readonly numId?: number;
  readonly ilvl?: number;
  readonly pageBreakBefore?: boolean;
  readonly markDeleted?: boolean;
  readonly sectionBreak?: boolean;
}

function p(content: string, o: ParagraphOptions = {}): string {
  const props =
    (o.style ? `<w:pStyle w:val="${o.style}"/>` : "") +
    (o.pageBreakBefore ? "<w:pageBreakBefore/>" : "") +
    (o.numId !== undefined ? `<w:numPr><w:ilvl w:val="${o.ilvl ?? 0}"/><w:numId w:val="${o.numId}"/></w:numPr>` : "") +
    (o.markDeleted ? `<w:rPr><w:del w:id="9" w:author="A"/></w:rPr>` : "") +
    (o.sectionBreak ? `<w:sectPr/>` : "");
  return `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}${content}</w:p>`;
}

/** Plain paragraph shortcut. */
const t = (text: string, o: ParagraphOptions = {}): string => p(r(text), o);
const pageBreak = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;

interface PictureOptions {
  readonly rid?: string;
  readonly alt?: string;
  readonly title?: string;
  readonly anchor?: boolean;
  /** r:link instead of r:embed: a picture linked to an outside file. */
  readonly linked?: boolean;
  /** Word's SVG picture: a:blip is the PNG fallback, asvg:svgBlip the SVG. */
  readonly svgRid?: string;
}

function pictureRun(o: PictureOptions = {}): string {
  const wrap = o.anchor ? "anchor" : "inline";
  const blipRef = o.linked ? `r:link="${o.rid ?? "rId22"}"` : `r:embed="${o.rid ?? "rId20"}"`;
  const svg = o.svgRid
    ? `<a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="${o.svgRid}"/></a:ext></a:extLst>`
    : "";
  return (
    `<w:r><w:drawing><wp:${wrap} xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:docPr id="1" name="Picture 1"${o.alt !== undefined ? ` descr="${esc(o.alt)}"` : ""}${o.title !== undefined ? ` title="${esc(o.title)}"` : ""}/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData>` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip ${blipRef}>${svg}</a:blip></pic:blipFill></pic:pic>` +
    `</a:graphicData></a:graphic></wp:${wrap}></w:drawing></w:r>`
  );
}

const picture = pictureRun();
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46]);

function field(instr: string, result: string): string {
  return (
    `<w:r><w:fldChar w:fldCharType="begin"/></w:r>` +
    `<w:r><w:instrText xml:space="preserve"> ${esc(instr)} </w:instrText></w:r>` +
    `<w:r><w:fldChar w:fldCharType="separate"/></w:r>` +
    r(result) +
    `<w:r><w:fldChar w:fldCharType="end"/></w:r>`
  );
}

const STYLES =
  XML +
  `<w:styles xmlns:w="${W}">` +
  `<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault></w:docDefaults>` +
  `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="1"/></w:pPr></w:style>` +
  // A localized display name: matched through basedOn, not by name.
  `<w:style w:type="paragraph" w:customStyle="1" w:styleId="KathaShirshike"><w:name w:val="ಕಥೆ ಶೀರ್ಷಿಕೆ"/><w:basedOn w:val="Heading1"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Caption"><w:name w:val="caption"/><w:basedOn w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="TOC1"><w:name w:val="toc 1"/><w:basedOn w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="TOCHeading"><w:name w:val="TOC Heading"/><w:basedOn w:val="Heading1"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/></w:style>` +
  `<w:style w:type="character" w:styleId="Strong"><w:name w:val="Strong"/></w:style>` +
  `<w:style w:type="character" w:styleId="Emphasis"><w:name w:val="Emphasis"/></w:style>` +
  `<w:style w:type="character" w:customStyle="1" w:styleId="HiddenNote"><w:name w:val="Hidden Note"/><w:rPr><w:vanish/></w:rPr></w:style>` +
  `</w:styles>`;

const NUMBERING =
  XML +
  `<w:numbering xmlns:w="${W}">` +
  `<w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum>` +
  `<w:abstractNum w:abstractNumId="2"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>` +
  `<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>` +
  `<w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num>` +
  `<w:num w:numId="3"><w:abstractNumId w:val="2"/></w:num>` +
  `</w:numbering>`;

interface CoreProps {
  readonly title?: string;
  readonly creator?: string;
  readonly language?: string;
}

interface DocxSpec {
  readonly body: string;
  readonly core?: CoreProps;
  readonly comments?: boolean;
  readonly styles?: string | null;
}

function makeDocx(spec: DocxSpec): Uint8Array {
  const core = spec.core;
  const docRels =
    XML +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    (spec.styles !== null ? `<Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/>` : "") +
    `<Relationship Id="rId2" Type="${R}/numbering" Target="numbering.xml"/>` +
    `<Relationship Id="rId10" Type="${R}/hyperlink" Target="https://example.com/krishna" TargetMode="External"/>` +
    `<Relationship Id="rId11" Type="${R}/hyperlink" Target="javascript:alert(1)" TargetMode="External"/>` +
    `<Relationship Id="rId20" Type="${R}/image" Target="media/image1.png"/>` +
    `<Relationship Id="rId21" Type="${R}/image" Target="media/image2.jpeg"/>` +
    `<Relationship Id="rId22" Type="${R}/image" Target="https://example.com/outside.png" TargetMode="External"/>` +
    `<Relationship Id="rId23" Type="${R}/image" Target="embeddings/oleObject1.bin"/>` +
    `<Relationship Id="rId24" Type="${R}/image" Target="media/image3.svg"/>` +
    `<Relationship Id="rId25" Type="${R}/image" Target="media/my%20drawing.png"/>` +
    (spec.comments ? `<Relationship Id="rId30" Type="${R}/comments" Target="comments.xml"/>` : "") +
    `</Relationships>`;
  const files: Record<string, string> = {
    "[Content_Types].xml":
      XML +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `</Types>`,
    "_rels/.rels":
      XML +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/>` +
      (core ? `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` : "") +
      `</Relationships>`,
    "word/_rels/document.xml.rels": docRels,
    "word/document.xml": XML + `<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:m="${M}"><w:body>${spec.body}<w:sectPr/></w:body></w:document>`,
    "word/numbering.xml": NUMBERING,
  };
  if (spec.styles !== null) files["word/styles.xml"] = spec.styles ?? STYLES;
  if (core) {
    files["docProps/core.xml"] =
      XML +
      `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">` +
      (core.title !== undefined ? `<dc:title>${esc(core.title)}</dc:title>` : "") +
      (core.creator !== undefined ? `<dc:creator>${esc(core.creator)}</dc:creator>` : "") +
      (core.language !== undefined ? `<dc:language>${core.language}</dc:language>` : "") +
      `<dcterms:created>2024-01-01T00:00:00Z</dcterms:created>` +
      `</cp:coreProperties>`;
  }
  if (spec.comments) files["word/comments.xml"] = XML + `<w:comments xmlns:w="${W}"/>`;
  const zippable: Zippable = {};
  for (const [name, value] of Object.entries(files)) zippable[name] = strToU8(value);
  zippable["word/media/image1.png"] = PNG;
  zippable["word/media/image2.jpeg"] = JPEG;
  zippable["word/media/my%20drawing.png"] = PNG;
  zippable["word/media/image3.svg"] = strToU8(`<svg xmlns="http://www.w3.org/2000/svg"/>`);
  zippable["word/embeddings/oleObject1.bin"] = new Uint8Array([1, 2, 3]);
  return zipSync(zippable, { mtime: new Date("2026-10-28T00:00:00Z") });
}

async function importBytes(bytes: Uint8Array, options?: ImportOptions): Promise<ImportResult> {
  return new ImportService().import({ format: "docx", bytes, filename: "manuscript.docx" }, options);
}

async function importBook(spec: DocxSpec, options?: ImportOptions): Promise<{ book: Book; result: ImportResult }> {
  const result = await importBytes(makeDocx(spec), options);
  assert.equal(result.success, true, JSON.stringify(result.issues));
  assert.ok(result.book);
  assert.equal(validateBook(result.book).filter((issue) => issue.severity === "error").length, 0);
  return { book: result.book, result };
}

function textOf(spans: readonly InlineSpan[]): string {
  return spans.map((span) => (span.type === "text" ? span.text : textOf(span.children))).join("");
}

function blockText(block: ContentBlock): string {
  if (block.type === "list") return block.items.map(textOf).join(" | ");
  if (block.type === "image") return textOf(block.caption);
  return textOf(block.inlines);
}

function allText(book: Book): string {
  return [...book.frontMatter, ...book.chapters, ...book.backMatter]
    .flatMap((section) => [section.title, ...section.blocks.map(blockText)])
    .join("\n");
}

function paragraphInlines(block: ContentBlock | undefined): InlineSpan[] {
  return block?.type === "paragraph" ? block.inlines : [];
}

function codes(result: ImportResult): string[] {
  return result.issues.map((issue) => issue.code);
}

// --- English book with heading styles -------------------------------------------------------

const ENGLISH = [
  p(r("Little Krishna's Wisdom Stories"), { style: "Title" }),
  p(r("Twenty-five tales for children"), { style: "Subtitle" }),
  t("Foreword", { style: "Heading1" }),
  t("These stories were told to me by my grandmother."),
  p(r("Preface", { b: true })),
  t("I wrote them down for my own children."),
  t("The Butter Thief", { style: "Heading1" }),
  p(r("Krishna loved ") + r("butter", { b: true }) + r(" more than ") + r("anything", { i: true }) + r(".")),
  t("In the kitchen", { style: "Heading2" }),
  p(`<w:hyperlink r:id="rId10">${r("Read more online")}</w:hyperlink>` + r(" or ") + `<w:hyperlink w:anchor="ch2">${r("skip ahead")}</w:hyperlink>`),
  t("Milk", { numId: 1 }),
  t("Curd", { numId: 1 }),
  t("Butter", { numId: 1 }),
  t("Wake up early", { numId: 2 }),
  t("Help your mother", { numId: 2 }),
  t("Be kind to cows.", { style: "Quote" }),
  t("The Serpent Kaliya", { style: "Heading1" }),
  p(r("A ", {}) + r("strong", { style: "Strong" }) + r(" and ") + r("gentle", { style: "Emphasis" }) + r(" story.")),
  t("Govardhan Hill", { style: "Heading1" }),
  t("The whole village sheltered under the hill."),
].join("");

test("imports an English book with heading styles into front matter and chapters", async () => {
  const { book, result } = await importBook({ body: ENGLISH });

  assert.equal(book.metadata.title, "Little Krishna's Wisdom Stories");
  assert.equal(book.metadata.subtitle, "Twenty-five tales for children");
  assert.equal(book.metadata.language, "en-US");
  assert.equal(book.metadata.publishedAt, "", "dcterms:created is never used as publishedAt");

  assert.deepEqual(
    book.frontMatter.map((s) => [s.kind, s.role, s.title]),
    [
      ["front", "foreword", "Foreword"],
      ["front", "preface", "Preface"],
    ],
  );
  assert.deepEqual(book.chapters.map((s) => s.title), ["The Butter Thief", "The Serpent Kaliya", "Govardhan Hill"]);
  assert.ok(book.chapters.every((s) => s.kind === "main" && s.role === "chapter"));
  assert.ok(!allText(book).includes("Twenty-five tales"), "subtitle is metadata, not body text");

  const first = book.chapters[0]!.blocks;
  assert.deepEqual(first.map((b) => b.type), ["paragraph", "heading", "paragraph", "list", "list", "quote"]);
  assert.deepEqual(paragraphInlines(first[0]), [
    { type: "text", text: "Krishna loved " },
    { type: "strong", children: [{ type: "text", text: "butter" }] },
    { type: "text", text: " more than " },
    { type: "emphasis", children: [{ type: "text", text: "anything" }] },
    { type: "text", text: "." },
  ]);
  const heading = first[1]!;
  assert.ok(heading.type === "heading" && heading.level === 2 && textOf(heading.inlines) === "In the kitchen");
  const links = first[2]!;
  assert.ok(links.type === "paragraph");
  assert.deepEqual(links.inlines, [
    { type: "link", href: "https://example.com/krishna", children: [{ type: "text", text: "Read more online" }] },
    { type: "text", text: " or skip ahead" },
  ]);
  const [bullets, numbers] = [first[3]!, first[4]!];
  assert.ok(bullets.type === "list" && !bullets.ordered && bullets.items.length === 3);
  assert.ok(numbers.type === "list" && numbers.ordered && numbers.items.length === 2);

  const styled = book.chapters[1]!.blocks[0]!;
  assert.ok(styled.type === "paragraph");
  assert.deepEqual(styled.inlines, [
    { type: "text", text: "A " },
    { type: "strong", children: [{ type: "text", text: "strong" }] },
    { type: "text", text: " and " },
    { type: "emphasis", children: [{ type: "text", text: "gentle" }] },
    { type: "text", text: " story." },
  ]);

  assert.ok(codes(result).includes("DOCX_FORMATTING_DROPPED"));
  assert.equal(result.stats.sectionCount, 5);
});

test("the same bytes always give the same Book; different files never share ids", async () => {
  const bytes = makeDocx({ body: ENGLISH });
  const a = await importBytes(bytes);
  const b = await importBytes(bytes);
  assert.deepEqual(a.book, b.book);
  const other = await importBytes(makeDocx({ body: ENGLISH + t("One more line.") }));
  assert.notEqual(a.book!.chapters[0]!.id, other.book!.chapters[0]!.id);
});

// --- metadata ---------------------------------------------------------------------------------

test("uses core properties; ignores Word's default title; overrides win", async () => {
  const body = p(r("The Real Title"), { style: "Title" }) + t("Chapter One", { style: "Heading1" }) + t("Text.");
  const fromCore = await importBook({ body, core: { title: "Krishna Stories", creator: "Muralidhar Rao; A. N. Other" } });
  assert.equal(fromCore.book.metadata.title, "Krishna Stories");
  assert.deepEqual(fromCore.book.metadata.authors, ["Muralidhar Rao", "A. N. Other"]);
  assert.ok(codes(fromCore.result).includes("DOCX_AUTHOR_FROM_PROPERTIES"));
  assert.ok(!allText(fromCore.book).includes("The Real Title"), "the Title paragraph is not body text");

  const defaultTitle = await importBook({ body, core: { title: "Document1" } });
  assert.equal(defaultTitle.book.metadata.title, "The Real Title");

  const overridden = await importBook({ body, core: { title: "Krishna Stories", creator: "PC-USER" } }, {
    metadataOverrides: { title: "Override", authors: ["Real Author"] },
  });
  assert.equal(overridden.book.metadata.title, "Override");
  assert.deepEqual(overridden.book.metadata.authors, ["Real Author"]);
});

test("falls back to the file name when nothing names the book", async () => {
  const { book } = await importBook({ body: t("Chapter", { style: "Heading1" }) + t("Text.") });
  assert.equal(book.metadata.title, "manuscript");
});

// --- Kannada book without heading styles ---------------------------------------------------------

const KN_TITLE = "ಪುಟ್ಟ ಕೃಷ್ಣನ ಜಾಣ್ಮೆಯ ಕಥೆಗಳು";
const KN_STORIES = ["ಬೆಣ್ಣೆ ಕಳ್ಳ", "ಕಾಳಿಂಗ ಮರ್ದನ", "ಗೋವರ್ಧನ ಗಿರಿ"];

const KANNADA = [
  p(r(KN_TITLE, { b: true, sz: 40 })),
  t("ಮುರಳೀಧರ ರಾವ್"),
  pageBreak,
  p(r("ಪರಿವಿಡಿ", { b: true })),
  t("ಮುನ್ನುಡಿ\t೩"),
  t(`${KN_STORIES[0]} ........ 5`),
  t(`${KN_STORIES[1]}\t೧೨`),
  t(`${KN_STORIES[2]} 21`),
  p(r("ಮುನ್ನುಡಿ", { b: true }), { pageBreakBefore: true }),
  t("ಈ ಕಥೆಗಳು ನನ್ನ ಅಜ್ಜಿ ಹೇಳಿದವು."),
  p(r(KN_STORIES[0]!, { b: true }), { pageBreakBefore: true }),
  t("ಕೃಷ್ಣನಿಗೆ ಬೆಣ್ಣೆ ಎಂದರೆ ತುಂಬಾ ಇಷ್ಟ."),
  p(r(KN_STORIES[1]!, { b: true }), { pageBreakBefore: true }),
  t("ಯಮುನಾ ನದಿಯಲ್ಲಿ ಕಾಳಿಂಗ ಇದ್ದ."),
  p(r(KN_STORIES[2]!, { b: true }), { pageBreakBefore: true }),
  t("ಊರಿನವರೆಲ್ಲ ಬೆಟ್ಟದ ಕೆಳಗೆ ನಿಂತರು."),
].join("");

test("imports a Kannada book with no heading styles using its typed contents page", async () => {
  const { book, result } = await importBook({ body: KANNADA, core: { creator: "ಮುರಳೀಧರ ರಾವ್" } });

  assert.equal(book.metadata.language, "kn", "Kannada text wins over the en-US style default");
  assert.ok(codes(result).includes("DOCX_LANGUAGE_FROM_TEXT"));
  assert.ok(codes(result).includes("DOCX_CHAPTERS_FROM_CONTENTS"));
  assert.ok(codes(result).includes("DOCX_TOC_REMOVED"));

  assert.deepEqual(book.frontMatter.map((s) => [s.role, s.title]), [
    ["custom", KN_TITLE],
    ["foreword", "ಮುನ್ನುಡಿ"],
  ]);
  assert.deepEqual(book.chapters.map((s) => s.title), KN_STORIES);
  assert.equal(blockText(book.chapters[0]!.blocks[0]!), "ಕೃಷ್ಣನಿಗೆ ಬೆಣ್ಣೆ ಎಂದರೆ ತುಂಬಾ ಇಷ್ಟ.");
  assert.ok(!allText(book).includes("ಪರಿವಿಡಿ"), "the typed contents page is gone");
  assert.ok(!allText(book).includes("........"));
});

test("drops a title page that only repeats the title and author", async () => {
  const body = [
    p(r("Little Krishna", { b: true })),
    t("by Muralidhar Rao"),
    t("Chapter One", { style: "Heading1" }),
    t("Text."),
  ].join("");
  const { book, result } = await importBook({ body, core: { title: "Little Krishna", creator: "Muralidhar Rao" } });
  assert.equal(book.frontMatter.length, 0);
  assert.ok(!codes(result).includes("DOCX_FRONT_MATTER_REVIEW"));
});

test("puts unrecognised text before the first chapter in a front section for review", async () => {
  const body = t("For Amma and Appa") + t("With love") + t("Chapter One", { style: "Heading1" }) + t("Text.");
  const { book, result } = await importBook({ body });
  assert.deepEqual(book.frontMatter.map((s) => [s.role, s.title, s.blocks.map(blockText)]), [
    ["custom", "For Amma and Appa", ["With love"]],
  ]);
  assert.ok(codes(result).includes("DOCX_FRONT_MATTER_REVIEW"));
});

test("guesses chapters from bold titles at the top of a page when there is no contents page", async () => {
  const body = [
    p(r("The Butter Thief", { b: true })),
    t("Krishna loved butter."),
    p(r("The Serpent", { b: true }), { pageBreakBefore: true }),
    t("Kaliya lived in the river."),
    pageBreak,
    p(r("The Hill", { sz: 36 })),
    t("Everyone sheltered."),
    p(r("Not a title, just bold.", { b: true })),
  ].join("");
  const { book, result } = await importBook({ body });
  assert.deepEqual(book.chapters.map((s) => s.title), ["The Butter Thief", "The Serpent", "The Hill"]);
  assert.ok(codes(result).includes("DOCX_CHAPTERS_FROM_FORMATTING"));
  assert.ok(allText(book).includes("Not a title, just bold."));
});

test("imports everything as one chapter when no chapter titles can be found", async () => {
  const { book, result } = await importBook({ body: t("Once upon a time.") + t("The end.") });
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0]!.blocks.length, 2);
  assert.ok(codes(result).includes("DOCX_NO_CHAPTERS"));
});

test("matches heading styles through basedOn, whatever their display name", async () => {
  const body = t("ಮೊದಲ ಕಥೆ", { style: "KathaShirshike" }) + t("ಪಠ್ಯ.") + t("ಎರಡನೇ ಕಥೆ", { style: "KathaShirshike" }) + t("ಪಠ್ಯ.");
  const { book } = await importBook({ body });
  assert.deepEqual(book.chapters.map((s) => s.title), ["ಮೊದಲ ಕಥೆ", "ಎರಡನೇ ಕಥೆ"]);
});

test("front-matter titles count only before the first chapter", async () => {
  const body = [
    t("Foreword", { style: "Heading1" }),
    t("Why I wrote this."),
    t("Introduction", { style: "Heading1" }),
    t("Krishna was born in Mathura."),
    t("The Butter Thief", { style: "Heading1" }),
    t("Story."),
    t("Acknowledgements", { style: "Heading1" }),
    t("Thanks to everyone."),
  ].join("");
  const { book } = await importBook({ body });
  assert.deepEqual(book.frontMatter.map((s) => s.role), ["foreword", "introduction"]);
  assert.deepEqual(book.chapters.map((s) => s.title), ["The Butter Thief", "Acknowledgements"]);
});

test("splits on Heading 2 with the heading-2 strategy, and keeps one chapter with single-chapter", async () => {
  const body = t("Part One", { style: "Heading1" }) + t("A", { style: "Heading2" }) + t("x") + t("B", { style: "Heading2" }) + t("y");
  const h2 = await importBook({ body }, { splitStrategy: "heading-2" });
  assert.deepEqual(h2.book.chapters.map((s) => s.title), ["A", "B"]);
  const single = await importBook({ body }, { splitStrategy: "single-chapter" });
  assert.equal(single.book.chapters.length, 1);
});

// --- tables of contents and fields --------------------------------------------------------------

test("removes Word's generated table of contents (field, styles, and content control)", async () => {
  const tocField =
    p(`<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> TOC \\o "1-3" \\h </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>` + r("The Butter Thief 1"), { style: "TOC1" }) +
    p(r("The Serpent 4") + `<w:r><w:fldChar w:fldCharType="end"/></w:r>`, { style: "TOC1" });
  const sdt =
    `<w:sdt><w:sdtPr><w:docPartObj><w:docPartGallery w:val="Table of Contents"/></w:docPartObj></w:sdtPr>` +
    `<w:sdtContent>${t("Contents", { style: "TOCHeading" })}${t("Should vanish 2", { style: "TOC1" })}</w:sdtContent></w:sdt>`;
  const body = sdt + tocField + t("The Butter Thief", { style: "Heading1" }) + t("Story.") + t("The Serpent", { style: "Heading1" }) + t("Story.");
  const { book, result } = await importBook({ body });
  assert.deepEqual(book.chapters.map((s) => s.title), ["The Butter Thief", "The Serpent"]);
  assert.equal(book.frontMatter.length, 0);
  assert.ok(!allText(book).includes("Should vanish"));
  assert.ok(!allText(book).includes(" 1"));
  assert.ok(codes(result).includes("DOCX_TOC_REMOVED"));
});

test("never emits field instructions; keeps field results by type", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(r("Visit ") + field('HYPERLINK "https://example.com/krishna"', "our site") + r(".")) +
    p(r("Figure ") + field("SEQ Figure \\* ARABIC", "1") + r(" shows Krishna.")) +
    p(r("Page ") + field("PAGE", "7")) +
    p(r("Picture: ") + field('INCLUDEPICTURE "https://evil.example/x.png" \\d', "[picture]")) +
    p(`<w:fldSimple w:instr=" HYPERLINK &quot;mailto:author@example.com&quot; ">${r("Write to me")}</w:fldSimple>`) +
    p(field('HYPERLINK \\l "chapter2"', "see chapter two"));
  const { book, result } = await importBook({ body });
  const text = allText(book);
  for (const leaked of ["HYPERLINK", "SEQ", "INCLUDEPICTURE", "PAGE", "evil.example", "[picture]", "7"]) {
    assert.ok(!text.includes(leaked), `leaked ${leaked}`);
  }
  const blocks = book.chapters[0]!.blocks;
  assert.deepEqual(paragraphInlines(blocks[0]), [
    { type: "text", text: "Visit " },
    { type: "link", href: "https://example.com/krishna", children: [{ type: "text", text: "our site" }] },
    { type: "text", text: "." },
  ]);
  assert.equal(blockText(blocks[1]!), "Figure 1 shows Krishna.");
  assert.deepEqual(paragraphInlines(blocks[4]), [
    { type: "link", href: "mailto:author@example.com", children: [{ type: "text", text: "Write to me" }] },
  ]);
  assert.deepEqual(paragraphInlines(blocks[5]), [{ type: "text", text: "see chapter two" }]);
  assert.ok(codes(result).includes("DOCX_EXTERNAL_CONTENT_IGNORED"));
});

test("keeps unsafe links as plain text", async () => {
  const body = t("Chapter", { style: "Heading1" }) + p(`<w:hyperlink r:id="rId11">${r("click me")}</w:hyperlink>`);
  const { book, result } = await importBook({ body });
  assert.deepEqual(paragraphInlines(book.chapters[0]!.blocks[0]), [
    { type: "text", text: "click me" },
  ]);
  assert.ok(codes(result).includes("DOCX_LINKS_REMOVED"));
});

// --- tracked changes ----------------------------------------------------------------------------

test("reads tracked changes as accepted: moves appear once, deleted paragraph marks join", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(r("Krishna ") + `<w:ins w:id="1" w:author="A">${r("happily ")}</w:ins>` + `<w:del w:id="2" w:author="A"><w:r><w:delText>sadly </w:delText></w:r></w:del>` + r("ate.")) +
    p(`<w:moveFrom w:id="3" w:author="A">${r("Moved sentence.")}</w:moveFrom>`) +
    p(r("First half "), { markDeleted: true }) +
    p(r("second half.")) +
    p(`<w:moveTo w:id="4" w:author="A">${r("Moved sentence.")}</w:moveTo>`);
  const { book, result } = await importBook({ body });
  assert.deepEqual(book.chapters[0]!.blocks.map(blockText), ["Krishna happily ate.", "First half second half.", "Moved sentence."]);
  assert.ok(codes(result).includes("DOCX_TRACKED_CHANGES"));
});

// --- lists, tables, and things left out ------------------------------------------------------------

test("separates lists by numbering and flattens nested items with a warning", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    t("One", { numId: 2 }) + t("Two", { numId: 2 }) +
    t("Again one", { numId: 3 }) +
    t("Fruit", { numId: 1 }) + t("Mango", { numId: 1, ilvl: 1 });
  const { book, result } = await importBook({ body });
  const lists = book.chapters[0]!.blocks;
  assert.deepEqual(lists.map(blockText), ["One | Two", "Again one", "Fruit | Mango"]);
  assert.ok(codes(result).includes("DOCX_LIST_FLATTENED"));
});

test("reports what it leaves out, once each, in plain language", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(r("A note") + `<w:r><w:footnoteReference w:id="1"/></w:r>` + r(".")) +
    `<w:tbl><w:tr><w:tc>${t("Cell one")}</w:tc><w:tc>${t("Cell two")}</w:tc></w:tr></w:tbl>` +
    p(picture) +
    t("Figure 1: Krishna with the cows", { style: "Caption" }) +
    p(`<w:r><w:pict><v:shape xmlns:v="urn:schemas-microsoft-com:vml"><v:textbox><w:txbxContent>${t("Boxed text")}</w:txbxContent></v:textbox></v:shape></w:pict></w:r>`) +
    p(`<m:oMath><m:r><m:t>x</m:t></m:r></m:oMath>`) +
    p(r("Commented") + `<w:r><w:commentReference w:id="0"/></w:r>`);
  const { book, result } = await importBook({ body, comments: true });
  const text = allText(book);
  assert.ok(text.includes("Cell one") && text.includes("Cell two"));
  assert.ok(!text.includes("Boxed text"));
  const image = book.chapters[0]!.blocks.find((block) => block.type === "image");
  assert.ok(image && image.type === "image");
  assert.equal(textOf(image.caption), "Figure 1: Krishna with the cows");
  const found = codes(result);
  for (const code of [
    "DOCX_FOOTNOTES_SKIPPED",
    "DOCX_TABLES_FLATTENED",
    "DOCX_TEXT_BOXES_SKIPPED",
    "DOCX_EQUATIONS_SKIPPED",
    "DOCX_COMMENTS_SKIPPED",
  ]) {
    assert.equal(found.filter((c) => c === code).length, 1, code);
  }
  assert.ok(result.issues.every((issue) => issue.severity !== "error" && issue.severity !== "fatal"));
});

test("warns about pre-Unicode Kannada fonts", async () => {
  const body = t("Chapter", { style: "Heading1" }) + p(r("PÀxÉ", { font: "Nudi 01 e" }));
  const { result } = await importBook({ body });
  const issue = result.issues.find((i) => i.code === "DOCX_LEGACY_KANNADA_FONT");
  assert.ok(issue && issue.message.includes("Nudi 01 e"));
});

test("works without a styles part", async () => {
  const { book } = await importBook({ body: t("Hello.") + t("World."), styles: null });
  assert.equal(book.chapters[0]!.blocks.length, 2);
});

// --- pictures (Slice 3) -------------------------------------------------------------------------

test("returns pictures as payloads; image blocks follow their paragraph with alt text and caption", async () => {
  const body =
    t("The Butter Thief", { style: "Heading1" }) +
    p(r("Krishna by the river.") + pictureRun({ alt: "Krishna with the cows" })) +
    t("Figure 1: At the river", { style: "Caption" }) +
    p(pictureRun({ rid: "rId21", title: "Yashoda", anchor: true })) +
    t("Story text.");
  const { book, result } = await importBook({ body });

  const blocks = book.chapters[0]!.blocks;
  assert.deepEqual(blocks.map((b) => b.type), ["paragraph", "image", "image", "paragraph"]);
  const [first, second] = [blocks[1]!, blocks[2]!];
  assert.ok(first.type === "image" && second.type === "image");
  assert.ok(first.assetId.startsWith(IMPORTED_IMAGE_PLACEHOLDER_PREFIX));
  assert.equal(textOf(first.caption), "Figure 1: At the river");
  assert.deepEqual(second.caption, []);
  assert.equal(book.assets.length, 0, "the caller ingests the bytes and adds AssetRefs");

  assert.deepEqual(
    result.images?.map((image) => [image.placeholderId, image.sourceName, image.altText, image.bytes.length]),
    [
      [first.assetId, "image1.png", "Krishna with the cows", PNG.length],
      [second.assetId, "image2.jpeg", "Yashoda", JPEG.length],
    ],
  );
  assert.deepEqual([...result.images![0]!.bytes], [...PNG]);
  assert.ok(!codes(result).includes("DOCX_PICTURES_NOT_YET_IMPORTED"));
});

test("the same picture used twice is one payload", async () => {
  const body = t("Chapter", { style: "Heading1" }) + p(pictureRun()) + t("Between.") + p(pictureRun({ alt: "Late alt" }));
  const { book, result } = await importBook({ body });
  const images = book.chapters[0]!.blocks.filter((block) => block.type === "image");
  assert.equal(images.length, 2);
  assert.equal(result.images?.length, 1);
  assert.equal(result.images?.[0]?.altText, "Late alt", "the first non-empty alt text is kept");
  assert.ok(images.every((block) => block.type === "image" && block.assetId === result.images?.[0]?.placeholderId));
});

test("uses the PNG fallback of an SVG picture and reads VML pictures", async () => {
  const vml =
    `<w:r><w:pict><v:shape xmlns:v="urn:schemas-microsoft-com:vml" alt="Old-style picture">` +
    `<v:imagedata r:id="rId21"/></v:shape></w:pict></w:r>`;
  const body = t("Chapter", { style: "Heading1" }) + p(pictureRun({ svgRid: "rId24" })) + p(vml);
  const { result } = await importBook({ body });
  assert.deepEqual(result.images?.map((image) => [image.sourceName, image.altText]), [
    ["image1.png", ""],
    ["image2.jpeg", "Old-style picture"],
  ]);
});

test("never fetches linked pictures, and leaves out pictures it may not read", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(r("Linked: ") + pictureRun({ linked: true })) +
    p(r("Embedded object: ") + pictureRun({ rid: "rId23" }));
  const { book, result } = await importBook({ body });
  assert.equal(book.chapters[0]!.blocks.filter((block) => block.type === "image").length, 0);
  assert.equal(result.images, undefined);
  assert.ok(codes(result).includes("DOCX_LINKED_PICTURES_SKIPPED"));
  assert.ok(codes(result).includes("DOCX_PICTURES_UNREADABLE"));
});

test("keeps a title-page picture in a front section", async () => {
  const body = p(pictureRun({ alt: "Cover art" })) + t("Chapter", { style: "Heading1" }) + t("Text.");
  const { book, result } = await importBook({ body });
  assert.deepEqual(book.frontMatter.map((s) => [s.title, s.blocks.map((b) => b.type)]), [["Title page", ["image"]]]);
  assert.equal(result.images?.length, 1);
});

// --- Slice 3 review regressions ------------------------------------------------------------------

test("keeps pictures anchored to chapter titles, front-matter titles, and the Title paragraph", async () => {
  const body =
    p(r("Little Krishna") + pictureRun({ alt: "Cover art" }), { style: "Title" }) +
    p(r("Foreword") + pictureRun({ rid: "rId21", alt: "Lotus" }), { style: "Heading1" }) +
    t("Why I wrote this.") +
    p(r("The Butter Thief") + pictureRun({ alt: "Krishna and the butter pot", anchor: true }), { style: "Heading1" }) +
    t("Story.");
  const { book, result } = await importBook({ body });
  assert.equal(book.metadata.title, "Little Krishna");
  assert.deepEqual(book.frontMatter.map((s) => [s.title, s.blocks.map((b) => b.type)]), [
    ["Title page", ["image"]],
    ["Foreword", ["image", "paragraph"]],
  ]);
  assert.deepEqual(book.chapters[0]!.blocks.map((b) => b.type), ["image", "paragraph"]);
  assert.equal(result.images?.length, 2, "the cover art and the chapter picture share image1.png");
});

test("never imports hidden pictures", async () => {
  const hiddenPicture = pictureRun({ alt: "Secret" }).replace("<w:r>", "<w:r><w:rPr><w:vanish/></w:rPr>");
  const body = t("Chapter", { style: "Heading1" }) + p(r("Visible.") + hiddenPicture);
  const { book, result } = await importBook({ body });
  assert.equal(book.chapters[0]!.blocks.filter((b) => b.type === "image").length, 0);
  assert.equal(result.images, undefined);
  assert.ok(codes(result).includes("DOCX_HIDDEN_TEXT_SKIPPED"));
});

test("leaves Word's automatic descriptions out of the alt text", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(pictureRun({ alt: "A cartoon of a boy with a flute Description automatically generated" })) +
    p(pictureRun({ rid: "rId21", alt: "A drawing of a cow Description automatically generated with medium confidence", title: "Nandi the cow" }));
  const { result } = await importBook({ body });
  assert.deepEqual(result.images?.map((image) => image.altText), ["", "Nandi the cow"]);
  assert.ok(codes(result).includes("DOCX_AUTOMATIC_ALT_TEXT_REMOVED"));
});

test("warns when a reused picture has different descriptions", async () => {
  const body = t("Chapter", { style: "Heading1" }) + p(pictureRun({ alt: "Lotus" })) + p(pictureRun({ alt: "Peacock feather" }));
  const { result } = await importBook({ body });
  assert.equal(result.images?.[0]?.altText, "Lotus");
  assert.ok(codes(result).includes("DOCX_PICTURE_ALT_TEXT_DIFFERS"));
});

test("a picture inside a list item goes after the list instead of splitting it", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    t("Wake up", { numId: 2 }) +
    p(r("Milk the cow") + pictureRun(), { numId: 2 }) +
    t("Churn the butter", { numId: 2 });
  const { book } = await importBook({ body });
  const blocks = book.chapters[0]!.blocks;
  assert.deepEqual(blocks.map((b) => b.type), ["list", "image"]);
  assert.equal(blockText(blocks[0]!), "Wake up | Milk the cow | Churn the butter");
});

test("shows picture file names without percent-encoding", async () => {
  const body = t("Chapter", { style: "Heading1" }) + p(pictureRun({ rid: "rId25" }));
  const { result } = await importBook({ body });
  assert.equal(result.images?.[0]?.sourceName, "my drawing.png");
});

// --- review regressions -----------------------------------------------------------------------

const BEGIN = `<w:r><w:fldChar w:fldCharType="begin"/></w:r>`;
const SEPARATE = `<w:r><w:fldChar w:fldCharType="separate"/></w:r>`;
const END = `<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
const instr = (text: string): string => `<w:r><w:instrText xml:space="preserve"> ${text} </w:instrText></w:r>`;

test("a field whose end was deleted with track changes still closes", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(BEGIN + instr('HYPERLINK "https://example.com/krishna"') + SEPARATE + r("link text") + `<w:del w:id="5" w:author="A">${END}</w:del>`) +
    t("After the field.") +
    t("Second", { style: "Heading1" }) +
    t("More.");
  const { book, result } = await importBook({ body });
  assert.deepEqual(book.chapters.map((s) => s.title), ["Chapter", "Second"]);
  assert.ok(allText(book).includes("After the field.") && allText(book).includes("More."));
  assert.ok(!codes(result).includes("DOCX_FIELDS_REPAIRED"));
});

test("a field with no end never swallows the rest of the book", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(r("Page ") + BEGIN + instr("PAGE")) +
    t("Still here.") +
    p(BEGIN + instr('TOC \\o "1-3"') + SEPARATE + r("Entry 1"), { style: "TOC1" }) +
    t("Real", { style: "Heading1" }) +
    t("Story text.");
  const { book, result } = await importBook({ body });
  assert.deepEqual(book.chapters.map((s) => s.title), ["Chapter", "Real"]);
  assert.ok(allText(book).includes("Still here.") && allText(book).includes("Story text."));
  assert.ok(!allText(book).includes("Entry 1"));
  assert.ok(codes(result).includes("DOCX_FIELDS_REPAIRED"));
});

test("hidden text is never imported, directly or through a style", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(r("Visible.") + r(" secret note", { hidden: true }) + r(" also secret", { style: "HiddenNote" }));
  const { book, result } = await importBook({ body });
  assert.equal(blockText(book.chapters[0]!.blocks[0]!), "Visible.");
  assert.ok(codes(result).includes("DOCX_HIDDEN_TEXT_SKIPPED"));
});

test("the title-page line is not guessed as a chapter", async () => {
  const body = [
    p(r("Little Krishna", { b: true, sz: 40 })),
    t("by Muralidhar Rao"),
    p(r("The Butter Thief", { b: true }), { pageBreakBefore: true }),
    t("Krishna loved butter."),
    p(r("The Serpent", { b: true }), { pageBreakBefore: true }),
    t("Kaliya lived in the river."),
  ].join("");
  const { book } = await importBook({ body, core: { title: "Little Krishna", creator: "Muralidhar Rao" } });
  assert.deepEqual(book.chapters.map((s) => s.title), ["The Butter Thief", "The Serpent"]);
  assert.equal(book.frontMatter.length, 0);
});

test("text held by a deleted paragraph mark survives at the end and before a table", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(r("Before table."), { markDeleted: true }) +
    `<w:tbl><w:tr><w:tc>${t("Cell")}</w:tc></w:tr></w:tbl>` +
    p(r("Last words."), { markDeleted: true });
  const { book } = await importBook({ body });
  assert.deepEqual(book.chapters[0]!.blocks.map(blockText), ["Before table.", "Cell", "Last words."]);
});

test("with the heading-2 strategy, Part headings open the next chapter instead of front matter", async () => {
  const body =
    t("Part One", { style: "Heading1" }) + t("A", { style: "Heading2" }) + t("x") + t("B", { style: "Heading2" }) + t("y") +
    t("Part Two", { style: "Heading1" }) + t("C", { style: "Heading2" }) + t("z");
  const { book, result } = await importBook({ body }, { splitStrategy: "heading-2" });
  assert.deepEqual(book.chapters.map((s) => s.title), ["A", "B", "C"]);
  assert.equal(book.frontMatter.length, 0);
  assert.ok(!codes(result).includes("DOCX_FRONT_MATTER_REVIEW"));
  assert.deepEqual(book.chapters[0]!.blocks.map(blockText), ["Part One", "x"]);
  assert.deepEqual(book.chapters[2]!.blocks.map(blockText), ["Part Two", "z"]);
});

test("story titles in Word's Title style become chapters", async () => {
  const body =
    p(r("Krishna Stories"), { style: "Title" }) +
    p(r("The Butter Thief"), { style: "Title" }) + t("Story one.") +
    p(r("The Serpent"), { style: "Title" }) + t("Story two.");
  const { book, result } = await importBook({ body, core: { title: "Krishna Stories" } });
  assert.equal(book.metadata.title, "Krishna Stories");
  assert.deepEqual(book.chapters.map((s) => s.title), ["The Butter Thief", "The Serpent"]);
  assert.ok(codes(result).includes("DOCX_CHAPTERS_FROM_TITLE_STYLE"));
});

test("removes trailing contents lines that do not match a later title", async () => {
  const body = [
    p(r("Contents", { b: true })),
    t("The Butter Thief ..... 1"),
    t("The Serpent ..... 5"),
    t("About the Author ..... 98"),
    p(r("The Butter Thief", { b: true }), { pageBreakBefore: true }),
    t("Story."),
    p(r("The Serpent", { b: true }), { pageBreakBefore: true }),
    t("Story."),
    p(r("About the writer", { b: true }), { pageBreakBefore: true }),
    t("Bio."),
  ].join("");
  const { book } = await importBook({ body });
  assert.ok(!allText(book).includes("About the Author"));
  assert.ok(!allText(book).includes("....."));
  // Chapters come from the contents page, which does not list “About the writer”: it stays as text.
  assert.deepEqual(book.chapters.map((s) => s.title), ["The Butter Thief", "The Serpent"]);
  assert.ok(allText(book).includes("About the writer"));
});

test("maps Symbol-font characters and drops picture-font symbols", async () => {
  const body =
    t("Chapter", { style: "Heading1" }) +
    p(`<w:r><w:sym w:font="Symbol" w:char="F061"/></w:r>` + r(" and ") + `<w:r><w:sym w:font="Wingdings" w:char="F04A"/></w:r>` + r(" end"));
  const { book, result } = await importBook({ body });
  assert.equal(blockText(book.chapters[0]!.blocks[0]!), "α and end");
  assert.ok(codes(result).includes("DOCX_SYMBOLS_SKIPPED"));
});

test("collapses spaces across split runs", async () => {
  const body = t("Chapter", { style: "Heading1" }) + p(r("the ") + r(" cow  ") + r("  ate"));
  const { book } = await importBook({ body });
  assert.equal(blockText(book.chapters[0]!.blocks[0]!), "the cow ate");
});

// --- failures ---------------------------------------------------------------------------------

test("fails closed on bad input", async () => {
  const notZip = await importBytes(strToU8("not a docx"));
  assert.equal(notZip.success, false);
  assert.equal(notZip.issues[0]?.code, "DOCX_NOT_ZIP");

  const empty = await importBytes(makeDocx({ body: p("") + pageBreak }));
  assert.equal(empty.success, false);
  assert.equal(empty.issues[0]?.code, "EMPTY_SOURCE");

  const wrongShape = await new ImportService().import({ format: "docx", bytes: "nope" as unknown as Uint8Array });
  assert.equal(wrongShape.success, false);
  assert.equal(wrongShape.issues[0]?.code, "INVALID_CONTENT");
});

test("markdown and text imports are unchanged", async () => {
  const md = await new ImportService().import({ format: "markdown", content: "# One\n\nHello **world**." });
  assert.equal(md.success, true);
  assert.equal(md.book?.chapters[0]?.title, "One");
  const txt = await new ImportService().import({ format: "text", content: "Hello.\n\nWorld." });
  assert.equal(txt.success, true);
  assert.equal(txt.book?.chapters[0]?.blocks.length, 2);
});
