// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { GATE10_WINDOWS_PLATFORM_KEY } from "./packagedResourceAssembly.js";
import {
  GATE10_WINDOWS_INSTALLER_FAMILY,
  WINDOWS_DISTRIBUTABLE_IDENTITY_FILE,
  WINDOWS_RELEASE_ARTIFACT_MANIFEST_FILE,
  assertReleaseArtifactManifestShape,
  readRuntimePinsFromAssemblyEvidence,
  recordWindowsDistributableIdentity,
  type ShippedRuntimePins,
} from "./windowsDistributableIdentity.js";

function hexOf(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

async function withTempDir(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "openbook-gate10-slice4-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function fixturePins(): ShippedRuntimePins {
  return {
    platformKey: GATE10_WINDOWS_PLATFORM_KEY,
    epubcheckVersion: "5.3.0",
    epubcheckArtifactSha256: hexOf("epub-zip"),
    temurinArtifactSha256: hexOf("temurin-zip"),
    temurinArtifactName: "OpenJDK21U-jdk_x64_windows_hotspot_fixture.zip",
    jlinkJavaSha256: hexOf("java.exe"),
    typstVersion: "0.15.1",
    typstArtifactSha256: hexOf("typst-zip"),
    typstExecutableSha256: hexOf("typst.exe"),
    fontSha256: { "LibertinusSerif-Regular.otf": hexOf("font") },
  };
}

test("recordWindowsDistributableIdentity hashes NSIS artifact and keeps evidence unresolved", async () => {
  await withTempDir(async (root) => {
    const artifactPath = path.join(root, "OpenBook Studio_0.0.0_x64-setup.exe");
    const payload = "fake-nsis-installer-bytes";
    await writeFile(artifactPath, payload, "utf8");
    const outputDir = path.join(root, "packaging-out");
    const expectedSha = hexOf(payload);

    const result = recordWindowsDistributableIdentity({
      artifactPath,
      applicationName: "OpenBook Studio",
      applicationVersion: "0.0.0",
      applicationIdentifier: "com.sanmitra.openbook",
      sourceCommit: "abc123def456",
      outputDir,
      runtimePins: fixturePins(),
      dependencyLock: "package-lock.json",
      environment: "windows-x64-msvc-local",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.installerFamily, GATE10_WINDOWS_INSTALLER_FAMILY);
    assert.equal(result.value.platformKey, GATE10_WINDOWS_PLATFORM_KEY);
    assert.equal(result.value.artifact.sha256, expectedSha);
    assert.equal(result.value.artifact.classification, "installer");
    assert.equal(result.value.releaseStatus, "unresolved");
    assert.equal(result.value.fontEvidenceStatus, "unresolved");
    assert.equal(result.value.runtimePins.epubcheckVersion, "5.3.0");
    assert.equal(result.value.runtimePins.typstVersion, "0.15.1");

    const identityRaw = await readFile(
      path.join(outputDir, WINDOWS_DISTRIBUTABLE_IDENTITY_FILE),
      "utf8",
    );
    const identity = JSON.parse(identityRaw) as { artifact: { sha256: string } };
    assert.equal(identity.artifact.sha256, expectedSha);

    const manifestRaw = await readFile(
      path.join(outputDir, WINDOWS_RELEASE_ARTIFACT_MANIFEST_FILE),
      "utf8",
    );
    const manifest = JSON.parse(manifestRaw) as unknown;
    const shape = assertReleaseArtifactManifestShape(manifest);
    assert.equal(shape.ok, true);
    if (!shape.ok) return;
    assert.equal(shape.value.release.status, "unresolved");
    assert.equal(shape.value.release.sourceCommit, "abc123def456");
    assert.equal(shape.value.artifacts[0]?.classification, "installer");
    assert.equal(shape.value.artifacts[0]?.integrity.value, expectedSha);
    assert.equal(shape.value.artifacts[0]?.status, "unresolved");
    assert.ok(
      (shape.value.artifacts[0]?.fontEvidenceReferences ?? []).some((r) =>
        r.includes("FONT-PROVENANCE-POLICY"),
      ),
    );
  });
});

test("recordWindowsDistributableIdentity reads runtime pins from assembly-evidence.json", async () => {
  await withTempDir(async (root) => {
    const pins = fixturePins();
    const assemblyEvidencePath = path.join(root, "assembly-evidence.json");
    await writeFile(
      assemblyEvidencePath,
      `${JSON.stringify({ gate: "Gate 10 Slice 2", checksums: pins }, null, 2)}\n`,
      "utf8",
    );
    const artifactPath = path.join(root, "setup.exe");
    await writeFile(artifactPath, "bytes", "utf8");

    const fromEvidence = readRuntimePinsFromAssemblyEvidence(assemblyEvidencePath);
    assert.equal(fromEvidence.ok, true);

    const result = recordWindowsDistributableIdentity({
      artifactPath,
      applicationName: "OpenBook Studio",
      applicationVersion: "0.0.0",
      applicationIdentifier: "com.sanmitra.openbook",
      sourceCommit: "deadbeef",
      outputDir: path.join(root, "out"),
      assemblyEvidencePath,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.runtimePins.jlinkJavaSha256, pins.jlinkJavaSha256);
  });
});

test("recordWindowsDistributableIdentity fails closed on missing artifact", async () => {
  await withTempDir(async (root) => {
    const result = recordWindowsDistributableIdentity({
      artifactPath: path.join(root, "missing-setup.exe"),
      applicationName: "OpenBook Studio",
      applicationVersion: "0.0.0",
      applicationIdentifier: "com.sanmitra.openbook",
      sourceCommit: "deadbeef",
      outputDir: path.join(root, "out"),
      runtimePins: fixturePins(),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "MISSING_ARTIFACT");
  });
});

test("recordWindowsDistributableIdentity requires assembly evidence or runtime pins", async () => {
  await withTempDir(async (root) => {
    const artifactPath = path.join(root, "setup.exe");
    await writeFile(artifactPath, "x", "utf8");
    const result = recordWindowsDistributableIdentity({
      artifactPath,
      applicationName: "OpenBook Studio",
      applicationVersion: "0.0.0",
      applicationIdentifier: "com.sanmitra.openbook",
      sourceCommit: "deadbeef",
      outputDir: path.join(root, "out"),
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "MISSING_ASSEMBLY_EVIDENCE");
  });
});

test("assertReleaseArtifactManifestShape rejects confirmed release status inference", async () => {
  const shape = assertReleaseArtifactManifestShape({
    schemaVersion: "1.0",
    manifestKind: "release-artifact-manifest",
    release: { sourceCommit: "abc", status: "confirmed" },
    artifacts: [{ name: "x", classification: "installer", status: "confirmed" }],
  });
  assert.equal(shape.ok, false);
  if (shape.ok) return;
  assert.equal(shape.error.code, "MISSING_METADATA");
});

test("readRuntimePinsFromAssemblyEvidence fails when checksums incomplete", async () => {
  await withTempDir(async (root) => {
    const evidencePath = path.join(root, "assembly-evidence.json");
    await mkdir(root, { recursive: true });
    await writeFile(evidencePath, `${JSON.stringify({ checksums: { platformKey: "windows-x64" } })}\n`);
    const result = readRuntimePinsFromAssemblyEvidence(evidencePath);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "MALFORMED_ASSEMBLY_EVIDENCE");
  });
});
