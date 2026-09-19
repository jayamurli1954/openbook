// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MemoryAssetStore, sha256Hex } from "@openbook/assets";
import { BOOK_MODEL_SCHEMA_VERSION, createBook, type Book } from "@openbook/book-model";
import {
  PACKAGE_ASSETS_DIR,
  PACKAGE_ASSETS_INDEX_FILE,
  PACKAGE_BOOK_FILE,
  PACKAGE_MANIFEST_FILE,
  createMemoryAssetStoreWith,
  openProjectPackage,
  packageAssetsDirectory,
  saveProjectPackage,
} from "./projectPackageFs.js";

async function withTempRoot(
  run: (parent: string) => Promise<void>,
): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-pkg-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function sampleBook(): Book {
  const book = createBook({
    title: "ಕನ್ನಡ Package",
    language: "kn",
    authors: ["Author"],
  });
  book.chapters[0]!.blocks[0] = {
    type: "paragraph",
    id: book.chapters[0]!.blocks[0]!.id,
    inlines: [{ type: "text", text: "ನಮಸ್ಕಾರ" }],
  };
  return book;
}

function bookWithImage(assetId: string, fileName: string): Book {
  const book = sampleBook();
  book.assets = [
    {
      id: assetId,
      kind: "image",
      fileName,
      mediaType: "image/png",
      altText: "figure",
      licence: "",
    },
  ];
  book.chapters[0]!.blocks.push({
    type: "image",
    id: "img-1",
    assetId,
    caption: [],
  });
  return book;
}

function pngBytes(tag: string): Uint8Array {
  return new TextEncoder().encode(`fake-png-${tag}`);
}

test("Save/Open round-trip preserves Unicode Book with no assets", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "demo.obproj");
    const book = sampleBook();
    const saved = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-demo", name: "Demo" },
      assetBindings: [],
      assetStore: new MemoryAssetStore(),
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) return;

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "ಕನ್ನಡ Package");
    assert.equal(
      (opened.value.book.chapters[0]?.blocks[0] as { inlines: Array<{ text: string }> }).inlines[0]
        ?.text,
      "ನಮಸ್ಕಾರ",
    );
    assert.equal(opened.value.assetBindings.size, 0);
    assert.deepEqual(
      (await readdir(parent)).filter((name) => name.includes("openbook-staging")),
      [],
    );
  });
});

test("Save/Open round-trip persists CAS bytes and bindings", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "with-assets.obproj");
    const bytes = pngBytes("alpha");
    const sha = sha256Hex(bytes);
    const book = bookWithImage("asset-alpha", "ಕನ್ನಡ-cover.png");
    const store = await createMemoryAssetStoreWith([{ sha256: sha, bytes }]);

    const saved = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-assets" },
      assetBindings: [{ assetId: "asset-alpha", sha256: sha }],
      assetStore: store,
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) return;
    assert.equal(saved.value.assetCount, 1);

    const onDisk = await readFile(path.join(packageAssetsDirectory(projectRoot), sha));
    assert.equal(sha256Hex(new Uint8Array(onDisk)), sha);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.assetBindings.get("asset-alpha"), sha);
    assert.equal(opened.value.book.assets[0]?.fileName, "ಕನ್ನಡ-cover.png");
    const restored = await opened.value.assetStore.get(sha);
    assert.ok(restored);
    assert.equal(sha256Hex(restored), sha);
  });
});

test("Open fails closed when manifest.json is missing", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "broken.obproj");
    await mkdir(projectRoot, { recursive: true });
    await writeFile(path.join(projectRoot, PACKAGE_BOOK_FILE), "{}");
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
    if (opened.ok) return;
    assert.equal(opened.error.code, "PACKAGE_IO_ERROR");
  });
});

test("Open fails closed on unsupported future package version", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "future.obproj");
    const book = sampleBook();
    const saved = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-future" },
      assetBindings: [],
      assetStore: new MemoryAssetStore(),
    });
    assert.equal(saved.ok, true);

    const manifestPath = path.join(projectRoot, PACKAGE_MANIFEST_FILE);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    manifest.packageVersion = 99;
    await writeFile(manifestPath, JSON.stringify(manifest));

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
    if (opened.ok) return;
    assert.equal(opened.error.code, "UNSUPPORTED_FUTURE_VERSION");
  });
});

test("Open fails closed on migration-required older package version", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "legacy.obproj");
    const book = sampleBook();
    const saved = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-legacy" },
      assetBindings: [],
      assetStore: new MemoryAssetStore(),
    });
    assert.equal(saved.ok, true);

    const manifestPath = path.join(projectRoot, PACKAGE_MANIFEST_FILE);
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Record<string, unknown>;
    manifest.packageVersion = 0;
    await writeFile(manifestPath, JSON.stringify(manifest));

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
    if (opened.ok) return;
    assert.equal(opened.error.code, "MIGRATION_REQUIRED");
  });
});

