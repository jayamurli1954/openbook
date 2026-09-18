// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 5 — end-to-end export verification/hardening (ADR-0030).
 *
 * Composes the real DesktopStudioCoordinator with ExportSaveHostAdapter /
 * SaveAsHostAdapter / DesktopExportController using fake Save-As ports (no Tauri).
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
} from "../../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { DesktopExportController } from "../../host/desktopExportController.js";
import { ExportSaveHostAdapter } from "./exportSaveHostAdapter.js";
import {
  SaveAsFileSystemError,
  SaveAsHostAdapter,
  type OverwriteConfirmationPort,
  type SaveAsDialogPort,
  type SaveAsFileSystemPort,
  type SaveAsFileWrite,
  type SaveAsHostRequest,
} from "./saveAsHostAdapter.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoSrc = join(here, "..", "..", "..", "src");

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

class RecordingValidator implements ValidatorService {
  calls = 0;
  constructor(private readonly report: ValidationReport = cleanEpubCheckReport()) {}
  async validateEpub(epubPath: string): Promise<ValidationReport> {
    this.calls += 1;
    return { ...this.report, targetPath: epubPath };
  }
}

class MockPdfPublisher implements IPdfPublisher {
  async publishPdf(
    _book: Readonly<Book>,
    _options: { assetResolver: AssetResolver; signal?: AbortSignal },
  ): Promise<PdfPublication> {
    return {
      pdf: PDF_MAGIC,
      typstSource: "#set page()\n",
      diagnostics: [],
    };
  }
}

function freshCoordinator(
  idSeed: string,
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

function fakeSaveAs(options?: {
  destination?: string | null;
  overwrite?: boolean;
  existing?: string[];
  failWrite?: boolean;
}) {
  const writes: SaveAsFileWrite[][] = [];
  const files = new Map<string, Uint8Array>();
  for (const path of options?.existing ?? []) {
    files.set(path, new Uint8Array([0]));
  }
  const saveRequests: SaveAsHostRequest[] = [];
  const dialogChoices: Array<{ defaultFileName: string; extension: string }> = [];
  const overwriteRequests: string[][] = [];

  const dialog: SaveAsDialogPort = {
    async chooseDestination(dialogOptions) {
      dialogChoices.push({
        defaultFileName: dialogOptions.defaultFileName,
        extension: dialogOptions.extension,
      });
      return options?.destination === undefined ? "Out.epub" : options.destination;
    },
  };
  const overwrite: OverwriteConfirmationPort = {
    async confirmOverwrite(paths) {
      overwriteRequests.push([...paths]);
      return options?.overwrite !== false;
    },
  };
  const fileSystem: SaveAsFileSystemPort = {
    async exists(path) {
      return files.has(path);
    },
    async writeAtomically(batch) {
      writes.push(batch.map((file) => ({ path: file.path, bytes: file.bytes })));
      if (options?.failWrite) {
        throw new SaveAsFileSystemError("WRITE_FAILED", "Atomic write failed.");
      }
      for (const file of batch) {
        files.set(file.path, file.bytes);
      }
    },
  };

  const saveAs = new SaveAsHostAdapter(dialog, overwrite, fileSystem);
  return {
    saveAs: {
      async save(request: SaveAsHostRequest) {
        saveRequests.push(request);
        return saveAs.save(request);
      },
    },
    files,
    writes,
    saveRequests,
    dialogChoices,
    overwriteRequests,
  };
}

function wireHost(coordinator: DesktopStudioCoordinator, saveAs: { save: SaveAsHostAdapter["save"] }) {
  return ExportSaveHostAdapter.fromPorts(coordinator, saveAs);
}

test("E2E PREVIEW: EPUB/HTML/PDF reach Save-As with real coordinator bytes", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const validator = new RecordingValidator();
  const coordinator = freshCoordinator("gate9-preview", {
    persistence,
    validatorService: validator,
  });
  await coordinator.saveProject("Gate 9 Preview Book");
  const projectsBefore = JSON.stringify([...driver.projects.entries()]);
  const docsBefore = JSON.stringify([...driver.projectDocuments.entries()]);
  const bookBefore = JSON.stringify(coordinator.getBook());

  await readyForExport(coordinator, "PREVIEW");
  const { saveAs, files, dialogChoices } = fakeSaveAs({
    destination: "exports/Gate9.epub",
  });
  const host = wireHost(coordinator, saveAs);
  const controller = new DesktopExportController({
    exportSaveHost: host,
    getSuggestedTitle: () => coordinator.getBook().metadata.title || "Untitled Book",
    getStage: () => coordinator.getState().stage,
  });

  const epubStatus = await controller.exportFormat("epub");
  assert.equal(epubStatus.phase, "succeeded");
  assert.ok(files.get("exports/Gate9.epub")?.byteLength);
  assert.equal(files.get("exports/Gate9.epub")?.[0], 0x50); // 'P' of PK zip
  assert.equal(validator.calls, 0); // PREVIEW fast path
  assert.equal(dialogChoices[0]?.extension, "epub");
  assert.ok(dialogChoices[0]?.defaultFileName.endsWith(".epub"));

  const htmlPorts = fakeSaveAs({ destination: "exports/Gate9.html" });
  const htmlHost = wireHost(coordinator, htmlPorts.saveAs);
  const htmlResult = await htmlHost.exportAndSave({
    format: "html",
    suggestedTitle: coordinator.getBook().metadata.title || "Untitled Book",
  });
  assert.equal(htmlResult.ok, true);
  if (htmlResult.ok) {
    assert.ok(htmlPorts.files.get("exports/Gate9.html")?.byteLength);
    assert.ok(
      new TextDecoder().decode(htmlPorts.files.get("exports/Gate9.html")).includes("<!DOCTYPE html>"),
    );
  }

  const pdfPorts = fakeSaveAs({ destination: "exports/Gate9.pdf" });
  const pdfHost = wireHost(coordinator, pdfPorts.saveAs);
  const pdfResult = await pdfHost.exportAndSave({
    format: "pdf",
    suggestedTitle: coordinator.getBook().metadata.title || "Untitled Book",
  });
  assert.equal(pdfResult.ok, true);
  assert.deepEqual(pdfPorts.files.get("exports/Gate9.pdf")?.slice(0, 4), PDF_MAGIC);

  assert.equal(JSON.stringify(coordinator.getBook()), bookBefore);
  assert.equal(JSON.stringify([...driver.projects.entries()]), projectsBefore);
  assert.equal(JSON.stringify([...driver.projectDocuments.entries()]), docsBefore);
  const payload = JSON.parse(
    [...driver.projectDocuments.values()][0]!.book_payload,
  ) as Record<string, unknown>;
  assert.equal("epub" in payload, false);
  assert.equal("pdf" in payload, false);
  assert.equal("html" in payload, false);
});

