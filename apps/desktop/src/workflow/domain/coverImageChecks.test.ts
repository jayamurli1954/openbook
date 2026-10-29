// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 2 — cover image checks and the checked cover command.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import type { AssetResolver } from "@openbook/assets";
import { createBook, serializeBook, type AssetRef } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import {
  COVER_MAX_RATIO,
  COVER_MIN_LONGEST_SIDE_PX,
  COVER_MIN_RATIO,
  checkCoverImage,
  hasCoverImageErrors,
} from "./coverImageChecks.js";
import { executeCheckedCoverCommand, inspectCover, readCover } from "./coverWizardContract.js";
import { findInternalTerms } from "./studioShellGuide.js";

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  bytes[24] = 8;
  bytes[25] = 2;
  return bytes;
}

function jpeg(width: number, height: number): Uint8Array {
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 1, 1, 0x11, 0,
    0xff, 0xd9,
  ]);
}

function image(id: string, mediaType = "image/png"): AssetRef {
  return { id, kind: "image", fileName: `${id}.png`, mediaType, altText: "", licence: "" };
}

const codes = (bytes: Uint8Array) =>
  checkCoverImage(image("cover"), bytes).issues.map((issue) => `${issue.code}:${issue.severity}`);

test("a large portrait cover has no issues and reports its size", () => {
  const report = checkCoverImage(image("cover"), png(1600, 2560));
  assert.deepEqual(report, { assetId: "cover", width: 1600, height: 2560, issues: [] });
  assert.equal(hasCoverImageErrors(report), false);
});

test("thresholds match ADR-0038 §2.3 and their edges do not warn", () => {
  assert.equal(COVER_MIN_LONGEST_SIDE_PX, 1600);
  assert.equal(COVER_MIN_RATIO, 1.3);
  assert.equal(COVER_MAX_RATIO, 1.8);
  assert.deepEqual(codes(png(1000, 1600)), []);
  assert.deepEqual(codes(png(1000, 1300)), ["COVER_LOW_RESOLUTION:warning"]);
  assert.deepEqual(codes(png(1000, 1800)), []);
  assert.deepEqual(codes(png(1000, 1599)), ["COVER_LOW_RESOLUTION:warning"]);
  assert.deepEqual(codes(png(1000, 1801)), ["COVER_UNUSUAL_SHAPE:warning"]);
  assert.deepEqual(codes(png(1250, 1624)), ["COVER_UNUSUAL_SHAPE:warning"]);
});

test("the KDP-style 841 × 1261 cover is low resolution but the right shape", () => {
  const report = checkCoverImage(image("cover", "image/jpeg"), jpeg(841, 1261));
  assert.deepEqual(
    report.issues.map((issue) => issue.code),
    ["COVER_LOW_RESOLUTION"],
  );
  assert.match(report.issues[0]!.message, /841 × 1261 pixels/);
});

test("a square picture gets the shape warning", () => {
  assert.deepEqual(codes(png(1024, 1024)), [
    "COVER_LOW_RESOLUTION:warning",
    "COVER_UNUSUAL_SHAPE:warning",
  ]);
  assert.deepEqual(codes(png(2048, 2048)), ["COVER_UNUSUAL_SHAPE:warning"]);
});

test("bytes decide the format, whatever the asset declares", () => {
  const declaredJpeg = checkCoverImage(image("cover", "image/jpeg"), png(1600, 2560));
  assert.deepEqual(declaredJpeg.issues, []);
  assert.deepEqual(codes(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0])), [
    "COVER_NOT_JPEG_OR_PNG:error",
  ]);
  assert.deepEqual(codes(new TextEncoder().encode("<svg></svg>")), ["COVER_NOT_JPEG_OR_PNG:error"]);
});

test("unreadable and oversized pictures are errors", () => {
  // A cut-off PNG still has the PNG signature, so its size is what fails.
  assert.deepEqual(codes(png(1600, 2560).subarray(0, 20)), ["COVER_SIZE_UNREADABLE:error"]);
  assert.deepEqual(codes(Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])), ["COVER_SIZE_UNREADABLE:error"]);
  assert.deepEqual(codes(png(0, 2560)), ["COVER_SIZE_UNREADABLE:error"]);
  const tooLarge = checkCoverImage(image("cover"), png(1600, 2560), 10);
  assert.deepEqual(
    tooLarge.issues.map((issue) => issue.code),
    ["COVER_FILE_TOO_LARGE"],
  );
  assert.equal(hasCoverImageErrors(tooLarge), true);
});

test("checks never change the bytes", () => {
  const bytes = jpeg(841, 1261);
  const before = Uint8Array.from(bytes);
  checkCoverImage(image("cover", "image/jpeg"), bytes);
  assert.deepEqual(bytes, before);
});