test("Open fails closed when CAS bytes are missing", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "missing-cas.obproj");
    const bytes = pngBytes("missing");
    const sha = sha256Hex(bytes);
    const book = bookWithImage("asset-alpha", "a.png");
    const store = await createMemoryAssetStoreWith([{ sha256: sha, bytes }]);
    const saved = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-missing-cas" },
      assetBindings: [{ assetId: "asset-alpha", sha256: sha }],
      assetStore: store,
    });
    assert.equal(saved.ok, true);

    await rm(path.join(packageAssetsDirectory(projectRoot), sha), { force: true });
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
    if (opened.ok) return;
    assert.equal(opened.error.code, "MISSING_ASSET_BYTES");
  });
});

test("Open fails closed when CAS bytes do not match the key", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "corrupt-cas.obproj");
    const bytes = pngBytes("good");
    const sha = sha256Hex(bytes);
    const book = bookWithImage("asset-alpha", "a.png");
    const store = await createMemoryAssetStoreWith([{ sha256: sha, bytes }]);
    const saved = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-corrupt-cas" },
      assetBindings: [{ assetId: "asset-alpha", sha256: sha }],
      assetStore: store,
    });
    assert.equal(saved.ok, true);

    await writeFile(path.join(packageAssetsDirectory(projectRoot), sha), pngBytes("tampered"));
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
    if (opened.ok) return;
    assert.equal(opened.error.code, "INVALID_ASSET_BYTES");
  });
});

test("Failed Save with missing source bytes leaves a prior package unchanged", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "stable.obproj");
    const book = sampleBook();
    const first = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-stable", name: "Stable" },
      assetBindings: [],
      assetStore: new MemoryAssetStore(),
    });
    assert.equal(first.ok, true);

    const before = await readFile(path.join(projectRoot, PACKAGE_BOOK_FILE), "utf8");
    const bytes = pngBytes("absent");
    const sha = sha256Hex(bytes);
    const bookWithAsset = bookWithImage("asset-alpha", "a.png");
    const second = await saveProjectPackage({
      projectRoot,
      book: bookWithAsset,
      project: { id: "project-stable", name: "Stable" },
      assetBindings: [{ assetId: "asset-alpha", sha256: sha }],
      assetStore: new MemoryAssetStore(),
    });
    assert.equal(second.ok, false);
    if (second.ok) return;
    assert.equal(second.error.code, "MISSING_ASSET_BYTES");

    const after = await readFile(path.join(projectRoot, PACKAGE_BOOK_FILE), "utf8");
    assert.equal(after, before);
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "ಕನ್ನಡ Package");
  });
});

test("Replace Save updates Book content and leaves no staging dirs", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "replace.obproj");
    const firstBook = sampleBook();
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: firstBook,
          project: { id: "project-replace" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );

    const secondBook = sampleBook();
    secondBook.metadata.title = "Updated Title";
    const second = await saveProjectPackage({
      projectRoot,
      book: secondBook,
      project: { id: "project-replace" },
      assetBindings: [],
      assetStore: new MemoryAssetStore(),
    });
    assert.equal(second.ok, true);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "Updated Title");
    const siblings = await readdir(parent);
    assert.equal(siblings.some((name) => name.includes("openbook-staging")), false);
    assert.equal(siblings.some((name) => name.includes("openbook-backup")), false);
  });
});

test("Save fails closed when Book asset lacks a binding", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "unbound.obproj");
    const book = bookWithImage("asset-alpha", "a.png");
    const result = await saveProjectPackage({
      projectRoot,
      book,
      project: { id: "project-unbound" },
      assetBindings: [],
      assetStore: new MemoryAssetStore(),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "MISSING_PACKAGE_ASSET");
    assert.equal(await readdir(parent).then((names) => names.includes("unbound.obproj")), false);
  });
});

test("package layout uses expected filenames", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "layout.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: sampleBook(),
          project: { id: "project-layout" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );
    const names = await readdir(projectRoot);
    assert.ok(names.includes(PACKAGE_MANIFEST_FILE));
    assert.ok(names.includes(PACKAGE_BOOK_FILE));
    assert.ok(names.includes(PACKAGE_ASSETS_INDEX_FILE));
    assert.ok(names.includes(PACKAGE_ASSETS_DIR));
    assert.equal(BOOK_MODEL_SCHEMA_VERSION, 1);
    // sanity: sha helper matches node crypto for fixture stability
    const probe = new TextEncoder().encode("x");
    assert.equal(sha256Hex(probe), createHash("sha256").update(probe).digest("hex"));
  });
});
