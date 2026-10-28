// SPDX-License-Identifier: Apache-2.0
// ADR-0040 Slice 1 — `.docx` container reader and security limits.
import test from "node:test";
import * as assert from "node:assert/strict";
import { strToU8, zipSync, type Zippable } from "fflate";
import {
  DEFAULT_DOCX_LIMITS,
  DocxReadError,
  ImportService,
  openDocxPackage,
  type DocxLimits,
  type DocxPackage,
} from "../index.js";
import { resolveDocxLimits } from "./limits.js";
import { crc32 } from "./zip.js";
import { parseXml, parseXmlPart, type XmlElement } from "./xml.js";

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DOC_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";

function contentTypes(mainType = DOC_TYPE, extra = ""): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="${mainType}"/>` +
    extra +
    `</Types>`
  );
}

function rootRels(target = "word/document.xml", targetMode = ""): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${target}"${targetMode}/>` +
    `</Relationships>`
  );
}

function documentXml(body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document xmlns:w="${W_NS}"><w:body>${body}</w:body></w:document>`
  );
}

const KANNADA = "ಪುಟ್ಟ ಕೃಷ್ಣನ ಜಾಣ್ಮೆಯ ಕಥೆಗಳು";

function docxFiles(overrides: Record<string, string | Uint8Array | null> = {}): Zippable {
  const files: Record<string, string | Uint8Array | null> = {
    "[Content_Types].xml": contentTypes(),
    "_rels/.rels": rootRels(),
    "word/document.xml": documentXml(`<w:p><w:r><w:t>Hello</w:t></w:r></w:p><w:p><w:r><w:t>${KANNADA}</w:t></w:r></w:p>`),
    ...overrides,
  };
  const zippable: Zippable = {};
  for (const [name, value] of Object.entries(files)) {
    if (value === null) continue;
    zippable[name] = typeof value === "string" ? strToU8(value) : value;
  }
  return zippable;
}

function makeDocx(overrides: Record<string, string | Uint8Array | null> = {}, level: 0 | 6 = 6): Uint8Array {
  return zipSync(docxFiles(overrides), { level, mtime: new Date("2026-10-28T00:00:00Z") });
}

function open(bytes: Uint8Array, limits?: Partial<DocxLimits>): DocxPackage {
  const result = openDocxPackage(bytes, limits);
  if (!result.ok) {
    assert.fail(`expected open to succeed, got ${result.issue.code}: ${result.issue.message}`);
  }
  return result.docx;
}

function expectOpenFailure(bytes: Uint8Array, code: string, limits?: Partial<DocxLimits>): void {
  const result = openDocxPackage(bytes, limits);
  assert.equal(result.ok, false, `expected ${code}`);
  if (!result.ok) {
    assert.equal(result.issue.code, code, result.issue.message);
    assert.equal(result.issue.severity, "fatal");
    assert.ok(result.issue.message.length > 0);
  }
}

function expectReadError(fn: () => unknown, code: string): void {
  assert.throws(fn, (err: unknown) => err instanceof DocxReadError && err.code === code);
}

/** Offset of the central directory header for `name`. */
function centralHeaderOffset(bytes: Uint8Array, name: string): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const target = new TextEncoder().encode(name);
  for (let pos = 0; pos + 46 <= bytes.length; pos += 1) {
    if (view.getUint32(pos, true) !== 0x02014b50) continue;
    const nameLength = view.getUint16(pos + 28, true);
    const candidate = bytes.subarray(pos + 46, pos + 46 + nameLength);
    if (candidate.length === target.length && candidate.every((b, i) => b === target[i])) return pos;
  }
  throw new Error(`no central header for ${name}`);
}

function eocdOffset(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let pos = bytes.length - 22; pos >= 0; pos -= 1) {
    if (view.getUint32(pos, true) === 0x06054b50) return pos;
  }
  throw new Error("no EOCD");
}

function patch(bytes: Uint8Array, mutate: (view: DataView) => void): Uint8Array {
  const copy = bytes.slice();
  mutate(new DataView(copy.buffer));
  return copy;
}

function allText(element: XmlElement): string[] {
  const out: string[] = [];
  for (const child of element.children) {
    if (typeof child === "string") out.push(child);
    else out.push(...allText(child));
  }
  return out;
}

/** Deterministic varied prose: compresses like real text, not like a repeated line. */
function prose(bytes: number): Uint8Array {
  const words = ["Krishna", "river", "cow", "flute", "butter", "Yashoda", "laughed", "village", "morning", "sang", "small", "wise", "friend", "the", "and", "a"];
  let seed = 12345;
  let out = "";
  while (out.length < bytes) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    out += words[seed % words.length] + (seed % 7 === 0 ? ". " : " ");
  }
  return strToU8(out);
}

const XML_LIMITS = { maxXmlDepth: DEFAULT_DOCX_LIMITS.maxXmlDepth, maxXmlAttributes: DEFAULT_DOCX_LIMITS.maxXmlAttributes };

// --- happy path ---------------------------------------------------------------

test("opens a minimal .docx and reads its main document with namespaces resolved", () => {
  const docx = open(makeDocx());
  assert.equal(docx.mainDocumentPart, "word/document.xml");
  assert.ok(docx.hasPart("/word/document.xml"));
  assert.ok(docx.partNames.includes("[Content_Types].xml"));

  const root = docx.readXmlPart("word/document.xml");
  assert.equal(root.ns, W_NS);
  assert.equal(root.local, "document");
  assert.deepEqual(allText(root), ["Hello", KANNADA]);
});

test("Kannada text survives code point for code point (ZWJ/ZWNJ kept, no normalization)", () => {
  // ka + vowel sign e + ai length mark (canonically equivalent to ka + ai), then ZWJ and ZWNJ.
  const text = String.fromCodePoint(0x0c95, 0x0cc6, 0x0cd6, 0x200d, 0x200c);
  const docx = open(makeDocx({ "word/document.xml": documentXml(`<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`) }));
  assert.deepEqual(allText(docx.readXmlPart("word/document.xml")), [text]);
});

test("reads stored (uncompressed) entries", () => {
  const docx = open(makeDocx({}, 0));
  assert.equal(docx.readXmlPart("word/document.xml").local, "document");
});

test("finds the main document by relationship, not by a fixed name", () => {
  const bytes = makeDocx({
    "_rels/.rels": rootRels("/content/main.xml"),
    "[Content_Types].xml": contentTypes(DOC_TYPE, `<Override PartName="/content/main.xml" ContentType="${DOC_TYPE}"/>`),
    "content/main.xml": documentXml(""),
  });
  assert.equal(open(bytes).mainDocumentPart, "content/main.xml");
});

test("canImport('docx') stays false until Slice 2", () => {
  assert.equal(new ImportService().canImport("docx"), false);
});

// --- file signature and size ----------------------------------------------------

test("rejects an empty file", () => {
  expectOpenFailure(new Uint8Array(0), "DOCX_EMPTY");
});

test("rejects a file that is not a ZIP", () => {
  expectOpenFailure(strToU8("# Just Markdown\n\nHello"), "DOCX_NOT_ZIP");
});

test("recognises an older .doc or password-protected file (CFB signature)", () => {
  const cfb = new Uint8Array(1024);
  cfb.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  expectOpenFailure(cfb, "DOCX_LEGACY_OR_PROTECTED");
});

test("rejects a file over the input size cap before reading it", () => {
  const bytes = makeDocx();
  expectOpenFailure(bytes, "DOCX_FILE_TOO_LARGE", { maxFileBytes: bytes.length - 1 });
});

test("rejects a truncated file", () => {
  const bytes = makeDocx();
  expectOpenFailure(bytes.subarray(0, bytes.length - 10), "DOCX_ZIP_CORRUPT");
});

// --- ZIP structure ----------------------------------------------------------------

test("rejects too many entries", () => {
  expectOpenFailure(makeDocx({ "word/a.xml": "<a/>", "word/b.xml": "<b/>" }), "DOCX_TOO_MANY_ENTRIES", { maxEntries: 4 });
});

test("rejects entries whose names differ only by case", () => {
  expectOpenFailure(makeDocx({ "word/extra.xml": "<a/>", "WORD/EXTRA.XML": "<b/>" }), "DOCX_DUPLICATE_ENTRY");
});

test("rejects encrypted entries", () => {
  const bytes = makeDocx();
  const at = centralHeaderOffset(bytes, "word/document.xml");
  const encrypted = patch(bytes, (view) => view.setUint16(at + 8, view.getUint16(at + 8, true) | 0x0001, true));
  expectOpenFailure(encrypted, "DOCX_ENCRYPTED");
});

test("rejects unsupported compression methods", () => {
  const bytes = makeDocx();
  const at = centralHeaderOffset(bytes, "word/document.xml");
  expectOpenFailure(patch(bytes, (view) => view.setUint16(at + 10, 12, true)), "DOCX_ZIP_UNSUPPORTED");
});

test("rejects ZIP64 markers and multi-disk archives", () => {
  const bytes = makeDocx();
  const at = eocdOffset(bytes);
  expectOpenFailure(
    patch(bytes, (view) => {
      view.setUint16(at + 8, 0xffff, true);
      view.setUint16(at + 10, 0xffff, true);
    }),
    "DOCX_ZIP_UNSUPPORTED",
  );
  expectOpenFailure(patch(bytes, (view) => view.setUint16(at + 4, 1, true)), "DOCX_ZIP_UNSUPPORTED");
});

test("rejects an entry that points at another entry's data", () => {
  const bytes = makeDocx();
  const first = centralHeaderOffset(bytes, "[Content_Types].xml");
  const second = centralHeaderOffset(bytes, "word/document.xml");
  const overlapping = patch(bytes, (view) => view.setUint32(second + 42, view.getUint32(first + 42, true), true));
  expectOpenFailure(overlapping, "DOCX_ZIP_CORRUPT");
});

test("detects a CRC mismatch when a part is read", () => {
  const bytes = makeDocx();
  const at = centralHeaderOffset(bytes, "word/document.xml");
  const docx = open(patch(bytes, (view) => view.setUint32(at + 16, view.getUint32(at + 16, true) ^ 1, true)));
  expectReadError(() => docx.readPart("word/document.xml"), "DOCX_ZIP_CORRUPT");
});

// --- ZIP bombs ----------------------------------------------------------------------

test("rejects a classic ZIP bomb by its declared compression ratio, before inflating", () => {
  // 40 MB of zeros deflates to ~40 KB: just over 1000 : 1.
  const zeros = new Uint8Array(40 * 1024 * 1024);
  expectOpenFailure(makeDocx({ "word/media/bomb.bin": zeros }), "DOCX_COMPRESSION_RATIO");
});

test("a bomb that stays under the ratio limit is still stopped by the per-part cap", () => {
  const zeros = new Uint8Array(12 * 1024 * 1024);
  expectOpenFailure(makeDocx({ "word/media/bomb.bin": zeros }), "DOCX_ENTRY_TOO_LARGE", {
    maxCompressionRatio: 5000,
    maxBinaryPartBytes: 10 * 1024 * 1024,
  });
});

test("allows ordinary compression ratios", () => {
  const story = prose(2 * 1024 * 1024);
  const docx = open(makeDocx({ "word/story.xml": `<s>${new TextDecoder().decode(story)}</s>` }));
  assert.equal(allText(docx.readXmlPart("word/story.xml")).join("").length, story.length);
});

test("stops inflating when a part expands past its declared size (lying header)", () => {
  const bytes = makeDocx({ "word/media/liar.bin": new Uint8Array(512 * 1024) });
  const at = centralHeaderOffset(bytes, "word/media/liar.bin");
  const lying = patch(bytes, (view) => view.setUint32(at + 24, 100, true));
  const docx = open(lying);
  expectReadError(() => docx.readPart("word/media/liar.bin"), "DOCX_COMPRESSION_RATIO");
});

test("rejects a single part over its size cap", () => {
  expectOpenFailure(
    makeDocx({ "word/big.xml": `<a>${"x".repeat(5000)}</a>` }),
    "DOCX_ENTRY_TOO_LARGE",
    { maxXmlPartBytes: 4096 },
  );
  expectOpenFailure(
    makeDocx({ "word/media/big.png": new Uint8Array(5000) }),
    "DOCX_ENTRY_TOO_LARGE",
    { maxBinaryPartBytes: 4096 },
  );
});

test("rejects a package whose parts add up past the total cap", () => {
  expectOpenFailure(
    makeDocx({ "word/media/a.bin": new Uint8Array(3000), "word/media/b.bin": new Uint8Array(3000) }),
    "DOCX_TOTAL_TOO_LARGE",
    { maxTotalUncompressedBytes: 5000 },
  );
});

// --- package rules --------------------------------------------------------------------

test("rejects macro-enabled documents (.docm)", () => {
  const docm = "application/vnd.ms-word.document.macroEnabled.main+xml";
  expectOpenFailure(makeDocx({ "[Content_Types].xml": contentTypes(docm) }), "DOCX_MACRO_ENABLED");
});

test("rejects Word templates (.dotx)", () => {
  const dotx = "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml";
  const result = openDocxPackage(makeDocx({ "[Content_Types].xml": contentTypes(dotx) }));
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.issue.code, "DOCX_NOT_WORD_DOCUMENT");
    assert.match(result.issue.message, /template/);
  }
});

test("rejects a ZIP that is not a Word document", () => {
  expectOpenFailure(makeDocx({ "[Content_Types].xml": null }), "DOCX_NOT_WORD_DOCUMENT");
  expectOpenFailure(makeDocx({ "_rels/.rels": null }), "DOCX_NOT_WORD_DOCUMENT");
  expectOpenFailure(makeDocx({ "word/document.xml": null }), "DOCX_NOT_WORD_DOCUMENT");
  expectOpenFailure(
    makeDocx({ "[Content_Types].xml": contentTypes("application/vnd.oasis.opendocument.text") }),
    "DOCX_NOT_WORD_DOCUMENT",
  );
});

test("never follows an external main-document target", () => {
  expectOpenFailure(
    makeDocx({ "_rels/.rels": rootRels("https://example.com/doc.xml", ` TargetMode="External"`) }),
    "DOCX_EXTERNAL_TARGET",
  );
  expectOpenFailure(makeDocx({ "_rels/.rels": rootRels("file:///C:/secret.xml") }), "DOCX_NOT_WORD_DOCUMENT");
});

test("refuses relationship targets that escape the package", () => {
  expectOpenFailure(makeDocx({ "_rels/.rels": rootRels("../../etc/passwd") }), "DOCX_NOT_WORD_DOCUMENT");
});

test("never reads macro or embedded-object parts", () => {
  const docx = open(
    makeDocx({
      "word/vbaProject.bin": new Uint8Array([1, 2, 3]),
      "word/embeddings/oleObject1.bin": new Uint8Array([1, 2, 3]),
      "word/activeX/activeX1.xml": "<ax/>",
    }),
  );
  expectReadError(() => docx.readPart("word/vbaProject.bin"), "DOCX_PART_BLOCKED");
  expectReadError(() => docx.readPart("/word/embeddings/oleObject1.bin"), "DOCX_PART_BLOCKED");
  expectReadError(() => docx.readXmlPart("word/activeX/activeX1.xml"), "DOCX_PART_BLOCKED");
});

test("reports a missing part as a structured error", () => {
  expectReadError(() => open(makeDocx()).readPart("word/styles.xml"), "DOCX_PART_MISSING");
});

// --- restricted XML -------------------------------------------------------------------

test("rejects a DOCTYPE (billion laughs) inside a part", () => {
  const laughs =
    `<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY lol "lol"><!ENTITY lol2 "&lol;&lol;&lol;">]>` +
    `<w:document xmlns:w="${W_NS}">&lol2;</w:document>`;
  const docx = open(makeDocx({ "word/document.xml": laughs }));
  expectReadError(() => docx.readXmlPart("word/document.xml"), "DOCX_XML_DOCTYPE");
});

test("allows only predefined entities and valid character references", () => {
  const root = parseXml(`<a b="&quot;x&quot;">&lt;&amp;&gt;&apos;&#65;&#x0CB8;</a>`, XML_LIMITS, "t.xml");
  assert.deepEqual(root.children, ["<&>'Aಸ"]);
  assert.equal(root.attributes[0]?.value, `"x"`);
  expectReadError(() => parseXml(`<a>&nbsp;</a>`, XML_LIMITS, "t.xml"), "DOCX_XML_ENTITY");
  expectReadError(() => parseXml(`<a>&#0;</a>`, XML_LIMITS, "t.xml"), "DOCX_XML_ENTITY");
  expectReadError(() => parseXml(`<a>&#xD800;</a>`, XML_LIMITS, "t.xml"), "DOCX_XML_ENTITY");
  expectReadError(() => parseXml(`<a>fish & chips</a>`, XML_LIMITS, "t.xml"), "DOCX_XML_ENTITY");
});

