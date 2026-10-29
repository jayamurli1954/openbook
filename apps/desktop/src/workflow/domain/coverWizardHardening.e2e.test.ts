// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 6 — Cover Wizard hardening.
 *
 * English and Kannada books get a cover through the Cover Wizard fields port, then go through
 * package Save → Open, autosave, the remove-while-cover guard, the book check, and EPUB / HTML /
 * PDF export from the reopened book. The package must hold only the cover field and an ordinary
 * asset, never a generated cover page (ADR-0038 invariant 4).
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DomainValidationError } from "@openbook/authoring";
import type { AssetResolver } from "@openbook/assets";
import { serializeBook, type Book } from "@openbook/book-model";
import { buildEpubPackage } from "@openbook/epub";
import { processBookAssets, serializeBookToTypst, type PdfPublication } from "@openbook/pdf";
import { DesktopStudioCoordinator, type IPdfPublisher } from "../../domain/desktopStudioCoordinator.js";
import type { AutosaveClock } from "../../persistence/autosaveController.js";
import { PACKAGE_BOOK_FILE } from "../../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { checkCoverImage } from "./coverImageChecks.js";
import { readCover } from "./coverWizardContract.js";
import { createCoverWizardFields, type CoverPickedImage } from "./coverWizardFields.js";

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

/** A JPEG header OpenBook can measure; `tag` makes otherwise-equal pictures different files. */
function jpeg(width: number, height: number, tag: number): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x05, 0x41, 0x42, tag,
    0xff, 0xc0, 0x00, 0x0b, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0,
    0xff, 0xd9,
  ]);
}

const CHAPTER_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

interface Spec {
  readonly label: string;
  readonly language: string;
  readonly title: string;
  readonly coverAlt: string;
  readonly replacementAlt: string;
}

const SPECS: readonly Spec[] = [
  {
    label: "English",
    language: "en",
    title: "Little Krishna Wisdom Stories",
    coverAlt: "Little Krishna on a chariot with five children, under the book title",
    replacementAlt: "Little Krishna playing the flute by a river",
  },
  {
    label: "Kannada",
    language: "kn",
    title: "ಪುಟ್ಟ ಕೃಷ್ಣನ ಕಥೆಗಳು",
    coverAlt: "ರಥದ ಮೇಲೆ ಪುಟ್ಟ ಕೃಷ್ಣ ಮತ್ತು ಐದು ಮಕ್ಕಳು",
    replacementAlt: "ನದಿಯ ದಡದಲ್ಲಿ ಕೊಳಲು ನುಡಿಸುವ ಕೃಷ್ಣ",
  },
];

function coordinatorFor(seed: string, clock: FakeClock, pdf?: IPdfPublisher): DesktopStudioCoordinator {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: seed,
    autosaveDebounceMs: 40,
    autosaveClock: clock,
    ...(pdf ? { pdfPublisher: pdf } : {}),
  });
}

function coverFields(coordinator: DesktopStudioCoordinator, queue: CoverPickedImage[]) {
  return createCoverWizardFields({
    pick: { pickImage: async () => queue.shift() ?? { kind: "cancelled" } },
    coordinator: {
      getBook: () => coordinator.getBook(),
      getStage: () => coordinator.getState().stage,
      advanceStage: () => coordinator.advanceStage(),
      ingestAsset: (input) => coordinator.ingestAsset(input),
      getAssetResolver: () => coordinator.getAssetResolver(),
      getSession: () => coordinator.getSession(),
    },
  });
}

async function setCover(
  coordinator: DesktopStudioCoordinator,
  content: Uint8Array,
  altText: string,
): Promise<void> {
  const fields = coverFields(coordinator, [{ kind: "bytes", content, originalFilename: "cover.jpg" }]);
  const chosen = await fields.choose();
  assert.equal(chosen.kind, "chosen");
  if (chosen.kind !== "chosen") return;
  const hadCover = readCover(coordinator.getBook()) !== null;
  assert.deepEqual(await fields.apply(chosen.candidate, altText), {
    ok: true,
    message: hadCover ? "Replaced the cover." : "Added the cover.",
  });
}

