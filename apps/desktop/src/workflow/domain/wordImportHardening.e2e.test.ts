// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0040 Slice 5 — Word import hardening.
 *
 * English and Kannada manuscripts shaped like the maintainer's book (built here; no content from
 * it) go through the studio's Word import, package Save → Open, autosave, Write's "Add chapters
 * from a Word file", and EPUB / HTML / PDF export. Harmful files are refused through the same
 * path with the book unchanged.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { AssetResolver } from "@openbook/assets";
import type { Book, ContentBlock } from "@openbook/book-model";
import type { PdfPublication } from "@openbook/pdf";
import { DesktopStudioCoordinator, type IPdfPublisher } from "../../domain/desktopStudioCoordinator.js";
import {
  manuscriptDocx,
  storedZip,
  type ManuscriptSpec,
} from "../../domain/wordDocxTestFixture.js";
import { PACKAGE_BOOK_FILE } from "../../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { isAuthorSafeText } from "./studioShellErrors.js";
import { findInternalTerms } from "./studioShellGuide.js";
import { importWordFile, type WordFilePickPort } from "./wordImport.js";

class RecordingPdfPublisher implements IPdfPublisher {
  resolved: Uint8Array[] = [];
  async publishPdf(
    book: Readonly<Book>,
    options: { assetResolver: AssetResolver; signal?: AbortSignal },
  ): Promise<PdfPublication> {
    this.resolved = await Promise.all(book.assets.map((asset) => options.assetResolver.resolve(asset)));
    return { pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]), typstSource: "", diagnostics: [] };
  }
}

function coordinatorFor(seed: string, pdfPublisher?: IPdfPublisher): DesktopStudioCoordinator {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: seed,
    autosaveDebounceMs: 600_000,
    ...(pdfPublisher ? { pdfPublisher } : {}),
  });
}

function pick(bytes: Uint8Array, name: string): WordFilePickPort {
  return { pickWordFile: async () => ({ kind: "bytes", content: bytes, originalFilename: name }) };
}

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-word-harden-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function images(book: Book): Array<Extract<ContentBlock, { type: "image" }>> {
  return [...book.frontMatter, ...book.chapters, ...book.backMatter].flatMap((section) =>
    section.blocks.filter((block): block is Extract<ContentBlock, { type: "image" }> => block.type === "image"),
  );
}

async function readyForExport(coordinator: DesktopStudioCoordinator): Promise<void> {
  while (coordinator.getState().stage !== "VALIDATION") {
    assert.ok(coordinator.advanceStage(), `advance from ${coordinator.getState().stage}`);
  }
  const report = await coordinator.runValidation();
  assert.equal(report.summary.isClean, true, JSON.stringify(report.summary));
  while (coordinator.getState().stage !== "PREVIEW") {
    assert.ok(coordinator.advanceStage());
  }
}

const STORY_COUNT = 5;

const ENGLISH: ManuscriptSpec = {
  title: "Little Lessons by the River",
  creator: "python-docx",
  tagline: "Five Bedtime Stories",
  contentsHeading: "Table of Contents",
  contentsLine: (i, title) => `${i}. ${title.replace(/^Story \d+: /, "")} - A lesson`,
  frontTitle: "Foreword",
  frontText: "These stories were told at bedtime.",
  storyTitles: "heading-style",
  stories: Array.from({ length: STORY_COUNT }, (_, i) => ({
    title: `Story ${i + 1}: The ${["Chariot", "Lake", "Lamp", "Tree", "Mirror"][i]} Lesson`,
    paragraphs: [`Once upon a time, lesson ${i + 1} began.`, `And everyone learned something.`],
    pictureAlt: `Picture for story ${i + 1}`,
  })),
};

const KANNADA: ManuscriptSpec = {
  title: "ಪುಟ್ಟ ಕೃಷ್ಣನ ಕಥೆಗಳು",
  creator: "ಮುರಳೀಧರ ರಾವ್",
  tagline: "ಮಲಗುವ ಮುನ್ನ ಐದು ಕಥೆಗಳು",
  contentsHeading: "ಪರಿವಿಡಿ",
  contentsLine: (i, title) => `${title} ........ ${["೩", "೭", "೧೧", "೧೫", "೧೯"][i - 1]}`,
  frontTitle: "ಮುನ್ನುಡಿ",
  frontText: "ಈ ಕಥೆಗಳನ್ನು ನನ್ನ ಅಜ್ಜಿ ಹೇಳಿದರು.",
  storyTitles: "bold-page-top",
  stories: ["ಬೆಣ್ಣೆ ಕಳ್ಳ", "ಕಾಳಿಂಗ ಮರ್ದನ", "ಗೋವರ್ಧನ ಗಿರಿ", "ಕೊಳಲಿನ ನಾದ", "ಯಮುನೆಯ ದಡ"].map((title, i) => ({
    title,
    paragraphs: [`ಕಥೆ ${i + 1} ಇಲ್ಲಿ ಆರಂಭವಾಗುತ್ತದೆ.`, "ಎಲ್ಲರೂ ಒಂದು ಪಾಠ ಕಲಿತರು."],
    pictureAlt: `ಕಥೆ ${i + 1}ರ ಚಿತ್ರ`,
  })),
};

