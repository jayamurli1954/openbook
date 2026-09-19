// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MemoryAssetStore } from "@openbook/assets";
import { createBook } from "@openbook/book-model";
import {
  discoverProjectPackageRecovery,
  listProjectPackageBackups,
} from "./projectPackageRecovery.js";
import { saveProjectPackage } from "./projectPackageFs.js";

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-discover-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function sampleBook() {
  return createBook({ title: "Discover", language: "en", authors: ["Author"] });
}

test("discoverProjectPackageRecovery reports live-ready when package exists", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "live.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-live" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const discovered = await discoverProjectPackageRecovery(projectRoot);
    assert.equal(discovered.ok, true);
    if (!discovered.ok) return;
    assert.equal(discovered.value.status, "live-ready");
    if (discovered.value.status === "live-ready") {
      assert.equal(discovered.value.liveExists, true);
      assert.deepEqual(discovered.value.backups, []);
    }
  });
});

test("discoverProjectPackageRecovery reports recoverable for a single sibling backup", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "gone.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-gone" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const backupRoot = path.join(parent, "gone.obproj.openbook-backup-1");
    await rename(projectRoot, backupRoot);

    const discovered = await discoverProjectPackageRecovery(projectRoot);
    assert.equal(discovered.ok, true);
    if (!discovered.ok) return;
    assert.equal(discovered.value.status, "recoverable");
    if (discovered.value.status === "recoverable") {
      assert.equal(discovered.value.backupRoot, backupRoot);
      assert.equal(discovered.value.liveExists, false);
    }
  });
});

test("discoverProjectPackageRecovery reports ambiguous for multiple backups", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "multi.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-multi" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "multi.obproj.openbook-backup-a"));
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-multi-2" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "multi.obproj.openbook-backup-b"));

    const discovered = await discoverProjectPackageRecovery(projectRoot);
    assert.equal(discovered.ok, true);
    if (!discovered.ok) return;
    assert.equal(discovered.value.status, "ambiguous");
    if (discovered.value.status === "ambiguous") {
      assert.equal(discovered.value.backups.length, 2);
    }
  });
});

test("discoverProjectPackageRecovery reports unavailable when live and backups are missing", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "missing.obproj");
    const discovered = await discoverProjectPackageRecovery(projectRoot);
    assert.equal(discovered.ok, true);
    if (!discovered.ok) return;
    assert.equal(discovered.value.status, "unavailable");
  });
});

test("listProjectPackageBackups returns sorted sibling backup paths", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "list.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-list" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "list.obproj.openbook-backup-z"));
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-list-2" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    await rename(projectRoot, path.join(parent, "list.obproj.openbook-backup-a"));

    const listed = await listProjectPackageBackups(projectRoot);
    assert.equal(listed.ok, true);
    if (!listed.ok) return;
    assert.equal(listed.value.length, 2);
    assert.ok(listed.value[0]!.endsWith("openbook-backup-a"));
    assert.ok(listed.value[1]!.endsWith("openbook-backup-z"));
  });
});
