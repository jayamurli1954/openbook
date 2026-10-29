// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 3 — Cover Wizard fields port against the real coordinator.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { serializeBook, type ContentBlock } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import type { AutosaveClock } from "../../persistence/autosaveController.js";
import type { PackageAutosaveSaveFn } from "../../persistence/packageAutosavePort.js";
import type { ProjectPackageSaveSummary } from "../../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { readCover } from "./coverWizardContract.js";
import {
  createCoverWizardFields,
  isAssetUsedInText,
  type CoverCandidate,
  type CoverPickedImage,
  type CoverWizardFields,
} from "./coverWizardFields.js";
import { findInternalTerms } from "./studioShellGuide.js";

function png(width: number, height: number, tag = 0): Uint8Array {
  const bytes = new Uint8Array(34);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 2;
  bytes[33] = tag; // makes otherwise-equal pictures different files
  return bytes;
}

class FakeClock implements AutosaveClock {
  setTimeout(): unknown {
    return 1;
  }
  clearTimeout(): void {}
}

interface Harness {
  coordinator: DesktopStudioCoordinator;
  fields: CoverWizardFields;
  queue: CoverPickedImage[];
  messages: string[];
}

function harness(options: { packageSave?: PackageAutosaveSaveFn } = {}): Harness {
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "cover-slice-3",
    ...(options.packageSave
      ? { packageSave: options.packageSave, autosaveClock: new FakeClock(), autosaveDebounceMs: 10 }
      : {}),
  });
  const queue: CoverPickedImage[] = [];
  const messages: string[] = [];
  const fields = createCoverWizardFields({
    pick: {
      async pickImage() {
        return queue.shift() ?? { kind: "cancelled" };
      },
    },
    coordinator: {
      getBook: () => coordinator.getBook(),
      getStage: () => coordinator.getState().stage,
      advanceStage: () => coordinator.advanceStage(),
      ingestAsset: (input) => coordinator.ingestAsset(input),
      getAssetResolver: () => coordinator.getAssetResolver(),
      getSession: () => coordinator.getSession(),
    },
  });
  return { coordinator, fields, queue, messages };
}

async function choose(h: Harness, content: Uint8Array, name = "cover.png"): Promise<CoverCandidate> {
  h.queue.push({ kind: "bytes", content, originalFilename: name });
  const chosen = await h.fields.choose();
  assert.equal(chosen.kind, "chosen");
  if (chosen.kind !== "chosen") throw new Error("not chosen");
  return chosen.candidate;
}

test("cancelling or choosing an unusable file leaves the Book unchanged", async () => {
  const h = harness();
  const before = serializeBook(h.coordinator.getBook());

  assert.deepEqual(await h.fields.choose(), { kind: "cancelled" });
  for (const content of [
    Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]),
    Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
    Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
  ]) {
    h.queue.push({ kind: "bytes", content, originalFilename: "picture" });
    const chosen = await h.fields.choose();
    assert.equal(chosen.kind, "rejected");
    if (chosen.kind === "rejected") h.messages.push(chosen.message);
  }
  assert.equal(serializeBook(h.coordinator.getBook()), before);
  assert.equal(h.coordinator.getBook().assets.length, 0);
  await h.coordinator.close();
});

test("a picture with warnings is set after it is described, with its report", async () => {
  const h = harness();
  const candidate = await choose(h, png(841, 1261));
  assert.deepEqual(
    candidate.report.issues.map((issue) => issue.code),
    ["COVER_LOW_RESOLUTION"],
  );
  assert.equal(h.coordinator.getBook().assets.length, 0, "nothing added until Use as cover");

  const blank = await h.fields.apply(candidate, "  ");
  assert.equal(blank.ok, false);
  assert.equal(h.coordinator.getBook().assets.length, 0);

  const applied = await h.fields.apply(candidate, "ಬೆಟ್ಟದ ಮೇಲೆ ಕೃಷ್ಣ");
  assert.deepEqual(applied, { ok: true, message: "Added the cover." });
  const view = await h.fields.read();
  assert.equal(view.cover?.altText, "ಬೆಟ್ಟದ ಮೇಲೆ ಕೃಷ್ಣ");
  assert.deepEqual(view.bytes, png(841, 1261));
  assert.equal(view.report?.width, 841);
  await h.coordinator.close();
});

test("replacing removes the old picture when no chapter uses it", async () => {
  const h = harness();
  await h.fields.apply(await choose(h, png(1600, 2560, 1)), "First cover");
  const first = h.coordinator.getBook().publishing.coverAssetId!;

  const replaced = await h.fields.apply(await choose(h, png(1600, 2560, 2)), "Second cover");
  assert.deepEqual(replaced, { ok: true, message: "Replaced the cover." });
  const book = h.coordinator.getBook();
  assert.notEqual(book.publishing.coverAssetId, first);
  assert.deepEqual(
    book.assets.map((asset) => asset.id),
    [book.publishing.coverAssetId],
  );

  // Undo the tidy-up: the old picture comes back, and the new cover stays.
  assert.equal(h.coordinator.getSession().undo(), true);
  assert.equal(h.coordinator.getBook().assets.some((asset) => asset.id === first), true);
  assert.notEqual(readCover(h.coordinator.getBook())?.assetId, first);
  await h.coordinator.close();
});

