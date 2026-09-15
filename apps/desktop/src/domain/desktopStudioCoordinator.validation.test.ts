// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 8 Slice 4: DesktopStudioCoordinator Book Doctor validation tests (ADR-0022).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { Book } from "@openbook/book-model";
import {
  ValidationCoordinator,
  type BookDiagnostic,
  type IValidationCoordinator,
  type TypstDiagnosticInput,
} from "@openbook/book-doctor";
import type { WorkflowStage } from "@openbook/workflow";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
  type EpubCheckDiagnosticInput,
} from "./desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

const here = dirname(fileURLToPath(import.meta.url));
const srcFile = join(here, "..", "..", "src", "domain", "desktopStudioCoordinator.ts");

class DomainErrorCoordinator implements IValidationCoordinator {
  readonly inner = new ValidationCoordinator();

  async runDomainValidation(book: Book): Promise<readonly BookDiagnostic[]> {
    const base = await this.inner.runDomainValidation(book);
    return [
      ...base,
      {
        source: "domain-model",
        severity: "error",
        code: "empty-chapter-list",
        message: "Book has no chapters.",
        targetSectionId: book.chapters[0]?.id,
      },
    ];
  }

  normalizeEpubCheckReport(report: unknown) {
    return this.inner.normalizeEpubCheckReport(report);
  }

  normalizeTypstDiagnostics(input: TypstDiagnosticInput) {
    return this.inner.normalizeTypstDiagnostics(input);
  }

  aggregate(diagnosticSets: readonly (readonly BookDiagnostic[])[]) {
    return this.inner.aggregate(diagnosticSets);
  }
}

class HangingCoordinator implements IValidationCoordinator {
  readonly inner = new ValidationCoordinator();
  readonly started: Promise<void>;
  #notifyStarted!: () => void;
  #release!: (diagnostics: readonly BookDiagnostic[]) => void;

  constructor() {
    this.started = new Promise((resolve) => {
      this.#notifyStarted = resolve;
    });
  }

  release(diagnostics: readonly BookDiagnostic[] = []): void {
    this.#release(diagnostics);
  }

  async runDomainValidation(_book: Book): Promise<readonly BookDiagnostic[]> {
    return new Promise((resolve) => {
      this.#release = resolve;
      this.#notifyStarted();
    });
  }

  normalizeEpubCheckReport(report: unknown) {
    return this.inner.normalizeEpubCheckReport(report);
  }

  normalizeTypstDiagnostics(input: TypstDiagnosticInput) {
    return this.inner.normalizeTypstDiagnostics(input);
  }

  aggregate(diagnosticSets: readonly (readonly BookDiagnostic[])[]) {
    return this.inner.aggregate(diagnosticSets);
  }
}

