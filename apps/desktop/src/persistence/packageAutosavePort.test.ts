// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { MemoryAssetStore } from "@openbook/assets";
import { createBook, type Book } from "@openbook/book-model";
import { AutosaveController } from "./autosaveController.js";
import {
  AUTOSAVE_INVALID_PACKAGE_ROOT,
  AUTOSAVE_UNBOUND_PACKAGE,
  PackageAutosavePort,
  type PackageAutosaveBinding,
} from "./packageAutosavePort.js";
import {
  openProjectPackage,
  saveProjectPackage,
  type ProjectPackageSaveInput,
} from "./projectPackageFs.js";

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-autosave-port-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function sampleBook(title = "Autosave Slice 2"): Book {
  const book = createBook({
    title,
    language: "en",
    authors: ["Author"],
  });
  book.chapters[0]!.blocks[0] = {
    type: "paragraph",
    id: book.chapters[0]!.blocks[0]!.id,
    inlines: [{ type: "text", text: "Hello autosave" }],
  };
  return book;
}

function boundInput(projectRoot: string, book: Book): ProjectPackageSaveInput {
  return {
    projectRoot,
    book,
    project: { id: "project-autosave-slice-2", name: "Autosave Slice 2" },
    assetBindings: [],
    assetStore: new MemoryAssetStore(),
  };
}

test("PackageAutosavePort saves through saveProjectPackage when bound", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "bound.obproj");
    const book = sampleBook();
    const binding: PackageAutosaveBinding = {
      resolveSaveInput: () => boundInput(projectRoot, book),
    };
    const port = new PackageAutosavePort({ binding });

    const result = await port.save();
    assert.equal(result.ok, true);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "Autosave Slice 2");
  });
});

test("PackageAutosavePort fails closed when no package root is bound", async () => {
  const port = new PackageAutosavePort({
    binding: { resolveSaveInput: () => null },
  });
  const result = await port.save();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, AUTOSAVE_UNBOUND_PACKAGE);
});

test("PackageAutosavePort rejects an empty package root", async () => {
  const book = sampleBook();
  const port = new PackageAutosavePort({
    binding: {
      resolveSaveInput: () => boundInput("   ", book),
    },
  });
  const result = await port.save();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, AUTOSAVE_INVALID_PACKAGE_ROOT);
});

test("PackageAutosavePort maps package FS errors into AutosaveSaveResult", async () => {
  const book = sampleBook();
  const port = new PackageAutosavePort({
    binding: {
      resolveSaveInput: () => boundInput("/tmp/unused.obproj", book),
    },
    save: async () => ({
      ok: false,
      error: {
        code: "PACKAGE_IO_ERROR",
        message: "disk full",
        details: { errno: "ENOSPC" },
      },
    }),
  });

  const result = await port.save();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.error.code, "PACKAGE_IO_ERROR");
  assert.equal(result.error.message, "disk full");
  assert.deepEqual(result.error.details, { errno: "ENOSPC" });
});

test("PackageAutosavePort resolves Book at save time (not a captured Tiptap doc)", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "live.obproj");
    let book = sampleBook("Before");
    const binding: PackageAutosaveBinding = {
      resolveSaveInput: () => boundInput(projectRoot, book),
    };
    const port = new PackageAutosavePort({ binding });

    book = sampleBook("After");
    const result = await port.save();
    assert.equal(result.ok, true);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "After");
  });
});

test("AutosaveController flush uses PackageAutosavePort for a real package Save", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "flush.obproj");
    const book = sampleBook("Flush");
    const port = new PackageAutosavePort({
      binding: { resolveSaveInput: () => boundInput(projectRoot, book) },
      save: saveProjectPackage,
    });
    const controller = new AutosaveController({ debounceMs: 60_000, save: port });

    controller.markDirty();
    const flushed = await controller.flush();
    assert.equal(flushed.ok, true);
    assert.equal(controller.isDirty(), false);

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
  });
});

test("PackageAutosavePort save signature has no document argument", () => {
  const port = new PackageAutosavePort({
    binding: { resolveSaveInput: () => null },
  });
  assert.equal((port.save as (...args: never[]) => Promise<unknown>).length, 0);
});
