// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 8 Slice 5: DesktopStudioCoordinator publishing/export tests (ADR-0023).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { Book } from "@openbook/book-model";
import type { AssetResolver } from "@openbook/assets";
import type { PdfPublication } from "@openbook/pdf";
import type { ValidationReport, ValidatorService } from "@openbook/validator";
import type { WorkflowStage } from "@openbook/workflow";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
  type IPdfPublisher,
} from "./desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

const here = dirname(fileURLToPath(import.meta.url));
const srcFile = join(here, "..", "..", "src", "domain", "desktopStudioCoordinator.ts");

const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02,
  0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const KANNADA_TYPST = "#set text(lang: \"kn\")\nನಮಸ್ಕಾರ";
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

function cleanEpubCheckReport(targetPath = "book.epub"): ValidationReport {
  return {
    validatorName: "EPUBCheck",
    validatorVersion: "5.3.0",
    targetPath,
    isValid: true,
    summary: {
      totalFatal: 0,
      totalErrors: 0,
      totalWarnings: 0,
      totalInfos: 0,
      isValid: true,
    },
    messages: [],
    rawExitCode: 0,
    failureKind: "none",
  };
}

function dirtyEpubCheckReport(targetPath = "book.epub"): ValidationReport {
  return {
    validatorName: "EPUBCheck",
    validatorVersion: "5.3.0",
    targetPath,
    isValid: false,
    summary: {
      totalFatal: 0,
      totalErrors: 2,
      totalWarnings: 0,
      totalInfos: 0,
      isValid: false,
    },
    messages: [
      {
        id: "CHK-1",
        severity: "ERROR",
        message: "Bad OPF",
        locations: [{ path: "EPUB/package.opf", line: 10, column: 2 }],
      },
      {
        id: "CHK-2",
        severity: "ERROR",
        message: "Missing manifest item",
        locations: [],
      },
    ],
    rawExitCode: 1,
    failureKind: "conformance",
  };
}

class RecordingValidator implements ValidatorService {
  calls = 0;
  lastPath: string | undefined;
  constructor(private readonly report: ValidationReport = cleanEpubCheckReport()) {}
  async validateEpub(epubPath: string): Promise<ValidationReport> {
    this.calls += 1;
    this.lastPath = epubPath;
    return { ...this.report, targetPath: epubPath };
  }
}

class HangingValidator implements ValidatorService {
  readonly started: Promise<void>;
  #notifyStarted!: () => void;
  #release!: (report: ValidationReport) => void;

  constructor() {
    this.started = new Promise((resolve) => {
      this.#notifyStarted = resolve;
    });
  }

  release(report: ValidationReport = cleanEpubCheckReport()): void {
    this.#release(report);
  }

  async validateEpub(epubPath: string): Promise<ValidationReport> {
    const report = await new Promise<ValidationReport>((resolve) => {
      this.#release = resolve;
      this.#notifyStarted();
    });
    return { ...report, targetPath: epubPath };
  }
}

class MockPdfPublisher implements IPdfPublisher {
  calls = 0;
  lastBook: Readonly<Book> | undefined;
  lastResolver: AssetResolver | undefined;
  resolvedAsset: Uint8Array | undefined;

  constructor(
    private readonly result: PdfPublication = {
      pdf: PDF_MAGIC,
      typstSource: KANNADA_TYPST,
      diagnostics: [],
    },
  ) {}

  async publishPdf(
    book: Readonly<Book>,
    options: { assetResolver: AssetResolver; signal?: AbortSignal },
  ): Promise<PdfPublication> {
    this.calls += 1;
    this.lastBook = book;
    this.lastResolver = options.assetResolver;
    const asset = book.assets[0];
    if (asset) {
      this.resolvedAsset = await options.assetResolver.resolve(asset);
    }
    return this.result;
  }
}

class FailingPdfPublisher implements IPdfPublisher {
  async publishPdf(): Promise<PdfPublication> {
    const err = new Error("unknown variable at main.typ:3");
    err.name = "TypstRuntimeError";
    throw err;
  }
}

function freshCoordinator(
  idSeed = "publish-studio",
  extras?: {
    validatorService?: ValidatorService;
    pdfPublisher?: IPdfPublisher;
    persistence?: SqliteProjectPersistence;
  },
) {
  const persistence =
    extras?.persistence ?? new SqliteProjectPersistence(new InMemorySqliteConnection());
  return new DesktopStudioCoordinator({
    persistence,
    idSeed,
    validatorService: extras?.validatorService ?? new RecordingValidator(),
    pdfPublisher: extras?.pdfPublisher ?? new MockPdfPublisher(),
  });
}