for (const [label, spec] of [
  ["An English", ENGLISH],
  ["A Kannada", KANNADA],
] as const) {
  test(`${label} Word manuscript survives import → Save → Open → autosave → export`, async () => {
    await withTempRoot(async (parent) => {
      const pdf = new RecordingPdfPublisher();
      const coordinator = coordinatorFor(`word-harden-${label}`, pdf);
      const bytes = manuscriptDocx(spec);

      // Import from the start screen.
      const outcome = await importWordFile(coordinator, pick(bytes, "manuscript.docx"), "new-project");
      assert.equal(outcome.kind, "imported", JSON.stringify(outcome));
      if (outcome.kind !== "imported") return;
      const { summary } = outcome;
      assert.equal(summary.chapters, STORY_COUNT);
      assert.equal(summary.pictures, STORY_COUNT + 1, "every story picture plus the title-page picture");
      for (const text of [summary.headline, ...summary.toCheck, ...summary.goodToKnow]) {
        assert.deepEqual(findInternalTerms(text), [], text);
      }
      assert.ok(summary.goodToKnow.some((m) => /table of contents was removed/.test(m)));

      const imported = coordinator.getBook();
      assert.equal(imported.metadata.title, spec.title);
      assert.deepEqual(imported.chapters.map((c) => c.title), spec.stories.map((s) => s.title));
      assert.ok(imported.frontMatter.some((s) => s.title === spec.frontTitle));
      assert.ok(!JSON.stringify(imported).includes(spec.contentsHeading), "the typed contents page is gone");
      assert.equal(imported.assets.length, STORY_COUNT + 1);
      assert.ok(imported.assets.every((asset) => asset.mediaType === "image/jpeg"));
      if (spec === ENGLISH) {
        assert.deepEqual(imported.metadata.authors, [], "a program name is not an author");
      } else {
        assert.deepEqual(imported.metadata.authors, [spec.creator]);
        assert.equal(imported.metadata.language, "kn");
      }

      // Save to a book folder and open it again.
      const root = path.join(parent, "word-book.obproj");
      coordinator.bindPackageRoot(root);
      await coordinator.saveProject(spec.title);
      const stored = await readFile(path.join(root, PACKAGE_BOOK_FILE), "utf8");
      assert.ok(!stored.includes("import-picture-"), "no placeholder reaches the package");
      assert.equal(stored.normalize("NFC"), stored);

      const reopened = coordinatorFor(`word-harden-${label}-open`);
      await reopened.openFromProjectPackage(root);
      const book = reopened.getBook();
      assert.deepEqual(book.chapters.map((c) => c.title), spec.stories.map((s) => s.title));
      assert.equal(images(book).length, STORY_COUNT + 1);
      const assetIds = new Set(book.assets.map((asset) => asset.id));
      assert.ok(images(book).every((block) => assetIds.has(block.assetId)));
      for (const asset of book.assets) {
        const original = await coordinator.getAssetResolver().resolve(imported.assets.find((a) => a.id === asset.id)!);
        assert.deepEqual([...(await reopened.getAssetResolver().resolve(asset))], [...original]);
      }

      // Autosave keeps a later edit.
      const first = reopened.getBook().chapters[0]!;
      reopened.getSession().updateSectionTitle(first.id, `${first.title}!`);
      const flushed = await reopened.flushAutosave();
      assert.equal(flushed.ok, true, JSON.stringify(flushed));
      const third = coordinatorFor(`word-harden-${label}-third`);
      await third.openFromProjectPackage(root);
      assert.equal(third.getBook().chapters[0]!.title, `${first.title}!`);

      // Export: every picture reaches EPUB, HTML, and the PDF renderer.
      await readyForExport(coordinator);
      const epub = await coordinator.exportEpub({ verificationMode: "fast" });
      const epubText = new TextDecoder("latin1").decode(epub.bytes);
      for (const asset of imported.assets) {
        assert.ok(epubText.includes(`EPUB/images/${asset.id}`), `EPUB carries ${asset.id}`);
      }
      const html = await coordinator.exportHtml();
      assert.equal(html.files.filter((file) => file.mediaType === "image/jpeg").length, imported.assets.length);
      for (const story of spec.stories) assert.ok(html.html.includes(story.title.replace(/&/g, "&amp;")));
      await coordinator.exportPdf();
      assert.equal(pdf.resolved.length, imported.assets.length);

      await coordinator.close();
      await reopened.close();
      await third.close();
    });
  });
}

