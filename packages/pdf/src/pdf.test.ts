// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createBook,
  parseBook,
  validateBook,
  type AssetRef,
  type InlineSpan,
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
  typstLanguage,
  TypstRuntimeError,
  AssetValidationError,
  AssetResolutionError,
  InvalidPdfProfileError,
  PRINT_MAX_PAGES,
  PRINT_PAGE_LIMIT_MESSAGE,
  PRINT_TRIM_SIZES,
  type PdfProfile,
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

/** True when Gate 6 packaging has produced Typst + fonts under `.cache/pdf-runtime`. */
const hasRuntime = resolveProductionTypstRuntime({ repoRoot: rootDir }) !== null;

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

test("Kannada fonts come first only for Kannada books, so English digits match their words", () => {
  const kannada = serializeBookToTypst(loadFixture("kannada-prose.json"));
  assert.match(kannada, /#set text\(font: \("Noto Serif Kannada", "Noto Serif", "Noto Emoji"\)/);
  assert.match(kannada, /#show heading: set text\(font: \("Noto Sans Kannada", "Noto Sans", "Noto Emoji"\)\)/);
  for (const name of ["english-prose.json", "mixed-english-kannada.json"]) {
    const typst = serializeBookToTypst(loadFixture(name));
    assert.match(typst, /#set text\(font: \("Noto Serif", "Noto Serif Kannada", "Noto Emoji"\)/, name);
    assert.match(typst, /#show heading: set text\(font: \("Noto Sans", "Noto Sans Kannada", "Noto Emoji"\)\)/, name);
  }
});

test("inventory pins italic Noto Serif and Noto Sans, and Noto Emoji", () => {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  for (const file of ["NotoSerif-Italic[wdth,wght].ttf", "NotoSans-Italic[wdth,wght].ttf", "NotoEmoji[wght].ttf"]) {
    assert.match(inventory.fonts.files[file]?.sha256 ?? "", /^[0-9a-f]{64}$/, file);
  }
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

test(
  "production packaging evidence records Typst 0.15.1 when runtime is built",
  { skip: !hasRuntime },
  () => {
    const runtime = resolveProductionTypstRuntime({ repoRoot: rootDir });
    assert.ok(runtime?.evidencePath);
    const evidence = readBuildEvidence(runtime.evidencePath) as {
      typst: { version: string; artifactSha256: string };
    };
    assert.equal(evidence.typst.version, "0.15.1");
    assert.ok(evidence.typst.artifactSha256);
  },
);

test(
  "buildPdf compiles bake-off fixtures to PDF with Typst 0.15.1",
  { skip: !hasRuntime },
  async () => {
    for (const name of [
      "english-prose.json",
      "kannada-prose.json",
      "mixed-english-kannada.json",
      "indic-conjunct-shaping.json",
    ]) {
      const book = loadFixture(name);
      const pub = await buildPdf(book);
      assert.ok(pub.pdf.byteLength > 1000, `${name} PDF too small`);
      assert.equal(
        String.fromCharCode(pub.pdf[0]!, pub.pdf[1]!, pub.pdf[2]!, pub.pdf[3]!),
        "%PDF",
      );
      assert.ok(pub.typstSource.includes("Noto Serif"));
    }
  },
);

test(
  "buildPdf is byte-deterministic for identical Book inputs",
  { skip: !hasRuntime },
  async () => {
    const book = loadFixture("kannada-prose.json");
    const a = await buildPdf(book);
    const b = await buildPdf(book);
    assert.equal(sha256(a.pdf), sha256(b.pdf));
  },
);

test(
  "buildPdf embeds image assets via AssetResolver",
  { skip: !hasRuntime },
  async () => {
    const asset: AssetRef = {
      id: "dot",
      kind: "image",
      fileName: "dot.png",
      mediaType: "image/png",
      altText: "Dot",
      licence: "test",
    };
    const book = createBook({
      title: "Image Fixture",
      language: "en",
      withOpeningChapter: false,
    });
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
    assert.equal(
      String.fromCharCode(pub.pdf[0]!, pub.pdf[1]!, pub.pdf[2]!, pub.pdf[3]!),
      "%PDF",
    );
    assert.match(pub.typstSource, /image\("assets\/dot\.png"\)/);
  },
);

test(
  "buildPdf prints italics with the italic fonts and emoji with Noto Emoji",
  { skip: !hasRuntime },
  async () => {
    const book = createBook({ title: "Fonts", language: "en", withOpeningChapter: false });
    book.metadata.publishedAt = "2026-10-30";
    book.chapters = [
      {
        id: "c1",
        kind: "main",
        role: "chapter",
        title: "Story 1: The Chariot",
        blocks: [
          { type: "paragraph", id: "p1", inlines: [{ type: "emphasis", children: [{ type: "text", text: "Dear Parents," }] }] },
          { type: "paragraph", id: "p2", inlines: [{ type: "text", text: "What We Learned 🌟" }] },
        ],
      },
    ];
    const pub = await buildPdf(book);
    const fonts = new Set(
      [...Buffer.from(pub.pdf).toString("latin1").matchAll(/\/BaseFont\s*\/[A-Z]{6}\+([A-Za-z0-9-]+)/g)].map((m) => m[1] ?? ""),
    );
    assert.ok(fonts.has("NotoSerif-Italic"), `fonts: ${[...fonts].join(", ")}`);
    assert.ok([...fonts].some((name) => name.startsWith("NotoEmoji")), `fonts: ${[...fonts].join(", ")}`);
    assert.ok(![...fonts].some((name) => name.includes("Kannada")), "an English book takes digits from the Latin fonts");
  },
);

test("injected runtimeRoot is used without walking a repository root", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-runtime-locator-"));
  try {
    const typstName = process.platform === "win32" ? "typst.exe" : "typst";
    fs.mkdirSync(path.join(tmp, "typst"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "fonts"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "typst", typstName), "");
    const resolved = resolveProductionTypstRuntime({ runtimeRoot: tmp });
    assert.ok(resolved);
    assert.equal(resolved?.cacheRoot, tmp);
    assert.ok(resolved?.typstExecutablePath.startsWith(tmp));
    assert.ok(resolved?.fontsDirectory.startsWith(tmp));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("incomplete injected runtimeRoot returns null instead of a system Typst", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pdf-runtime-locator-"));
  try {
    const resolved = resolveProductionTypstRuntime({ runtimeRoot: tmp });
    assert.equal(resolved, null);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// --- ADR-0038 Slice 5: PDF cover --------------------------------------------

const COVER_ALT = "ಬೆಟ್ಟದ ಮೇಲೆ ಪುಟ್ಟ ಕೃಷ್ಣ";

function coverBook(options: { showInChapter?: boolean } = {}) {
  const book = loadFixture("kannada-prose.json");
  book.assets = [
    ...book.assets,
    { id: "cover", kind: "image", fileName: "cover.png", mediaType: "image/png", altText: COVER_ALT, licence: "test" },
  ];
  book.publishing.coverAssetId = "cover";
  if (options.showInChapter) {
    book.chapters[0]!.blocks.push({ type: "image", id: "fig-cover", assetId: "cover", caption: [] });
  }
  return book;
}

const coverResolver = {
  async resolve(ref: AssetRef) {
    assert.equal(ref.id, "cover");
    return TINY_PNG;
  },
};

function pdfPageCount(pdf: Uint8Array): number {
  return [...Buffer.from(pdf).toString("latin1").matchAll(/\/Type\s*\/Page(?![s\w])/g)].length;
}

test("serializeBookToTypst puts one cover page before the title page", async () => {
  const pub = serializeBookToTypst(coverBook(), new Map([
    ["cover", { asset: coverBook().assets.at(-1)!, fileName: "cover.png", relativePath: "assets/cover.png", content: TINY_PNG, altText: COVER_ALT }],
  ]));
  const cover = pub.indexOf("#page(margin: 0pt)[");
  const title = pub.indexOf("\n= ");
  assert.ok(cover > 0 && cover < title, "cover page comes before the title");
  assert.equal(pub.split("#page(margin: 0pt)[").length - 1, 1);
  assert.ok(
    pub.includes(`#image("assets/cover.png", width: 100%, height: 100%, fit: "contain", alt: "${COVER_ALT}")`),
  );
});

test("serializeBookToTypst emits no cover page without a cover", () => {
  const book = loadFixture("kannada-prose.json");
  assert.doesNotMatch(serializeBookToTypst(book), /#page\(margin: 0pt\)|fit: "contain"/);
});

test("a missing cover asset fails closed before rendering", async () => {
  const book = coverBook();
  book.assets = book.assets.filter((asset) => asset.id !== "cover");
  await assert.rejects(
    buildPdf(book, { assetResolver: coverResolver }),
    (err: unknown) =>
      err instanceof AssetValidationError &&
      err.code === "MISSING_ASSET_REFERENCE" &&
      /Cover references asset/.test(err.message),
  );
  await assert.rejects(
    buildPdf(coverBook()),
    (err: unknown) => err instanceof AssetResolutionError && err.code === "MISSING_RESOLVER",
  );
});

test(
  "buildPdf renders the cover as one extra first page, deterministically",
  { skip: !hasRuntime },
  async () => {
    const plain = await buildPdf(loadFixture("kannada-prose.json"));
    const book = coverBook();
    const first = await buildPdf(book, { assetResolver: coverResolver });
    const second = await buildPdf(structuredClone(book), { assetResolver: coverResolver });
    assert.equal(String.fromCharCode(...first.pdf.subarray(0, 4)), "%PDF");
    assert.equal(pdfPageCount(first.pdf), pdfPageCount(plain.pdf) + 1);
    assert.equal(sha256(first.pdf), sha256(second.pdf));
  },
);

test(
  "buildPdf packages a picture shown in a chapter and used as the cover once",
  { skip: !hasRuntime },
  async () => {
    const pub = await buildPdf(coverBook({ showInChapter: true }), { assetResolver: coverResolver });
    assert.equal(pub.typstSource.split('"assets/cover.png"').length - 1, 2);
    assert.equal(String.fromCharCode(...pub.pdf.subarray(0, 4)), "%PDF");
  },
);

// --- Language tags with a region (found by ADR-0038 Slice 6) --------------

test("typstLanguage keeps a bare code and splits a region off", () => {
  assert.deepEqual(typstLanguage("en"), { lang: "en" });
  assert.deepEqual(typstLanguage("kn"), { lang: "kn" });
  assert.deepEqual(typstLanguage("en-US"), { lang: "en", region: "US" });
  assert.deepEqual(typstLanguage("kn-IN"), { lang: "kn", region: "IN" });
  assert.deepEqual(typstLanguage("EN_gb"), { lang: "en", region: "GB" });
  assert.deepEqual(typstLanguage("zh-Hant-TW"), { lang: "zh", region: "TW" });
  assert.deepEqual(typstLanguage("es-419"), { lang: "es" });
  assert.deepEqual(typstLanguage("i-klingon"), { lang: "und" });
  assert.deepEqual(typstLanguage(""), { lang: "und" });
});

test("serializeBookToTypst writes lang and region separately", () => {
  const book = loadFixture("english-prose.json");
  book.metadata.language = "en-US";
  const source = serializeBookToTypst(book);
  assert.match(source, /lang: "en", region: "US", fallback: true\)/);
  assert.doesNotMatch(source, /lang: "en-US"/);
  book.metadata.language = "en";
  assert.match(serializeBookToTypst(book), /lang: "en", fallback: true\)/);
});

test(
  "buildPdf renders books whose language has a region",
  { skip: !hasRuntime },
  async () => {
    for (const [fixture, tag] of [
      ["english-prose.json", "en-US"],
      ["kannada-prose.json", "kn-IN"],
    ] as const) {
      const book = loadFixture(fixture);
      book.metadata.language = tag;
      const pub = await buildPdf(book);
      assert.equal(String.fromCharCode(...pub.pdf.subarray(0, 4)), "%PDF", tag);
    }
  },
);

// --- Pictures without a caption get no "Figure N:" label -------------------

function pictureBook(caption: InlineSpan[]) {
  const book = createBook({ title: "Pictures", language: "en", withOpeningChapter: false });
  book.metadata.publishedAt = "2026-09-04";
  book.assets = [{ id: "dot", kind: "image", fileName: "dot.png", mediaType: "image/png", altText: "Dot", licence: "test" }];
  book.chapters = [
    {
      id: "c1",
      kind: "main",
      role: "chapter",
      title: "Chapter",
      blocks: [{ type: "image", id: "i1", assetId: "dot", caption }],
    },
  ];
  return book;
}

const dotImages = new Map([
  ["dot", { asset: { id: "dot", kind: "image" as const, fileName: "dot.png", mediaType: "image/png", altText: "Dot", licence: "test" }, fileName: "dot.png", relativePath: "assets/dot.png", content: TINY_PNG, altText: "Dot" }],
]);

test("a picture with no caption, or only spaces, gets no caption argument", () => {
  for (const caption of [[], [{ type: "text" as const, text: "   " }], [{ type: "emphasis" as const, children: [] }]]) {
    const source = serializeBookToTypst(pictureBook(caption), dotImages);
    assert.match(source, /#figure\(\n  image\("assets\/dot\.png"\),\n\)/);
    assert.doesNotMatch(source, /caption:/);
  }
});

test("a picture with a caption keeps it", () => {
  const source = serializeBookToTypst(pictureBook([{ type: "text", text: "A pixel." }]), dotImages);
  assert.match(source, /caption: \[A pixel\.\],/);
});

test(
  "buildPdf renders pictures without captions",
  { skip: !hasRuntime },
  async () => {
    const pub = await buildPdf(pictureBook([]), { assetResolver: { resolve: async () => TINY_PNG } });
    assert.equal(String.fromCharCode(...pub.pdf.subarray(0, 4)), "%PDF");
    assert.doesNotMatch(pub.typstSource, /caption:/);
  },
);

// --- ADR-0041 Slice 2: lesson boxes ----------------------------------------------

function lessonBook(language: "en" | "kn") {
  const book = loadFixture(language === "kn" ? "kannada-prose.json" : "english-prose.json");
  book.chapters[0]!.blocks.push(
    {
      type: "callout",
      id: "c1",
      title: language === "kn" ? "ನಾವು ಕಲಿತದ್ದು" : "What We Learned",
      inlines: [{ type: "text", text: language === "kn" ? "ಸತ್ಯವೇ ಬೆಳಕು." : "Rule #1: be honest [always] & kind." }],
    },
    { type: "callout", id: "c2", title: "", inlines: [{ type: "text", text: "No title here." }] },
  );
  return book;
}

test("serializeBookToTypst frames a lesson box with its title on its own line", () => {
  const source = serializeBookToTypst(lessonBook("en"));
  const frame = "#block(width: 100%, inset: (x: 10pt, y: 8pt), radius: 6pt, stroke: 0.75pt + luma(110), breakable: false)[";
  assert.ok(source.includes(`${frame}#strong[What We Learned] \\\nRule \\#1: be honest \\[always\\] & kind.]`), source);
  assert.ok(source.includes(`${frame}No title here.]`));
  assert.equal(source.split(frame).length - 1, 2);
});

test("serializeBookToTypst emits no lesson-box frame without lesson boxes", () => {
  assert.doesNotMatch(serializeBookToTypst(loadFixture("english-prose.json")), /breakable: false/);
});

test(
  "buildPdf renders English and Kannada lesson boxes deterministically",
  { skip: !hasRuntime },
  async () => {
    for (const language of ["en", "kn"] as const) {
      const book = lessonBook(language);
      const first = await buildPdf(book);
      const second = await buildPdf(structuredClone(book));
      assert.equal(String.fromCharCode(...first.pdf.subarray(0, 4)), "%PDF", language);
      assert.equal(sha256(first.pdf), sha256(second.pdf), language);
    }
  },
);

// --- ADR-0042 Slice 1: print profile (paperback interior) --------------------

/** The source from the title heading on: identical for both kinds of PDF. */
function bodyFromTitle(source: string): string {
  return source.slice(source.indexOf("\n= "));
}

function pdfMediaBoxesIn(pdf: Uint8Array): string[] {
  return [...Buffer.from(pdf).toString("latin1").matchAll(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/g)].map(
    (m) => `${(Number(m[1]) / 72).toFixed(2)}x${(Number(m[2]) / 72).toFixed(2)}`,
  );
}

test("the reading PDF source is unchanged: no profile and the reading profile agree", () => {
  for (const name of ["english-prose.json", "kannada-prose.json"]) {
    const book = loadFixture(name);
    const plain = serializeBookToTypst(book);
    assert.equal(serializeBookToTypst(book, new Map(), { kind: "reading" }), plain);
    assert.ok(plain.startsWith("// Generated by @openbook/pdf (ADR-0013). Do not edit by hand.\n"));
    assert.match(plain, /#set page\(paper: "a5", margin: \(x: 1\.75cm, y: 2\.25cm\)\)\n/);
    assert.doesNotMatch(plain, /footer:|counter\(page\)/);
  }
});

test("every print trim size sets its page, mirrored margins, numbers from page 2, and the page limit", () => {
  const book = loadFixture("english-prose.json");
  assert.equal(PRINT_TRIM_SIZES.length, 8);
  for (const trim of PRINT_TRIM_SIZES) {
    const source = serializeBookToTypst(book, new Map(), { kind: "print", trim: trim.id });
    assert.ok(source.startsWith(`// Generated by @openbook/pdf (ADR-0013, ADR-0042 print, ${trim.id}).`), trim.id);
    assert.ok(
      source.includes(
        `#set page(width: ${trim.widthIn}in, height: ${trim.heightIn}in, margin: (inside: 0.75in, outside: 0.5in, y: 2.25cm), footer: context { if counter(page).get().first() > 1 { align(center, text(size: 9pt, counter(page).display("1"))) } })`,
      ),
      trim.id,
    );
    assert.ok(source.includes(`#context if counter(page).final().first() > ${PRINT_MAX_PAGES} { panic("${PRINT_PAGE_LIMIT_MESSAGE}") }`));
    assert.doesNotMatch(source, /paper: "a5"/);
  }
  assert.deepEqual(
    PRINT_TRIM_SIZES.map((t) => t.label),
    ["5 × 8 in", "5.25 × 8 in", "5.5 × 8.5 in", "6 × 9 in", "7 × 10 in", "8 × 10 in", "8.5 × 11 in", "A5 (5.83 × 8.27 in)"],
  );
});

test("a print PDF has no cover page even when the book has a cover", () => {
  const book = coverBook();
  const images = new Map([
    ["cover", { asset: book.assets.at(-1)!, fileName: "cover.png", relativePath: "assets/cover.png", content: TINY_PNG, altText: COVER_ALT }],
  ]);
  assert.match(serializeBookToTypst(book, images), /#page\(margin: 0pt\)\[/);
  assert.doesNotMatch(serializeBookToTypst(book, images, { kind: "print", trim: "6x9" }), /#page\(margin: 0pt\)|fit: "contain"/);
});

test("English and Kannada books keep the same text, pictures, and lesson boxes in both kinds", () => {
  for (const name of ["english-prose.json", "kannada-prose.json", "mixed-english-kannada.json"]) {
    const book = loadFixture(name);
    book.chapters[0]!.blocks.push({ type: "callout", id: "lesson", title: "ನಾವು ಕಲಿತದ್ದು", inlines: [{ type: "text", text: "ಸತ್ಯವೇ ಬೆಳಕು." }] });
    const reading = serializeBookToTypst(book);
    const print = serializeBookToTypst(book, new Map(), { kind: "print", trim: "5.5x8.5" });
    assert.equal(bodyFromTitle(print), bodyFromTitle(reading), name);
    assert.ok(print.includes("#strong[ನಾವು ಕಲಿತದ್ದು]"));
  }
});

test("an unknown trim size is refused before anything is rendered", async () => {
  const book = loadFixture("english-prose.json");
  const bad = { kind: "print", trim: "4x6" } as unknown as PdfProfile;
  assert.throws(() => serializeBookToTypst(book, new Map(), bad), InvalidPdfProfileError);
  await assert.rejects(buildPdf(book, { profile: bad, typstExecutablePath: "typst", fontPath: "." }), InvalidPdfProfileError);
});

test(
  "a print PDF is the trim size on every page and byte-identical across builds",
  { skip: !hasRuntime },
  async () => {
    for (const trim of ["5.5x8.5", "a5"] as const) {
      const book = loadFixture("kannada-prose.json");
      const first = await buildPdf(book, { profile: { kind: "print", trim } });
      const second = await buildPdf(structuredClone(book), { profile: { kind: "print", trim } });
      assert.equal(sha256(first.pdf), sha256(second.pdf), trim);
      const size = PRINT_TRIM_SIZES.find((t) => t.id === trim)!;
      const boxes = pdfMediaBoxesIn(first.pdf);
      assert.equal(boxes.length, pdfPageCount(first.pdf));
      assert.deepEqual(new Set(boxes), new Set([`${size.widthIn.toFixed(2)}x${size.heightIn.toFixed(2)}`]), trim);
    }
  },
);

test(
  "a print PDF leaves out the cover page that the reading PDF has",
  { skip: !hasRuntime },
  async () => {
    const reading = await buildPdf(coverBook(), { assetResolver: coverResolver });
    const print = await buildPdf(coverBook(), { assetResolver: coverResolver, profile: { kind: "print", trim: "a5" } });
    assert.equal(pdfPageCount(print.pdf), pdfPageCount(reading.pdf) - 1);
  },
);

test(
  "a book over the page limit fails with a plain message",
  { skip: !hasRuntime },
  async () => {
    const book = createBook({ title: "Long", language: "en", withOpeningChapter: false });
    const template = loadFixture("english-prose.json").chapters[0]!;
    book.chapters = Array.from({ length: PRINT_MAX_PAGES + 1 }, (_, i) => ({
      ...template,
      id: `ch-${i}`,
      title: `Chapter ${i + 1}`,
      blocks: [{ type: "paragraph" as const, id: `p-${i}`, inlines: [{ type: "text" as const, text: "A page." }] }],
    }));
    await assert.rejects(
      buildPdf(book, { profile: { kind: "print", trim: "5x8" } }),
      (err: unknown) =>
        err instanceof TypstRuntimeError && err.code === "PRINT_PAGE_LIMIT_EXCEEDED" && err.message === PRINT_PAGE_LIMIT_MESSAGE,
    );
  },
);
