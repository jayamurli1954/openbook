// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { locatePackagedRuntimes } from "./packagedRuntimeLocator.js";
import {
  GATE10_WINDOWS_PLATFORM_KEY,
  assembleWindowsResourceLayout,
  sha256File,
  verifyPdfRuntimeForPackaging,
  verifyValidatorRuntimeForPackaging,
  type PdfInventoryPin,
  type ValidatorInventoryPin,
} from "./packagedResourceAssembly.js";

const JAVA = "java.exe";
const TYPST = "typst.exe";

function hexOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function withTempDir(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "openbook-gate10-slice2-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function fixtureInventories(hashes: {
  epubZip: string;
  temurinZip: string;
  typstZip: string;
  fonts: Record<string, string>;
}): { validator: ValidatorInventoryPin; pdf: PdfInventoryPin } {
  return {
    validator: {
      epubcheck: { version: "5.3.0", sha256: hashes.epubZip },
      temurin: {
        releaseName: "jdk-21.0.12.1+1",
        platforms: {
          [GATE10_WINDOWS_PLATFORM_KEY]: {
            sha256: hashes.temurinZip,
            artifactName: "OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip",
          },
        },
      },
      layout: {
        epubcheckDir: "epubcheck-5.3.0",
        runtimeDir: "runtime",
        evidenceFile: "build-evidence.json",
      },
    },
    pdf: {
      typst: {
        version: "0.15.1",
        platforms: {
          [GATE10_WINDOWS_PLATFORM_KEY]: {
            sha256: hashes.typstZip,
            artifactName: "typst-x86_64-pc-windows-msvc.zip",
          },
        },
      },
      fonts: {
        files: Object.fromEntries(
          Object.entries(hashes.fonts).map(([name, sha256]) => [name, { sha256 }]),
        ),
      },
      layout: {
        typstDir: "typst",
        fontsDir: "fonts",
        evidenceFile: "build-evidence.json",
      },
    },
  };
}

async function writeCompleteSources(root: string): Promise<{
  validatorRoot: string;
  pdfRoot: string;
  inventories: { validator: ValidatorInventoryPin; pdf: PdfInventoryPin };
  hashes: {
    epubZip: string;
    temurinZip: string;
    typstZip: string;
    fonts: Record<string, string>;
    javaBody: string;
    typstBody: string;
  };
}> {
  const epubZip = hexOf("epub-zip");
  const temurinZip = hexOf("temurin-zip");
  const typstZip = hexOf("typst-zip");
  const fontA = "NotoSerif[wdth,wght].ttf";
  const fontB = "NotoSans[wdth,wght].ttf";
  const fontBodies = {
    [fontA]: "font-a-bytes",
    [fontB]: "font-b-bytes",
  };
  const fontHashes = {
    [fontA]: hexOf(fontBodies[fontA]!),
    [fontB]: hexOf(fontBodies[fontB]!),
  };
  const inventories = fixtureInventories({
    epubZip,
    temurinZip,
    typstZip,
    fonts: fontHashes,
  });

  const validatorRoot = path.join(root, "validator-src");
  const pdfRoot = path.join(root, "pdf-src");
  const javaBody = "fake-jlink-java";
  const typstBody = "fake-typst-bin";

  await mkdir(path.join(validatorRoot, "runtime", "bin"), { recursive: true });
  await mkdir(path.join(validatorRoot, "epubcheck-5.3.0"), { recursive: true });
  await writeFile(path.join(validatorRoot, "runtime", "bin", JAVA), javaBody);
  await writeFile(path.join(validatorRoot, "epubcheck-5.3.0", "epubcheck.jar"), "jar");
  await writeFile(
    path.join(validatorRoot, "build-evidence.json"),
    `${JSON.stringify(
      {
        host: { platformKey: GATE10_WINDOWS_PLATFORM_KEY },
        epubcheck: { version: "5.3.0", artifactSha256: epubZip },
        temurin: {
          releaseName: "jdk-21.0.12.1+1",
          artifactName: "OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip",
          artifactSha256: temurinZip,
        },
      },
      null,
      2,
    )}\n`,
  );

  await mkdir(path.join(pdfRoot, "typst"), { recursive: true });
  await mkdir(path.join(pdfRoot, "fonts"), { recursive: true });
  await writeFile(path.join(pdfRoot, "typst", TYPST), typstBody);
  for (const [name, body] of Object.entries(fontBodies)) {
    await writeFile(path.join(pdfRoot, "fonts", name), body);
  }
  await writeFile(
    path.join(pdfRoot, "build-evidence.json"),
    `${JSON.stringify(
      {
        host: { platformKey: GATE10_WINDOWS_PLATFORM_KEY },
        typst: {
          version: "0.15.1",
          artifactName: "typst-x86_64-pc-windows-msvc.zip",
          artifactSha256: typstZip,
        },
      },
      null,
      2,
    )}\n`,
  );

  return {
    validatorRoot,
    pdfRoot,
    inventories,
    hashes: { epubZip, temurinZip, typstZip, fonts: fontHashes, javaBody, typstBody },
  };
}

