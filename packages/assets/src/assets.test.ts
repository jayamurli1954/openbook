// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import test from "node:test";
import { createBook, type Book } from "@openbook/book-model";
import {
  AssetAuditor,
  AssetIngestionPipeline,
  AssetRegistry,
  DEFAULT_ASSET_SIZE_LIMIT_BYTES,
  DirectoryAssetStore,
  MemoryAssetStore,
  StoreBackedAssetResolver,
  metadataFileName,
  sha256Hex,
  type AssetResolver,
} from "./index.js";

/** Minimal valid 1×1 PNG. */
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02,
  0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

const SAFE_SVG = new TextEncoder().encode(
  `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>`,
);

const UNSAFE_SVG_SCRIPT = new TextEncoder().encode(
  `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
);

/** Minimal WOFF signature header (not a complete font; enough for magic detection). */
const WOFF_HEADER = new TextEncoder().encode("wOFF");

function pipeline(store = new MemoryAssetStore(), registry = new AssetRegistry()) {
  return {
    store,
    registry,
    ingest: new AssetIngestionPipeline(store, registry),
    resolver: new StoreBackedAssetResolver(store, registry),
    auditor: new AssetAuditor(store, registry),
  };
}

test("INV-1: magic-byte validation ignores filename extension", async () => {
  const { ingest } = pipeline();
  const ok = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "definitely-not-a-png.txt",
    kind: "image",
    altText: "pixel",
    idSeed: "inv1",
  });
  assert.equal(ok.success, true);
  assert.equal(ok.assetRef?.mediaType, "image/png");

  const mismatch = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "font.woff",
    kind: "font",
    idSeed: "inv1-bad",
  });
  assert.equal(mismatch.success, false);
  assert.ok(mismatch.issues.some((i) => i.code === "KIND_MISMATCH"));

  const unknown = await ingest.ingest({
    content: new TextEncoder().encode("not-an-asset"),
    originalFilename: "photo.png",
    kind: "image",
  });
  assert.equal(unknown.success, false);
  assert.ok(unknown.issues.some((i) => i.code === "UNKNOWN_TYPE"));
});

test("INV-2: unsafe SVG is rejected, not rewritten", async () => {
  const { ingest, store } = pipeline();
  const result = await ingest.ingest({
    content: UNSAFE_SVG_SCRIPT,
    originalFilename: "evil.svg",
    kind: "image",
    idSeed: "inv2",
  });
  assert.equal(result.success, false);
  assert.ok(result.issues.some((i) => i.code === "SVG_SCRIPT" && i.severity === "error"));
  assert.equal((await store.listHashes()).length, 0);

  const safe = await ingest.ingest({
    content: SAFE_SVG,
    originalFilename: "ok.svg",
    kind: "image",
    altText: "red square",
    idSeed: "inv2-safe",
  });
  assert.equal(safe.success, true);
  assert.equal(safe.assetRef?.mediaType, "image/svg+xml");
});

test("INV-3: originalFilename never constructs filesystem path or storage key", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "openbook-assets-"));
  try {
    const store = new DirectoryAssetStore(root);
    const registry = new AssetRegistry();
    const ingest = new AssetIngestionPipeline(store, registry);
    const traversalName = "../../etc/passwd\0evil.png";
    const result = await ingest.ingest({
      content: PNG_1X1,
      originalFilename: traversalName,
      kind: "image",
      altText: "x",
      idSeed: "inv3",
    });
    assert.equal(result.success, true);
    assert.ok(result.sha256);
    assert.notEqual(result.sha256, traversalName);

    const entries = await readdir(root);
    assert.deepEqual(entries, [result.sha256]);
    assert.ok(!entries.some((e) => e.includes("..") || e.includes("passwd")));

    const onDisk = await readFile(path.join(root, result.sha256!));
    assert.equal(sha256Hex(new Uint8Array(onDisk)), result.sha256);

    // Metadata basename is sanitized for AssetRef.fileName only.
    assert.equal(result.assetRef?.fileName, metadataFileName(traversalName));
    assert.ok(!result.assetRef!.fileName.includes(".."));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("INV-4: identical binary content yields identical SHA-256 storage identity", async () => {
  const { ingest } = pipeline();
  const a = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "a.png",
    kind: "image",
    altText: "a",
    idSeed: "seed-a",
  });
  const b = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "b.png",
    kind: "image",
    altText: "b",
    idSeed: "seed-b",
  });
  assert.equal(a.success, true);
  assert.equal(b.success, true);
  assert.equal(a.sha256, b.sha256);
  assert.equal(a.sha256, createHash("sha256").update(PNG_1X1).digest("hex"));

  // Same seed + same content ⇒ same AssetRef.id (deterministic).
  const c = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "c.png",
    kind: "image",
    altText: "c",
    idSeed: "seed-a",
  });
  assert.equal(c.assetRef?.id, a.assetRef?.id);
});

test("INV-5: audit severities — errors vs warnings", async () => {
  const { store, registry, ingest, auditor } = pipeline();
  const ok = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "cover.png",
    kind: "image",
    altText: "",
    idSeed: "inv5",
  });
  assert.equal(ok.success, true);

  // Orphan: ingest extra asset not placed on Book.
  const orphan = await ingest.ingest({
    content: SAFE_SVG,
    originalFilename: "orphan.svg",
    kind: "image",
    altText: "o",
    idSeed: "inv5-orphan",
  });
  assert.equal(orphan.success, true);

  let book = createBook({ language: "en", title: "Audit" });
  book = {
    ...book,
    assets: [
      { ...ok.assetRef! },
      {
        id: "missing-binding",
        kind: "image",
        fileName: "gone.png",
        mediaType: "image/png",
        altText: "x",
        licence: "",
      },
    ],
    chapters: [
      {
        ...book.chapters[0]!,
        blocks: [
          {
            type: "image",
            id: "img-1",
            assetId: "does-not-exist",
            caption: [],
          },
        ],
      },
    ],
  };

  const report = await auditor.audit(book);
  const byCode = Object.fromEntries(
    report.issues.map((i) => [i.code, i.severity]),
  );

  assert.equal(byCode.DANGLING_REFERENCE, "error");
  assert.equal(byCode.MISSING_PAYLOAD, "error");
  assert.equal(byCode.MISSING_ALT_TEXT, "warning");
  assert.equal(byCode.ORPHANED_ASSET, "warning");

  // Corrupt payload: overwrite store blob under registered hash.
  const hash = ok.sha256!;
  await store.put(hash, new TextEncoder().encode("tampered"));
  const corruptBook: Book = {
    ...createBook({ language: "en", title: "Corrupt" }),
    assets: [{ ...ok.assetRef!, altText: "ok" }],
  };
  // Re-bind registry for this asset id
  registry.register(ok.assetRef!.id, hash);
  const corruptReport = await auditor.audit(corruptBook);
  assert.ok(
    corruptReport.issues.some(
      (i) => i.code === "CORRUPT_PAYLOAD" && i.severity === "error",
    ),
  );
});

test("INV-6: StoreBackedAssetResolver matches established AssetResolver contract", async () => {
  const { ingest, resolver } = pipeline();
  const result = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "x.png",
    kind: "image",
    altText: "pixel",
    idSeed: "inv6",
  });
  assert.equal(result.success, true);

  const asContract: AssetResolver = resolver;
  const bytes = await asContract.resolve(result.assetRef!);
  assert.deepEqual(bytes, PNG_1X1);
});

test("INV-7: ingestion never mutates the canonical Book", async () => {
  const book = createBook({ language: "en", title: "Immutable" });
  const before = structuredClone(book);
  const { ingest } = pipeline();
  const result = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "x.png",
    kind: "image",
    altText: "pixel",
    idSeed: "inv7",
  });
  assert.equal(result.success, true);
  assert.deepEqual(book, before);
  assert.equal(book.assets.length, 0);
});

test("configurable per-class size limits default to 50 MB", async () => {
  assert.equal(DEFAULT_ASSET_SIZE_LIMIT_BYTES, 50 * 1024 * 1024);
  const store = new MemoryAssetStore();
  const registry = new AssetRegistry();
  const ingest = new AssetIngestionPipeline(store, registry, {
    sizeLimits: { image: 16 },
  });
  const tooBig = await ingest.ingest({
    content: PNG_1X1,
    originalFilename: "x.png",
    kind: "image",
  });
  assert.equal(tooBig.success, false);
  assert.ok(tooBig.issues.some((i) => i.code === "SIZE_LIMIT_EXCEEDED"));
});

test("MemoryAssetStore and font kind magic path", async () => {
  const { ingest } = pipeline();
  const font = await ingest.ingest({
    content: WOFF_HEADER,
    originalFilename: "ignored.ttf",
    kind: "font",
    idSeed: "font",
  });
  assert.equal(font.success, true);
  assert.equal(font.assetRef?.kind, "font");
  assert.equal(font.assetRef?.mediaType, "font/woff");
});

test("package has no workflow/importer/publishing/sqlite deps", async () => {
  const pkg = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  ) as { dependencies?: Record<string, string> };
  const deps = Object.keys(pkg.dependencies ?? {});
  assert.deepEqual(deps, ["@openbook/book-model"]);
});
