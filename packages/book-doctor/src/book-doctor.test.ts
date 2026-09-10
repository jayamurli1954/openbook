// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import {
  ValidationCoordinator,
  aggregateDiagnostics,
  mapDomainSeverity,
  mapEpubCheckSeverity,
  mapTypstSeverity,
  type BookDiagnostic,
  type BookValidationReport,
} from "./index.js";
import * as bookDoctorApi from "./index.js";

test("INV-1: aggregated type is BookValidationReport; no ValidationReport export", () => {
  const keys = Object.keys(bookDoctorApi);
  assert.ok(!keys.includes("ValidationReport"));
  // Type-level: BookValidationReport is the aggregate shape.
  const report: BookValidationReport = aggregateDiagnostics([]);
  assert.equal(report.summary.isClean, true);
  assert.deepEqual(report.diagnostics, []);
});

test("INV-2: severity mapping matches ADR-0018 §2.6", () => {
  assert.equal(mapDomainSeverity("error"), "error");
  assert.equal(mapDomainSeverity("fatal"), "fatal");
  assert.equal(mapDomainSeverity("warning"), "warning");
  assert.equal(mapDomainSeverity("suggestion"), "info");
  assert.equal(mapDomainSeverity("information"), "info");

  assert.equal(mapEpubCheckSeverity("FATAL"), "fatal");
  assert.equal(mapEpubCheckSeverity("ERROR"), "error");
  assert.equal(mapEpubCheckSeverity("WARNING"), "warning");
  assert.equal(mapEpubCheckSeverity("INFO"), "info");
  assert.equal(mapEpubCheckSeverity("USAGE"), "info");

  assert.equal(mapTypstSeverity("error"), "error");
  assert.equal(mapTypstSeverity("warning"), "warning");
  assert.equal(mapTypstSeverity("info"), "info");
});

test("INV-2: EPUBCheck / Typst / domain fixtures normalize correctly", async () => {
  const coordinator = new ValidationCoordinator();

  const domain = await coordinator.runDomainValidation(
    createBook({ title: "", language: "" }),
  );
  assert.ok(domain.some((d) => d.code === "missing-language" && d.severity === "error"));
  assert.ok(domain.some((d) => d.code === "missing-title" && d.severity === "warning"));
  assert.ok(domain.every((d) => d.source === "domain-model"));

  const epub = await coordinator.normalizeEpubCheckReport({
    validatorName: "EPUBCheck",
    validatorVersion: "5.3.0",
    targetPath: "/tmp/x.epub",
    isValid: false,
    failureKind: "conformance",
    summary: {
      totalFatal: 0,
      totalErrors: 1,
      totalWarnings: 1,
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
        severity: "WARNING",
        message: "Missing alt",
        locations: [],
      },
      {
        id: "CHK-3",
        severity: "USAGE",
        message: "Usage note",
        locations: [],
      },
    ],
    rawExitCode: 1,
  });
  assert.ok(epub.some((d) => d.severity === "error" && d.code === "CHK-1"));
  assert.ok(epub.some((d) => d.severity === "warning" && d.code === "CHK-2"));
  assert.ok(epub.some((d) => d.severity === "info" && d.code === "CHK-3"));
  assert.ok(epub.every((d) => d.source === "epubcheck"));

  const runtime = await coordinator.normalizeEpubCheckReport({
    failureKind: "missing_runtime",
    targetPath: "/tmp/y.epub",
    messages: [],
  });
  assert.ok(
    runtime.some(
      (d) =>
        d.severity === "fatal" &&
        d.source === "epubcheck" &&
        d.code.includes("missing_runtime"),
    ),
  );

  const typst = await coordinator.normalizeTypstDiagnostics({
    messages: [
      { severity: "error", message: "unknown variable", file: "main.typ", line: 3 },
      { severity: "warning", message: "overset", code: "layout-overset" },
    ],
  });
  assert.ok(typst.some((d) => d.source === "typst-compiler" && d.severity === "error"));
  assert.ok(typst.some((d) => d.source === "typst-compiler" && d.severity === "warning"));
});