test("caps element depth", () => {
  const deep = (n: number): string => "<a>".repeat(n) + "</a>".repeat(n);
  assert.equal(parseXml(deep(256), XML_LIMITS, "t.xml").local, "a");
  expectReadError(() => parseXml(deep(257), XML_LIMITS, "t.xml"), "DOCX_XML_TOO_DEEP");
});

test("caps attributes per element", () => {
  const attrs = (n: number): string => Array.from({ length: n }, (_, i) => `a${i}="1"`).join(" ");
  assert.equal(parseXml(`<e ${attrs(64)}/>`, XML_LIMITS, "t.xml").attributes.length, 64);
  expectReadError(() => parseXml(`<e ${attrs(65)}/>`, XML_LIMITS, "t.xml"), "DOCX_XML_TOO_MANY_ATTRIBUTES");
});

test("resolves namespaces whatever the prefix", () => {
  const root = parseXml(`<x:document xmlns:x="${W_NS}"><x:body x:val="1" plain="2"/></x:document>`, XML_LIMITS, "t.xml");
  assert.equal(root.ns, W_NS);
  const body = root.children[0];
  assert.ok(body && typeof body !== "string");
  assert.equal(body.ns, W_NS);
  assert.deepEqual(body.attributes, [
    { ns: W_NS, local: "val", value: "1" },
    { ns: "", local: "plain", value: "2" },
  ]);
  expectReadError(() => parseXml(`<q:a/>`, XML_LIMITS, "t.xml"), "DOCX_XML_INVALID");
});