function advanceTo(coordinator: DesktopStudioCoordinator, target: WorkflowStage): void {
  while (coordinator.getState().stage !== target) {
    const next = coordinator.advanceStage();
    if (!next) {
      throw new Error(`Cannot advance to ${target} from ${coordinator.getState().stage}`);
    }
  }
}

async function readyForExport(
  coordinator: DesktopStudioCoordinator,
  target: "PREVIEW" | "PUBLISH" = "PREVIEW",
): Promise<void> {
  advanceTo(coordinator, "VALIDATION");
  const report = await coordinator.runValidation();
  assert.equal(report.summary.isClean, true);
  advanceTo(coordinator, target);
}

function pngIngest(filename: string, altText?: string) {
  return {
    content: PNG_1X1,
    originalFilename: filename,
    kind: "image" as const,
    altText,
  };
}

test("export is refused before PREVIEW and leaves the job idle", async () => {
  const stages: WorkflowStage[] = ["IMPORT", "STRUCTURE", "AUTHORING", "ASSETS", "VALIDATION"];
  for (const stage of stages) {
    const coordinator = freshCoordinator(`stage-${stage.toLowerCase()}`);
    if (stage !== "IMPORT") {
      advanceTo(coordinator, stage);
    }
    assert.equal(coordinator.getState().stage, stage);
    await assert.rejects(
      () => coordinator.exportEpub(),
      (err: unknown) =>
        err instanceof DesktopStudioError &&
        err.code === "PUBLISH_NOT_PERMITTED" &&
        err.message.includes(stage),
    );
    await assert.rejects(
      () => coordinator.exportHtml(),
      (err: unknown) =>
        err instanceof DesktopStudioError && err.code === "PUBLISH_NOT_PERMITTED",
    );
    await assert.rejects(
      () => coordinator.exportPdf(),
      (err: unknown) =>
        err instanceof DesktopStudioError && err.code === "PUBLISH_NOT_PERMITTED",
    );
    assert.equal(coordinator.getState().jobStatus, "idle");
  }
});

test("Phase 1 rejects unrun or unclean Book Doctor reports", async () => {
  const unclean = freshCoordinator("phase1-unclean", {
    validatorService: new RecordingValidator(),
  });
  advanceTo(unclean, "VALIDATION");
  const dirty = await unclean.runValidation({
    epubCheckReport: {
      validatorName: "EPUBCheck",
      targetPath: "/tmp/x.epub",
      isValid: false,
      failureKind: "conformance",
      messages: [
        {
          id: "CHK-1",
          severity: "ERROR",
          message: "Bad OPF",
          locations: [],
        },
      ],
    },
  });
  assert.equal(dirty.summary.isClean, false);
  await assert.rejects(
    () => unclean.exportEpub(),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "PUBLISH_NOT_PERMITTED",
  );

  const coordinator = freshCoordinator("phase1-unrun");
  await readyForExport(coordinator, "PREVIEW");
  coordinator.updateActiveSectionBlocks([
    { type: "paragraph", id: "p-edit", inlines: [{ type: "text", text: "Edited after validate" }] },
  ]);
  assert.equal(coordinator.getValidationReport(), null);
  await assert.rejects(
    () => coordinator.exportEpub({ verificationMode: "fast" }),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "PREPUBLISH_VALIDATION_FAILED" &&
      err.message === "Cannot export: Book Doctor validation has not been run.",
  );
  await assert.rejects(
    () => coordinator.exportHtml(),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "PREPUBLISH_VALIDATION_FAILED",
  );
  assert.equal(coordinator.getState().jobStatus, "idle");
});

test("PREVIEW fast EPUB skips ValidatorService", async () => {
  const validator = new RecordingValidator();
  const coordinator = freshCoordinator("epub-fast", { validatorService: validator });
  await readyForExport(coordinator, "PREVIEW");
  const result = await coordinator.exportEpub({ verificationMode: "fast" });
  assert.equal(result.format, "epub");
  assert.ok(result.bytes instanceof Uint8Array);
  assert.ok(result.bytes.byteLength > 0);
  assert.equal(validator.calls, 0);
  assert.equal(result.epubCheckReport, undefined);
  assert.equal(coordinator.getState().jobStatus, "idle");
  const asText = new TextDecoder("latin1").decode(result.bytes);
  assert.ok(asText.includes("application/epub+zip"));
});

