// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 1 — cover contract tests. No React chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook, serializeBook, type AssetRef } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import type { AutosaveClock } from "../../persistence/autosaveController.js";
import {
  mapBookToPackagePayload,
  parsePackageBookDocument,
  serializePackageBookDocument,
} from "../../persistence/bookPackageMapping.js";
import type { PackageAutosaveSaveFn } from "../../persistence/packageAutosavePort.js";
import type { ProjectPackageSaveSummary } from "../../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import {
  COVER_WIZARD_CAPABILITIES,
  executeCoverCommand,
  getCoverWizardCapability,
  isCoverWizardCommandType,
  readCover,
  type CoverWizardSessionPort,
} from "./coverWizardContract.js";

function image(id: string, overrides: Partial<AssetRef> = {}): AssetRef {
  return {
    id,
    kind: "image",
    fileName: `${id}.jpg`,
    mediaType: "image/jpeg",
    altText: "",
    licence: "CC-BY-4.0",
    ...overrides,
  };
}

function session(): BookSession {
  const studio = new BookSession({
    book: createBook({ title: "ಮುಖಪುಟ", language: "kn", authors: ["ಲೇಖಕ"] }),
    idSeed: "cover-slice-1",
  });
  studio.addAsset(image("jpeg"));
  studio.addAsset(image("png", { mediaType: "image/png", fileName: "png.png" }));
  studio.addAsset(image("svg", { mediaType: "image/svg+xml", fileName: "svg.svg" }));
  studio.addAsset(image("webp", { mediaType: "image/webp", fileName: "webp.webp" }));
  studio.addAsset(image("font", { kind: "font", mediaType: "font/woff", fileName: "f.woff" }));
  return studio;
}

test("capability matrix follows ADR-0038 §2.2", () => {
  const byStatus = (status: string) =>
    COVER_WIZARD_CAPABILITIES.filter((capability) => capability.status === status).map(
      (capability) => capability.id,
    );
  assert.deepEqual(byStatus("in-scope"), [
    "import-image",
    "use-illustration",
    "preview-cover",
    "epub-cover",
    "html-pdf-cover",
    "image-quality-warning",
    "cover-alt-text",
  ]);
  assert.deepEqual(byStatus("deferred"), [
    "cover-direction",
    "cover-text",
    "cover-typography",
    "contrast-warning",
  ]);
  assert.deepEqual(byStatus("out-of-scope"), ["print-cover", "ai-cover"]);
  assert.equal(getCoverWizardCapability("cover-alt-text")?.status, "in-scope");
  assert.equal(isCoverWizardCommandType("set-cover"), true);
  assert.equal(isCoverWizardCommandType("clear-cover"), true);
  assert.equal(isCoverWizardCommandType("generate-cover"), false);
});

test("set-cover sets a JPEG or PNG cover with trimmed Kannada alt text", () => {
  for (const assetId of ["jpeg", "png"]) {
    const studio = session();
    assert.equal(readCover(studio.getBook()), null);
    const result = executeCoverCommand(studio, {
      type: "set-cover",
      assetId,
      altText: "  ನದಿಯ ದಡದಲ್ಲಿ ಹುಡುಗಿ  ",
    });
    assert.deepEqual(result, { ok: true });
    const cover = readCover(studio.getBook());
    assert.equal(cover?.assetId, assetId);
    assert.equal(cover?.altText, "ನದಿಯ ದಡದಲ್ಲಿ ಹುಡುಗಿ");
  }
});

test("rejected set-cover commands leave the Book unchanged", () => {
  const cases = [
    { assetId: "missing", altText: "Cover", code: "UNKNOWN_ASSET" },
    { assetId: "font", altText: "Cover", code: "NOT_AN_IMAGE" },
    { assetId: "svg", altText: "Cover", code: "UNSUPPORTED_IMAGE_TYPE" },
    { assetId: "webp", altText: "Cover", code: "UNSUPPORTED_IMAGE_TYPE" },
    { assetId: "jpeg", altText: "   ", code: "EMPTY_ALT_TEXT" },
  ] as const;
  for (const { assetId, altText, code } of cases) {
    const studio = session();
    const before = serializeBook(studio.getBook());
    const result = executeCoverCommand(studio, { type: "set-cover", assetId, altText });
    assert.equal(result.ok, false, assetId);
    if (!result.ok) assert.equal(result.code, code);
    assert.equal(serializeBook(studio.getBook()), before);
  }
});

