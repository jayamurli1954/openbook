// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0031 Slice 4: coordinator open-with-recover / discovery.
 */
import assert from "node:assert/strict";
import { mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MemoryAssetStore } from "@openbook/assets";
import { createBook } from "@openbook/book-model";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
} from "./desktopStudioCoordinator.js";
import { openProjectPackage, saveProjectPackage } from "../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-coord-recover-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function sampleBook(title = "Recovery Slice 4") {
  return createBook({ title, language: "en", authors: ["Author"] });
}

function freshCoordinator() {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "slice-4-recover",
  });
}

test("discoverPackageRecovery reports live-ready for an intact package", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "live.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "proj-live", name: "Live" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const coordinator = freshCoordinator();
    const discovery = await coordinator.discoverPackageRecovery(projectRoot);
    assert.equal(discovery.status, "live-ready");
    await coordinator.close();
  });
});

test("openFromProjectPackage loads Book and binds package root without recovery", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "open.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook("Opened Package"),
          project: { id: "proj-open", name: "Opened" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const coordinator = freshCoordinator();
    const result = await coordinator.openFromProjectPackage(projectRoot);
    assert.equal(result.recovered, false);
    assert.equal(coordinator.getBook().metadata.title, "Opened Package");
    assert.equal(coordinator.getPackageRoot(), projectRoot);
    assert.equal(coordinator.getState().binding?.projectId, "proj-open");
    assert.equal(coordinator.getAutosaveStatus().state, "idle");
    await coordinator.close();
  });
});

test("openFromProjectPackage refuses silent recover when live is missing", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "need-recover.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "proj-need" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "need-recover.obproj.openbook-backup-1"));

    const coordinator = freshCoordinator();
    await assert.rejects(
      () => coordinator.openFromProjectPackage(projectRoot),
      (err: unknown) =>
        err instanceof DesktopStudioError && err.code === "PACKAGE_RECOVERY_REQUIRED",
    );
    await coordinator.close();
  });
});

test("openFromProjectPackage restores with explicit restore-if-live-missing", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "restore.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook("Restored Title"),
          project: { id: "proj-restore", name: "Restored" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "restore.obproj.openbook-backup-1"));

    const coordinator = freshCoordinator();
    const result = await coordinator.openFromProjectPackage(projectRoot, {
      recover: { mode: "restore-if-live-missing" },
    });
    assert.equal(result.recovered, true);
    assert.equal(coordinator.getBook().metadata.title, "Restored Title");
    assert.equal(coordinator.getPackageRoot(), projectRoot);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    await coordinator.close();
  });
});

test("openFromProjectPackage force-replace requires explicit backup when ambiguous", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "ambig.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook("A"),
          project: { id: "proj-a" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "ambig.obproj.openbook-backup-a"));
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook("B"),
          project: { id: "proj-b" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "ambig.obproj.openbook-backup-b"));

    const coordinator = freshCoordinator();
    await assert.rejects(
      () =>
        coordinator.openFromProjectPackage(projectRoot, {
          recover: { mode: "force-replace" },
        }),
      (err: unknown) =>
        err instanceof DesktopStudioError && err.code === "PACKAGE_RECOVERY_AMBIGUOUS",
    );

    const result = await coordinator.openFromProjectPackage(projectRoot, {
      recover: {
        mode: "force-replace",
        backupRoot: path.join(parent, "ambig.obproj.openbook-backup-b"),
      },
    });
    assert.equal(result.recovered, true);
    assert.equal(coordinator.getBook().metadata.title, "B");
    await coordinator.close();
  });
});
