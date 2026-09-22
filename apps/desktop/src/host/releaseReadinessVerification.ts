// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 5: release-readiness verification (ADR-0032).
 *
 * Automated checks that a packaged resource tree contains Gate 5/6 runtimes,
 * validation remains an offline/local filesystem operation, and failure kinds
 * stay distinct (conformance vs missing_runtime vs process).
 *
 * This module NEVER declares FOUNDATION-READY / FOUNDATION-GOVERNANCE-READY.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { locatePackagedRuntimes } from "./packagedRuntimeLocator.js";
import {
  assertReleaseArtifactManifestShape,
  WINDOWS_DISTRIBUTABLE_IDENTITY_FILE,
  WINDOWS_RELEASE_ARTIFACT_MANIFEST_FILE,
} from "./windowsDistributableIdentity.js";

/** Gate 10 packaging verification kind (distinct from ADR-0028 reproducibility). */
export const GATE10_RELEASE_READINESS_VERIFICATION_KIND =
  "gate10-release-readiness-verification" as const;

export type Gate10ReadinessCheckStatus =
  | "pass"
  | "fail"
  | "skip"
  | "verified-with-limitations";

export type Gate10ReadinessOverallStatus =
  | "verified-with-limitations"
  | "failed"
  | "unresolved";

export interface Gate10ReadinessCheck {
  readonly id: string;
  readonly name: string;
  readonly status: Gate10ReadinessCheckStatus;
  readonly notes: string;
}

export interface Gate10ReleaseReadinessReport {
  readonly schemaVersion: "1.0";
  readonly verificationKind: typeof GATE10_RELEASE_READINESS_VERIFICATION_KIND;
  readonly gate: "Gate 10 Slice 5";
  readonly adr: "ADR-0032";
  readonly verifiedAt: string;
  /** Always false — Slice 5 forbids FOUNDATION-READY claims. */
  readonly foundationReady: false;
  readonly foundationGovernanceReady: false;
  readonly overallStatus: Gate10ReadinessOverallStatus;
  readonly platformKey: string;
  readonly resourceRoot?: string;
  readonly checks: readonly Gate10ReadinessCheck[];
  readonly environmentalLimitations: readonly string[];
  readonly notes: string;
}

export type ReleaseReadinessVerificationErrorCode =
  | "MISSING_RESOURCE_ROOT"
  | "VERIFICATION_IO_ERROR";

