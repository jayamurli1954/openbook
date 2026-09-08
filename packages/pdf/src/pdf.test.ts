// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBook,
  parseBook,
  validateBook,
  type AssetRef,
  type StructuralSection,
} from "@openbook/book-model";
import {
  buildPdf,
  escapeTypstText,
  resolveCreationTimestamp,
  resolveHostPlatformKey,
  resolveProductionTypstRuntime,
  readBuildEvidence,
  serializeBookToTypst,
  TypstRuntimeError,
  AssetValidationError,
  AssetResolutionError,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");
const bakeoffDir = path.join(rootDir, "tests", "fixtures", "pdf-bakeoff");
const inventoryPath = path.join(rootDir, "packages", "pdf", "packaging", "inventory.json");

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function loadFixture(name: string) {
  const raw = fs.readFileSync(path.join(bakeoffDir, name), "utf8");
  const book = parseBook(raw);
  const errors = validateBook(book).filter((issue) => issue.severity === "error");
  assert.equal(errors.length, 0, `Fixture ${name} must validate: ${JSON.stringify(errors)}`);
  return book;
}

const TINY_PNG = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

test("inventory pins Typst 0.15.1 with platform SHA-256 digests", () => {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  assert.equal(inventory.typst.version, "0.15.1");
  assert.equal(inventory.typst.gitCommit, "9dfd3a08");
  assert.equal(
    inventory.typst.platforms["windows-x64"].sha256,
    "19ce3551153c2fe7ee9fa2f95208310c8f4d3209fedb699e0333faf8913f6736",
  );
  assert.equal(
    inventory.typst.platforms["linux-x64"].sha256,
    "a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c",
  );
  assert.ok(inventory.typst.platforms["linux-aarch64"]?.sha256);
  assert.ok(inventory.typst.platforms["mac-x64"]?.sha256);
  assert.ok(inventory.typst.platforms["mac-aarch64"]?.sha256);
  assert.ok(inventory.fonts.files["NotoSerifKannada[wght].ttf"]?.sha256);
  assert.ok(inventory.fonts.files["NotoSansKannada[wdth,wght].ttf"]?.sha256);
});

test("resolveHostPlatformKey maps Node platforms to inventory keys", () => {
  assert.equal(resolveHostPlatformKey("win32", "x64"), "windows-x64");
  assert.equal(resolveHostPlatformKey("linux", "x64"), "linux-x64");
  assert.equal(resolveHostPlatformKey("linux", "arm64"), "linux-aarch64");
  assert.equal(resolveHostPlatformKey("darwin", "arm64"), "mac-aarch64");
});

test("escapeTypstText preserves Kannada and escapes markup metacharacters", () => {
  assert.equal(escapeTypstText("ಕನ್ನಡ"), "ಕನ್ನಡ");
  assert.equal(escapeTypstText("a#b*c"), "a\\#b\\*c");
});

test("serializeBookToTypst emits deterministic Typst for bake-off fixtures", () => {
  const book = loadFixture("kannada-prose.json");
  const a = serializeBookToTypst(book);
  const b = serializeBookToTypst(book);
  assert.equal(a, b);
  assert.match(a, /Noto Serif Kannada/);
  assert.match(a, /ನದಿಯ ಬೆಳಗು/);
  assert.match(a, /#emph\[/);
  assert.match(a, /#strong\[/);
});

test("resolveCreationTimestamp uses publishedAt date-only as UTC midnight", () => {
  const book = createBook({ title: "Timestamp", withOpeningChapter: false });
  book.metadata.publishedAt = "2026-09-04";
  assert.equal(resolveCreationTimestamp(book), Date.parse("2026-09-04T00:00:00.000Z") / 1000);
  assert.equal(resolveCreationTimestamp(book, 42), 42);
});

test("missing Typst runtime fails deterministically", async () => {
  const book = createBook({ title: "No Runtime", withOpeningChapter: false });
  book.metadata.publishedAt = "2026-01-01";
  await assert.rejects(
    () =>
      buildPdf(book, {
        typstExecutablePath: path.join(rootDir, ".cache", "pdf-runtime", "missing-typst"),
        fontPath: path.join(rootDir, ".cache", "pdf-runtime", "missing-fonts"),
      }),
    (err: unknown) => {
      assert.ok(err instanceof TypstRuntimeError);
      assert.equal(err.code, "TYPST_COMPILE_FAILED");
      return true;
    },
  );
});

test("unsafe asset id is rejected", async () => {
  const book = createBook({ title: "Bad Asset", withOpeningChapter: false });
  book.metadata.publishedAt = "2026-01-01";
  book.assets = [
    {
      id: "../escape",
      kind: "image",
      fileName: "x.png",
      mediaType: "image/png",
      altText: "x",
      licence: "test",
    },
  ];
  book.chapters = [
    {
      id: "c1",
      kind: "main",
      role: "chapter",
      title: "C",
      blocks: [{ type: "image", id: "i1", assetId: "../escape", caption: [] }],
    } satisfies StructuralSection,
  ];

  await assert.rejects(
    () =>
      buildPdf(book, {
        assetResolver: { resolve: async () => TINY_PNG },
        typstExecutablePath: "typst",
        fontPath: ".",
      }),
    (err: unknown) => err instanceof AssetValidationError && err.code === "UNSAFE_ASSET_ID",
  );
});

test("image without AssetResolver fails deterministically", async () => {
  const asset: AssetRef = {
    id: "cover",
    kind: "image",
    fileName: "cover.png",
    mediaType: "image/png",
    altText: "Cover",
    licence: "test",
  };
  const book = createBook({ title: "Needs Resolver", withOpeningChapter: false });
  book.metadata.publishedAt = "2026-01-01";
  book.assets = [asset];
  book.chapters = [
    {
      id: "c1",
      kind: "main",
      role: "chapter",
      title: "C",
      blocks: [{ type: "image", id: "i1", assetId: "cover", caption: [] }],
    },
  ];

  await assert.rejects(
    () => buildPdf(book, { typstExecutablePath: "typst", fontPath: "." }),
    (err: unknown) => err instanceof AssetResolutionError && err.code === "MISSING_RESOLVER",
  );
});

test("production packaging evidence records Typst 0.15.1 when runtime is built", () => {
  const runtime = resolveProductionTypstRuntime({ repoRoot: rootDir });
  if (!runtime?.evidencePath) {
    // packaging:build not run yet in this environment
    assert.equal(runtime, null);
    return;
  }
  const evidence = readBuildEvidence(runtime.evidencePath) as {
    typst: { version: string; artifactSha256: string };
  };
  assert.equal(evidence.typst.version, "0.15.1");
  assert.ok(evidence.typst.artifactSha256);
});

async function requireRuntime() {
  const runtime = resolveProductionTypstRuntime({ repoRoot: rootDir });
  assert.ok(
    runtime,
    "Typst runtime missing. Run: npm run packaging:build -w @openbook/pdf",
  );
  return runtime;
}

test("buildPdf compiles bake-off fixtures to PDF with Typst 0.15.1", async () => {
  await requireRuntime();
  for (const name of [
    "english-prose.json",
    "kannada-prose.json",
    "mixed-english-kannada.json",
    "indic-conjunct-shaping.json",
  ]) {
    const book = loadFixture(name);
    const pub = await buildPdf(book);
    assert.ok(pub.pdf.byteLength > 1000, `${name} PDF too small`);
    assert.equal(String.fromCharCode(pub.pdf[0]!, pub.pdf[1]!, pub.pdf[2]!, pub.pdf[3]!), "%PDF");
    assert.ok(pub.typstSource.includes("Noto Serif"));
  }
});

test("buildPdf is byte-deterministic for identical Book inputs", async () => {
  await requireRuntime();
  const book = loadFixture("kannada-prose.json");
  const a = await buildPdf(book);
  const b = await buildPdf(book);
  assert.equal(sha256(a.pdf), sha256(b.pdf));
});

test("buildPdf embeds image assets via AssetResolver", async () => {
  await requireRuntime();
  const asset: AssetRef = {
    id: "dot",
    kind: "image",
    fileName: "dot.png",
    mediaType: "image/png",
    altText: "Dot",
    licence: "test",
  };
  const book = createBook({ title: "Image Fixture", language: "en", withOpeningChapter: false });
  book.metadata.publishedAt = "2026-09-04";
  book.assets = [asset];
  book.chapters = [
    {
      id: "c1",
      kind: "main",
      role: "chapter",
      title: "Chapter",
      blocks: [
        { type: "paragraph", id: "p1", inlines: [{ type: "text", text: "Before image." }] },
        {
          type: "image",
          id: "i1",
          assetId: "dot",
          caption: [{ type: "text", text: "A pixel." }],
        },
      ],
    },
  ];

  const pub = await buildPdf(book, {
    assetResolver: {
      async resolve(ref) {
        assert.equal(ref.id, "dot");
        return TINY_PNG;
      },
    },
  });
  assert.equal(String.fromCharCode(pub.pdf[0]!, pub.pdf[1]!, pub.pdf[2]!, pub.pdf[3]!), "%PDF");
  assert.match(pub.typstSource, /image\("assets\/dot\.png"\)/);
});
