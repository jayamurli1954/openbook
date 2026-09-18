// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  ExportHostAdapter,
  type ExportCoordinatorPort,
  type ExportHostRequest,
} from "./exportHostAdapter.js";

function fakeCoordinator() {
  const calls: Array<{ format: string; options: Record<string, unknown> | undefined }> = [];
  const result = {
    epub: { format: "epub" as const, bytes: new Uint8Array([1]), diagnostics: [] },
    html: { format: "html" as const, html: "<!DOCTYPE html>", files: [], diagnostics: [] },
    pdf: { format: "pdf" as const, bytes: new Uint8Array([2]), typstSource: "", diagnostics: [] },
  };
  const coordinator: ExportCoordinatorPort = {
    async exportEpub(options) {
      calls.push({ format: "epub", options: options as Record<string, unknown> | undefined });
      return result.epub;
    },
    async exportHtml(options) {
      calls.push({ format: "html", options: options as Record<string, unknown> | undefined });
      return result.html;
    },
    async exportPdf(options) {
      calls.push({ format: "pdf", options: options as Record<string, unknown> | undefined });
      return result.pdf;
    },
  };
  return { coordinator, calls, result };
}

test("delegates EPUB export and preserves verification mode and signal", async () => {
  const { coordinator, calls, result } = fakeCoordinator();
  const adapter = new ExportHostAdapter(coordinator);
  const controller = new AbortController();

  const request: ExportHostRequest = {
    format: "epub",
    verificationMode: "verified",
    signal: controller.signal,
  };
  const actual = await adapter.export(request);

  assert.equal(actual, result.epub);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.format, "epub");
  assert.equal(calls[0]?.options?.verificationMode, "verified");
  assert.equal(calls[0]?.options?.signal, controller.signal);
});

test("delegates HTML export and preserves signal without adding filesystem concerns", async () => {
  const { coordinator, calls, result } = fakeCoordinator();
  const adapter = new ExportHostAdapter(coordinator);
  const controller = new AbortController();

  const actual = await adapter.export({
    format: "html",
    signal: controller.signal,
  });

  assert.equal(actual, result.html);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.format, "html");
  assert.equal(calls[0]?.options?.signal, controller.signal);
});

test("delegates PDF export and preserves signal", async () => {
  const { coordinator, calls, result } = fakeCoordinator();
  const adapter = new ExportHostAdapter(coordinator);
  const controller = new AbortController();

  const actual = await adapter.export({
    format: "pdf",
    signal: controller.signal,
  });

  assert.equal(actual, result.pdf);
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.format, "pdf");
  assert.equal(calls[0]?.options?.signal, controller.signal);
});

test("does not expose persistence or filesystem operations", () => {
  const { coordinator } = fakeCoordinator();
  const adapter = new ExportHostAdapter(coordinator);

  assert.equal("saveProject" in adapter, false);
  assert.equal("openProject" in adapter, false);
  assert.equal("writeFile" in adapter, false);
  assert.equal("showSaveDialog" in adapter, false);
});
