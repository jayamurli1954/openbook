// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  ExportHostAdapter,
  type ExportCoordinatorPort,
} from "./exportHostAdapter.js";
import {
  ExportSaveHostAdapter,
  exportResultToSaveAsRequest,
} from "./exportSaveHostAdapter.js";
import {
  SaveAsFileSystemError,
  SaveAsHostAdapter,
  type OverwriteConfirmationPort,
  type SaveAsDialogPort,
  type SaveAsFileSystemPort,
  type SaveAsFileWrite,
  type SaveAsHostRequest,
} from "./saveAsHostAdapter.js";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function fakeCoordinator(options?: {
  failFormat?: "epub" | "html" | "pdf";
  failMessage?: string;
}) {
  const calls: Array<{ format: string; options: Record<string, unknown> | undefined }> = [];
  const results = {
    epub: {
      format: "epub" as const,
      bytes: bytes(1, 2, 3),
      diagnostics: [],
    },
    html: {
      format: "html" as const,
      html: "<!DOCTYPE html><html><body>Book</body></html>",
      files: [
        {
          path: "index.html",
          mediaType: "text/html; charset=utf-8",
          content: "<!DOCTYPE html><html><body>Book</body></html>",
        },
        {
          path: "assets/cover.png",
          mediaType: "image/png",
          content: bytes(9, 9),
        },
      ],
      diagnostics: [],
    },
    pdf: {
      format: "pdf" as const,
      bytes: bytes(4, 5),
      typstSource: "#set page()",
      diagnostics: [],
    },
  };

  const coordinator: ExportCoordinatorPort = {
    async exportEpub(exportOptions) {
      calls.push({
        format: "epub",
        options: exportOptions as Record<string, unknown> | undefined,
      });
      if (options?.failFormat === "epub") {
        throw new Error(options.failMessage ?? "EPUB export failed");
      }
      return results.epub;
    },
    async exportHtml(exportOptions) {
      calls.push({
        format: "html",
        options: exportOptions as Record<string, unknown> | undefined,
      });
      if (options?.failFormat === "html") {
        throw new Error(options.failMessage ?? "HTML export failed");
      }
      return results.html;
    },
    async exportPdf(exportOptions) {
      calls.push({
        format: "pdf",
        options: exportOptions as Record<string, unknown> | undefined,
      });
      if (options?.failFormat === "pdf") {
        throw new Error(options.failMessage ?? "PDF export failed");
      }
      return results.pdf;
    },
  };

  return { coordinator, calls, results };
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
    files.set(path, bytes(0));
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
  const recordingSaveAs = {
    async save(request: SaveAsHostRequest) {
      saveRequests.push(request);
      return saveAs.save(request);
    },
  };

  return {
    saveAs: recordingSaveAs,
    files,
    writes,
    saveRequests,
    dialogChoices,
    overwriteRequests,
  };
}

test("maps EPUB and PDF export results to primary-only Save-As requests", () => {
  const epub = exportResultToSaveAsRequest(
    { format: "epub", bytes: bytes(1), diagnostics: [] },
    "My Book",
  );
  assert.equal(epub.format, "epub");
  assert.equal(epub.suggestedTitle, "My Book");
  assert.deepEqual(epub.bytes, bytes(1));
  assert.equal(epub.companionFiles, undefined);

  const pdf = exportResultToSaveAsRequest(
    { format: "pdf", bytes: bytes(2), typstSource: "", diagnostics: [] },
    "My Book",
  );
  assert.equal(pdf.format, "pdf");
  assert.deepEqual(pdf.bytes, bytes(2));
  assert.equal(pdf.companionFiles, undefined);
});