test("E2E PUBLISH EPUB requires EPUBCheck and writes verified bytes", async () => {
  const validator = new RecordingValidator();
  const coordinator = freshCoordinator("gate9-publish", { validatorService: validator });
  await readyForExport(coordinator, "PUBLISH");
  const { saveAs, files } = fakeSaveAs({ destination: "publish/Book.epub" });
  const host = wireHost(coordinator, saveAs);

  const result = await host.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
    verificationMode: "verified",
  });

  assert.equal(result.ok, true);
  assert.ok(validator.calls >= 1);
  assert.ok(files.get("publish/Book.epub")?.byteLength);
});

test("E2E Book Doctor gate: export refused before PREVIEW/PUBLISH", async () => {
  const coordinator = freshCoordinator("gate9-pre-preview");
  advanceTo(coordinator, "VALIDATION");
  const { saveAs, writes } = fakeSaveAs({ destination: "blocked.epub" });
  const host = wireHost(coordinator, saveAs);
  const controller = new DesktopExportController({
    exportSaveHost: host,
    getSuggestedTitle: () => "Book",
    getStage: () => coordinator.getState().stage,
  });

  const status = await controller.exportFormat("epub");
  assert.equal(status.phase, "failed");
  assert.equal(status.code, "PUBLISH_NOT_PERMITTED");
  assert.equal(writes.length, 0);
  assert.equal(controller.canExport(), false);
});

test("E2E unrun validation cannot reach PREVIEW; export refused before Save-As", async () => {
  const coordinator = freshCoordinator("gate9-novalidation");
  advanceTo(coordinator, "VALIDATION");
  assert.throws(
    () => coordinator.transitionStage("PREVIEW"),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "VALIDATION_FAILED",
  );

  const { saveAs, writes, saveRequests } = fakeSaveAs({ destination: "x.epub" });
  const host = wireHost(coordinator, saveAs);
  const result = await host.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
    verificationMode: "fast",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, "export");
    assert.ok(result.error instanceof DesktopStudioError);
  }
  assert.equal(saveRequests.length, 0);
  assert.equal(writes.length, 0);
});

test("E2E dialog cancel after generation performs no filesystem commit", async () => {
  const coordinator = freshCoordinator("gate9-cancel");
  await readyForExport(coordinator, "PREVIEW");
  const { saveAs, writes, files } = fakeSaveAs({ destination: null });
  const host = wireHost(coordinator, saveAs);

  const result = await host.exportAndSave({
    format: "pdf",
    suggestedTitle: "Book",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, "save");
    assert.equal(result.code, "EXPORT_CANCELLED");
  }
  assert.equal(writes.length, 0);
  assert.equal(files.size, 0);
});