test("Write adds a second Word file's chapters and pictures to an imported book", async () => {
  const coordinator = coordinatorFor("word-harden-append");
  const first = await importWordFile(coordinator, pick(manuscriptDocx(ENGLISH), "one.docx"), "new-project");
  assert.equal(first.kind, "imported");
  const more: ManuscriptSpec = {
    ...ENGLISH,
    stories: [{ title: "Story 6: The Golden Rule", paragraphs: ["Treat others kindly."], pictureAlt: "A golden sun" }],
  };
  const second = await importWordFile(coordinator, pick(manuscriptDocx(more), "two.docx"), "append-sections");
  assert.equal(second.kind, "imported", JSON.stringify(second));
  if (second.kind !== "imported") return;
  assert.equal(second.summary.chapters, 1);
  const book = coordinator.getBook();
  assert.equal(book.chapters.at(-1)!.title, "Story 6: The Golden Rule");
  const assetIds = new Set(book.assets.map((asset) => asset.id));
  assert.ok(images(book).every((block) => assetIds.has(block.assetId)));
  await coordinator.close();
});

// --- harmful files, through the studio --------------------------------------------------------

const CONTENT_TYPES = (mainType: string) =>
  `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/word/document.xml" ContentType="${mainType}"/></Types>`;
const ROOT_RELS = (target: string, mode = "") =>
  `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
  `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${target}"${mode}/></Relationships>`;
const DOCX_MAIN = "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
const BODY = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hi</w:t></w:r></w:p></w:body></w:document>`;

function encrypted(): Uint8Array {
  const bytes = storedZip({ "[Content_Types].xml": CONTENT_TYPES(DOCX_MAIN), "_rels/.rels": ROOT_RELS("word/document.xml"), "word/document.xml": BODY });
  const view = new DataView(bytes.buffer);
  for (let pos = 0; pos + 4 <= bytes.length; pos += 1) {
    if (view.getUint32(pos, true) === 0x02014b50) view.setUint16(pos + 8, 1, true);
  }
  return bytes;
}

const HARMFUL: ReadonlyArray<readonly [string, Uint8Array]> = [
  ["not a Word file", new TextEncoder().encode("# Just Markdown")],
  ["an older .doc or protected file", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0])],
  ["a macro-enabled document", storedZip({ "[Content_Types].xml": CONTENT_TYPES("application/vnd.ms-word.document.macroEnabled.main+xml"), "_rels/.rels": ROOT_RELS("word/document.xml"), "word/document.xml": BODY })],
  ["a billion-laughs document", storedZip({ "[Content_Types].xml": CONTENT_TYPES(DOCX_MAIN), "_rels/.rels": ROOT_RELS("word/document.xml"), "word/document.xml": `<?xml version="1.0"?><!DOCTYPE l [<!ENTITY a "aaaa">]><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">&a;</w:document>` })],
  ["a document stored outside the file", storedZip({ "[Content_Types].xml": CONTENT_TYPES(DOCX_MAIN), "_rels/.rels": ROOT_RELS("https://evil.example/doc.xml", ` TargetMode="External"`) })],
  ["an encrypted ZIP", encrypted()],
  ["a file with too many parts", storedZip(Object.fromEntries(Array.from({ length: 2001 }, (_, i) => [`junk/${i}.txt`, "x"])))],
];

for (const [name, bytes] of HARMFUL) {
  test(`refuses ${name} with a plain message and an unchanged book`, async () => {
    const coordinator = coordinatorFor(`word-harmful-${name}`);
    const before = JSON.stringify(coordinator.getBook());
    const outcome = await importWordFile(coordinator, pick(bytes, "bad.docx"), "new-project");
    assert.equal(outcome.kind, "failed");
    if (outcome.kind === "failed") {
      assert.ok(isAuthorSafeText(outcome.message), outcome.message);
      assert.deepEqual(findInternalTerms(outcome.message), []);
    }
    assert.equal(JSON.stringify(coordinator.getBook()), before);
    assert.equal(coordinator.getState().stage, "IMPORT");
    await coordinator.close();
  });
}
