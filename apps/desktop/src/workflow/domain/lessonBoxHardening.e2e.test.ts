// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 Slice 5 — lesson boxes end to end, for an English and a Kannada book: book-wide
 * conversion, editing through the editor path, package Save → Open, autosave, a version 1
 * package, the book check, and EPUB / HTML / PDF exports. Uses the real coordinator; only the
 * PDF renderer is replaced by one that records the Typst source.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DomainValidationError } from "@openbook/authoring";
import type { AssetResolver } from "@openbook/assets";
import { serializeBook, type Book, type ContentBlock, type InlineSpan } from "@openbook/book-model";
import { buildEpubPackage } from "@openbook/epub";
import { processBookAssets, serializeBookToTypst, type PdfPublication } from "@openbook/pdf";
import { DesktopStudioCoordinator, type IPdfPublisher } from "../../domain/desktopStudioCoordinator.js";
import type { TipTapDocJSON } from "../../domain/editorAdapter.js";
import type { AutosaveClock } from "../../persistence/autosaveController.js";
import {
  PACKAGE_INTEGRITY_FILE,
  buildPackageIntegrityEvidence,
  serializePackageIntegrityEvidence,
} from "../../persistence/packageIntegrity.js";
import {
  PACKAGE_ASSETS_INDEX_FILE,
  PACKAGE_BOOK_FILE,
  PACKAGE_MANIFEST_FILE,
} from "../../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { convertLabelledParagraphs, findLabelledParagraphs } from "./lessonBoxConversion.js";
import { lessonBoxToParagraph } from "./lessonBoxEditing.js";

class FakeClock implements AutosaveClock {
  nowMs = 0;
  readonly #timers = new Map<number, { due: number; handler: () => void }>();
  #nextId = 1;

  setTimeout(handler: () => void, ms: number): unknown {
    const id = this.#nextId++;
    this.#timers.set(id, { due: this.nowMs + ms, handler });
    return id;
  }

  clearTimeout(id: unknown): void {
    this.#timers.delete(id as number);
  }

  advance(ms: number): void {
    this.nowMs += ms;
    const due = [...this.#timers.entries()].filter(([, timer]) => timer.due <= this.nowMs);
    for (const [id, timer] of due) {
      this.#timers.delete(id);
      timer.handler();
    }
  }
}

/** Records what the PDF engine would render, using its real asset pipeline and Typst writer. */
class TypstRecordingPdfPublisher implements IPdfPublisher {
  typstSource = "";
  async publishPdf(
    book: Readonly<Book>,
    options: { assetResolver: AssetResolver; signal?: AbortSignal },
  ): Promise<PdfPublication> {
    const assets = await processBookAssets(book, options.assetResolver);
    this.typstSource = serializeBookToTypst(book, assets.resolvedImagesByAssetId);
    return { pdf: new Uint8Array([0x25, 0x50, 0x44, 0x46]), typstSource: this.typstSource, diagnostics: [] };
  }
}

const PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

interface Spec {
  readonly label: string;
  readonly language: string;
  readonly title: string;
  readonly boxTitle: string;
  readonly retitled: string;
  readonly stories: readonly { title: string; body: string; lesson: string }[];
}

const SPECS: readonly Spec[] = [
  {
    label: "English",
    language: "en",
    title: "Little Krishna Wisdom Stories",
    boxTitle: "What We Learned",
    retitled: "Our Lesson",
    stories: [
      { title: "The Chariot Lesson", body: "Krishna held the reins.", lesson: "Guide your thoughts with courage." },
      { title: "The Honest Fruit Seller", body: "The scale was fair.", lesson: "Be honest when no one is watching." },
      { title: "The Shared Butter", body: "Everyone got a share.", lesson: "Sharing makes joy bigger." },
    ],
  },
  {
    label: "Kannada",
    language: "kn",
    title: "ಪುಟ್ಟ ಕೃಷ್ಣನ ಕಥೆಗಳು",
    boxTitle: "ನಾವು ಕಲಿತದ್ದು",
    retitled: "ನಮ್ಮ ಪಾಠ",
    stories: [
      { title: "ರಥದ ಪಾಠ", body: "ಕೃಷ್ಣನು ಕಡಿವಾಣ ಹಿಡಿದನು.", lesson: "ಧೈರ್ಯದಿಂದ ಆಲೋಚನೆಗಳನ್ನು ನಡೆಸು." },
      { title: "ಪ್ರಾಮಾಣಿಕ ಹಣ್ಣು ಮಾರುವವನು", body: "ತಕ್ಕಡಿ ಸರಿಯಾಗಿತ್ತು.", lesson: "ಯಾರೂ ನೋಡದಿದ್ದಾಗಲೂ ಪ್ರಾಮಾಣಿಕನಾಗಿರು." },
      { title: "ಹಂಚಿದ ಬೆಣ್ಣೆ", body: "ಎಲ್ಲರಿಗೂ ಪಾಲು ಸಿಕ್ಕಿತು.", lesson: "ಹಂಚಿಕೊಂಡರೆ ಸಂತೋಷ ಹೆಚ್ಚುತ್ತದೆ." },
    ],
  },
];

const text = (t: string): InlineSpan => ({ type: "text", text: t });
const strong = (...children: InlineSpan[]): InlineSpan => ({ type: "strong", children });

function coordinatorFor(seed: string, clock: FakeClock, pdf?: IPdfPublisher): DesktopStudioCoordinator {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: seed,
    autosaveDebounceMs: 40,
    autosaveClock: clock,
    ...(pdf ? { pdfPublisher: pdf } : {}),
  });
}