function freshCoordinator(
  idSeed = "validation-studio",
  extras?: { validationCoordinator?: IValidationCoordinator; persistence?: SqliteProjectPersistence },
) {
  const persistence =
    extras?.persistence ?? new SqliteProjectPersistence(new InMemorySqliteConnection());
  return new DesktopStudioCoordinator({
    persistence,
    idSeed,
    validationCoordinator: extras?.validationCoordinator,
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

const EPUB_ERROR_REPORT: EpubCheckDiagnosticInput = {
  validatorName: "EPUBCheck",
  targetPath: "/tmp/x.epub",
  isValid: false,
  failureKind: "conformance",
  messages: [
    {
      id: "CHK-1",
      severity: "ERROR",
      message: "Bad OPF",
      locations: [{ path: "EPUB/package.opf", line: 10, column: 2 }],
    },
    {
      id: "CHK-2",
      severity: "WARNING",
      message: "Missing alt",
      locations: [],
    },
  ],
};

const TYPST_MIXED: TypstDiagnosticInput = {
  messages: [
    { severity: "error", message: "unknown variable", file: "main.typ", line: 3 },
    { severity: "info", message: "ok", code: "t-info" },
  ],
};

test("default validationReport is null on new and opened projects", async () => {
  const coordinator = freshCoordinator("default-null");
  assert.equal(coordinator.getState().validationReport, null);
  assert.equal(coordinator.getValidationReport(), null);

  await coordinator.newProject("Fresh Draft");
  assert.equal(coordinator.getState().validationReport, null);

  const saved = await coordinator.saveProject();
  await coordinator.openProject(saved.projectId);
  assert.equal(coordinator.getState().validationReport, null);
  assert.equal(coordinator.getValidationReport(), null);
});

test("runValidation is refused outside VALIDATION", async () => {
  const coordinator = freshCoordinator("stage-guard");
  await assert.rejects(
    () => coordinator.runValidation(),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "VALIDATION_NOT_PERMITTED" &&
      err.message.includes("VALIDATION stage"),
  );
  assert.equal(coordinator.getState().jobStatus, "idle");

  advanceTo(coordinator, "ASSETS");
  await assert.rejects(
    () => coordinator.runValidation(),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "VALIDATION_NOT_PERMITTED",
  );
  assert.equal(coordinator.getState().stage, "ASSETS");
  assert.equal(coordinator.getState().validationReport, null);
});

test("clean draft produces isClean true and updates state", async () => {
  const coordinator = freshCoordinator("clean");
  advanceTo(coordinator, "VALIDATION");
  const report = await coordinator.runValidation();
  assert.equal(report.summary.isClean, true);
  assert.equal(report.summary.totalFatal, 0);
  assert.equal(report.summary.totalErrors, 0);
  assert.deepEqual(coordinator.getValidationReport(), report);
  assert.deepEqual(coordinator.getState().validationReport, report);
  assert.equal(coordinator.getState().jobStatus, "idle");
});

test("domain-model errors produce isClean false without throwing", async () => {
  const coordinator = freshCoordinator("domain-errors", {
    validationCoordinator: new DomainErrorCoordinator(),
  });
  advanceTo(coordinator, "VALIDATION");
  const report = await coordinator.runValidation();
  assert.equal(report.summary.isClean, false);
  assert.ok(report.summary.totalErrors >= 1);
  assert.ok(report.diagnostics.some((d) => d.source === "domain-model" && d.severity === "error"));
  assert.equal(coordinator.getState().jobStatus, "idle");
  assert.equal(coordinator.getState().validationReport?.summary.isClean, false);
});

test("typed EPUBCheck and Typst diagnostics aggregate with deterministic sort", async () => {
  const coordinator = freshCoordinator("injected");
  advanceTo(coordinator, "VALIDATION");
  const first = await coordinator.runValidation({
    epubCheckReport: EPUB_ERROR_REPORT,
    typstDiagnostics: TYPST_MIXED,
  });
  const second = await coordinator.runValidation({
    typstDiagnostics: TYPST_MIXED,
    epubCheckReport: EPUB_ERROR_REPORT,
  });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.equal(first.summary.isClean, false);
  assert.ok(first.diagnostics.some((d) => d.source === "epubcheck" && d.severity === "error"));
  assert.ok(first.diagnostics.some((d) => d.source === "typst-compiler" && d.severity === "error"));
  const ranks = { fatal: 4, error: 3, warning: 2, info: 1 } as const;
  for (let i = 1; i < first.diagnostics.length; i += 1) {
    assert.ok(
      ranks[first.diagnostics[i - 1]!.severity] >= ranks[first.diagnostics[i]!.severity],
      "diagnostics must be sorted by severity descending",
    );
  }
});

test("validation job tracks idle → running → succeeded → idle", async () => {
  const hanging = new HangingCoordinator();
  const coordinator = freshCoordinator("job-lifecycle", {
    validationCoordinator: hanging,
  });
  advanceTo(coordinator, "VALIDATION");
  assert.equal(coordinator.getState().jobStatus, "idle");

  const pending = coordinator.runValidation();
  await hanging.started;
  const running = coordinator.getState();
  assert.equal(running.jobStatus, "running");
  assert.match(running.activeJobId ?? "", /^validation-/);

  hanging.release([]);
  await pending;
  const done = coordinator.getState();
  assert.equal(done.jobStatus, "idle");
  assert.equal(done.activeJobId, undefined);
  // running → idle is illegal in @openbook/workflow; idle after success
  // proves the coordinator passed through succeeded.
});

test("concurrent runValidation is VALIDATION_FAILED", async () => {
  const hanging = new HangingCoordinator();
  const coordinator = freshCoordinator("concurrent", {
    validationCoordinator: hanging,
  });
  advanceTo(coordinator, "VALIDATION");
  const first = coordinator.runValidation();
  await hanging.started;
  await assert.rejects(
    () => coordinator.runValidation(),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "VALIDATION_FAILED",
  );
  assert.equal(coordinator.getState().jobStatus, "running");
  hanging.release([]);
  await first;
  assert.equal(coordinator.getState().jobStatus, "idle");
});

test("any edit after validate resets validationReport to null", async () => {
  const coordinator = freshCoordinator("invalidate");
  advanceTo(coordinator, "VALIDATION");
  await coordinator.runValidation();
  assert.notEqual(coordinator.getValidationReport(), null);

  coordinator.updateActiveSectionBlocks([
    { type: "paragraph", id: "p-edit", inlines: [{ type: "text", text: "Edited" }] },
  ]);
  assert.equal(coordinator.getValidationReport(), null);

  await coordinator.runValidation();
  coordinator.applyActiveSectionTipTap({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Tiptap" }] }],
  });
  assert.equal(coordinator.getState().validationReport, null);

  await coordinator.runValidation();
  coordinator.getSession().updateMetadata({ title: "Retitled" });
  assert.equal(coordinator.getValidationReport(), null);

  await coordinator.runValidation();
  coordinator.getSession().addSection({ matter: "main", title: "Another" });
  assert.equal(coordinator.getValidationReport(), null);

  await coordinator.runValidation();
  await coordinator.newProject("Replacement");
  assert.equal(coordinator.getValidationReport(), null);
});

test("PREVIEW is blocked unless a clean validation report is active", async () => {
  const coordinator = freshCoordinator("preview-gate");
  advanceTo(coordinator, "VALIDATION");
  assert.throws(
    () => coordinator.transitionStage("PREVIEW"),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "VALIDATION_FAILED" &&
      err.message.includes("has not been run"),
  );
  assert.equal(coordinator.getState().stage, "VALIDATION");

  const dirty = await coordinator.runValidation({ epubCheckReport: EPUB_ERROR_REPORT });
  assert.equal(dirty.summary.isClean, false);
  assert.throws(
    () => coordinator.transitionStage("PREVIEW"),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      err.code === "VALIDATION_FAILED" &&
      err.message.includes(`${dirty.summary.totalFatal} fatal`) &&
      err.message.includes(`${dirty.summary.totalErrors} error`),
  );
  assert.equal(coordinator.getState().stage, "VALIDATION");

  const cleanCoordinator = freshCoordinator("preview-clean");
  advanceTo(cleanCoordinator, "VALIDATION");
  const clean = await cleanCoordinator.runValidation();
  assert.equal(clean.summary.isClean, true);
  cleanCoordinator.transitionStage("PREVIEW");
  assert.equal(cleanCoordinator.getState().stage, "PREVIEW");
});

test("runValidation does not write SQLite and does not mutate Book", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "persist-firewall",
  });
  const saved = await coordinator.saveProject("Firewall Draft");
  const projectsBefore = JSON.stringify([...driver.projects.entries()]);
  const docsBefore = JSON.stringify([...driver.projectDocuments.entries()]);
  const bookBefore = JSON.stringify(coordinator.getBook());

  advanceTo(coordinator, "VALIDATION");
  const report = await coordinator.runValidation({
    epubCheckReport: EPUB_ERROR_REPORT,
    typstDiagnostics: TYPST_MIXED,
  });
  assert.equal(report.summary.isClean, false);
  assert.equal(JSON.stringify(coordinator.getBook()), bookBefore);
  assert.equal(JSON.stringify([...driver.projects.entries()]), projectsBefore);
  assert.equal(JSON.stringify([...driver.projectDocuments.entries()]), docsBefore);

  const payload = JSON.parse(
    [...driver.projectDocuments.values()][0]!.book_payload,
  ) as Record<string, unknown>;
  assert.equal(payload["schemaVersion"], 1);
  assert.equal("diagnostics" in payload, false);
  assert.equal("validationReport" in payload, false);
  assert.equal(saved.projectId, [...driver.projects.keys()][0]);
});

test("coordinator source stays headless and Slice 4 scoped", () => {
  const source = readFileSync(srcFile, "utf8");
  assert.match(source, /from "@openbook\/book-doctor"/);
  assert.match(source, /BookValidationReport/);
  assert.doesNotMatch(source, /from ["']@openbook\/validator["']/);
  assert.doesNotMatch(source, /from ["']@openbook\/epub["']/);
  assert.doesNotMatch(source, /from ["']@openbook\/html["']/);
  assert.doesNotMatch(source, /from ["']@openbook\/pdf["']/);
  assert.doesNotMatch(source, /from ["']@tauri-apps\//);
  assert.doesNotMatch(source, /from ["']react["']/);
  assert.doesNotMatch(source, /from ["']react-dom["']/);
  assert.doesNotMatch(source, /EditorBookSession/);
});