test("PUBLISH EPUB requires EPUBCheck and rejects fast mode", async () => {
  const validator = new RecordingValidator();
  const coordinator = freshCoordinator("epub-publish", { validatorService: validator });
  await readyForExport(coordinator, "PUBLISH");
  await assert.rejects(
    () => coordinator.exportEpub({ verificationMode: "fast" }),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "PUBLISH_FAILED" &&
      err.message === "verificationMode cannot be 'fast' during PUBLISH stage.",
  );
  assert.equal(coordinator.getState().jobStatus, "failed");
  assert.equal(validator.calls, 0);

  const verified = await coordinator.exportEpub();
  assert.equal(verified.format, "epub");
  assert.equal(validator.calls, 1);
  assert.ok(verified.epubCheckReport);
  assert.equal(verified.epubCheckReport.isValid, true);
  assert.equal(coordinator.getState().jobStatus, "idle");
  assert.equal(coordinator.getState().activeJobId, undefined);
});

test("injected EPUBCheck errors throw CONFORMANCE_CHECK_FAILED", async () => {
  const validator = new RecordingValidator(dirtyEpubCheckReport());
  const coordinator = freshCoordinator("epub-conformance", { validatorService: validator });
  await readyForExport(coordinator, "PUBLISH");
  await assert.rejects(
    () => coordinator.exportEpub(),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "CONFORMANCE_CHECK_FAILED" &&
      err.message === "EPUBCheck failed with 2 errors.",
  );
  assert.equal(validator.calls, 1);
  assert.equal(coordinator.getState().jobStatus, "failed");
});

test("HTML export returns HtmlExportResult", async () => {
  const coordinator = freshCoordinator("html-export");
  await readyForExport(coordinator, "PREVIEW");
  const result = await coordinator.exportHtml();
  assert.equal(result.format, "html");
  assert.ok(result.html.includes("<!DOCTYPE html>"));
  assert.ok(result.files.length >= 1);
  assert.equal(result.files[0]?.path, "index.html");
  assert.ok(Array.isArray(result.diagnostics));
  assert.equal(coordinator.getState().jobStatus, "idle");
});

test("PDF export returns Typst output and maps compiler errors", async () => {
  const pdf = new MockPdfPublisher();
  const coordinator = freshCoordinator("pdf-ok", { pdfPublisher: pdf });
  await readyForExport(coordinator, "PREVIEW");
  const result = await coordinator.exportPdf();
  assert.equal(result.format, "pdf");
  assert.deepEqual([...result.bytes], [...PDF_MAGIC]);
  assert.ok(result.typstSource.includes("ನಮಸ್ಕಾರ"));
  assert.ok(Array.isArray(result.diagnostics));
  assert.equal(pdf.calls, 1);

  const failing = freshCoordinator("pdf-fail", { pdfPublisher: new FailingPdfPublisher() });
  await readyForExport(failing, "PREVIEW");
  await assert.rejects(
    () => failing.exportPdf(),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "RENDERER_COMPILER_FAILED" &&
      err.message.includes("unknown variable"),
  );
  assert.equal(failing.getState().jobStatus, "failed");
});

test("identical Book snapshots produce identical EPUB and HTML bytes", async () => {
  const coordinator = freshCoordinator("determinism");
  await readyForExport(coordinator, "PREVIEW");
  const epub1 = await coordinator.exportEpub({ verificationMode: "fast" });
  const epub2 = await coordinator.exportEpub({ verificationMode: "fast" });
  assert.deepEqual([...epub1.bytes], [...epub2.bytes]);
  const html1 = await coordinator.exportHtml();
  const html2 = await coordinator.exportHtml();
  assert.equal(html1.html, html2.html);
  assert.equal(JSON.stringify(html1.files), JSON.stringify(html2.files));
});