test("maps HTML export results to primary HTML bytes plus companion resources", () => {
  const mapped = exportResultToSaveAsRequest(
    {
      format: "html",
      html: "<html></html>",
      files: [
        {
          path: "index.html",
          mediaType: "text/html; charset=utf-8",
          content: "<html>primary</html>",
        },
        {
          path: "assets/cover.png",
          mediaType: "image/png",
          content: bytes(7, 8),
        },
      ],
      diagnostics: [],
    },
    "ಕನ್ನಡ",
  );

  assert.equal(mapped.format, "html");
  assert.equal(mapped.suggestedTitle, "ಕನ್ನಡ");
  assert.deepEqual(mapped.bytes, new TextEncoder().encode("<html>primary</html>"));
  assert.deepEqual(mapped.companionFiles, [
    { relativePath: "assets/cover.png", bytes: bytes(7, 8) },
  ]);
});

test("EPUB export flows through coordinator into Save-As destination", async () => {
  const { coordinator, calls, results } = fakeCoordinator();
  const { saveAs, files, dialogChoices, saveRequests } = fakeSaveAs({
    destination: "exports/Open Book.epub",
  });
  const adapter = new ExportSaveHostAdapter(new ExportHostAdapter(coordinator), saveAs);

  const outcome = await adapter.exportAndSave({
    format: "epub",
    suggestedTitle: "Open Book",
    verificationMode: "verified",
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) {
    return;
  }
  assert.equal(outcome.path, "exports/Open Book.epub");
  assert.deepEqual(outcome.writtenPaths, ["exports/Open Book.epub"]);
  assert.equal(outcome.exportResult, results.epub);
  assert.deepEqual(files.get("exports/Open Book.epub"), results.epub.bytes);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.format, "epub");
  assert.equal(calls[0]?.options?.verificationMode, "verified");
  assert.deepEqual(dialogChoices, [{ defaultFileName: "Open Book.epub", extension: "epub" }]);
  assert.equal(saveRequests[0]?.format, "epub");
});

test("HTML export writes primary HTML and companion assets", async () => {
  const { coordinator, results } = fakeCoordinator();
  const { saveAs, files, dialogChoices } = fakeSaveAs({
    destination: "out/Open Book.html",
  });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  const outcome = await adapter.exportAndSave({
    format: "html",
    suggestedTitle: "Open Book",
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) {
    return;
  }
  assert.equal(outcome.path, "out/Open Book.html");
  assert.deepEqual(outcome.writtenPaths, [
    "out/Open Book.html",
    "out/assets/cover.png",
  ]);
  assert.deepEqual(
    files.get("out/Open Book.html"),
    new TextEncoder().encode(results.html.html),
  );
  assert.deepEqual(files.get("out/assets/cover.png"), bytes(9, 9));
  assert.deepEqual(dialogChoices, [{ defaultFileName: "Open Book.html", extension: "html" }]);
});

test("PDF export flows through coordinator into Save-As destination", async () => {
  const { coordinator, results } = fakeCoordinator();
  const { saveAs, files } = fakeSaveAs({ destination: "Book.pdf" });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  const outcome = await adapter.exportAndSave({
    format: "pdf",
    suggestedTitle: "Book",
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) {
    return;
  }
  assert.equal(outcome.path, "Book.pdf");
  assert.deepEqual(files.get("Book.pdf"), results.pdf.bytes);
});

test("destination cancellation returns a save-stage cancellation with no write", async () => {
  const { coordinator } = fakeCoordinator();
  const { saveAs, writes } = fakeSaveAs({ destination: null });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  const outcome = await adapter.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
  });

  assert.deepEqual(outcome, {
    ok: false,
    stage: "save",
    code: "EXPORT_CANCELLED",
    message: "Save As destination selection was cancelled.",
  });
  assert.equal(writes.length, 0);
});