async function listFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
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

/** The package stores the cover only as a field plus an ordinary asset (ADR-0038 invariant 4). */
async function assertNoStoredCoverDocument(projectRoot: string, coverAssetId: string): Promise<void> {
  const files = (await listFiles(projectRoot)).map((file) => path.relative(projectRoot, file).replace(/\\/g, "/"));
  assert.equal(
    files.find((file) => /\.(x?html?|pdf|typ|epub|opf)$/i.test(file) || /cover/i.test(file)),
    undefined,
    files.join("\n"),
  );
  const text = await readFile(path.join(projectRoot, PACKAGE_BOOK_FILE), "utf8");
  assert.doesNotMatch(text, /cover-image|cover\.xhtml|book-cover|epub:type|"coverPage"|"coverDocument"/);
  const stored = JSON.parse(text) as { book: Book };
  assert.equal(stored.book.publishing.coverAssetId, coverAssetId);
  assert.deepEqual(Object.keys(stored.book.publishing).sort(), ["coverAssetId", "intendedOutputs"]);
}

for (const spec of SPECS) {
  test(`${spec.label} book: cover through Save → Open, autosave, guard, check, and every export`, async () => {
    const parent = await mkdtemp(path.join(tmpdir(), "ob-cover-harden-"));
    const projectRoot = path.join(parent, "cover.obproj");
    const clock = new FakeClock();
    const coordinators: DesktopStudioCoordinator[] = [];
    try {
      // 1. A book with a chapter picture, then a cover through the wizard.
      const first = coordinatorFor(`cover-harden-${spec.language}`, clock);
      coordinators.push(first);
      first.getSession().updateMetadata({ title: spec.title, language: spec.language, authors: ["Muralidhar Rao"] });
      const chapterId = first.getBook().chapters[0]!.id;
      while (first.getState().stage !== "ASSETS") assert.ok(first.advanceStage());
      await first.insertImageBlock({
        sectionId: chapterId,
        atIndex: 0,
        ingest: { content: CHAPTER_PNG, originalFilename: "river.png", kind: "image", altText: "A river" },
      });
      const coverBytes = jpeg(1600, 2560, 1);
      await setCover(first, coverBytes, spec.coverAlt);
      const coverId = first.getBook().publishing.coverAssetId!;

      // 2. Package Save holds the field and the asset, and no cover page.
      first.bindPackageRoot(projectRoot);
      await first.saveProject(spec.title);
      await assertNoStoredCoverDocument(projectRoot, coverId);

      // 3. Open in a new studio: same cover, description, and bytes.
      const opened = coordinatorFor(`cover-harden-${spec.language}-open`, clock);
      coordinators.push(opened);
      await opened.openFromProjectPackage(projectRoot);
      const cover = readCover(opened.getBook());
      assert.equal(cover?.assetId, coverId);
      assert.equal(cover?.altText, spec.coverAlt);
      const asset = opened.getBook().assets.find((candidate) => candidate.id === coverId)!;
      assert.deepEqual(await opened.getAssetResolver().resolve(asset), coverBytes);

      // 4. Replacing the cover is written by autosave; the unused old picture is removed.
      const replacement = jpeg(1600, 2560, 2);
      await setCover(opened, replacement, spec.replacementAlt);
      const newCoverId = opened.getBook().publishing.coverAssetId!;
      assert.notEqual(newCoverId, coverId);
      assert.equal(opened.getBook().assets.some((candidate) => candidate.id === coverId), false);
      clock.advance(50);
      await waitForAutosaveSettled(opened);
      assert.equal(opened.getAutosaveStatus().state, "idle");

      const pdfPublisher = new TypstRecordingPdfPublisher();
      const reopened = coordinatorFor(`cover-harden-${spec.language}-reopen`, clock, pdfPublisher);
      coordinators.push(reopened);
      await reopened.openFromProjectPackage(projectRoot);
      assert.equal(readCover(reopened.getBook())?.assetId, newCoverId);
      assert.equal(readCover(reopened.getBook())?.altText, spec.replacementAlt);
      assert.equal(reopened.getBook().assets.some((candidate) => candidate.id === coverId), false);
      assert.equal(reopened.getBook().assets.length, 2, "chapter picture + new cover");
      await assertNoStoredCoverDocument(projectRoot, newCoverId);

      // 5. The cover picture can't be removed while it is the cover.
      const before = serializeBook(reopened.getBook());
      assert.throws(
        () => reopened.getSession().removeAsset(newCoverId),
        (err: unknown) =>
          err instanceof DomainValidationError && err.issues.some((issue) => issue.code === "cover-asset-missing"),
      );
      assert.equal(serializeBook(reopened.getBook()), before);

      // 6. Book check is clean, then every export carries the cover once.
      await readyForExport(reopened);
      const epub = await reopened.exportEpub({ verificationMode: "fast" });
      const directory = new TextDecoder("latin1").decode(epub.bytes);
      assert.ok(directory.includes("EPUB/text/cover.xhtml"));
      assert.ok(directory.includes(`EPUB/images/${newCoverId}.jpg`));
      const pkg = await buildEpubPackage(reopened.getBook(), { assetResolver: reopened.getAssetResolver() });
      assert.equal(pkg.manifest.filter((item) => item.properties === "cover-image").length, 1);
      assert.equal(pkg.spine[0], "cover-page");

      const html = await reopened.exportHtml();
      assert.equal((html.html.match(/<figure class="book-cover">/g) ?? []).length, 1);
      assert.ok(html.html.includes(`alt="${spec.replacementAlt}"`));

      await reopened.exportPdf();
      assert.equal(pdfPublisher.typstSource.split("#page(margin: 0pt)[").length - 1, 1);
      assert.ok(pdfPublisher.typstSource.indexOf("#page(margin: 0pt)[") < pdfPublisher.typstSource.indexOf("\n= "));
      assert.ok(pdfPublisher.typstSource.includes(`alt: "${spec.replacementAlt}"`));
    } finally {
      for (const coordinator of coordinators) await coordinator.close();
      await rm(parent, { recursive: true, force: true });
    }
  });
}

