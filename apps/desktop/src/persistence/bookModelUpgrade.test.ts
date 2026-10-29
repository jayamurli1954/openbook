// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 Slice 1 — Book Model version 1 → 2 on every read path.
 *
 * A version-1 package or SQLite row opens as a version-2 Book in memory. Nothing on disk
 * changes at Open; the next Save writes version 2.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MemoryAssetStore } from "@openbook/assets";
import { BOOK_MODEL_SCHEMA_VERSION, createBook, type Book } from "@openbook/book-model";
import { deserializeProjectFromDto, serializeProjectToDto } from "./dto.js";
import {
  PACKAGE_INTEGRITY_FILE,
  buildPackageIntegrityEvidence,
  serializePackageIntegrityEvidence,
} from "./packageIntegrity.js";
import {
  PACKAGE_ASSETS_INDEX_FILE,
  PACKAGE_BOOK_FILE,
  PACKAGE_MANIFEST_FILE,
  openProjectPackage,
  saveProjectPackage,
} from "./projectPackageFs.js";
import { PERSISTENCE_SCHEMA_VERSION } from "./types.js";

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-upgrade-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function kannadaBook(): Book {
  const book = createBook({ title: "ಪುಟ್ಟ ಕೃಷ್ಣ", language: "kn", authors: ["ಲೇಖಕ"] });
  book.chapters[0]!.blocks[0] = {
    type: "paragraph",
    id: book.chapters[0]!.blocks[0]!.id,
    inlines: [{ type: "text", text: "ನಮಸ್ಕಾರ" }],
  };
  return book;
}

async function readParts(projectRoot: string) {
  const read = (name: string) => readFile(path.join(projectRoot, name), "utf8");
  return {
    "manifest.json": await read(PACKAGE_MANIFEST_FILE),
    "book.json": await read(PACKAGE_BOOK_FILE),
    "assets.json": await read(PACKAGE_ASSETS_INDEX_FILE),
  };
}

/** Rewrite a saved package as a package from before version 2 (valid integrity evidence). */
async function writeAsVersion(
  projectRoot: string,
  versions: { manifest: number; document: number; book: number },
): Promise<void> {
  const parts = await readParts(projectRoot);
  const manifest = JSON.parse(parts["manifest.json"]) as Record<string, unknown>;
  manifest.bookModelVersion = versions.manifest;
  const document = JSON.parse(parts["book.json"]) as { bookModelVersion: number; book: Book };
  document.bookModelVersion = versions.document;
  document.book.schemaVersion = versions.book;
  const next = {
    "manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
    "book.json": `${JSON.stringify(document, null, 2)}\n`,
    "assets.json": parts["assets.json"],
  };
  await writeFile(path.join(projectRoot, PACKAGE_MANIFEST_FILE), next["manifest.json"]);
  await writeFile(path.join(projectRoot, PACKAGE_BOOK_FILE), next["book.json"]);
  await writeFile(
    path.join(projectRoot, PACKAGE_INTEGRITY_FILE),
    serializePackageIntegrityEvidence(buildPackageIntegrityEvidence(next)),
  );
}

async function savePackage(projectRoot: string, book: Book) {
  const saved = await saveProjectPackage({
    projectRoot,
    book,
    project: { id: "project-upgrade", name: "Upgrade" },
    assetBindings: [],
    assetStore: new MemoryAssetStore(),
  });
  assert.equal(saved.ok, true, JSON.stringify(saved));
}

