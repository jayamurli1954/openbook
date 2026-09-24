// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import type { ImportSource } from "@openbook/importer";
import {
  GuidedStartHostAdapter,
} from "./guidedStartHostAdapter.js";
import type {
  GuidedStartContinuePort,
  GuidedStartCoordinatorPort,
  GuidedStartRecentListPort,
} from "./guidedStartContract.js";

function fakePorts(overrides?: {
  continueUnavailable?: boolean;
  failNewProject?: boolean;
}) {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const importSource: ImportSource = {
    format: "markdown",
    content: "# Hello\n",
    filename: "hello.md",
  };
  const importResult = {
    success: true,
    mode: "new-project" as const,
    sectionCount: 1,
    blockCount: 1,
    wordCount: 1,
    issues: [],
  };
  const openResult = { projectRoot: "/tmp/demo", recovered: false };

  const coordinator: GuidedStartCoordinatorPort = {
    async newProject(name, language) {
      calls.push({ op: "newProject", args: [name, language] });
      if (overrides?.failNewProject) {
        throw new Error("persistence unavailable");
      }
    },
    async importContent(source, options) {
      calls.push({ op: "importContent", args: [source, options] });
      return importResult;
    },
    async openFromProjectPackage(projectRoot, options) {
      calls.push({ op: "openFromProjectPackage", args: [projectRoot, options] });
      return { ...openResult, projectRoot };
    },
  };

  const recentList: GuidedStartRecentListPort = {
    async listRecent() {
      calls.push({ op: "listRecent", args: [] });
      return [
        {
          projectRoot: "/tmp/demo",
          displayName: "Demo",
          lastOpenedAt: "2026-09-24T00:00:00.000Z",
        },
      ];
    },
  };

  const continuePort: GuidedStartContinuePort = {
    async resolveContinueTarget() {
      calls.push({ op: "resolveContinueTarget", args: [] });
      if (overrides?.continueUnavailable) {
        return { kind: "unavailable", reason: "No last package bound." };
      }
      return {
        kind: "package",
        projectRoot: "/tmp/continue",
        options: { recover: { mode: "none" } },
      };
    },
  };

  const adapter = new GuidedStartHostAdapter({
    coordinator,
    recentList,
    continuePort,
  });

  return { adapter, calls, importSource, importResult, openResult };
}

test("startNewBook validates then delegates name and language to newProject", async () => {
  const { adapter, calls } = fakePorts();

  const ok = await adapter.startNewBook({
    title: "  My Book  ",
    language: "kn",
    authors: ["ಲೇಖಕ"],
    writingGoal: "draft",
  });

  assert.equal(ok.ok, true);
  if (!ok.ok) return;
  assert.equal(ok.projectName, "My Book");
  assert.equal(ok.language, "kn");
  assert.deepEqual(calls, [
    { op: "newProject", args: ["My Book", "kn"] },
  ]);
});

test("startNewBook fails closed on validation without calling coordinator", async () => {
  const { adapter, calls } = fakePorts();

  const bad = await adapter.startNewBook({ title: "", language: "en" });

  assert.equal(bad.ok, false);
  if (bad.ok) return;
  assert.equal(bad.code, "TITLE_REQUIRED");
  assert.equal(calls.length, 0);
});

test("startNewBook maps coordinator failures to structured errors", async () => {
  const { adapter } = fakePorts({ failNewProject: true });

  const failed = await adapter.startNewBook({
    title: "Book",
    language: "en",
  });

  assert.equal(failed.ok, false);
  if (failed.ok) return;
  assert.equal(failed.code, "COORDINATOR_FAILED");
  assert.match(failed.message, /persistence unavailable/);
});

