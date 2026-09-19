// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0031 Slice 5: SQLite session Save unified with package Save when bound.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContentBlock } from "@openbook/book-model";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
} from "./desktopStudioCoordinator.js";
import { openProjectPackage } from "../persistence/projectPackageFs.js";
import type { ProjectPackageSaveInput } from "../persistence/projectPackageFs.js";
import type { ProjectPackageFsResult } from "../persistence/projectPackageFs.js";
import type { ProjectPackageSaveSummary } from "../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-save-unify-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function paragraph(text: string, id = "p1"): ContentBlock {
  return {
    type: "paragraph",
    id,
    inlines: [{ type: "text", text }],
  };
}

test("unbound saveProject remains SQLite-only (no invented package path)", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "unbound.obproj");
    const coordinator = new DesktopStudioCoordinator({
      persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
      idSeed: "unbound-save",
    });
    coordinator.updateActiveSectionBlocks([paragraph("sqlite only")]);
    const summary = await coordinator.saveProject("SQLite Only");
    assert.ok(summary.projectId);
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
    await coordinator.close();
  });
});

test("bound saveProject commits package first then SQLite index", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "bound.obproj");
    const coordinator = new DesktopStudioCoordinator({
      persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
      idSeed: "bound-save",
    });
    coordinator.bindPackageRoot(projectRoot);
    coordinator.updateActiveSectionBlocks([paragraph("unified body")]);

    const summary = await coordinator.saveProject("Unified");
    assert.ok(summary.projectId);
    assert.equal(coordinator.getState().isDirty, false);
    assert.equal(coordinator.getAutosaveStatus().state, "idle");

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "Untitled Project");
    const block = opened.value.book.chapters[0]!.blocks[0]!;
    assert.equal(block.type, "paragraph");
    if (block.type === "paragraph" && block.inlines[0]!.type === "text") {
      assert.equal(block.inlines[0]!.text, "unified body");
    }

    // SQLite session index also holds the project.
    const listed = await coordinator.listProjects();
    assert.ok(listed.some((p) => p.id === summary.projectId));
    await coordinator.close();
  });
});

test("bound saveProject fails closed without SQLite write when package Save fails", async () => {
  const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "pkg-fail",
    packageSave: async () => ({
      ok: false,
      error: { code: "PACKAGE_IO_ERROR", message: "disk full" },
    }),
  });
  coordinator.bindPackageRoot("/tmp/pkg-fail.obproj");
  coordinator.updateActiveSectionBlocks([paragraph("should not index")]);

  await assert.rejects(
    () => coordinator.saveProject("Fail Package"),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "PACKAGE_SAVE_FAILED",
  );

  const listed = await coordinator.listProjects();
  assert.equal(listed.length, 0);
  assert.equal(coordinator.getState().isDirty, true);
  await coordinator.close();
});

test("bound saveProject reports index sync failure after successful package commit", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "index-fail.obproj");
    let packageWrites = 0;
    const packageSave = async (
      input: ProjectPackageSaveInput,
    ): Promise<ProjectPackageFsResult<ProjectPackageSaveSummary>> => {
      packageWrites += 1;
      const { saveProjectPackage } = await import("../persistence/projectPackageFs.js");
      return saveProjectPackage(input);
    };

    const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
    persistence.saveProject = async () => ({
      ok: false,
      error: { code: "DATABASE_ERROR", message: "index unavailable" },
    });

    const coordinator = new DesktopStudioCoordinator({
      persistence,
      idSeed: "index-fail",
      packageSave,
    });
    coordinator.bindPackageRoot(projectRoot);
    coordinator.updateActiveSectionBlocks([paragraph("pkg ok")]);

    await assert.rejects(
      () => coordinator.saveProject("Index Fail"),
      (err: unknown) =>
        err instanceof DesktopStudioError && err.code === "PACKAGE_INDEX_SYNC_FAILED",
    );
    assert.equal(packageWrites, 1);
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    await coordinator.close();
  });
});

test("bound saveProject writes package even when session is already clean", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "clean-save.obproj");
    let writes = 0;
    const coordinator = new DesktopStudioCoordinator({
      persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
      idSeed: "clean-save",
      packageSave: async (input) => {
        writes += 1;
        const { saveProjectPackage } = await import("../persistence/projectPackageFs.js");
        return saveProjectPackage(input);
      },
    });
    coordinator.bindPackageRoot(projectRoot);
    coordinator.updateActiveSectionBlocks([paragraph("first")]);
    await coordinator.saveProject("Clean Save");
    assert.equal(writes, 1);
    assert.equal(coordinator.getState().isDirty, false);

    // Explicit Save again while clean must still commit package.
    await coordinator.saveProject("Clean Save");
    assert.equal(writes, 2);
    await coordinator.close();
  });
});
