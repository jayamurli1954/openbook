// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  PACKAGED_PDF_RUNTIME_DIR,
  PACKAGED_VALIDATOR_RUNTIME_DIR,
} from "./packagedRuntimeLocator.js";
import {
  assertFailureKindsRemainDistinct,
  verifyGate10ReleaseReadiness,
  verifyOfflineValidationPosture,
} from "./releaseReadinessVerification.js";

function hexOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function withTempDir(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "openbook-gate10-slice5-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const javaName = process.platform === "win32" ? "java.exe" : "java";
const typstName = process.platform === "win32" ? "typst.exe" : "typst";

async function writeCompletePackagedRoot(resourceRoot: string): Promise<void> {
  const javaPath = path.join(
    resourceRoot,
    PACKAGED_VALIDATOR_RUNTIME_DIR,
    "runtime",
    "bin",
    javaName,
  );
  const jarPath = path.join(
    resourceRoot,
    PACKAGED_VALIDATOR_RUNTIME_DIR,
    "epubcheck-5.3.0",
    "epubcheck.jar",
  );
  const typstPath = path.join(resourceRoot, PACKAGED_PDF_RUNTIME_DIR, "typst", typstName);
  const fontPath = path.join(
    resourceRoot,
    PACKAGED_PDF_RUNTIME_DIR,
    "fonts",
    "LibertinusSerif-Regular.otf",
  );
  for (const filePath of [javaPath, jarPath, typstPath, fontPath]) {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `fixture:${path.basename(filePath)}`, "utf8");
  }
  await writeFile(
    path.join(resourceRoot, "assembly-evidence.json"),
    `${JSON.stringify({ gate: "Gate 10 Slice 2", checksums: { platformKey: "windows-x64" } }, null, 2)}\n`,
  );
}

test("verifyGate10ReleaseReadiness passes complete packaged root with foundationReady false", async () => {
  await withTempDir(async (root) => {
    const resourceRoot = path.join(root, "resources");
    await writeCompletePackagedRoot(resourceRoot);
    const cleanSource = path.join(root, "clean-host.ts");
    await writeFile(
      cleanSource,
      "// local filesystem runtime discovery only\nexport const mode = 'offline';\n",
      "utf8",
    );

    const result = verifyGate10ReleaseReadiness({
      resourceRoot,
      offlinePostureSourcePaths: [cleanSource],
      outputPath: path.join(root, "packaging-out", "gate10-release-readiness.json"),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.foundationReady, false);
    assert.equal(result.value.foundationGovernanceReady, false);
    assert.equal(result.value.overallStatus, "verified-with-limitations");
    assert.equal(
      result.value.checks.find((c) => c.id === "packaged-runtimes-present")?.status,
      "pass",
    );
    assert.equal(
      result.value.checks.find((c) => c.id === "failure-kinds-distinct")?.status,
      "pass",
    );
    assert.equal(
      result.value.checks.find((c) => c.id === "offline-validation-posture")?.status,
      "pass",
    );
    assert.equal(
      result.value.checks.find((c) => c.id === "no-foundation-ready-declaration")?.status,
      "pass",
    );
    assert.ok(
      result.value.environmentalLimitations.some((n) => n.includes("FOUNDATION-READY")),
    );

    const written = JSON.parse(
      await readFile(path.join(root, "packaging-out", "gate10-release-readiness.json"), "utf8"),
    ) as { foundationReady: boolean };
    assert.equal(written.foundationReady, false);
  });
});

test("verifyGate10ReleaseReadiness fails when packaged runtimes are incomplete", async () => {
  await withTempDir(async (root) => {
    const resourceRoot = path.join(root, "resources");
    await mkdir(path.join(resourceRoot, PACKAGED_VALIDATOR_RUNTIME_DIR), { recursive: true });
    const result = verifyGate10ReleaseReadiness({ resourceRoot });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.overallStatus, "failed");
    assert.equal(
      result.value.checks.find((c) => c.id === "packaged-runtimes-present")?.status,
      "fail",
    );
    assert.equal(result.value.foundationReady, false);
  });
});

test("verifyOfflineValidationPosture fails on first-run download invitation", async () => {
  await withTempDir(async (root) => {
    const bad = path.join(root, "bad.ts");
    await writeFile(
      bad,
      'export async function boot() { await downloadTemurin("https://example.com/temurin.zip"); }\n',
      "utf8",
    );
    const check = verifyOfflineValidationPosture([bad]);
    assert.equal(check.status, "fail");
  });
});

test("assertFailureKindsRemainDistinct reports missing_runtime not conformance", () => {
  const check = assertFailureKindsRemainDistinct();
  assert.equal(check.status, "pass");
  assert.match(check.notes, /missing_runtime/);
});

test("verifyGate10ReleaseReadiness rejects FOUNDATION-READY in identity record", async () => {
  await withTempDir(async (root) => {
    const resourceRoot = path.join(root, "resources");
    await writeCompletePackagedRoot(resourceRoot);
    const packagingOut = path.join(root, "packaging-out");
    await mkdir(packagingOut, { recursive: true });
    await writeFile(
      path.join(packagingOut, "windows-distributable-identity.json"),
      `${JSON.stringify({
        releaseStatus: "unresolved",
        fontEvidenceStatus: "unresolved",
        foundationReady: true,
        artifact: { sha256: hexOf("x") },
      })}\n`,
    );

    const result = verifyGate10ReleaseReadiness({
      resourceRoot,
      packagingOutDir: packagingOut,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.overallStatus, "failed");
    assert.equal(
      result.value.checks.find((c) => c.id === "no-foundation-ready-declaration")?.status,
      "fail",
    );
  });
});

test("verifyGate10ReleaseReadiness accepts unresolved Slice 4 identity linkage", async () => {
  await withTempDir(async (root) => {
    const resourceRoot = path.join(root, "resources");
    await writeCompletePackagedRoot(resourceRoot);
    const packagingOut = path.join(root, "packaging-out");
    await mkdir(packagingOut, { recursive: true });
    await writeFile(
      path.join(packagingOut, "windows-distributable-identity.json"),
      `${JSON.stringify({
        releaseStatus: "unresolved",
        fontEvidenceStatus: "unresolved",
        foundationReady: false,
      })}\n`,
    );
    await writeFile(
      path.join(packagingOut, "release-artifact-manifest.json"),
      `${JSON.stringify({
        schemaVersion: "1.0",
        manifestKind: "release-artifact-manifest",
        release: { sourceCommit: "abc", status: "unresolved" },
        artifacts: [
          {
            name: "setup.exe",
            version: "0.0.0",
            classification: "installer",
            status: "unresolved",
            path: "setup.exe",
            integrity: { algorithm: "SHA-256", value: hexOf("setup") },
            evidenceReferences: [],
            noticeReferences: [],
            fontEvidenceReferences: [],
            notes: "unresolved",
          },
        ],
      })}\n`,
    );

    const result = verifyGate10ReleaseReadiness({
      resourceRoot,
      packagingOutDir: packagingOut,
      offlinePostureSourcePaths: [],
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(
      result.value.checks.find((c) => c.id === "identity-manifest-linkage")?.status,
      "pass",
    );
    // offline skipped → still verified-with-limitations if other checks pass
    assert.equal(result.value.overallStatus, "verified-with-limitations");
    assert.equal(result.value.foundationReady, false);
  });
});