test("rejects malformed XML", () => {
  for (const bad of [
    `<a><b></a></b>`,
    `<a>`,
    `<a/><b/>`,
    `text<a/>`,
    `<a b="1" b="2"/>`,
    `<a b="<"/>`,
    `<a><!-- open`,
    ``,
    `<a/><?xml version="1.0"?>`,
  ]) {
    expectReadError(() => parseXml(bad, XML_LIMITS, "t.xml"), "DOCX_XML_INVALID");
  }
});

test("keeps CDATA as text and skips comments and processing instructions", () => {
  const root = parseXml(`<?xml version="1.0"?><a><!-- c --><?pi x?>one<![CDATA[<two>]]>three</a>`, XML_LIMITS, "t.xml");
  assert.deepEqual(root.children, ["one<two>three"]);
});

test("decodes UTF-16 parts and refuses other encodings and malformed bytes", () => {
  const xml = `<?xml version="1.0" encoding="UTF-16"?><a>${KANNADA}</a>`;
  const le = new Uint8Array(2 + xml.length * 2);
  le.set([0xff, 0xfe]);
  for (let i = 0; i < xml.length; i += 1) {
    le[2 + i * 2] = xml.charCodeAt(i) & 0xff;
    le[3 + i * 2] = xml.charCodeAt(i) >> 8;
  }
  assert.deepEqual(parseXmlPart(le, XML_LIMITS, "t.xml").children, [KANNADA]);

  expectReadError(
    () => parseXmlPart(strToU8(`<?xml version="1.0" encoding="windows-1252"?><a/>`), XML_LIMITS, "t.xml"),
    "DOCX_XML_INVALID",
  );
  expectReadError(() => parseXmlPart(new Uint8Array([0x3c, 0x61, 0x3e, 0xff, 0x3c, 0x2f, 0x61, 0x3e]), XML_LIMITS, "t.xml"), "DOCX_XML_INVALID");
});

