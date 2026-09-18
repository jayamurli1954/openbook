// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import { DesktopStudioError } from "../domain/desktopStudioCoordinator.js";
import type { IExportSaveHostAdapter } from "../workflow/domain/exportSaveHostAdapter.js";
import {
  DesktopExportController,
  defaultVerificationMode,
  isExportStage,
} from "./desktopExportController.js";

test("export is permitted only in PREVIEW and PUBLISH", () => {
  assert.equal(isExportStage("PREVIEW"), true);
  assert.equal(isExportStage("PUBLISH"), true);
  assert.equal(isExportStage("VALIDATION"), false);
  assert.equal(isExportStage("AUTHORING"), false);
  assert.equal(defaultVerificationMode("PREVIEW"), "fast");
  assert.equal(defaultVerificationMode("PUBLISH"), "verified");
});

test("soft-fails when stage is not exportable without calling the host", async () => {
  let called = false;
  const host: IExportSaveHostAdapter = {
    async exportAndSave() {
      called = true;
      return { ok: true, path: "x.epub", writtenPaths: ["x.epub"], exportResult: {
        format: "epub",
        bytes: new Uint8Array([1]),
        diagnostics: [],
      } };
    },
  };
  const controller = new DesktopExportController({
    exportSaveHost: host,
    getSuggestedTitle: () => "Book",
    getStage: () => "AUTHORING",
  });

  const status = await controller.exportFormat("epub");

  assert.equal(called, false);
  assert.equal(controller.canExport(), false);
  assert.equal(status.phase, "failed");
  assert.equal(status.code, "PUBLISH_NOT_PERMITTED");
});

test("maps successful Save-As path into a success status", async () => {
  const host: IExportSaveHostAdapter = {
    async exportAndSave(request) {
      assert.equal(request.format, "pdf");
      assert.equal(request.suggestedTitle, "Open Book");
      return {
        ok: true,
        path: "out/Open Book.pdf",
        writtenPaths: ["out/Open Book.pdf"],
        exportResult: {
          format: "pdf",
          bytes: new Uint8Array([2]),
          typstSource: "",
          diagnostics: [],
        },
      };
    },
  };
  const controller = new DesktopExportController({
    exportSaveHost: host,
    getSuggestedTitle: () => "Open Book",
    getStage: () => "PREVIEW",
  });

  const status = await controller.exportFormat("pdf");

  assert.deepEqual(status, {
    phase: "succeeded",
    format: "pdf",
    path: "out/Open Book.pdf",
    message: "Exported PDF to out/Open Book.pdf",
  });
});

test("forwards EPUB verification mode from the workflow stage", async () => {
  const seen: Array<"fast" | "verified" | undefined> = [];
  const host: IExportSaveHostAdapter = {
    async exportAndSave(request) {
      seen.push(request.verificationMode);
      return {
        ok: false,
        stage: "save",
        code: "EXPORT_CANCELLED",
        message: "cancelled",
      };
    },
  };

  const preview = new DesktopExportController({
    exportSaveHost: host,
    getSuggestedTitle: () => "Book",
    getStage: () => "PREVIEW",
  });
  const publish = new DesktopExportController({
    exportSaveHost: host,
    getSuggestedTitle: () => "Book",
    getStage: () => "PUBLISH",
  });

  await preview.exportFormat("epub");
  await publish.exportFormat("epub");
  await preview.exportFormat("html");

  assert.deepEqual(seen, ["fast", "verified", undefined]);
});

test("maps save cancellation and export coordinator failures distinctly", async () => {
  const cancelledHost: IExportSaveHostAdapter = {
    async exportAndSave() {
      return {
        ok: false,
        stage: "save",
        code: "EXPORT_CANCELLED",
        message: "Save As destination selection was cancelled.",
      };
    },
  };
  const exportFailHost: IExportSaveHostAdapter = {
    async exportAndSave() {
      return {
        ok: false,
        stage: "export",
        error: new DesktopStudioError(
          "PREPUBLISH_VALIDATION_FAILED",
          "Cannot export: Book Doctor validation has not been run.",
        ),
      };
    },
  };

  const cancelStatus = await new DesktopExportController({
    exportSaveHost: cancelledHost,
    getSuggestedTitle: () => "Book",
    getStage: () => "PUBLISH",
  }).exportFormat("epub");

  const exportStatus = await new DesktopExportController({
    exportSaveHost: exportFailHost,
    getSuggestedTitle: () => "Book",
    getStage: () => "PUBLISH",
  }).exportFormat("epub");

  assert.equal(cancelStatus.phase, "cancelled");
  assert.equal(cancelStatus.code, "EXPORT_CANCELLED");
  assert.equal(exportStatus.phase, "failed");
  assert.equal(exportStatus.code, "PREPUBLISH_VALIDATION_FAILED");
});

test("falls back to Untitled Book when metadata title is blank", async () => {
  let title = "";
  const host: IExportSaveHostAdapter = {
    async exportAndSave(request) {
      title = request.suggestedTitle;
      return {
        ok: false,
        stage: "save",
        code: "EXPORT_CANCELLED",
        message: "cancelled",
      };
    },
  };

  await new DesktopExportController({
    exportSaveHost: host,
    getSuggestedTitle: () => "   ",
    getStage: () => "PREVIEW",
  }).exportFormat("html");

  assert.equal(title, "Untitled Book");
});