test("clear-cover keeps the asset, and fails closed with no cover", () => {
  const studio = session();
  const none = executeCoverCommand(studio, { type: "clear-cover" });
  assert.equal(none.ok, false);
  if (!none.ok) assert.equal(none.code, "NO_COVER");

  executeCoverCommand(studio, { type: "set-cover", assetId: "jpeg", altText: "Cover" });
  assert.deepEqual(executeCoverCommand(studio, { type: "clear-cover" }), { ok: true });
  assert.equal(readCover(studio.getBook()), null);
  assert.equal(studio.getBook().assets.some((asset) => asset.id === "jpeg"), true);
});

test("session rejections map to COVER_REJECTED", () => {
  const studio = session();
  // A port whose session drops the alt text: BookSession validation rejects it.
  const port: CoverWizardSessionPort = {
    getBook: () => studio.getBook(),
    setCover: (assetId) => studio.setCover(assetId, ""),
    clearCover: () => studio.clearCover(),
  };
  const before = serializeBook(studio.getBook());
  const result = executeCoverCommand(port, {
    type: "set-cover",
    assetId: "jpeg",
    altText: "Cover",
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "COVER_REJECTED");
  assert.equal(serializeBook(studio.getBook()), before);
});

test("a Book with a cover round-trips through the package Book mapping", () => {
  const studio = session();
  executeCoverCommand(studio, { type: "set-cover", assetId: "png", altText: "ಮುಖಪುಟ" });
  const mapped = mapBookToPackagePayload(studio.getBook());
  assert.deepEqual(mapped.errors, []);
  assert.ok(mapped.document);
  const reopened = parsePackageBookDocument(serializePackageBookDocument(mapped.document));
  assert.deepEqual(reopened.errors, []);
  assert.ok(reopened.document);
  assert.equal(reopened.document.book.publishing.coverAssetId, "png");
  assert.equal(readCover(reopened.document.book)?.altText, "ಮುಖಪುಟ");
});

class FakeClock implements AutosaveClock {
  readonly #timers = new Map<number, { due: number; handler: () => void }>();
  #now = 0;
  #nextId = 1;

  setTimeout(handler: () => void, ms: number): unknown {
    const id = this.#nextId++;
    this.#timers.set(id, { due: this.#now + ms, handler });
    return id;
  }

  clearTimeout(id: unknown): void {
    this.#timers.delete(id as number);
  }
}

test("cover edits through the coordinator schedule autosave when a package is bound", async () => {
  const packageSave: PackageAutosaveSaveFn = async () => ({
    ok: true,
    value: {} as ProjectPackageSaveSummary,
  });
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "cover-autosave",
    autosaveDebounceMs: 10,
    autosaveClock: new FakeClock(),
    packageSave,
  });
  coordinator.getSession().addAsset(image("jpeg"));
  coordinator.bindPackageRoot("/books/cover.obproj");
  await coordinator.flushAutosave();
  assert.equal(coordinator.getAutosaveStatus().state, "idle");

  const set = executeCoverCommand(coordinator.getSession(), {
    type: "set-cover",
    assetId: "jpeg",
    altText: "Cover",
  });
  assert.deepEqual(set, { ok: true });
  assert.equal(coordinator.getAutosaveStatus().state, "scheduled");
  await coordinator.flushAutosave();
  assert.equal(coordinator.getAutosaveStatus().state, "idle");

  assert.deepEqual(executeCoverCommand(coordinator.getSession(), { type: "clear-cover" }), {
    ok: true,
  });
  assert.equal(coordinator.getAutosaveStatus().state, "scheduled");
  await coordinator.flushAutosave();
  await coordinator.close();
});

test("contract surface stays free of engines, TipTap, Tauri, and React", () => {
  const source = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "src",
      "workflow",
      "domain",
      "coverWizardContract.ts",
    ),
    "utf8",
  );
  assert.match(source, /executeCoverCommand/);
  assert.match(source, /setCover/);
  assert.doesNotMatch(
    source,
    /from ["']@tiptap|from ["']react["']|from ["']@tauri-apps|from ["']@openbook\/(epub|html|pdf)|from ["']node:fs|localStorage|plugin-fs/,
  );
});
