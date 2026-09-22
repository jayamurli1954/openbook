// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 4: Windows distributable identity (ADR-0032).
 *
 * Records a reviewable Windows package identity (name, version, source commit,
 * SHA-256) and writes an ADR-0028 release-artifact-manifest linkage.
 * Unresolved evidence stays unresolved — this module does not certify release
 * readiness or clear fonts.
 *
 * Does not code-sign, publish, or declare FOUNDATION-READY (Slice 5).
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GATE10_WINDOWS_PLATFORM_KEY } from "./packagedResourceAssembly.js";

/** Tauri Windows installer family selected for Gate 10 Slice 4. */
export const GATE10_WINDOWS_INSTALLER_FAMILY = "nsis" as const;

export type Gate10WindowsInstallerFamily = typeof GATE10_WINDOWS_INSTALLER_FAMILY;

export const WINDOWS_DISTRIBUTABLE_IDENTITY_FILE = "windows-distributable-identity.json";
export const WINDOWS_RELEASE_ARTIFACT_MANIFEST_FILE = "release-artifact-manifest.json";

/** Default ADR-0028 notice / font / inventory linkage paths (repo-relative). */
export const DEFAULT_NOTICE_REFERENCES = [
  "docs/release-compliance/THIRD-PARTY-NOTICES.md",
  "packages/validator/packaging/THIRD-PARTY-NOTICES.md",
  "packages/pdf/packaging/THIRD-PARTY-NOTICES.md",
] as const;

export const DEFAULT_FONT_EVIDENCE_REFERENCES = [
  "docs/release-compliance/FONT-PROVENANCE-POLICY.md",
] as const;

export const DEFAULT_EVIDENCE_INVENTORY_REFERENCES = [
  "docs/release-compliance/evidence-inventory.schema.json",
  "docs/release-compliance/RELEASE-ARTIFACT-MANIFEST.md",
] as const;

export type WindowsDistributableIdentityErrorCode =
  | "MISSING_ARTIFACT"
  | "MISSING_ASSEMBLY_EVIDENCE"
  | "MALFORMED_ASSEMBLY_EVIDENCE"
  | "MISSING_METADATA"
  | "UNSUPPORTED_INSTALLER_FAMILY"
  | "IDENTITY_IO_ERROR";

export interface WindowsDistributableIdentityError {
  readonly code: WindowsDistributableIdentityErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export type WindowsDistributableIdentityResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: WindowsDistributableIdentityError };