test("a book without a cover still exports with no cover parts", async () => {
  const clock = new FakeClock();
  const pdfPublisher = new TypstRecordingPdfPublisher();
  const coordinator = coordinatorFor("cover-harden-none", clock, pdfPublisher);
  try {
    coordinator.getSession().updateMetadata({ title: "No Cover", language: "en", authors: ["Muralidhar Rao"] });
    await readyForExport(coordinator);
    const epub = await coordinator.exportEpub({ verificationMode: "fast" });
    assert.ok(!new TextDecoder("latin1").decode(epub.bytes).includes("cover.xhtml"));
    const html = await coordinator.exportHtml();
    assert.doesNotMatch(html.html, /book-cover/);
    await coordinator.exportPdf();
    assert.doesNotMatch(pdfPublisher.typstSource, /#page\(margin: 0pt\)/);
  } finally {
    await coordinator.close();
  }
});

test("cover checks and choosing a picture never change its bytes", async () => {
  const clock = new FakeClock();
  const coordinator = coordinatorFor("cover-harden-bytes", clock);
  try {
    const bytes = jpeg(841, 1261, 3);
    const copy = Uint8Array.from(bytes);
    checkCoverImage(
      { id: "probe", kind: "image", fileName: "c.jpg", mediaType: "image/jpeg", altText: "", licence: "" },
      bytes,
    );
    assert.deepEqual(bytes, copy);
    await setCover(coordinator, bytes, "Cover");
    assert.deepEqual(bytes, copy);
    const asset = coordinator.getBook().assets.find((a) => a.id === coordinator.getBook().publishing.coverAssetId)!;
    assert.deepEqual(await coordinator.getAssetResolver().resolve(asset), copy);
  } finally {
    await coordinator.close();
  }
});