test("E2E overwrite decline preserves existing artifact", async () => {
  const coordinator = freshCoordinator("gate9-overwrite");
  await readyForExport(coordinator, "PREVIEW");
  const { saveAs, files, overwriteRequests, writes } = fakeSaveAs({
    destination: "Book.epub",
    existing: ["Book.epub"],
    overwrite: false,
  });
  const host = wireHost(coordinator, saveAs);

  const result = await host.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
    verificationMode: "fast",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, "save");
    assert.equal(result.code, "EXPORT_OVERWRITE_DECLINED");
  }
  assert.deepEqual(files.get("Book.epub"), new Uint8Array([0]));
  assert.equal(writes.length, 0);
  assert.deepEqual(overwriteRequests, [["Book.epub"]]);
});

test("E2E overwrite accept replaces existing artifact with export bytes", async () => {
  const coordinator = freshCoordinator("gate9-overwrite-yes");
  await readyForExport(coordinator, "PREVIEW");
  const { saveAs, files } = fakeSaveAs({
    destination: "Book.pdf",
    existing: ["Book.pdf"],
    overwrite: true,
  });
  const host = wireHost(coordinator, saveAs);

  const result = await host.exportAndSave({
    format: "pdf",
    suggestedTitle: "Book",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(files.get("Book.pdf")?.slice(0, 4), PDF_MAGIC);
});

test("E2E write failure leaves no committed artifact after successful export", async () => {
  const coordinator = freshCoordinator("gate9-write-fail");
  await readyForExport(coordinator, "PREVIEW");
  const { saveAs, files, writes } = fakeSaveAs({
    destination: "Book.html",
    failWrite: true,
  });
  const host = wireHost(coordinator, saveAs);

  const result = await host.exportAndSave({
    format: "html",
    suggestedTitle: "Book",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, "save");
    assert.equal(result.code, "EXPORT_WRITE_FAILED");
  }
  assert.equal(files.has("Book.html"), false);
  assert.equal(writes.length, 1);
});

test("E2E AbortSignal cancels composed export without Save-As commit", async () => {
  const coordinator = freshCoordinator("gate9-abort");
  await readyForExport(coordinator, "PREVIEW");
  const controller = new AbortController();
  controller.abort();
  const { saveAs, writes } = fakeSaveAs({ destination: "Book.epub" });
  const host = wireHost(coordinator, saveAs);

  const result = await host.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
    verificationMode: "fast",
    signal: controller.signal,
  });

  assert.equal(result.ok, false);
  assert.equal(writes.length, 0);
});

test("E2E invalid destination never writes", async () => {
  const coordinator = freshCoordinator("gate9-invalid-dest");
  await readyForExport(coordinator, "PREVIEW");
  const { saveAs, writes } = fakeSaveAs({ destination: "Book.pdf" }); // wrong extension for epub
  const host = wireHost(coordinator, saveAs);

  const result = await host.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
    verificationMode: "fast",
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.stage, "save");
    assert.equal(result.code, "EXPORT_DESTINATION_INVALID");
  }
  assert.equal(writes.length, 0);
});

test("Gate 9 host/Tauri sources stay free of shell execution and broad FS plugin", () => {
  const ports = readFileSync(join(repoSrc, "host", "tauriSaveAsPorts.ts"), "utf8");
  const createHost = readFileSync(join(repoSrc, "host", "createTauriExportSaveHost.ts"), "utf8");
  const rust = readFileSync(join(repoSrc, "..", "src-tauri", "src", "lib.rs"), "utf8");
  const panel = readFileSync(join(repoSrc, "ui", "ExportPanel.tsx"), "utf8");

  assert.match(ports, /@tauri-apps\/plugin-dialog/);
  assert.match(ports, /no shell execution/);
  assert.doesNotMatch(ports, /@tauri-apps\/plugin-fs/);
  assert.doesNotMatch(ports, /child_process|execFile|spawn\(/);
  assert.doesNotMatch(createHost, /plugin-fs|child_process|execFile/);
  assert.match(rust, /export_write_atomically/);
  assert.match(rust, /cleanup_temps/);
  assert.doesNotMatch(rust, /std::process::Command|Command::new/);
  assert.match(panel, /DesktopExportController/);
  assert.doesNotMatch(panel, /buildEpub|buildHtml|publishPdf|writeFile|showSaveDialog/);
});
