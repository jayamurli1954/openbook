// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 2: Windows resource layout assembly (ADR-0032).
 *
 * Packaging-time verification of Gate 5/6 runtimes against committed inventories,
 * then copy into the Tauri resource tree:
 *   <resourceRoot>/validator-runtime
 *   <resourceRoot>/pdf-runtime
 *
 * Does not download runtimes, does not wire the desktop host locator (Slice 3),
 * and does not produce an installer (Slice 4).
 */
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  PACKAGED_PDF_RUNTIME_DIR,
  PACKAGED_VALIDATOR_RUNTIME_DIR,
} from "./packagedRuntimeLocator.js";

/** Default Tauri resource staging root (relative to `src-tauri/`). */
export const TAURI_RESOURCES_DIR = "resources";

/** First Gate 10 production packaging platform (ADR-0032 §2.3). */
export const GATE10_WINDOWS_PLATFORM_KEY = "windows-x64";

export type PackagedResourceAssemblyErrorCode =
  | "MISSING_SOURCE_RUNTIME"
  | "MISSING_BUILD_EVIDENCE"
  | "INVENTORY_MISMATCH"
  | "CHECKSUM_MISMATCH"
  | "UNSUPPORTED_PLATFORM"
  | "MALFORMED_EVIDENCE"
  | "ASSEMBLY_IO_ERROR";

export interface PackagedResourceAssemblyError {
  readonly code: PackagedResourceAssemblyErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export type PackagedResourceAssemblyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PackagedResourceAssemblyError };

export interface ValidatorInventoryPin {
  readonly epubcheck: { readonly version: string; readonly sha256: string };
  readonly temurin: {
    readonly releaseName: string;
    readonly platforms: Record<string, { readonly sha256: string; readonly artifactName: string }>;
  };
  readonly layout: {
    readonly epubcheckDir: string;
    readonly runtimeDir: string;
    readonly evidenceFile: string;
  };
}

export interface PdfInventoryPin {
  readonly typst: {
    readonly version: string;
    readonly platforms: Record<string, { readonly sha256: string; readonly artifactName: string }>;
  };
  readonly fonts: {
    readonly files: Record<string, { readonly sha256: string }>;
  };
  readonly layout: {
    readonly typstDir: string;
    readonly fontsDir: string;
    readonly evidenceFile: string;
  };
}

export interface AssembleWindowsResourceLayoutInput {
  readonly validatorSourceRoot: string;
  readonly pdfSourceRoot: string;
  readonly destinationResourceRoot: string;
  readonly validatorInventory: ValidatorInventoryPin;
  readonly pdfInventory: PdfInventoryPin;
  /**
   * Required evidence platform key. Defaults to windows-x64.
   * Tests may pass another key only when packaging deliberately targets that host.
   */
  readonly requiredPlatformKey?: string;
}

export interface PackagedRuntimeChecksumReport {
  readonly platformKey: string;
  readonly epubcheckVersion: string;
  readonly epubcheckArtifactSha256: string;
  readonly temurinArtifactSha256: string;
  readonly temurinArtifactName: string;
  readonly jlinkJavaSha256: string;
  readonly typstVersion: string;
  readonly typstArtifactSha256: string;
  readonly typstExecutableSha256: string;
  readonly fontSha256: Record<string, string>;
}

export interface AssembleWindowsResourceLayoutSummary {
  readonly destinationResourceRoot: string;
  readonly validatorRuntimeRoot: string;
  readonly pdfRuntimeRoot: string;
  readonly assemblyEvidencePath: string;
  readonly checksums: PackagedRuntimeChecksumReport;
}