test("export failure never invokes Save-As", async () => {
  const { coordinator, calls } = fakeCoordinator({
    failFormat: "pdf",
    failMessage: "Typst failed",
  });
  let saveCalled = false;
  const adapter = new ExportSaveHostAdapter(new ExportHostAdapter(coordinator), {
    async save() {
      saveCalled = true;
      return { ok: true, path: "x.pdf", writtenPaths: ["x.pdf"] };
    },
  });

  const outcome = await adapter.exportAndSave({
    format: "pdf",
    suggestedTitle: "Book",
  });

  assert.equal(outcome.ok, false);
  if (outcome.ok || outcome.stage !== "export") {
    assert.fail("expected export-stage failure");
  }
  assert.equal((outcome.error as Error).message, "Typst failed");
  assert.equal(saveCalled, false);
  assert.equal(calls.length, 1);
});

test("save write failure preserves export bytes without a final artifact", async () => {
  const { coordinator } = fakeCoordinator();
  const { saveAs, files, writes } = fakeSaveAs({
    destination: "Book.epub",
    failWrite: true,
  });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  const outcome = await adapter.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
  });

  assert.deepEqual(outcome, {
    ok: false,
    stage: "save",
    code: "EXPORT_WRITE_FAILED",
    message: "Atomic write failed.",
  });
  assert.equal(files.has("Book.epub"), false);
  assert.equal(writes.length, 1);
});

test("overwrite decline cancels the write after a successful export", async () => {
  const { coordinator } = fakeCoordinator();
  const { saveAs, files, overwriteRequests } = fakeSaveAs({
    destination: "Book.epub",
    existing: ["Book.epub"],
    overwrite: false,
  });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  const outcome = await adapter.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
  });

  assert.deepEqual(outcome, {
    ok: false,
    stage: "save",
    code: "EXPORT_OVERWRITE_DECLINED",
    message: "Existing destination was not overwritten.",
  });
  assert.deepEqual(files.get("Book.epub"), bytes(0));
  assert.deepEqual(overwriteRequests, [["Book.epub"]]);
});

test("accepted overwrite replaces the destination after export", async () => {
  const { coordinator, results } = fakeCoordinator();
  const { saveAs, files } = fakeSaveAs({
    destination: "Book.epub",
    existing: ["Book.epub"],
    overwrite: true,
  });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  const outcome = await adapter.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
  });

  assert.equal(outcome.ok, true);
  assert.deepEqual(files.get("Book.epub"), results.epub.bytes);
});

test("deterministic default filenames follow the selected format", async () => {
  const { coordinator } = fakeCoordinator();
  const { saveAs, dialogChoices } = fakeSaveAs({ destination: null });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  await adapter.exportAndSave({ format: "pdf", suggestedTitle: "A:B" });
  await adapter.exportAndSave({ format: "html", suggestedTitle: "A:B" });
  await adapter.exportAndSave({ format: "epub", suggestedTitle: "A:B" });

  assert.deepEqual(dialogChoices, [
    { defaultFileName: "A_B.pdf", extension: "pdf" },
    { defaultFileName: "A_B.html", extension: "html" },
    { defaultFileName: "A_B.epub", extension: "epub" },
  ]);
});

test("AbortSignal is forwarded to both export and Save-As stages", async () => {
  const controller = new AbortController();
  const { coordinator, calls } = fakeCoordinator();
  const { saveAs, saveRequests } = fakeSaveAs({ destination: "Book.epub" });
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  const outcome = await adapter.exportAndSave({
    format: "epub",
    suggestedTitle: "Book",
    signal: controller.signal,
  });

  assert.equal(outcome.ok, true);
  assert.equal(calls[0]?.options?.signal, controller.signal);
  assert.equal(saveRequests[0]?.signal, controller.signal);
});

test("does not expose Tauri, React, persistence, or engine methods on the wiring adapter", () => {
  const { coordinator } = fakeCoordinator();
  const { saveAs } = fakeSaveAs();
  const adapter = ExportSaveHostAdapter.fromPorts(coordinator, saveAs);

  assert.equal("exportEpub" in adapter, false);
  assert.equal("writeFile" in adapter, false);
  assert.equal("showSaveDialog" in adapter, false);
  assert.equal("saveProject" in adapter, false);
  assert.equal("chooseDestination" in adapter, false);
});