function allBlocks(book: Book): ContentBlock[] {
  return [...book.frontMatter, ...book.chapters, ...book.backMatter].flatMap((section) => section.blocks);
}

function boxes(book: Book): Extract<ContentBlock, { type: "callout" }>[] {
  return allBlocks(book).filter((block): block is Extract<ContentBlock, { type: "callout" }> => block.type === "callout");
}

/** Story text as a Word import leaves it: heading-free paragraphs, the lesson label in bold. */
function storyBlocks(spec: Spec, index: number): ContentBlock[] {
  const story = spec.stories[index]!;
  return [
    { type: "paragraph", id: `p${index}a`, inlines: [text(story.body)] },
    { type: "paragraph", id: `p${index}b`, inlines: [strong(text(`${spec.boxTitle}:`)), text(` ${story.lesson}`)] },
    { type: "quote", id: `q${index}`, inlines: [text(`${spec.boxTitle}: not a lesson`)] },
  ];
}

async function waitForAutosaveSettled(coordinator: DesktopStudioCoordinator): Promise<void> {
  for (let i = 0; i < 400; i++) {
    const state = coordinator.getAutosaveStatus().state;
    if (state === "idle" || state === "error") return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Autosave did not settle: ${coordinator.getAutosaveStatus().state}`);
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

/** What the Write panel does: find, then convert as one Book change. */
function convertAll(coordinator: DesktopStudioCoordinator, label: string): number {
  const found = findLabelledParagraphs(coordinator.getBook(), label).length;
  const { count, changes } = convertLabelledParagraphs(coordinator.getBook(), label);
  assert.equal(count, found, "the panel converts exactly what it showed");
  if (count > 0) coordinator.getSession().replaceSectionsBlocks(changes);
  return count;
}

for (const spec of SPECS) {
  test(`${spec.label} book: lesson boxes through conversion, editing, Save → Open, autosave, check, and every export`, async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "ob-lesson-harden-"));
    const projectRoot = path.join(parent, "lessons.obproj");
    const clock = new FakeClock();
    const coordinators: DesktopStudioCoordinator[] = [];
    try {
      // 1. Three stories, a picture, and labelled lessons in the first two.
      const first = coordinatorFor(`lesson-harden-${spec.language}`, clock);
      coordinators.push(first);
      const session = first.getSession();
      session.updateMetadata({ title: spec.title, language: spec.language, authors: ["Muralidhar Rao"] });
      const firstId = first.getBook().chapters[0]!.id;
      session.updateSectionTitle(firstId, spec.stories[0]!.title);
      session.setSectionBlocks(firstId, storyBlocks(spec, 0));
      const second = session.addSection({ matter: "main", title: spec.stories[1]!.title });
      session.setSectionBlocks(second.id, storyBlocks(spec, 1));
      const third = session.addSection({ matter: "main", title: spec.stories[2]!.title });
      session.setSectionBlocks(third.id, [{ type: "paragraph", id: "p2a", inlines: [text(spec.stories[2]!.body)] }]);
      while (first.getState().stage !== "ASSETS") assert.ok(first.advanceStage());
      await first.insertImageBlock({
        sectionId: firstId,
        atIndex: 0,
        ingest: { content: PNG, originalFilename: "river.png", kind: "image", altText: "A river" },
      });

      // 2. Book-wide conversion: one change, only the labelled paragraphs, one undo restores.
      const beforeConvert = serializeBook(first.getBook());
      const revision = session.getState().revision;
      assert.equal(convertAll(first, `${spec.boxTitle}:`), 2);
      assert.equal(session.getState().revision, revision + 1);
      const converted = boxes(first.getBook());
      assert.deepEqual(
        converted.map((box) => [box.title, box.inlines]),
        spec.stories.slice(0, 2).map((story) => [spec.boxTitle, [text(story.lesson)]]),
      );
      assert.equal(allBlocks(first.getBook()).filter((b) => b.type === "quote").length, 2, "quotes untouched");
      assert.equal(allBlocks(first.getBook()).filter((b) => b.type === "image").length, 1, "picture untouched");
      assert.equal(session.undo(), true);
      assert.equal(serializeBook(first.getBook()), beforeConvert);
      assert.equal(session.redo(), true);
      assert.equal(boxes(first.getBook()).length, 2);

      // 3. Editing through the editor path: retitle, back to a paragraph, and box again.
      first.selectSection(second.id);
      const doc = first.activeSectionToTipTap().doc as TipTapDocJSON;
      const at = doc.content!.findIndex((node) => node.type === "openbookCallout");
      const retitled = structuredClone(doc);
      retitled.content![at]!.attrs = { title: spec.retitled };
      first.applyActiveSectionTipTap(retitled);
      assert.equal(boxes(first.getBook())[1]!.title, spec.retitled);
      const unboxed = structuredClone(retitled);
      unboxed.content![at] = lessonBoxToParagraph(retitled.content![at]!);
      first.applyActiveSectionTipTap(unboxed);
      assert.equal(boxes(first.getBook()).length, 1);
      first.applyActiveSectionTipTap(retitled);
      assert.equal(boxes(first.getBook()).length, 2);

      // 4. A box with neither title nor text is refused; the Book is unchanged (invariant 1).
      const guarded = serializeBook(first.getBook());
      assert.throws(
        () => session.setSectionBlocks(third.id, [{ type: "callout", id: "empty", title: " ", inlines: [] }]),
        DomainValidationError,
      );
      assert.equal(serializeBook(first.getBook()), guarded);

      // 5. Package Save → Open in a new studio gives the same Book.
      first.bindPackageRoot(projectRoot);
      await first.saveProject(spec.title);
      const stored = JSON.parse(await readFile(path.join(projectRoot, PACKAGE_BOOK_FILE), "utf8")) as {
        bookModelVersion: number;
        book: Book;
      };
      assert.equal(stored.bookModelVersion, 2);
      assert.equal(boxes(stored.book).length, 2);
      const opened = coordinatorFor(`lesson-harden-${spec.language}-open`, clock);
      coordinators.push(opened);
      await opened.openFromProjectPackage(projectRoot);
      assert.equal(serializeBook(opened.getBook()), serializeBook(first.getBook()));
      assert.equal(boxes(opened.getBook())[1]!.title, spec.retitled, "Kannada kept code point for code point");

      // 6. Autosave writes a later conversion in the third story.
      opened.getSession().setSectionBlocks(third.id, [
        { type: "paragraph", id: "p2a", inlines: [text(spec.stories[2]!.body)] },
        { type: "paragraph", id: "p2b", inlines: [text(`  ${spec.boxTitle.toLocaleUpperCase()} ${spec.stories[2]!.lesson}`)] },
      ]);
      assert.equal(convertAll(opened, spec.boxTitle), 1);
      clock.advance(50);
      await waitForAutosaveSettled(opened);
      assert.equal(opened.getAutosaveStatus().state, "idle");

      const pdf = new TypstRecordingPdfPublisher();
      const reopened = coordinatorFor(`lesson-harden-${spec.language}-reopen`, clock, pdf);
      coordinators.push(reopened);
      await reopened.openFromProjectPackage(projectRoot);
      assert.equal(serializeBook(reopened.getBook()), serializeBook(opened.getBook()));
      const final = boxes(reopened.getBook());
      assert.equal(final.length, 3);
      assert.deepEqual(final[2]!.inlines, [text(spec.stories[2]!.lesson)]);

      // 7. The book check is clean, then every export has each box once with its title.
      await readyForExport(reopened);
      const pkg = await buildEpubPackage(reopened.getBook(), { assetResolver: reopened.getAssetResolver() });
      const xhtml = pkg.files
        .filter((file) => file.path.endsWith(".xhtml"))
        .map((file) => (typeof file.content === "string" ? file.content : new TextDecoder().decode(file.content)))
        .join("\n");
      assert.equal((xhtml.match(/<div class="ob-callout" role="note"/g) ?? []).length, 3);
      for (const box of final) assert.ok(xhtml.includes(`<p class="ob-callout-title">${box.title}</p>`), box.title);
      const epub = await reopened.exportEpub({ verificationMode: "fast" });
      assert.ok(epub.bytes.length > 0);

      const html = await reopened.exportHtml();
      assert.equal((html.html.match(/<div class="ob-callout" role="note"/g) ?? []).length, 3);
      assert.match(html.html, /\.ob-callout \{/);

      await reopened.exportPdf();
      assert.equal(pdf.typstSource.split("breakable: false)[").length - 1, 3);
      for (const box of final) assert.ok(pdf.typstSource.includes(`#strong[${box.title}]`), box.title);
    } finally {
      for (const coordinator of coordinators) await coordinator.close();
      await rm(parent, { recursive: true, force: true });
    }
  });
}

