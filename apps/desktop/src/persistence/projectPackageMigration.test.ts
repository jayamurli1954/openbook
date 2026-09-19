// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MemoryAssetStore } from "@openbook/assets";
import { createBook } from "@openbook/book-model";
import { PACKAGE_INTEGRITY_FILE } from "./packageIntegrity.js";
import { migrateProjectPackage } from "./projectPackageMigration.js";
import { recoverProjectPackage } from "./projectPackageRecovery.js";
import {
  PACKAGE_BOOK_FILE,
  PACKAGE_MANIFEST_FILE,
  openProjectPackage,
  saveProjectPackage,
} from "./projectPackageFs.js";

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-mig-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function sampleBook() {
  return createBook({ title: "ಕನ್ನಡ Migrate", language: "kn", authors: ["Author"] });
}

async function saveThenStripIntegrity(projectRoot: string): Promise<void> {
  const saved = await saveProjectPackage({
    projectRoot,
    book: sampleBook(),
    project: { id: "project-migrate" },
    assetBindings: [],
    assetStore: new MemoryAssetStore(),
  });
  assert.equal(saved.ok, true);
  await rm(path.join(projectRoot, PACKAGE_INTEGRITY_FILE), { force: true });
}

test("migrateProjectPackage adds integrity.json for Slice 4 packages (M1)", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "slice4.obproj");
    await saveThenStripIntegrity(projectRoot);

    const beforeOpen = await openProjectPackage(projectRoot);
    assert.equal(beforeOpen.ok, false);
    if (!beforeOpen.ok) assert.equal(beforeOpen.error.code, "INTEGRITY_EVIDENCE_MISSING");

    const migrated = await migrateProjectPackage(projectRoot);
    assert.equal(migrated.ok, true);
    if (!migrated.ok) return;
    assert.deepEqual(migrated.value.migrationsApplied, ["add-integrity-v1"]);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "ಕನ್ನಡ Migrate");
  });
});

test("migrateProjectPackage is idempotent when integrity.json already exists", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "current.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-current" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const first = await migrateProjectPackage(projectRoot);
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.deepEqual(first.value.migrationsApplied, []);
  });
});

test("openProjectPackage allowMigration upgrades missing integrity then opens", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "allow.obproj");
    await saveThenStripIntegrity(projectRoot);
    const opened = await openProjectPackage(projectRoot, { allowMigration: true });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "ಕನ್ನಡ Migrate");
  });
});

test("migrate refuses unsupported future package versions", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "future.obproj");
    await saveThenStripIntegrity(projectRoot);
    const manifestPath = path.join(projectRoot, PACKAGE_MANIFEST_FILE);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    manifest.packageVersion = 99;
    await writeFile(manifestPath, JSON.stringify(manifest));

    const migrated = await migrateProjectPackage(projectRoot);
    assert.equal(migrated.ok, false);
    if (migrated.ok) return;
    assert.equal(migrated.error.code, "UNSUPPORTED_FUTURE_VERSION");
  });
});

test("migrate refuses to invent Book content when book.json is missing", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "nobook.obproj");
    await saveThenStripIntegrity(projectRoot);
    await rm(path.join(projectRoot, PACKAGE_BOOK_FILE), { force: true });
    const migrated = await migrateProjectPackage(projectRoot);
    assert.equal(migrated.ok, false);
    if (migrated.ok) return;
    assert.equal(migrated.error.code, "PACKAGE_IO_ERROR");
  });
});

test("migrate does not rewrite digests to heal integrity mismatch", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "mismatch.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-mismatch" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const bookPath = path.join(projectRoot, PACKAGE_BOOK_FILE);
    await writeFile(bookPath, `${await readFile(bookPath, "utf8")} `);
    const migrated = await migrateProjectPackage(projectRoot);
    assert.equal(migrated.ok, true);
    if (!migrated.ok) return;
    assert.deepEqual(migrated.value.migrationsApplied, []);
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
    if (opened.ok) return;
    assert.equal(opened.error.code, "INTEGRITY_MISMATCH");
  });
});

test("recoverProjectPackage restores from an explicit backup sibling", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "recover.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-recover" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const backupRoot = path.join(parent, "recover.obproj.openbook-backup-test");
    await rename(projectRoot, backupRoot);
    assert.equal(await openProjectPackage(projectRoot).then((r) => r.ok), false);

    const recovered = await recoverProjectPackage({
      projectRoot,
      backupRoot,
    });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) return;
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "ಕನ್ನಡ Migrate");
  });
});

test("recoverProjectPackage discovers a single sibling backup", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "discover.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-discover" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const backupRoot = path.join(parent, "discover.obproj.openbook-backup-1");
    await rename(projectRoot, backupRoot);

    const recovered = await recoverProjectPackage({
      projectRoot,
      discoverSiblingBackup: true,
    });
    assert.equal(recovered.ok, true);
    if (!recovered.ok) return;
    assert.equal(recovered.value.restoredFrom, backupRoot);
  });
});

test("recoverProjectPackage refuses when no backup exists", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "missing-backup.obproj");
    const recovered = await recoverProjectPackage({
      projectRoot,
      discoverSiblingBackup: true,
    });
    assert.equal(recovered.ok, false);
    if (recovered.ok) return;
    assert.equal(recovered.error.code, "RECOVERY_BACKUP_MISSING");
    assert.equal((await readdir(parent)).includes("missing-backup.obproj"), false);
  });
});