test("check messages use plain language", () => {
  const samples = [
    png(1024, 1024),
    Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]),
    Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
  ];
  const messages = samples.flatMap((bytes) =>
    checkCoverImage(image("cover"), bytes).issues.map((issue) => issue.message),
  );
  messages.push(...checkCoverImage(image("cover"), png(1600, 2560), 10).issues.map((i) => i.message));
  assert.equal(messages.length, 5);
  for (const message of messages) {
    assert.deepEqual(findInternalTerms(message), [], message);
    assert.doesNotMatch(message, /IHDR|SOF|EXIF|magic|asset|bytes/i, message);
  }
});

function mapResolver(bytesById: Record<string, Uint8Array>): AssetResolver {
  return {
    async resolve(asset) {
      const bytes = bytesById[asset.id];
      if (!bytes) throw new Error(`no bytes for ${asset.id}`);
      return bytes;
    },
  };
}

function session(): BookSession {
  const studio = new BookSession({
    book: createBook({ title: "Cover checks", language: "en" }),
    idSeed: "cover-slice-2",
  });
  for (const id of ["sharp", "small", "square", "broken", "gif", "missing"]) studio.addAsset(image(id));
  return studio;
}

const resolver = mapResolver({
  sharp: png(1600, 2560),
  small: png(841, 1261),
  square: png(1024, 1024),
  broken: Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
  gif: Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0]),
});

test("checked set-cover sets covers that only have warnings and returns the report", async () => {
  for (const assetId of ["sharp", "small", "square"]) {
    const studio = session();
    const result = await executeCheckedCoverCommand(studio, resolver, {
      type: "set-cover",
      assetId,
      altText: "Cover",
    });
    assert.equal(result.ok, true, assetId);
    assert.equal(result.report?.assetId, assetId);
    assert.equal(readCover(studio.getBook())?.assetId, assetId);
  }
});

test("checked set-cover refuses image errors and leaves the Book unchanged", async () => {
  const cases = [
    ["broken", "COVER_SIZE_UNREADABLE"],
    ["gif", "COVER_NOT_JPEG_OR_PNG"],
    ["missing", "COVER_SIZE_UNREADABLE"],
  ] as const;
  for (const [assetId, code] of cases) {
    const studio = session();
    const before = serializeBook(studio.getBook());
    const result = await executeCheckedCoverCommand(studio, resolver, {
      type: "set-cover",
      assetId,
      altText: "Cover",
    });
    assert.equal(result.ok, false, assetId);
    if (!result.ok) assert.equal(result.code, code);
    assert.equal(serializeBook(studio.getBook()), before);
  }
});

test("checked commands keep the Slice 1 checks and pass clear-cover through", async () => {
  const studio = session();
  const unknown = await executeCheckedCoverCommand(studio, resolver, {
    type: "set-cover",
    assetId: "nope",
    altText: "Cover",
  });
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.code, "UNKNOWN_ASSET");
  const blank = await executeCheckedCoverCommand(studio, resolver, {
    type: "set-cover",
    assetId: "sharp",
    altText: " ",
  });
  assert.equal(blank.ok, false);
  if (!blank.ok) assert.equal(blank.code, "EMPTY_ALT_TEXT");

  const none = await executeCheckedCoverCommand(studio, resolver, { type: "clear-cover" });
  assert.equal(none.ok, false);
  if (!none.ok) assert.equal(none.code, "NO_COVER");
});

test("inspectCover reads stored bytes through the coordinator's resolver", async () => {
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "cover-inspect",
  });
  while (coordinator.getState().stage !== "ASSETS") {
    assert.ok(coordinator.advanceStage(), "advance to the ASSETS stage");
  }
  const ingested = await coordinator.ingestAsset({
    content: jpeg(841, 1261),
    originalFilename: "cover.jpg",
    kind: "image",
    idSeed: "cover-inspect",
  });
  assert.equal(ingested.success, true);
  const asset = ingested.assetRef!;
  assert.equal(coordinator.getBook().assets.some((candidate) => candidate.id === asset.id), true);
  const report = await inspectCover(asset, coordinator.getAssetResolver());
  assert.equal(report.width, 841);
  assert.equal(report.height, 1261);

  const result = await executeCheckedCoverCommand(
    coordinator.getSession(),
    coordinator.getAssetResolver(),
    { type: "set-cover", assetId: asset.id, altText: "Little Krishna on a hill" },
  );
  assert.equal(result.ok, true);
  assert.equal(readCover(coordinator.getBook())?.assetId, asset.id);
  await coordinator.close();
});

test("check modules stay free of chrome, engines, and file system imports", () => {
  const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src", "workflow", "domain");
  for (const file of ["coverImageChecks.ts", "coverWizardContract.ts"]) {
    const source = readFileSync(join(dir, file), "utf8");
    assert.doesNotMatch(
      source,
      /from ["']@tiptap|from ["']react["']|from ["']@tauri-apps|from ["']@openbook\/(epub|html|pdf)|from ["']node:fs|localStorage|plugin-fs/,
      file,
    );
  }
});