// --- review regressions ----------------------------------------------------------------

test("an undefined limit override keeps the default; invalid overrides are refused", () => {
  assert.deepEqual(resolveDocxLimits({ maxFileBytes: undefined }), DEFAULT_DOCX_LIMITS);
  const bytes = makeDocx();
  expectOpenFailure(bytes, "DOCX_FILE_TOO_LARGE", { maxFileBytes: bytes.length - 1, maxEntries: undefined });
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => openDocxPackage(bytes, { maxFileBytes: bad }), TypeError);
  }
  assert.throws(() => resolveDocxLimits({ maxBogus: 1 } as Partial<DocxLimits>), TypeError);
});

test("an embedded macro-enabled object does not reject the document, and is never read", () => {
  const docx = open(
    makeDocx({
      "[Content_Types].xml": contentTypes(
        DOC_TYPE,
        `<Default Extension="xlsm" ContentType="application/vnd.ms-excel.sheet.macroEnabled.12"/>`,
      ),
      "word/charts/book1.xlsm": new Uint8Array([1, 2, 3]),
    }),
  );
  expectReadError(() => docx.readPart("word/charts/book1.xlsm"), "DOCX_PART_BLOCKED");
});

test("rejects a macro-enabled template (.dotm) as containing macros", () => {
  const dotm = "application/vnd.ms-word.template.macroEnabledTemplate.main+xml";
  expectOpenFailure(makeDocx({ "[Content_Types].xml": contentTypes(dotm) }), "DOCX_MACRO_ENABLED");
});