export interface ShippedRuntimePins {
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

export interface RecordWindowsDistributableIdentityInput {
  /** Path to the produced Windows installer (or other reviewable package file). */
  readonly artifactPath: string;
  /** Application product name (e.g. from tauri.conf.json `productName`). */
  readonly applicationName: string;
  /** Application version recorded in the bundle (e.g. tauri.conf.json `version`). */
  readonly applicationVersion: string;
  /** Application identifier (e.g. tauri.conf.json `identifier`). */
  readonly applicationIdentifier: string;
  /** Full git commit SHA that produced the artifact. */
  readonly sourceCommit: string;
  /** Output directory for identity + ADR-0028 manifest files. */
  readonly outputDir: string;
  /**
   * Installer family. Gate 10 Slice 4 evaluates and selects NSIS.
   * Other families are rejected until separately authorized.
   */
  readonly installerFamily?: Gate10WindowsInstallerFamily;
  /** Production platform pin (default windows-x64). */
  readonly platformKey?: string;
  /**
   * Path to Slice 2 `assembly-evidence.json` (preferred source of shipped
   * runtime pins). Required unless `runtimePins` is provided explicitly.
   */
  readonly assemblyEvidencePath?: string;
  /** Explicit runtime pins (tests / callers that already verified assembly). */
  readonly runtimePins?: ShippedRuntimePins;
  readonly noticeReferences?: readonly string[];
  readonly fontEvidenceReferences?: readonly string[];
  readonly evidenceInventoryReferences?: readonly string[];
  /** Optional dependency lock path recorded on the ADR-0028 release block. */
  readonly dependencyLock?: string;
  /** Optional environment/toolchain note (does not claim reproducibility). */
  readonly environment?: string;
}

export interface WindowsDistributableArtifactIdentity {
  readonly name: string;
  readonly path: string;
  readonly classification: "installer";
  readonly sha256: string;
  readonly installerFamily: Gate10WindowsInstallerFamily;
}

export interface WindowsDistributableIdentityRecord {
  readonly gate: "Gate 10 Slice 4";
  readonly adr: "ADR-0032";
  readonly recordedAt: string;
  readonly installerFamily: Gate10WindowsInstallerFamily;
  readonly platformKey: string;
  readonly application: {
    readonly name: string;
    readonly version: string;
    readonly identifier: string;
  };
  readonly sourceCommit: string;
  readonly artifact: WindowsDistributableArtifactIdentity;
  readonly runtimePins: ShippedRuntimePins;
  readonly releaseArtifactManifestPath: string;
  readonly identityRecordPath: string;
  readonly fontEvidenceStatus: "unresolved";
  readonly releaseStatus: "unresolved";
  readonly notes: string;
}

/** ADR-0028 release-artifact-manifest (schemaVersion 1.0) shape. */
export interface ReleaseArtifactManifestDocument {
  readonly schemaVersion: "1.0";
  readonly manifestKind: "release-artifact-manifest";
  readonly release: {
    readonly sourceCommit: string;
    readonly status: "unresolved";
    readonly releaseId?: string;
    readonly dependencyLock?: string;
    readonly environment?: string;
  };
  readonly artifacts: ReadonlyArray<{
    readonly name: string;
    readonly version: string;
    readonly classification: "installer";
    readonly status: "unresolved";
    readonly path: string;
    readonly integrity: { readonly algorithm: "SHA-256"; readonly value: string };
    readonly evidenceReferences: readonly string[];
    readonly noticeReferences: readonly string[];
    readonly fontEvidenceReferences: readonly string[];
    readonly notes: string;
  }>;
}

function fail<T>(
  code: WindowsDistributableIdentityErrorCode,
  message: string,
  details?: Record<string, unknown>,
): WindowsDistributableIdentityResult<T> {
  return { ok: false, error: { code, message, details } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

/**
 * Read shipped runtime pins from Slice 2 assembly-evidence.json.
 */
export function readRuntimePinsFromAssemblyEvidence(
  assemblyEvidencePath: string,
): WindowsDistributableIdentityResult<ShippedRuntimePins> {
  const resolved = path.resolve(assemblyEvidencePath);
  if (!existsSync(resolved)) {
    return fail(
      "MISSING_ASSEMBLY_EVIDENCE",
      "assembly-evidence.json is missing; assemble Windows resources before recording identity.",
      { assemblyEvidencePath: resolved },
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolved, "utf8"));
  } catch (err) {
    return fail("MALFORMED_ASSEMBLY_EVIDENCE", "Failed to parse assembly-evidence.json.", {
      cause: String(err),
    });
  }
  if (!isRecord(parsed) || !isRecord(parsed.checksums)) {
    return fail(
      "MALFORMED_ASSEMBLY_EVIDENCE",
      "assembly-evidence.json must contain a checksums object.",
    );
  }

  const c = parsed.checksums;
  const platformKey = asString(c.platformKey);
  const epubcheckVersion = asString(c.epubcheckVersion);
  const epubcheckArtifactSha256 = asString(c.epubcheckArtifactSha256);
  const temurinArtifactSha256 = asString(c.temurinArtifactSha256);
  const temurinArtifactName = asString(c.temurinArtifactName);
  const jlinkJavaSha256 = asString(c.jlinkJavaSha256);
  const typstVersion = asString(c.typstVersion);
  const typstArtifactSha256 = asString(c.typstArtifactSha256);
  const typstExecutableSha256 = asString(c.typstExecutableSha256);
  const fontSha256Raw = c.fontSha256;

  if (
    !platformKey ||
    !epubcheckVersion ||
    !epubcheckArtifactSha256 ||
    !temurinArtifactSha256 ||
    !temurinArtifactName ||
    !jlinkJavaSha256 ||
    !typstVersion ||
    !typstArtifactSha256 ||
    !typstExecutableSha256 ||
    !isRecord(fontSha256Raw)
  ) {
    return fail(
      "MALFORMED_ASSEMBLY_EVIDENCE",
      "assembly-evidence.json checksums are incomplete for Gate 10 identity.",
    );
  }

  const fontSha256: Record<string, string> = {};
  for (const [name, value] of Object.entries(fontSha256Raw)) {
    const sha = asString(value);
    if (!sha) {
      return fail(
        "MALFORMED_ASSEMBLY_EVIDENCE",
        "assembly-evidence.json fontSha256 entries must be strings.",
        { font: name },
      );
    }
    fontSha256[name] = sha;
  }

  return {
    ok: true,
    value: {
      platformKey,
      epubcheckVersion,
      epubcheckArtifactSha256,
      temurinArtifactSha256,
      temurinArtifactName,
      jlinkJavaSha256,
      typstVersion,
      typstArtifactSha256,
      typstExecutableSha256,
      fontSha256,
    },
  };
}

function requireNonEmpty(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Structural check that a document matches ADR-0028 release-artifact-manifest
 * required fields used by Gate 10 Slice 4 (not a full JSON Schema engine).
 */
export function assertReleaseArtifactManifestShape(
  doc: unknown,
): WindowsDistributableIdentityResult<ReleaseArtifactManifestDocument> {
  if (!isRecord(doc)) {
    return fail("MISSING_METADATA", "Release artifact manifest must be an object.");
  }
  if (doc.schemaVersion !== "1.0" || doc.manifestKind !== "release-artifact-manifest") {
    return fail(
      "MISSING_METADATA",
      'Manifest must use schemaVersion "1.0" and manifestKind "release-artifact-manifest".',
    );
  }
  if (!isRecord(doc.release) || typeof doc.release.sourceCommit !== "string") {
    return fail("MISSING_METADATA", "Manifest release.sourceCommit is required.");
  }
  if (doc.release.status !== "unresolved") {
    return fail(
      "MISSING_METADATA",
      'Gate 10 Slice 4 keeps release.status "unresolved" (no production certification).',
    );
  }
  if (!Array.isArray(doc.artifacts) || doc.artifacts.length < 1) {
    return fail("MISSING_METADATA", "Manifest must list at least one artifact.");
  }
  return { ok: true, value: doc as unknown as ReleaseArtifactManifestDocument };
}

/**
 * Hash a Windows distributable, write identity + ADR-0028 manifest linkage.
 * Font and overall release evidence remain `unresolved`.
 */
export function recordWindowsDistributableIdentity(
  input: RecordWindowsDistributableIdentityInput,
): WindowsDistributableIdentityResult<WindowsDistributableIdentityRecord> {
  const installerFamily = input.installerFamily ?? GATE10_WINDOWS_INSTALLER_FAMILY;
  if (installerFamily !== GATE10_WINDOWS_INSTALLER_FAMILY) {
    return fail(
      "UNSUPPORTED_INSTALLER_FAMILY",
      `Installer family "${String(installerFamily)}" is not authorized; Gate 10 Slice 4 selects NSIS.`,
      { installerFamily },
    );
  }

  const applicationName = requireNonEmpty(input.applicationName);
  const applicationVersion = requireNonEmpty(input.applicationVersion);
  const applicationIdentifier = requireNonEmpty(input.applicationIdentifier);
  const sourceCommit = requireNonEmpty(input.sourceCommit);
  if (!applicationName || !applicationVersion || !applicationIdentifier || !sourceCommit) {
    return fail(
      "MISSING_METADATA",
      "applicationName, applicationVersion, applicationIdentifier, and sourceCommit are required.",
    );
  }

  const artifactPath = path.resolve(input.artifactPath);
  if (!existsSync(artifactPath)) {
    return fail("MISSING_ARTIFACT", "Windows distributable artifact file does not exist.", {
      artifactPath,
    });
  }

  const platformKey = input.platformKey ?? GATE10_WINDOWS_PLATFORM_KEY;
  let runtimePins: ShippedRuntimePins;
  if (input.runtimePins) {
    runtimePins = input.runtimePins;
  } else if (input.assemblyEvidencePath) {
    const pins = readRuntimePinsFromAssemblyEvidence(input.assemblyEvidencePath);
    if (!pins.ok) return pins;
    runtimePins = pins.value;
  } else {
    return fail(
      "MISSING_ASSEMBLY_EVIDENCE",
      "Provide assemblyEvidencePath or runtimePins so shipped Gate 5/6 pins are recorded.",
    );
  }

  if (runtimePins.platformKey !== platformKey) {
    return fail(
      "MALFORMED_ASSEMBLY_EVIDENCE",
      `Runtime pin platform "${runtimePins.platformKey}" does not match required "${platformKey}".`,
      { runtimePinsPlatform: runtimePins.platformKey, platformKey },
    );
  }

  let artifactSha256: string;
  try {
    artifactSha256 = sha256File(artifactPath);
  } catch (err) {
    return fail("IDENTITY_IO_ERROR", "Failed to hash the Windows distributable artifact.", {
      cause: String(err),
    });
  }

  const outputDir = path.resolve(input.outputDir);
  const artifactName = path.basename(artifactPath);
  const posixArtifactPath = artifactPath.replace(/\\/g, "/");
  const noticeReferences = [
    ...(input.noticeReferences ?? DEFAULT_NOTICE_REFERENCES),
  ];
  const fontEvidenceReferences = [
    ...(input.fontEvidenceReferences ?? DEFAULT_FONT_EVIDENCE_REFERENCES),
  ];
  const evidenceInventoryReferences = [
    ...(input.evidenceInventoryReferences ?? DEFAULT_EVIDENCE_INVENTORY_REFERENCES),
  ];

  const notes =
    "Gate 10 Slice 4 records Windows NSIS distributable identity and ADR-0028 manifest linkage. " +
    "Font-by-font clearance and production inventory population remain unresolved. " +
    "No code signing, publication, or FOUNDATION-READY declaration.";

  const manifest: ReleaseArtifactManifestDocument = {
    schemaVersion: "1.0",
    manifestKind: "release-artifact-manifest",
    release: {
      sourceCommit,
      status: "unresolved",
      releaseId: `gate10-slice4-windows-nsis-${applicationVersion}`,
      ...(input.dependencyLock ? { dependencyLock: input.dependencyLock } : {}),
      ...(input.environment ? { environment: input.environment } : {}),
    },
    artifacts: [
      {
        name: artifactName,
        version: applicationVersion,
        classification: "installer",
        status: "unresolved",
        path: posixArtifactPath,
        integrity: { algorithm: "SHA-256", value: artifactSha256 },
        evidenceReferences: evidenceInventoryReferences,
        noticeReferences,
        fontEvidenceReferences,
        notes,
      },
    ],
  };

  const shape = assertReleaseArtifactManifestShape(manifest);
  if (!shape.ok) return shape;

  const identityRecordPath = path.join(outputDir, WINDOWS_DISTRIBUTABLE_IDENTITY_FILE);
  const releaseArtifactManifestPath = path.join(
    outputDir,
    WINDOWS_RELEASE_ARTIFACT_MANIFEST_FILE,
  );

  const record: WindowsDistributableIdentityRecord = {
    gate: "Gate 10 Slice 4",
    adr: "ADR-0032",
    recordedAt: new Date().toISOString(),
    installerFamily,
    platformKey,
    application: {
      name: applicationName,
      version: applicationVersion,
      identifier: applicationIdentifier,
    },
    sourceCommit,
    artifact: {
      name: artifactName,
      path: posixArtifactPath,
      classification: "installer",
      sha256: artifactSha256,
      installerFamily,
    },
    runtimePins,
    releaseArtifactManifestPath: releaseArtifactManifestPath.replace(/\\/g, "/"),
    identityRecordPath: identityRecordPath.replace(/\\/g, "/"),
    fontEvidenceStatus: "unresolved",
    releaseStatus: "unresolved",
    notes,
  };

  try {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(identityRecordPath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    writeFileSync(releaseArtifactManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } catch (err) {
    return fail("IDENTITY_IO_ERROR", "Failed to write Windows distributable identity outputs.", {
      cause: String(err),
    });
  }

  return { ok: true, value: record };
}