function fail<T>(
  code: PackagedResourceAssemblyErrorCode,
  message: string,
  details?: Record<string, unknown>,
): PackagedResourceAssemblyResult<T> {
  return { ok: false, error: { code, message, details } };
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function javaExecutableName(platformKey: string): string {
  return platformKey.startsWith("windows-") ? "java.exe" : "java";
}

function typstExecutableName(platformKey: string): string {
  return platformKey.startsWith("windows-") ? "typst.exe" : "typst";
}

/**
 * Verify a Gate 5 `.cache/validator-runtime` (or equivalent) against inventory
 * pins and compute the packaging-time jlink java identity hash.
 */
export function verifyValidatorRuntimeForPackaging(
  runtimeRoot: string,
  inventory: ValidatorInventoryPin,
  requiredPlatformKey: string = GATE10_WINDOWS_PLATFORM_KEY,
): PackagedResourceAssemblyResult<{
  platformKey: string;
  epubcheckArtifactSha256: string;
  temurinArtifactSha256: string;
  temurinArtifactName: string;
  jlinkJavaSha256: string;
  javaExecutablePath: string;
  epubcheckJarPath: string;
  evidencePath: string;
}> {
  const root = path.resolve(runtimeRoot);
  const evidencePath = path.join(root, inventory.layout.evidenceFile);
  const javaPath = path.join(
    root,
    inventory.layout.runtimeDir,
    "bin",
    javaExecutableName(requiredPlatformKey),
  );
  const jarPath = path.join(root, inventory.layout.epubcheckDir, "epubcheck.jar");

  if (!existsSync(root)) {
    return fail("MISSING_SOURCE_RUNTIME", "Validator runtime source root does not exist.", {
      runtimeRoot: root,
    });
  }
  if (!existsSync(evidencePath)) {
    return fail(
      "MISSING_BUILD_EVIDENCE",
      "Validator build-evidence.json is missing; run Gate 5 packaging:build first.",
      { evidencePath },
    );
  }
  if (!existsSync(javaPath) || !existsSync(jarPath)) {
    return fail(
      "MISSING_SOURCE_RUNTIME",
      "Validator runtime layout is incomplete (java and/or epubcheck.jar missing).",
      { javaPath, jarPath },
    );
  }

  let evidence: unknown;
  try {
    evidence = readJsonFile(evidencePath);
  } catch (err) {
    return fail("MALFORMED_EVIDENCE", "Failed to parse validator build-evidence.json.", {
      cause: String(err),
    });
  }
  if (!isRecord(evidence)) {
    return fail("MALFORMED_EVIDENCE", "Validator build-evidence.json must be an object.");
  }

  const host = isRecord(evidence.host) ? evidence.host : {};
  const epubcheck = isRecord(evidence.epubcheck) ? evidence.epubcheck : {};
  const temurin = isRecord(evidence.temurin) ? evidence.temurin : {};
  const platformKey = asString(host.platformKey);
  const epubVersion = asString(epubcheck.version);
  const epubSha = asString(epubcheck.artifactSha256);
  const temurinSha = asString(temurin.artifactSha256);
  const temurinName = asString(temurin.artifactName);
  const temurinRelease = asString(temurin.releaseName);

  if (platformKey !== requiredPlatformKey) {
    return fail(
      "UNSUPPORTED_PLATFORM",
      `Validator evidence platform is "${platformKey ?? "(missing)"}"; Gate 10 Slice 2 requires "${requiredPlatformKey}".`,
      { platformKey, requiredPlatformKey },
    );
  }

  const platformPin = inventory.temurin.platforms[requiredPlatformKey];
  if (!platformPin) {
    return fail("INVENTORY_MISMATCH", `No Temurin pin for ${requiredPlatformKey} in inventory.`, {
      requiredPlatformKey,
    });
  }

  if (epubVersion !== inventory.epubcheck.version) {
    return fail("INVENTORY_MISMATCH", "EPUBCheck version in evidence does not match inventory.", {
      evidence: epubVersion,
      inventory: inventory.epubcheck.version,
    });
  }
  if ((epubSha ?? "").toLowerCase() !== inventory.epubcheck.sha256.toLowerCase()) {
    return fail(
      "INVENTORY_MISMATCH",
      "EPUBCheck artifact SHA-256 in evidence does not match inventory.",
      { evidence: epubSha, inventory: inventory.epubcheck.sha256 },
    );
  }
  if ((temurinSha ?? "").toLowerCase() !== platformPin.sha256.toLowerCase()) {
    return fail(
      "INVENTORY_MISMATCH",
      "Temurin artifact SHA-256 in evidence does not match inventory.",
      { evidence: temurinSha, inventory: platformPin.sha256 },
    );
  }
  if (temurinName !== platformPin.artifactName) {
    return fail("INVENTORY_MISMATCH", "Temurin artifact name in evidence does not match inventory.", {
      evidence: temurinName,
      inventory: platformPin.artifactName,
    });
  }
  if (temurinRelease !== undefined && temurinRelease !== inventory.temurin.releaseName) {
    return fail("INVENTORY_MISMATCH", "Temurin release name in evidence does not match inventory.", {
      evidence: temurinRelease,
      inventory: inventory.temurin.releaseName,
    });
  }

  const jlinkJavaSha256 = sha256File(javaPath);
  return {
    ok: true,
    value: {
      platformKey,
      epubcheckArtifactSha256: epubSha!,
      temurinArtifactSha256: temurinSha!,
      temurinArtifactName: temurinName!,
      jlinkJavaSha256,
      javaExecutablePath: javaPath,
      epubcheckJarPath: jarPath,
      evidencePath,
    },
  };
}

/**
 * Verify a Gate 6 `.cache/pdf-runtime` (or equivalent) against inventory pins,
 * re-hashing Typst and every font file listed in the inventory.
 */
export function verifyPdfRuntimeForPackaging(
  runtimeRoot: string,
  inventory: PdfInventoryPin,
  requiredPlatformKey: string = GATE10_WINDOWS_PLATFORM_KEY,
): PackagedResourceAssemblyResult<{
  platformKey: string;
  typstArtifactSha256: string;
  typstExecutableSha256: string;
  typstExecutablePath: string;
  fontSha256: Record<string, string>;
  evidencePath: string;
}> {
  const root = path.resolve(runtimeRoot);
  const evidencePath = path.join(root, inventory.layout.evidenceFile);
  const typstPath = path.join(
    root,
    inventory.layout.typstDir,
    typstExecutableName(requiredPlatformKey),
  );
  const fontsDir = path.join(root, inventory.layout.fontsDir);

  if (!existsSync(root)) {
    return fail("MISSING_SOURCE_RUNTIME", "PDF runtime source root does not exist.", {
      runtimeRoot: root,
    });
  }
  if (!existsSync(evidencePath)) {
    return fail(
      "MISSING_BUILD_EVIDENCE",
      "PDF build-evidence.json is missing; run Gate 6 packaging:build first.",
      { evidencePath },
    );
  }
  if (!existsSync(typstPath) || !existsSync(fontsDir)) {
    return fail(
      "MISSING_SOURCE_RUNTIME",
      "PDF runtime layout is incomplete (typst and/or fonts missing).",
      { typstPath, fontsDir },
    );
  }

  let evidence: unknown;
  try {
    evidence = readJsonFile(evidencePath);
  } catch (err) {
    return fail("MALFORMED_EVIDENCE", "Failed to parse PDF build-evidence.json.", {
      cause: String(err),
    });
  }
  if (!isRecord(evidence)) {
    return fail("MALFORMED_EVIDENCE", "PDF build-evidence.json must be an object.");
  }

  const host = isRecord(evidence.host) ? evidence.host : {};
  const typst = isRecord(evidence.typst) ? evidence.typst : {};
  const platformKey = asString(host.platformKey);
  const typstVersion = asString(typst.version);
  const typstSha = asString(typst.artifactSha256);
  const typstArtifactName = asString(typst.artifactName);

  if (platformKey !== requiredPlatformKey) {
    return fail(
      "UNSUPPORTED_PLATFORM",
      `PDF evidence platform is "${platformKey ?? "(missing)"}"; Gate 10 Slice 2 requires "${requiredPlatformKey}".`,
      { platformKey, requiredPlatformKey },
    );
  }

  const platformPin = inventory.typst.platforms[requiredPlatformKey];
  if (!platformPin) {
    return fail("INVENTORY_MISMATCH", `No Typst pin for ${requiredPlatformKey} in inventory.`, {
      requiredPlatformKey,
    });
  }
  if (typstVersion !== inventory.typst.version) {
    return fail("INVENTORY_MISMATCH", "Typst version in evidence does not match inventory.", {
      evidence: typstVersion,
      inventory: inventory.typst.version,
    });
  }
  if ((typstSha ?? "").toLowerCase() !== platformPin.sha256.toLowerCase()) {
    return fail(
      "INVENTORY_MISMATCH",
      "Typst artifact SHA-256 in evidence does not match inventory.",
      { evidence: typstSha, inventory: platformPin.sha256 },
    );
  }
  if (typstArtifactName !== platformPin.artifactName) {
    return fail("INVENTORY_MISMATCH", "Typst artifact name in evidence does not match inventory.", {
      evidence: typstArtifactName,
      inventory: platformPin.artifactName,
    });
  }

  const fontSha256: Record<string, string> = {};
  for (const [fileName, meta] of Object.entries(inventory.fonts.files)) {
    const fontPath = path.join(fontsDir, fileName);
    if (!existsSync(fontPath) || !statSync(fontPath).isFile()) {
      return fail("MISSING_SOURCE_RUNTIME", `Packaged font file is missing: ${fileName}.`, {
        fontPath,
      });
    }
    const actual = sha256File(fontPath);
    if (actual.toLowerCase() !== meta.sha256.toLowerCase()) {
      return fail("CHECKSUM_MISMATCH", `Font SHA-256 mismatch for ${fileName}.`, {
        expected: meta.sha256,
        actual,
      });
    }
    fontSha256[fileName] = actual;
  }

  return {
    ok: true,
    value: {
      platformKey,
      typstArtifactSha256: typstSha!,
      typstExecutableSha256: sha256File(typstPath),
      typstExecutablePath: typstPath,
      fontSha256,
      evidencePath,
    },
  };
}

function copyRuntimeTree(sourceRoot: string, destRoot: string, relativePaths: string[]): void {
  if (existsSync(destRoot)) {
    rmSync(destRoot, { recursive: true, force: true });
  }
  mkdirSync(destRoot, { recursive: true });
  for (const rel of relativePaths) {
    const from = path.join(sourceRoot, rel);
    const to = path.join(destRoot, rel);
    if (!existsSync(from)) {
      throw new Error(`Missing source path during assembly copy: ${from}`);
    }
    mkdirSync(path.dirname(to), { recursive: true });
    cpSync(from, to, { recursive: true });
  }
}

/**
 * Verify Gate 5/6 sources against inventories, then copy shippable trees into
 * the Tauri resource root layout used by Slice 1.
 */
export function assembleWindowsResourceLayout(
  input: AssembleWindowsResourceLayoutInput,
): PackagedResourceAssemblyResult<AssembleWindowsResourceLayoutSummary> {
  const requiredPlatformKey = input.requiredPlatformKey ?? GATE10_WINDOWS_PLATFORM_KEY;
  const destinationResourceRoot = path.resolve(input.destinationResourceRoot);
  const validatorSourceRoot = path.resolve(input.validatorSourceRoot);
  const pdfSourceRoot = path.resolve(input.pdfSourceRoot);

  const validator = verifyValidatorRuntimeForPackaging(
    validatorSourceRoot,
    input.validatorInventory,
    requiredPlatformKey,
  );
  if (!validator.ok) return validator;

  const pdf = verifyPdfRuntimeForPackaging(
    pdfSourceRoot,
    input.pdfInventory,
    requiredPlatformKey,
  );
  if (!pdf.ok) return pdf;

  const validatorRuntimeRoot = path.join(destinationResourceRoot, PACKAGED_VALIDATOR_RUNTIME_DIR);
  const pdfRuntimeRoot = path.join(destinationResourceRoot, PACKAGED_PDF_RUNTIME_DIR);

  try {
    mkdirSync(destinationResourceRoot, { recursive: true });
    copyRuntimeTree(validatorSourceRoot, validatorRuntimeRoot, [
      input.validatorInventory.layout.runtimeDir,
      input.validatorInventory.layout.epubcheckDir,
      input.validatorInventory.layout.evidenceFile,
    ]);
    copyRuntimeTree(pdfSourceRoot, pdfRuntimeRoot, [
      input.pdfInventory.layout.typstDir,
      input.pdfInventory.layout.fontsDir,
      input.pdfInventory.layout.evidenceFile,
    ]);
  } catch (err) {
    return fail("ASSEMBLY_IO_ERROR", "Failed to copy runtimes into the Tauri resource tree.", {
      cause: String(err),
    });
  }

  const checksums: PackagedRuntimeChecksumReport = {
    platformKey: requiredPlatformKey,
    epubcheckVersion: input.validatorInventory.epubcheck.version,
    epubcheckArtifactSha256: validator.value.epubcheckArtifactSha256,
    temurinArtifactSha256: validator.value.temurinArtifactSha256,
    temurinArtifactName: validator.value.temurinArtifactName,
    jlinkJavaSha256: validator.value.jlinkJavaSha256,
    typstVersion: input.pdfInventory.typst.version,
    typstArtifactSha256: pdf.value.typstArtifactSha256,
    typstExecutableSha256: pdf.value.typstExecutableSha256,
    fontSha256: pdf.value.fontSha256,
  };

  const assemblyEvidencePath = path.join(destinationResourceRoot, "assembly-evidence.json");
  const assemblyEvidence = {
    assembledAt: new Date().toISOString(),
    gate: "Gate 10 Slice 2",
    adr: "ADR-0032",
    requiredPlatformKey,
    destinationResourceRoot: destinationResourceRoot.replace(/\\/g, "/"),
    layout: {
      validatorRuntimeDir: PACKAGED_VALIDATOR_RUNTIME_DIR,
      pdfRuntimeDir: PACKAGED_PDF_RUNTIME_DIR,
    },
    checksums,
  };

  try {
    writeFileSync(assemblyEvidencePath, `${JSON.stringify(assemblyEvidence, null, 2)}\n`, "utf8");
  } catch (err) {
    return fail("ASSEMBLY_IO_ERROR", "Failed to write assembly-evidence.json.", {
      cause: String(err),
    });
  }

  return {
    ok: true,
    value: {
      destinationResourceRoot,
      validatorRuntimeRoot,
      pdfRuntimeRoot,
      assemblyEvidencePath,
      checksums,
    },
  };
}

/** List immediate child names (test helper / CLI diagnostics). */
export function listImmediateChildren(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}