test("blocks OLE, ActiveX, and embedded packages by content type, wherever they are stored", () => {
  const docx = open(
    makeDocx({
      "[Content_Types].xml": contentTypes(
        DOC_TYPE,
        `<Override PartName="/word/media/image9.bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/>` +
          `<Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>`,
      ),
      "word/media/image9.bin": new Uint8Array([1, 2, 3]),
      "word/media/table.xlsx": new Uint8Array([4, 5, 6]),
    }),
  );
  expectReadError(() => docx.readPart("word/media/image9.bin"), "DOCX_PART_BLOCKED");
  expectReadError(() => docx.readPart("word/media/table.xlsx"), "DOCX_PART_BLOCKED");
  assert.equal(docx.readXmlPart("word/document.xml").local, "document");
});

test("tolerates padding after the end of the ZIP", () => {
  const bytes = makeDocx();
  const padded = new Uint8Array(bytes.length + 100);
  padded.set(bytes);
  assert.equal(open(padded).readXmlPart("word/document.xml").local, "document");
});

test("reading a part again does not count it against the total twice", () => {
  const bytes = makeDocx();
  const declared = open(bytes).partNames.reduce((sum, name) => sum + open(bytes).readPart(name).length, 0);
  const docx = open(bytes, { maxTotalUncompressedBytes: declared });
  for (let i = 0; i < 10; i += 1) {
    assert.ok(docx.readPart("word/document.xml").length > 0);
  }
  assert.equal(docx.readXmlPart("word/document.xml"), docx.readXmlPart("word/document.xml"));
});