export interface ReleaseReadinessVerificationError {
  readonly code: ReleaseReadinessVerificationErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export type ReleaseReadinessVerificationResult =
  | { readonly ok: true; readonly value: Gate10ReleaseReadinessReport }
  | { readonly ok: false; readonly error: ReleaseReadinessVerificationError };

export interface VerifyGate10ReleaseReadinessInput {
  /** Assembled Slice 2 resource root to verify. */
  readonly resourceRoot: string;
  /** Optional Slice 4 packaging-out directory (identity + ADR-0028 manifest). */
  readonly packagingOutDir?: string;
  /** Optional explicit identity JSON path. */
  readonly identityRecordPath?: string;
  /** Optional explicit ADR-0028 release-artifact-manifest path. */
  readonly releaseArtifactManifestPath?: string;
  /**
   * Source files to scan for offline-validation posture (no runtime download
   * URLs / first-run fetch invitations). Defaults to empty → check skipped
   * unless callers (CLI) supply host/adapter sources.
   */
  readonly offlinePostureSourcePaths?: readonly string[];
  readonly platformKey?: string;
  /** When true, write report JSON beside packagingOutDir / outputPath. */
  readonly outputPath?: string;
}

const DEFAULT_LIMITATIONS = [
  "Windows x64 is the first Gate 10 packaging target; other OS/arch remain Packaging Analysis Only until native evidence exists.",
  "Font-by-font redistribution evidence remains unresolved per ADR-0028.",
  "Gate 10 Slice 5 does not declare FOUNDATION-READY or FOUNDATION-GOVERNANCE-READY.",
  "Code signing, publication, and SmartScreen are out of scope.",
] as const;

/** Patterns that would indicate first-run / network runtime acquisition. */
const FORBIDDEN_RUNTIME_NETWORK_PATTERNS: readonly RegExp[] = [
  /download.*(epubcheck|temurin|jlink|typst)/i,
  /https?:\/\/[^\s"'`]+.*(epubcheck|adoptium|temurin|typst)/i,
  /first[-_ ]?run.*download/i,
  /auto[-_ ]?update.*(?:epubcheck|typst|jre|jdk)/i,
];

function fail(
  code: ReleaseReadinessVerificationErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ReleaseReadinessVerificationResult {
  return { ok: false, error: { code, message, details } };
}

function check(
  id: string,
  name: string,
  status: Gate10ReadinessCheckStatus,
  notes: string,
): Gate10ReadinessCheck {
  return { id, name, status, notes };
}

/**
 * Contract probe: packaged locator failures are always `missing_runtime`,
 * never EPUB conformance.
 */
export function assertFailureKindsRemainDistinct(): Gate10ReadinessCheck {
  const envKeys = [
    "OPENBOOK_VALIDATOR_RUNTIME_ROOT",
    "OPENBOOK_PDF_RUNTIME_ROOT",
  ] as const;
  const previous = new Map<string, string | undefined>();
  for (const key of envKeys) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
  try {
    const probe = locatePackagedRuntimes({
      resourceRoot: path.join(path.sep, "__openbook_gate10_missing_resource_root__"),
    });
    if (probe.ok) {
      return check(
        "failure-kinds-distinct",
        "Failure kinds remain distinct",
        "fail",
        "Expected missing resource root to fail closed; locator unexpectedly succeeded.",
      );
    }
    if (probe.error.failureKind !== "missing_runtime") {
      return check(
        "failure-kinds-distinct",
        "Failure kinds remain distinct",
        "fail",
        `Expected failureKind "missing_runtime", got "${probe.error.failureKind}".`,
      );
    }
    return check(
      "failure-kinds-distinct",
      "Failure kinds remain distinct",
      "pass",
      'Packaged locator reports failureKind "missing_runtime" (not conformance) when runtimes are absent.',
    );
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/**
 * Scan sources for forbidden first-run / network runtime acquisition patterns.
 */
export function verifyOfflineValidationPosture(
  sourcePaths: readonly string[],
): Gate10ReadinessCheck {
  if (sourcePaths.length === 0) {
    return check(
      "offline-validation-posture",
      "Validation does not require network",
      "skip",
      "No offline-posture source paths supplied; CLI should pass Gate 5/6 resolve + desktop host sources.",
    );
  }

  const hits: string[] = [];
  for (const sourcePath of sourcePaths) {
    const resolved = path.resolve(sourcePath);
    if (!existsSync(resolved)) {
      hits.push(`missing source: ${resolved}`);
      continue;
    }
    let text: string;
    try {
      text = readFileSync(resolved, "utf8");
    } catch (err) {
      hits.push(`unreadable source: ${resolved} (${String(err)})`);
      continue;
    }
    for (const pattern of FORBIDDEN_RUNTIME_NETWORK_PATTERNS) {
      if (pattern.test(text)) {
        hits.push(`${resolved} matched ${pattern}`);
      }
    }
  }

  if (hits.length > 0) {
    return check(
      "offline-validation-posture",
      "Validation does not require network",
      "fail",
      `Forbidden runtime network/download posture detected: ${hits.join("; ")}`,
    );
  }

  return check(
    "offline-validation-posture",
    "Validation does not require network",
    "pass",
    `Scanned ${sourcePaths.length} source file(s); no first-run/runtime download acquisition patterns found.`,
  );
}

function verifyPackagedRuntimesPresent(resourceRoot: string): Gate10ReadinessCheck {
  const discovery = locatePackagedRuntimes({ resourceRoot });
  if (!discovery.ok) {
    return check(
      "packaged-runtimes-present",
      "Package contains Gate 5/6 runtimes",
      "fail",
      `${discovery.error.code}: ${discovery.error.message}`,
    );
  }
  return check(
    "packaged-runtimes-present",
    "Package contains Gate 5/6 runtimes",
    "pass",
    `Located validator java=${discovery.validator.javaExecutablePath} and typst=${discovery.pdf.typstExecutablePath} under packaged resource root.`,
  );
}

function verifyNoFoundationReadyClaim(
  identityPath: string | undefined,
  manifestPath: string | undefined,
): Gate10ReadinessCheck {
  const offenders: string[] = [];

  for (const filePath of [identityPath, manifestPath]) {
    if (!filePath || !existsSync(filePath)) continue;
    try {
      const text = readFileSync(filePath, "utf8").toLowerCase();
      if (
        text.includes("foundation-ready") ||
        text.includes("foundation_ready") ||
        text.includes('"foundationready": true')
      ) {
        offenders.push(filePath);
      }
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
      if (parsed.foundationReady === true || parsed.foundationGovernanceReady === true) {
        offenders.push(filePath);
      }
      if (
        typeof parsed.releaseStatus === "string" &&
        parsed.releaseStatus.toLowerCase().includes("foundation")
      ) {
        offenders.push(filePath);
      }
    } catch {
      // Malformed identity/manifest handled by dedicated checks.
    }
  }

  if (offenders.length > 0) {
    return check(
      "no-foundation-ready-declaration",
      "No FOUNDATION-READY declaration",
      "fail",
      `FOUNDATION-READY claim detected in: ${offenders.join(", ")}`,
    );
  }

  return check(
    "no-foundation-ready-declaration",
    "No FOUNDATION-READY declaration",
    "pass",
    "Slice 5 report keeps foundationReady=false; identity/manifest (if present) do not claim FOUNDATION-READY.",
  );
}

function verifyIdentityLinkage(
  identityPath: string | undefined,
  manifestPath: string | undefined,
): Gate10ReadinessCheck {
  if (!identityPath && !manifestPath) {
    return check(
      "identity-manifest-linkage",
      "Slice 4 identity / ADR-0028 linkage",
      "skip",
      "No Slice 4 identity or release-artifact-manifest path supplied.",
    );
  }

  const notes: string[] = [];

  if (identityPath) {
    if (!existsSync(identityPath)) {
      return check(
        "identity-manifest-linkage",
        "Slice 4 identity / ADR-0028 linkage",
        "fail",
        `Identity record missing: ${identityPath}`,
      );
    }
    try {
      const identity = JSON.parse(readFileSync(identityPath, "utf8")) as Record<string, unknown>;
      if (identity.releaseStatus !== "unresolved" || identity.fontEvidenceStatus !== "unresolved") {
        return check(
          "identity-manifest-linkage",
          "Slice 4 identity / ADR-0028 linkage",
          "fail",
          "Identity must keep releaseStatus and fontEvidenceStatus as unresolved.",
        );
      }
      notes.push(`identity ok (${path.basename(identityPath)})`);
    } catch (err) {
      return check(
        "identity-manifest-linkage",
        "Slice 4 identity / ADR-0028 linkage",
        "fail",
        `Failed to parse identity: ${String(err)}`,
      );
    }
  }

  if (manifestPath) {
    if (!existsSync(manifestPath)) {
      return check(
        "identity-manifest-linkage",
        "Slice 4 identity / ADR-0028 linkage",
        "fail",
        `Release artifact manifest missing: ${manifestPath}`,
      );
    }
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown;
      const shape = assertReleaseArtifactManifestShape(manifest);
      if (!shape.ok) {
        return check(
          "identity-manifest-linkage",
          "Slice 4 identity / ADR-0028 linkage",
          "fail",
          shape.error.message,
        );
      }
      notes.push("ADR-0028 manifest keeps release.status unresolved");
    } catch (err) {
      return check(
        "identity-manifest-linkage",
        "Slice 4 identity / ADR-0028 linkage",
        "fail",
        `Failed to parse release artifact manifest: ${String(err)}`,
      );
    }
  }

  return check(
    "identity-manifest-linkage",
    "Slice 4 identity / ADR-0028 linkage",
    "pass",
    notes.join("; "),
  );
}

function resolveOptionalPaths(input: VerifyGate10ReleaseReadinessInput): {
  identityPath?: string;
  manifestPath?: string;
} {
  const packagingOut = input.packagingOutDir
    ? path.resolve(input.packagingOutDir)
    : undefined;
  const identityPath =
    input.identityRecordPath ??
    (packagingOut ? path.join(packagingOut, WINDOWS_DISTRIBUTABLE_IDENTITY_FILE) : undefined);
  const manifestPath =
    input.releaseArtifactManifestPath ??
    (packagingOut
      ? path.join(packagingOut, WINDOWS_RELEASE_ARTIFACT_MANIFEST_FILE)
      : undefined);
  return { identityPath, manifestPath };
}

function overallFrom(checks: readonly Gate10ReadinessCheck[]): Gate10ReadinessOverallStatus {
  if (checks.some((c) => c.status === "fail")) return "failed";
  const actionable = checks.filter((c) => c.status !== "skip");
  if (actionable.length === 0) return "unresolved";
  return "verified-with-limitations";
}

/**
 * Run Gate 10 Slice 5 release-readiness verification against a packaged
 * resource root (and optional Slice 4 identity outputs).
 */
export function verifyGate10ReleaseReadiness(
  input: VerifyGate10ReleaseReadinessInput,
): ReleaseReadinessVerificationResult {
  const resourceRoot = path.resolve(input.resourceRoot);
  if (!existsSync(resourceRoot)) {
    return fail("MISSING_RESOURCE_ROOT", "Packaged resource root does not exist.", {
      resourceRoot,
    });
  }

  const { identityPath, manifestPath } = resolveOptionalPaths(input);
  const platformKey = input.platformKey ?? "windows-x64";

  const checks: Gate10ReadinessCheck[] = [
    verifyPackagedRuntimesPresent(resourceRoot),
    assertFailureKindsRemainDistinct(),
    verifyOfflineValidationPosture(input.offlinePostureSourcePaths ?? []),
    verifyNoFoundationReadyClaim(identityPath, manifestPath),
    verifyIdentityLinkage(identityPath, manifestPath),
  ];

  const overallStatus = overallFrom(checks);
  const report: Gate10ReleaseReadinessReport = {
    schemaVersion: "1.0",
    verificationKind: GATE10_RELEASE_READINESS_VERIFICATION_KIND,
    gate: "Gate 10 Slice 5",
    adr: "ADR-0032",
    verifiedAt: new Date().toISOString(),
    foundationReady: false,
    foundationGovernanceReady: false,
    overallStatus,
    platformKey,
    resourceRoot: resourceRoot.replace(/\\/g, "/"),
    checks,
    environmentalLimitations: [...DEFAULT_LIMITATIONS],
    notes:
      "Gate 10 Slice 5 packaging verification only. Passing checks do not authorize FOUNDATION-READY, font clearance, code signing, or publication.",
  };

  if (input.outputPath) {
    try {
      const out = path.resolve(input.outputPath);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    } catch (err) {
      return fail("VERIFICATION_IO_ERROR", "Failed to write verification report.", {
        cause: String(err),
      });
    }
  }

  return { ok: true, value: report };
}