test("ingested images are resolved across EPUB, HTML, and PDF", async () => {
  const pdf = new MockPdfPublisher();
  const coordinator = freshCoordinator("assets-export", { pdfPublisher: pdf });
  advanceTo(coordinator, "ASSETS");
  const { assetRef } = await coordinator.insertImageBlock({
    sectionId: coordinator.getBook().chapters[0]!.id,
    atIndex: 0,
    ingest: pngIngest("cover.png", "pixel"),
  });
  await readyForExport(coordinator, "PREVIEW");

  const epub = await coordinator.exportEpub({ verificationMode: "fast" });
  const epubText = new TextDecoder("latin1").decode(epub.bytes);
  assert.ok(epubText.includes(`EPUB/images/${assetRef.id}.png`));

  const html = await coordinator.exportHtml();
  const imageFile = html.files.find((file) => file.mediaType === "image/png");
  assert.ok(imageFile);
  assert.ok(imageFile.content instanceof Uint8Array);
  assert.deepEqual([...(imageFile.content as Uint8Array)], [...PNG_1X1]);
  assert.ok(html.html.includes(assetRef.altText ?? "pixel") || html.html.includes("cover.png") || html.html.includes("assets/"));

  const pdfResult = await coordinator.exportPdf();
  assert.equal(pdf.calls, 1);
  assert.ok(pdf.resolvedAsset);
  assert.deepEqual([...(pdf.resolvedAsset as Uint8Array)], [...PNG_1X1]);
  assert.equal(pdfResult.format, "pdf");
});

test("concurrent export throws PUBLISH_FAILED", async () => {
  const hanging = new HangingValidator();
  const coordinator = freshCoordinator("concurrent", { validatorService: hanging });
  await readyForExport(coordinator, "PUBLISH");
  const first = coordinator.exportEpub();
  await hanging.started;
  assert.equal(coordinator.getState().jobStatus, "running");
  assert.match(coordinator.getState().activeJobId ?? "", /^export-epub-/);
  await assert.rejects(
    () => coordinator.exportHtml(),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "PUBLISH_FAILED" &&
      err.message === "A workflow operation is already running.",
  );
  assert.equal(coordinator.getState().jobStatus, "running");
  hanging.release();
  await first;
  assert.equal(coordinator.getState().jobStatus, "idle");
});

test("AbortSignal throws OPERATION_ABORTED and fails the job", async () => {
  const hanging = new HangingValidator();
  const coordinator = freshCoordinator("abort", { validatorService: hanging });
  await readyForExport(coordinator, "PUBLISH");
  const controller = new AbortController();
  const pending = coordinator.exportEpub({ signal: controller.signal });
  await hanging.started;
  controller.abort();
  await assert.rejects(
    () => pending,
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "OPERATION_ABORTED",
  );
  assert.equal(coordinator.getState().jobStatus, "failed");
  hanging.release();
});

test("export does not write SQLite and does not mutate Book", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const coordinator = freshCoordinator("persist-firewall", { persistence });
  const saved = await coordinator.saveProject("Export Firewall");
  const projectsBefore = JSON.stringify([...driver.projects.entries()]);
  const docsBefore = JSON.stringify([...driver.projectDocuments.entries()]);
  const bookBefore = JSON.stringify(coordinator.getBook());

  await readyForExport(coordinator, "PREVIEW");
  await coordinator.exportEpub({ verificationMode: "fast" });
  await coordinator.exportHtml();
  await coordinator.exportPdf();

  assert.equal(JSON.stringify(coordinator.getBook()), bookBefore);
  assert.equal(JSON.stringify([...driver.projects.entries()]), projectsBefore);
  assert.equal(JSON.stringify([...driver.projectDocuments.entries()]), docsBefore);
  const payload = JSON.parse(
    [...driver.projectDocuments.values()][0]!.book_payload,
  ) as Record<string, unknown>;
  assert.equal(payload["schemaVersion"], 1);
  assert.equal("epub" in payload, false);
  assert.equal("pdf" in payload, false);
  assert.equal(saved.projectId, [...driver.projects.keys()][0]);
});

test("coordinator source stays headless and Slice 5 scoped", () => {
  const source = readFileSync(srcFile, "utf8");
  assert.match(source, /from "@openbook\/epub"/);
  assert.match(source, /from "@openbook\/html"/);
  assert.match(source, /from "@openbook\/pdf"/);
  assert.match(source, /from "@openbook\/validator"/);
  assert.doesNotMatch(source, /from ["']@tauri-apps\//);
  assert.doesNotMatch(source, /from ["']react["']/);
  assert.doesNotMatch(source, /from ["']react-dom["']/);
  assert.doesNotMatch(source, /EditorBookSession/);
});