test("verifyValidatorRuntimeForPackaging fails when evidence platform is not windows-x64", async () => {
  await withTempDir(async (root) => {
    const { validatorRoot, inventories } = await writeCompleteSources(root);
    await writeFile(
      path.join(validatorRoot, "build-evidence.json"),
      `${JSON.stringify(
        {
          host: { platformKey: "linux-x64" },
          epubcheck: {
            version: "5.3.0",
            artifactSha256: inventories.validator.epubcheck.sha256,
          },
          temurin: {
            releaseName: "jdk-21.0.12.1+1",
            artifactName: "OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip",
            artifactSha256:
              inventories.validator.temurin.platforms[GATE10_WINDOWS_PLATFORM_KEY]!.sha256,
          },
        },
        null,
        2,
      )}\n`,
    );
    const verified = verifyValidatorRuntimeForPackaging(validatorRoot, inventories.validator);
    assert.equal(verified.ok, false);
    if (verified.ok) return;
    assert.equal(verified.error.code, "UNSUPPORTED_PLATFORM");
  });
});

test("verifyPdfRuntimeForPackaging fails on font checksum mismatch", async () => {
  await withTempDir(async (root) => {
    const { pdfRoot, inventories } = await writeCompleteSources(root);
    const fontName = Object.keys(inventories.pdf.fonts.files)[0]!;
    await writeFile(path.join(pdfRoot, "fonts", fontName), "tampered-font");
    const verified = verifyPdfRuntimeForPackaging(pdfRoot, inventories.pdf);
    assert.equal(verified.ok, false);
    if (verified.ok) return;
    assert.equal(verified.error.code, "CHECKSUM_MISMATCH");
  });
});

test("assembleWindowsResourceLayout verifies, copies, and records jlink java hash", async () => {
  await withTempDir(async (root) => {
    const { validatorRoot, pdfRoot, inventories, hashes } = await writeCompleteSources(root);
    const destination = path.join(root, "resources");
    const assembled = assembleWindowsResourceLayout({
      validatorSourceRoot: validatorRoot,
      pdfSourceRoot: pdfRoot,
      destinationResourceRoot: destination,
      validatorInventory: inventories.validator,
      pdfInventory: inventories.pdf,
    });
    assert.equal(assembled.ok, true);
    if (!assembled.ok) return;

    assert.equal(
      assembled.value.checksums.jlinkJavaSha256,
      createHash("sha256").update(hashes.javaBody, "utf8").digest("hex"),
    );
    assert.equal(
      assembled.value.checksums.typstExecutableSha256,
      createHash("sha256").update(hashes.typstBody, "utf8").digest("hex"),
    );

    const evidenceRaw = await readFile(assembled.value.assemblyEvidencePath, "utf8");
    const evidence = JSON.parse(evidenceRaw) as {
      gate: string;
      checksums: { jlinkJavaSha256: string };
    };
    assert.equal(evidence.gate, "Gate 10 Slice 2");
    assert.equal(evidence.checksums.jlinkJavaSha256, assembled.value.checksums.jlinkJavaSha256);

    assert.equal(
      sha256File(path.join(assembled.value.validatorRuntimeRoot, "runtime", "bin", JAVA)),
      assembled.value.checksums.jlinkJavaSha256,
    );

    // Destination layout must match Slice 1 names. Host platform may differ from
    // windows-x64 evidence, so locatePackagedRuntimes is only asserted on win32.
    if (process.platform === "win32") {
      const located = locatePackagedRuntimes({ resourceRoot: destination });
      assert.equal(located.ok, true);
    }
  });
});

test("assembleWindowsResourceLayout fails closed when build evidence is missing", async () => {
  await withTempDir(async (root) => {
    const { validatorRoot, pdfRoot, inventories } = await writeCompleteSources(root);
    await rm(path.join(validatorRoot, "build-evidence.json"));
    const assembled = assembleWindowsResourceLayout({
      validatorSourceRoot: validatorRoot,
      pdfSourceRoot: pdfRoot,
      destinationResourceRoot: path.join(root, "resources"),
      validatorInventory: inventories.validator,
      pdfInventory: inventories.pdf,
    });
    assert.equal(assembled.ok, false);
    if (assembled.ok) return;
    assert.equal(assembled.error.code, "MISSING_BUILD_EVIDENCE");
  });
});