test("replacing or removing keeps a picture a chapter still uses", async () => {
  const h = harness();
  await h.fields.apply(await choose(h, png(1600, 2560, 3)), "Cover");
  const assetId = h.coordinator.getBook().publishing.coverAssetId!;
  const chapterId = h.coordinator.getBook().chapters[0]!.id;
  h.coordinator.insertExistingImageBlock(chapterId, 0, assetId);
  assert.equal(isAssetUsedInText(h.coordinator.getBook(), assetId), true);

  assert.deepEqual(await h.fields.remove(), { ok: true, message: "Removed the cover." });
  const book = h.coordinator.getBook();
  assert.equal(readCover(book), null);
  assert.equal(book.assets.some((asset) => asset.id === assetId), true);
  await h.coordinator.close();
});

test("removing an unused cover removes its picture; undo restores both steps", async () => {
  const h = harness();
  await h.fields.apply(await choose(h, png(1600, 2560, 4)), "Cover");
  const withCover = serializeBook(h.coordinator.getBook());

  await h.fields.remove();
  assert.equal(readCover(h.coordinator.getBook()), null);
  assert.equal(h.coordinator.getBook().assets.length, 0);

  assert.equal(h.coordinator.getSession().undo(), true); // the picture
  assert.equal(h.coordinator.getSession().undo(), true); // the cover
  assert.equal(serializeBook(h.coordinator.getBook()), withCover);

  const none = await harness().fields.remove();
  assert.equal(none.ok, false);
  await h.coordinator.close();
});

test("choosing the current picture again only updates its description", async () => {
  const h = harness();
  await h.fields.apply(await choose(h, png(1600, 2560, 5)), "Cover");
  const assetId = h.coordinator.getBook().publishing.coverAssetId;

  const again = await h.fields.apply(await choose(h, png(1600, 2560, 5)), "Cover, again");
  assert.equal(again.ok, true);
  const book = h.coordinator.getBook();
  assert.equal(book.publishing.coverAssetId, assetId);
  assert.equal(book.assets.length, 1);
  assert.equal(readCover(book)?.altText, "Cover, again");

  assert.deepEqual(await h.fields.updateDescription("A boy on a hill"), {
    ok: true,
    message: "Updated the cover description.",
  });
  assert.equal(readCover(h.coordinator.getBook())?.altText, "A boy on a hill");
  const blank = await h.fields.updateDescription(" ");
  assert.equal(blank.ok, false);
  assert.equal(readCover(h.coordinator.getBook())?.altText, "A boy on a hill");
  await h.coordinator.close();
});

test("cover edits schedule autosave when a package folder is bound", async () => {
  const packageSave: PackageAutosaveSaveFn = async () => ({
    ok: true,
    value: {} as ProjectPackageSaveSummary,
  });
  const h = harness({ packageSave });
  h.coordinator.bindPackageRoot("/books/cover.obproj");
  await h.coordinator.flushAutosave();
  assert.equal(h.coordinator.getAutosaveStatus().state, "idle");

  await h.fields.apply(await choose(h, png(1600, 2560, 6)), "Cover");
  assert.equal(h.coordinator.getAutosaveStatus().state, "scheduled");
  await h.coordinator.flushAutosave();

  await h.fields.remove();
  assert.equal(h.coordinator.getAutosaveStatus().state, "scheduled");
  await h.coordinator.flushAutosave();
  await h.coordinator.close();
});

test("fields messages use plain language", async () => {
  const h = harness();
  const candidate = await choose(h, png(1024, 1024, 7));
  const results = [
    await h.fields.apply(candidate, " "),
    await h.fields.apply(candidate, "Cover"),
    await h.fields.updateDescription("New words"),
    await h.fields.remove(),
    await h.fields.remove(),
    await h.fields.updateDescription("No cover"),
  ];
  for (const message of [...results.map((r) => r.message), ...candidate.report.issues.map((i) => i.message)]) {
    assert.ok(message.length > 0);
    assert.deepEqual(findInternalTerms(message), [], message);
    assert.doesNotMatch(message, /asset|COVER_|bytes/i, message);
  }
  await h.coordinator.close();
});

test("isAssetUsedInText looks at every section kind", () => {
  const image = (assetId: string): ContentBlock => ({ type: "image", id: "img", assetId, caption: [] });
  const section = (blocks: ContentBlock[]) => ({ id: "s", kind: "front" as const, role: "preface", title: "", blocks });
  const base = harness().coordinator.getBook();
  assert.equal(isAssetUsedInText({ ...base, frontMatter: [section([image("a")])] }, "a"), true);
  assert.equal(isAssetUsedInText({ ...base, backMatter: [section([image("b")])] }, "b"), true);
  assert.equal(isAssetUsedInText(base, "a"), false);
});