test("a version 1 package opens as version 2 and converts", async () => {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-lesson-harden-v1-"));
  const projectRoot = path.join(parent, "old.obproj");
  const clock = new FakeClock();
  const coordinators: DesktopStudioCoordinator[] = [];
  try {
    const spec = SPECS[1]!;
    const writer = coordinatorFor("lesson-harden-v1", clock);
    coordinators.push(writer);
    writer.getSession().updateMetadata({ title: spec.title, language: spec.language, authors: ["Muralidhar Rao"] });
    writer.getSession().setSectionBlocks(writer.getBook().chapters[0]!.id, storyBlocks(spec, 0));
    writer.bindPackageRoot(projectRoot);
    await writer.saveProject(spec.title);
    await writeAsVersion1(projectRoot);

    const opened = coordinatorFor("lesson-harden-v1-open", clock);
    coordinators.push(opened);
    await opened.openFromProjectPackage(projectRoot);
    assert.equal(opened.getBook().schemaVersion, 2);
    assert.equal(convertAll(opened, `${spec.boxTitle}:`), 1);
    assert.equal(boxes(opened.getBook())[0]!.title, spec.boxTitle);
  } finally {
    for (const coordinator of coordinators) await coordinator.close();
    await rm(parent, { recursive: true, force: true });
  }
});

/** Rewrites a saved package as Book Model version 1, as an older OpenBook wrote it. */
async function writeAsVersion1(projectRoot: string): Promise<void> {
  const read = (name: string) => readFile(path.join(projectRoot, name), "utf8");
  const manifest = JSON.parse(await read(PACKAGE_MANIFEST_FILE)) as Record<string, unknown>;
  manifest.bookModelVersion = 1;
  const document = JSON.parse(await read(PACKAGE_BOOK_FILE)) as { bookModelVersion: number; book: Book };
  document.bookModelVersion = 1;
  document.book.schemaVersion = 1;
  const parts = {
    "manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "book.json": `${JSON.stringify(document, null, 2)}\n`,
    "assets.json": await read(PACKAGE_ASSETS_INDEX_FILE),
  };
  await writeFile(path.join(projectRoot, PACKAGE_MANIFEST_FILE), parts["manifest.json"]);
  await writeFile(path.join(projectRoot, PACKAGE_BOOK_FILE), parts["book.json"]);
  await writeFile(
    path.join(projectRoot, PACKAGE_INTEGRITY_FILE),
    serializePackageIntegrityEvidence(buildPackageIntegrityEvidence(parts)),
  );
}