test("finds a percent-encoded main document part", () => {
  const bytes = makeDocx({
    "_rels/.rels": rootRels("word/my%20book.xml"),
    "[Content_Types].xml": contentTypes(DOC_TYPE, `<Override PartName="/word/my%20book.xml" ContentType="${DOC_TYPE}"/>`),
    "word/my%20book.xml": documentXml(""),
  });
  const docx = open(bytes);
  assert.equal(docx.mainDocumentPart, "word/my%20book.xml");
  assert.equal(docx.readXmlPart(docx.mainDocumentPart).local, "document");
});

test("reads a main document without an .xml extension, under the XML size cap", () => {
  const files = {
    "_rels/.rels": rootRels("word/document"),
    "[Content_Types].xml": contentTypes(DOC_TYPE, `<Override PartName="/word/document" ContentType="${DOC_TYPE}"/>`),
    "word/document": documentXml(`<w:p><w:r><w:t>${"x".repeat(5000)}</w:t></w:r></w:p>`),
  };
  const docx = open(makeDocx(files));
  assert.equal(docx.readXmlPart("word/document").local, "document");
  expectReadError(() => open(makeDocx(files), { maxXmlPartBytes: 4096 }).readXmlPart("word/document"), "DOCX_ENTRY_TOO_LARGE");
});

// --- support ---------------------------------------------------------------------------

test("crc32 matches the standard check value", () => {
  assert.equal(crc32(strToU8("123456789")), 0xcbf43926);
});

test("failures map to fatal import issues naming the part", () => {
  const docx = open(makeDocx({ "word/document.xml": `<!DOCTYPE x><x/>` }));
  try {
    docx.readXmlPart("word/document.xml");
    assert.fail("expected an error");
  } catch (err) {
    assert.ok(err instanceof DocxReadError);
    assert.equal(err.part, "word/document.xml");
  }
});