test("importBook delegates to coordinator.importContent", async () => {
  const { adapter, calls, importSource, importResult } = fakePorts();

  const result = await adapter.importBook({
    source: importSource,
    options: { mode: "new-project" },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.result, importResult);
  assert.equal(calls[0]?.op, "importContent");
  assert.equal(calls[0]?.args[0], importSource);
});

test("openRecent requires a project root and opens packages via coordinator", async () => {
  const { adapter, calls } = fakePorts();

  const empty = await adapter.openRecent({ projectRoot: "  " });
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.code, "PROJECT_ROOT_REQUIRED");
  }
  assert.equal(calls.length, 0);

  const opened = await adapter.openRecent({
    projectRoot: "/tmp/demo",
    options: { recover: { mode: "none" } },
  });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  assert.equal(opened.path, "open-recent");
  assert.equal(opened.result.projectRoot, "/tmp/demo");
  assert.equal(calls[0]?.op, "openFromProjectPackage");
});

test("continueExisting opens resolved package or fails when unavailable", async () => {
  const available = fakePorts();
  const continued = await available.adapter.continueExisting();
  assert.equal(continued.ok, true);
  if (!continued.ok) return;
  assert.equal(continued.path, "continue");
  assert.equal(continued.result.projectRoot, "/tmp/continue");
  assert.deepEqual(
    available.calls.map((c) => c.op),
    ["resolveContinueTarget", "openFromProjectPackage"],
  );

  const blocked = fakePorts({ continueUnavailable: true });
  const unavailable = await blocked.adapter.continueExisting();
  assert.equal(unavailable.ok, false);
  if (unavailable.ok) return;
  assert.equal(unavailable.code, "CONTINUE_UNAVAILABLE");
  assert.equal(
    blocked.calls.some((c) => c.op === "openFromProjectPackage"),
    false,
  );
});

test("listRecent delegates to the recent-list port", async () => {
  const { adapter, calls } = fakePorts();
  const entries = await adapter.listRecent();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.displayName, "Demo");
  assert.equal(calls[0]?.op, "listRecent");
});

test("cancelled AbortSignal performs no coordinator mutation", async () => {
  const { adapter, calls } = fakePorts();
  const controller = new AbortController();
  controller.abort("user cancelled");

  const result = await adapter.startNewBook(
    { title: "Book", language: "en" },
    { signal: controller.signal },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.code, "CANCELLED");
  }
  assert.equal(calls.length, 0);
});

test("openRecent remembers successful opens when recentWrite is provided", async () => {
  const remembered: Array<{ projectRoot: string; displayName: string }> = [];
  const writing = new GuidedStartHostAdapter({
    coordinator: {
      async newProject() {},
      async importContent() {
        return {
          success: true,
          mode: "new-project",
          sectionCount: 0,
          blockCount: 0,
          wordCount: 0,
          issues: [],
        };
      },
      async openFromProjectPackage(projectRoot) {
        return { projectRoot, recovered: false };
      },
    },
    recentList: {
      async listRecent() {
        return [];
      },
    },
    continuePort: {
      async resolveContinueTarget() {
        return { kind: "unavailable", reason: "none" };
      },
    },
    recentWrite: {
      async rememberOpened(entry) {
        remembered.push({
          projectRoot: entry.projectRoot,
          displayName: entry.displayName,
        });
      },
    },
    now: () => "2026-09-24T12:00:00.000Z",
  });

  const opened = await writing.openRecent({ projectRoot: "/tmp/Demo.obproj" });
  assert.equal(opened.ok, true);
  assert.deepEqual(remembered, [
    { projectRoot: "/tmp/Demo.obproj", displayName: "Demo.obproj" },
  ]);
});

test("adapter surface stays free of filesystem and React operations", () => {
  const { adapter } = fakePorts();
  assert.equal("writeFile" in adapter, false);
  assert.equal("chooseDirectory" in adapter, false);
  assert.equal("render" in adapter, false);
  assert.equal(typeof adapter.startNewBook, "function");
  assert.equal(typeof adapter.importBook, "function");
  assert.equal(typeof adapter.openRecent, "function");
  assert.equal(typeof adapter.continueExisting, "function");
  assert.equal(typeof adapter.listRecent, "function");
});