test("INV-3: identical inputs yield identical BookValidationReport serialization", async () => {
  const coordinator = new ValidationCoordinator();
  const book = createBook({ language: "en", title: "T" });
  const domain = await coordinator.runDomainValidation(book);
  const epub = await coordinator.normalizeEpubCheckReport({
    failureKind: "none",
    messages: [
      { id: "A", severity: "WARNING", message: "w1", locations: [] },
      { id: "B", severity: "ERROR", message: "e1", locations: [{ path: "a", line: 1 }] },
    ],
  });
  const typst = await coordinator.normalizeTypstDiagnostics({
    messages: [{ severity: "info", message: "i1", code: "t-info" }],
  });

  const a = coordinator.aggregate([typst, domain, epub]);
  const b = coordinator.aggregate([epub, typst, domain]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));

  // Ordering: fatal/error before warning before info; within same severity by source.
  const severities = a.diagnostics.map((d) => d.severity);
  const ranks = { fatal: 4, error: 3, warning: 2, info: 1 } as const;
  for (let i = 1; i < severities.length; i += 1) {
    assert.ok(
      ranks[severities[i - 1]!] >= ranks[severities[i]!],
      "diagnostics must be sorted by severity descending",
    );
  }
});

test("INV-4: domain validation does not mutate the Book", async () => {
  const book = createBook({ language: "en", title: "Immutable" });
  const before = structuredClone(book);
  const coordinator = new ValidationCoordinator();
  await coordinator.runDomainValidation(book);
  assert.deepEqual(book, before);
});

test("INV-5: Slice 5 paths never emit accessibility diagnostics", async () => {
  const coordinator = new ValidationCoordinator();
  const domain = await coordinator.runDomainValidation(
    createBook({ language: "en", title: "A" }),
  );
  const epub = await coordinator.normalizeEpubCheckReport({
    failureKind: "none",
    messages: [{ id: "X", severity: "INFO", message: "ok", locations: [] }],
  });
  const typst = await coordinator.normalizeTypstDiagnostics({
    messages: [{ severity: "info", message: "ok" }],
  });

  // Even if a rogue accessibility diagnostic is fed into aggregate, it is stripped.
  const rogue: BookDiagnostic = {
    source: "accessibility",
    severity: "warning",
    code: "a11y",
    message: "should not appear",
  };
  const report = coordinator.aggregate([domain, epub, typst, [rogue]]);
  assert.ok(report.diagnostics.every((d) => d.source !== "accessibility"));
  assert.ok(domain.every((d) => d.source !== "accessibility"));
  assert.ok(epub.every((d) => d.source !== "accessibility"));
  assert.ok(typst.every((d) => d.source !== "accessibility"));
});

test("INV-6 / INV-7: package depends only on book-model; no pdf or forbidden deps", async () => {
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
  };
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ["@openbook/book-model"]);
  const forbidden = [
    "@openbook/pdf",
    "@openbook/epub",
    "@openbook/html",
    "@openbook/workflow",
    "@openbook/authoring",
    "@openbook/importer",
    "@openbook/assets",
    "@openbook/validator",
    "@openbook/desktop",
    "better-sqlite3",
    "sqlite",
    "@tauri-apps/api",
    "react",
    "ollama",
  ];
  for (const name of forbidden) {
    assert.ok(!(name in deps), `forbidden dependency present: ${name}`);
  }
});

test("aggregate summary counts and isClean", () => {
  const report = aggregateDiagnostics([
    [
      {
        source: "domain-model",
        severity: "error",
        code: "e",
        message: "e",
      },
      {
        source: "epubcheck",
        severity: "fatal",
        code: "f",
        message: "f",
      },
      {
        source: "typst-compiler",
        severity: "warning",
        code: "w",
        message: "w",
      },
      {
        source: "domain-model",
        severity: "info",
        code: "i",
        message: "i",
      },
    ],
  ]);
  assert.equal(report.summary.totalFatal, 1);
  assert.equal(report.summary.totalErrors, 1);
  assert.equal(report.summary.totalWarnings, 1);
  assert.equal(report.summary.totalInfos, 1);
  assert.equal(report.summary.isClean, false);
});
