// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 8 Slice 3: DesktopStudioCoordinator asset/media boundary tests (ADR-0021).
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  MemoryAssetStore,
  sha256Hex,
  type IAssetStore,
} from "@openbook/assets";
import type { WorkflowStage } from "@openbook/workflow";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
} from "./desktopStudioCoordinator.js";
import { createDesktopDraftBook } from "./editorSessionAdapter.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

/** Minimal valid 1×1 PNG. */
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02,
  0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const UNSAFE_SVG_SCRIPT = new TextEncoder().encode(
  `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
);

class RecordingAssetStore implements IAssetStore {
  readonly inner = new MemoryAssetStore();
  puts = 0;

  async put(sha256: string, content: Uint8Array): Promise<void> {
    this.puts += 1;
    return this.inner.put(sha256, content);
  }
  async get(sha256: string): Promise<Uint8Array | undefined> {
    return this.inner.get(sha256);
  }
  async has(sha256: string): Promise<boolean> {
    return this.inner.has(sha256);
  }
  async delete(sha256: string): Promise<boolean> {
    return this.inner.delete(sha256);
  }
  async listHashes(): Promise<string[]> {
    return this.inner.listHashes();
  }
}

function freshCoordinator(
  idSeed = "asset-studio",
  extras?: { assetStore?: IAssetStore; book?: ReturnType<typeof createDesktopDraftBook> },
) {
  const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
  return new DesktopStudioCoordinator({
    persistence,
    idSeed,
    assetStore: extras?.assetStore,
    book: extras?.book,
  });
}

function advanceTo(coordinator: DesktopStudioCoordinator, target: WorkflowStage): void {
  while (coordinator.getState().stage !== target) {
    const next = coordinator.advanceStage();
    if (!next) {
      throw new Error(`Cannot advance to ${target} from ${coordinator.getState().stage}`);
    }
  }
}

function pngIngest(filename: string, altText?: string) {
  return {
    content: PNG_1X1,
    originalFilename: filename,
    kind: "image" as const,
    altText,
  };
}

test("default MemoryAssetStore vs injected IAssetStore", async () => {
  const defaultCoordinator = freshCoordinator("default-store");
  advanceTo(defaultCoordinator, "ASSETS");
  const ingested = await defaultCoordinator.ingestAsset(pngIngest("a.png", "pixel"));
  assert.equal(ingested.success, true);
  const resolved = await defaultCoordinator.getAssetResolver().resolve(ingested.assetRef!);
  assert.deepEqual([...resolved], [...PNG_1X1]);

  const injected = new RecordingAssetStore();
  const injectedCoordinator = freshCoordinator("injected-store", { assetStore: injected });
  advanceTo(injectedCoordinator, "ASSETS");
  await injectedCoordinator.ingestAsset(pngIngest("b.png"));
  assert.equal(injected.puts, 1);
  assert.deepEqual(await injected.listHashes(), [sha256Hex(PNG_1X1)]);
});

test("identical bytes share a SHA-256 store key regardless of filename", async () => {
  const store = new MemoryAssetStore();
  const coordinator = freshCoordinator("sha-store", { assetStore: store });
  advanceTo(coordinator, "ASSETS");
  const first = await coordinator.ingestAsset({ ...pngIngest("one.png"), idSeed: "sha-a" });
  const second = await coordinator.ingestAsset({ ...pngIngest("two.jpeg"), idSeed: "sha-b" });
  assert.equal(first.sha256, second.sha256);
  assert.equal(first.sha256, sha256Hex(PNG_1X1));
  assert.deepEqual(await store.listHashes(), [sha256Hex(PNG_1X1)]);
  assert.equal(first.assetRef?.fileName, "one.png");
  assert.equal(second.assetRef?.fileName, "two.jpeg");
  assert.equal(coordinator.getBook().assets.length, 2);
});

test("unsafe SVG is rejected and leaves the Book unchanged", async () => {
  const store = new MemoryAssetStore();
  const coordinator = freshCoordinator("svg-reject", { assetStore: store });
  advanceTo(coordinator, "ASSETS");
  const before = JSON.stringify(coordinator.getBook());
  const revision = coordinator.getState().revision;
  await assert.rejects(
    () =>
      coordinator.ingestAsset({
        content: UNSAFE_SVG_SCRIPT,
        originalFilename: "evil.svg",
        kind: "image",
      }),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "ASSET_INGEST_FAILED",
  );
  assert.equal(JSON.stringify(coordinator.getBook()), before);
  assert.equal(coordinator.getState().revision, revision);
  assert.equal(coordinator.getBook().assets.length, 0);
  assert.deepEqual(await store.listHashes(), []);
  assert.equal(coordinator.getState().jobStatus, "failed");
});

test("ingestAsset and insertImageBlock do not write SQLite until saveProject", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "persist-assets",
  });
  await coordinator.saveProject("Asset Draft");
  const projectId = coordinator.getState().binding!.projectId;
  const originalPayload = (
    await driver.select<{ book_payload: string }>(
      "SELECT book_payload FROM project_documents WHERE project_id = ?",
      [projectId],
    )
  )[0]!.book_payload;

  advanceTo(coordinator, "ASSETS");
  const chapterId = coordinator.getBook().chapters[0]!.id;
  await coordinator.insertImageBlock({
    sectionId: chapterId,
    atIndex: 0,
    ingest: pngIngest("cover.png", "pixel"),
  });
  assert.equal(coordinator.getState().isDirty, true);
  const midPayload = (
    await driver.select<{ book_payload: string }>(
      "SELECT book_payload FROM project_documents WHERE project_id = ?",
      [projectId],
    )
  )[0]!.book_payload;
  assert.equal(midPayload, originalPayload);
  assert.ok(!midPayload.includes("cover.png"));

  const saved = await coordinator.saveProject();
  assert.equal(saved.projectId, projectId);
  const savedPayload = (
    await driver.select<{ book_payload: string }>(
      "SELECT book_payload FROM project_documents WHERE project_id = ?",
      [projectId],
    )
  )[0]!.book_payload;
  const parsed = JSON.parse(savedPayload) as {
    assets: Array<Record<string, unknown>>;
    chapters: Array<{ blocks: Array<{ type: string; assetId?: string }> }>;
  };
  assert.equal(parsed.assets.length, 1);
  assert.equal(parsed.assets[0]?.fileName, "cover.png");
  assert.equal(parsed.assets[0]?.kind, "image");
  assert.equal(parsed.assets[0]?.content, undefined);
  assert.equal(parsed.assets[0]?.bytes, undefined);
  assert.equal(parsed.assets[0]?.sha256, undefined);
  assert.ok(!savedPayload.includes("\u0089PNG"));
  assert.ok(!savedPayload.includes("IHDR"));
  assert.equal(
    parsed.chapters[0]?.blocks.some((b) => b.type === "image"),
    true,
  );
});

test("ingestAsset is ASSETS-only; existing-ref image insert is AUTHORING and ASSETS", async () => {
  const seeded = createDesktopDraftBook({ title: "Seeded Assets" });
  seeded.assets.push({
    id: "existing-photo",
    kind: "image",
    fileName: "photo.png",
    mediaType: "image/png",
    altText: "photo",
    licence: "",
  });
  const coordinator = freshCoordinator("stage-perms", { book: seeded });
  assert.equal(coordinator.getState().stage, "IMPORT");
  await assert.rejects(
    () => coordinator.ingestAsset(pngIngest("nope.png")),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "ASSET_NOT_PERMITTED",
  );
  assert.throws(
    () => coordinator.insertExistingImageBlock(seeded.chapters[0]!.id, 0, "existing-photo"),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "ASSET_NOT_PERMITTED",
  );

  advanceTo(coordinator, "AUTHORING");
  await assert.rejects(
    () => coordinator.ingestAsset(pngIngest("still-nope.png")),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "ASSET_NOT_PERMITTED",
  );
  const authored = coordinator.insertExistingImageBlock(
    coordinator.getBook().chapters[0]!.id,
    0,
    "existing-photo",
  );
  assert.equal(authored.type, "image");
  if (authored.type === "image") {
    assert.equal(authored.assetId, "existing-photo");
  }
  coordinator.removeImageBlock(coordinator.getBook().chapters[0]!.id, authored.id);
  assert.equal(
    coordinator.getBook().chapters[0]!.blocks.some((b) => b.id === authored.id),
    false,
  );

  advanceTo(coordinator, "ASSETS");
  const ingested = await coordinator.ingestAsset(pngIngest("later.png"));
  assert.equal(ingested.success, true);
  const fromExisting = coordinator.insertExistingImageBlock(
    coordinator.getBook().chapters[0]!.id,
    1,
    ingested.assetRef!.id,
  );
  assert.equal(fromExisting.type, "image");
});

test("failed insertImageBlock restores the pre-image Book with no orphaned image block", async () => {
  const coordinator = freshCoordinator("atomic-image");
  advanceTo(coordinator, "ASSETS");
  const before = JSON.stringify(coordinator.getBook());
  await assert.rejects(
    () =>
      coordinator.insertImageBlock({
        sectionId: "missing-section",
        atIndex: 0,
        ingest: pngIngest("orphan.png", "nope"),
      }),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "SECTION_NOT_FOUND",
  );
  assert.equal(JSON.stringify(coordinator.getBook()), before);
  assert.equal(coordinator.getBook().assets.length, 0);
  assert.equal(
    coordinator.getBook().chapters.flatMap((c) => c.blocks).some((b) => b.type === "image"),
    false,
  );
  assert.equal(coordinator.getState().jobStatus, "failed");
});

test("Kannada altText survives ingest, image block, and saveProject metadata", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "kn-assets",
  });
  advanceTo(coordinator, "ASSETS");
  const chapterId = coordinator.getBook().chapters[0]!.id;
  const { assetRef, block } = await coordinator.insertImageBlock({
    sectionId: chapterId,
    atIndex: 0,
    ingest: pngIngest("nadi.png", "ನದಿಯ ಚಿತ್ರ"),
  });
  assert.equal(assetRef.altText, "ನದಿಯ ಚಿತ್ರ");
  assert.equal(assetRef.fileName, "nadi.png");
  assert.equal(block.type, "image");
  if (block.type === "image") {
    assert.equal(
      block.caption[0]?.type === "text" ? block.caption[0].text : "",
      "ನದಿಯ ಚಿತ್ರ",
    );
  }
  const state = coordinator.getState();
  assert.equal(Object.prototype.hasOwnProperty.call(state, "assets"), false);
  assert.equal("book" in state, false);
  assert.equal((state as { book?: unknown }).book, undefined);

  const saved = await coordinator.saveProject("ಕನ್ನಡ ಆಸ್ತಿ");
  const row = await driver.select<{ book_payload: string }>(
    "SELECT book_payload FROM project_documents WHERE project_id = ?",
    [saved.projectId],
  );
  assert.ok(row[0]!.book_payload.includes("ನದಿಯ ಚಿತ್ರ"));
  assert.ok(!row[0]!.book_payload.includes("\u0089PNG"));
});