test("a version-1 package opens as version 2, unchanged on disk until the next Save", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "old.obproj");
    const book = kannadaBook();
    await savePackage(projectRoot, book);
    await writeAsVersion(projectRoot, { manifest: 1, document: 1, book: 1 });
    const onDisk = await readParts(projectRoot);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true, JSON.stringify(opened));
    if (!opened.ok) return;
    assert.equal(opened.value.upgradedFrom, 1);
    assert.equal(opened.value.book.schemaVersion, BOOK_MODEL_SCHEMA_VERSION);
    assert.deepEqual({ ...opened.value.book, schemaVersion: 1 }, { ...book, schemaVersion: 1 });
    assert.deepEqual(await readParts(projectRoot), onDisk, "Open must not rewrite the package");

    await savePackage(projectRoot, opened.value.book);
    const after = await readParts(projectRoot);
    assert.equal((JSON.parse(after["manifest.json"]) as { bookModelVersion: number }).bookModelVersion, 2);
    assert.equal((JSON.parse(after["book.json"]) as { bookModelVersion: number }).bookModelVersion, 2);
    const reopened = await openProjectPackage(projectRoot);
    assert.equal(reopened.ok, true);
    if (reopened.ok) {
      assert.equal(reopened.value.upgradedFrom, undefined);
      assert.equal(reopened.value.book.chapters[0]!.blocks[0]!.type, "paragraph");
    }
  });
});

test("a package newer than version 2, or with mismatched versions, is refused", async () => {
  await withTempRoot(async (parent) => {
    const future = path.join(parent, "future.obproj");
    await savePackage(future, kannadaBook());
    await writeAsVersion(future, { manifest: 3, document: 3, book: 3 });
    const openedFuture = await openProjectPackage(future);
    assert.equal(openedFuture.ok, false);
    if (!openedFuture.ok) assert.equal(openedFuture.error.code, "UNSUPPORTED_FUTURE_VERSION");

    const mixed = path.join(parent, "mixed.obproj");
    await savePackage(mixed, kannadaBook());
    await writeAsVersion(mixed, { manifest: 1, document: 2, book: 2 });
    const openedMixed = await openProjectPackage(mixed);
    assert.equal(openedMixed.ok, false);
    if (!openedMixed.ok) assert.equal(openedMixed.error.code, "MALFORMED_PACKAGE");

    const lying = path.join(parent, "lying.obproj");
    await savePackage(lying, kannadaBook());
    await writeAsVersion(lying, { manifest: 1, document: 1, book: 2 });
    const openedLying = await openProjectPackage(lying);
    assert.equal(openedLying.ok, false);
  });
});

test("a version-1 SQLite row is read as version 2; a mismatched payload is refused", () => {
  const book = kannadaBook();
  const now = new Date().toISOString();
  const serialized = serializeProjectToDto({
    metadata: {
      id: "proj-upgrade-row",
      name: "Row",
      createdAt: now,
      updatedAt: now,
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      bookSchemaVersion: BOOK_MODEL_SCHEMA_VERSION,
    },
    book,
  });
  assert.equal(serialized.ok, true);
  if (!serialized.ok) return;
  assert.equal(serialized.value.document.book_schema_version, 2, "writes use version 2");

  const v1Payload = JSON.stringify({ ...book, schemaVersion: 1 });
  const oldRow = {
    ...serialized.value,
    document: { ...serialized.value.document, book_schema_version: 1, book_payload: v1Payload },
  };
  const read = deserializeProjectFromDto(oldRow);
  assert.equal(read.ok, true, JSON.stringify(read));
  if (read.ok) {
    assert.equal(read.value.book.schemaVersion, 2);
    assert.equal(read.value.metadata.bookSchemaVersion, 2);
    assert.equal(read.value.book.metadata.title, "ಪುಟ್ಟ ಕೃಷ್ಣ");
  }

  const mismatched = deserializeProjectFromDto({
    ...serialized.value,
    document: { ...serialized.value.document, book_schema_version: 1 },
  });
  assert.equal(mismatched.ok, false);
  if (!mismatched.ok) assert.equal(mismatched.error.code, "SCHEMA_VERSION_MISMATCH");

  const future = deserializeProjectFromDto({
    ...serialized.value,
    document: { ...serialized.value.document, book_schema_version: 3 },
  });
  assert.equal(future.ok, false);
});
