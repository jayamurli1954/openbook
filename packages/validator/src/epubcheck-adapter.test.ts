// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import * as assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EpubCheckSubprocessAdapter } from "./epubcheck-adapter.js";
import {
  readBuildEvidence,
  resolveHostPlatformKey,
  resolveProductionRuntime,
} from "./resolve-runtime.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");

const validEpub = path.join(
  rootDir,
  "tests",
  "fixtures",
  "validation-spike",
  "valid-minimal.epub",
);
const invalidEpub = path.join(
  rootDir,
  "tests",
  "fixtures",
  "validation-spike",
  "invalid-missing-nav.epub",
);

const inventoryPath = path.join(
  rootDir,
  "packages",
  "validator",
  "packaging",
  "inventory.json",
);

test("EpubCheckSubprocessAdapter interface & contract compliance", () => {
  const adapter = new EpubCheckSubprocessAdapter({
    javaExecutablePath: "java",
    epubcheckJarPath: "epubcheck.jar",
  });
  assert.ok(typeof adapter.validateEpub === "function");
});

test("inventory pins official EPUBCheck 5.3.0 and Temurin 21.0.12.1+1 with SHA-256", () => {
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  assert.equal(inventory.epubcheck.version, "5.3.0");
  assert.equal(
    inventory.epubcheck.sha256,
    "6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5",
  );
  assert.equal(inventory.temurin.ltsLine, "21");
  assert.equal(inventory.temurin.releaseName, "jdk-21.0.12.1+1");
  assert.ok(inventory.temurin.platforms["windows-x64"]?.sha256);
  assert.ok(inventory.temurin.platforms["linux-x64"]?.sha256);
  assert.ok(inventory.temurin.platforms["linux-aarch64"]?.sha256);
  assert.ok(inventory.temurin.platforms["mac-x64"]?.sha256);
  assert.ok(inventory.temurin.platforms["mac-aarch64"]?.sha256);
  assert.ok(inventory.jlink.modules.includes("java.base"));
  assert.ok(inventory.jlink.modules.includes("java.xml"));
});

test("resolveHostPlatformKey maps Node platforms to inventory keys", () => {
  assert.equal(resolveHostPlatformKey("win32", "x64"), "windows-x64");
  assert.equal(resolveHostPlatformKey("linux", "x64"), "linux-x64");
  assert.equal(resolveHostPlatformKey("linux", "arm64"), "linux-aarch64");
  assert.equal(resolveHostPlatformKey("darwin", "arm64"), "mac-aarch64");
});

test("missing bundled Java produces deterministic missing_runtime failure", async () => {
  const adapter = new EpubCheckSubprocessAdapter({
    javaExecutablePath: path.join(rootDir, ".cache", "validator-runtime", "missing-java"),
    epubcheckJarPath: path.join(rootDir, "packages", "validator", "packaging", "inventory.json"),
  });
  const report = await adapter.validateEpub(validEpub);
  assert.equal(report.isValid, false);
  assert.equal(report.failureKind, "missing_runtime");
  assert.equal(report.messages[0]?.id, "MISSING-RUNTIME");
});

test("missing EPUBCheck JAR produces deterministic missing_epubcheck failure", async () => {
  const fakeJava =
    process.platform === "win32"
      ? process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe"
      : "/bin/sh";
  const adapter = new EpubCheckSubprocessAdapter({
    javaExecutablePath: fakeJava,
    epubcheckJarPath: path.join(rootDir, ".cache", "validator-runtime", "missing.jar"),
  });
  const report = await adapter.validateEpub(validEpub);
  assert.equal(report.isValid, false);
  assert.equal(report.failureKind, "missing_epubcheck");
  assert.equal(report.messages[0]?.id, "MISSING-EPUBCHECK");
});

test("invalid EPUB path produces deterministic invalid_path failure", async () => {
  const runtime = resolveProductionRuntime({ repoRoot: rootDir });
  const javaPath = runtime?.javaExecutablePath ?? path.join(rootDir, "package.json");
  const jarPath = runtime?.epubcheckJarPath ?? path.join(rootDir, "package.json");
  const adapter = new EpubCheckSubprocessAdapter({
    javaExecutablePath: javaPath,
    epubcheckJarPath: jarPath,
  });
  const report = await adapter.validateEpub(path.join(rootDir, "does-not-exist.epub"));
  assert.equal(report.isValid, false);
  assert.equal(report.failureKind, "invalid_path");
  assert.equal(report.messages[0]?.id, "INVALID-PATH");
});

const runtime = resolveProductionRuntime({ repoRoot: rootDir });
const hasProductionRuntime = runtime !== null && fs.existsSync(validEpub);

test(
  "Gate 5 smoke: validates minimal valid EPUB with production jlink runtime",
  { skip: !hasProductionRuntime },
  async () => {
    assert.ok(runtime);
    const adapter = new EpubCheckSubprocessAdapter({
      javaExecutablePath: runtime.javaExecutablePath,
      epubcheckJarPath: runtime.epubcheckJarPath,
    });

    const report = await adapter.validateEpub(validEpub);
    assert.equal(report.validatorName, "EPUBCheck");
    assert.equal(report.validatorVersion, "5.3.0");
    assert.equal(report.isValid, true);
    assert.equal(report.failureKind, "none");
    assert.equal(report.rawExitCode, 0);
    assert.equal(report.summary.totalErrors, 0);
    assert.equal(report.summary.totalFatal, 0);
  },
);

test(
  "Gate 5 smoke: detects malformed EPUB with production jlink runtime",
  { skip: !hasProductionRuntime },
  async () => {
    assert.ok(runtime);
    const adapter = new EpubCheckSubprocessAdapter({
      javaExecutablePath: runtime.javaExecutablePath,
      epubcheckJarPath: runtime.epubcheckJarPath,
    });

    const report = await adapter.validateEpub(invalidEpub);
    assert.equal(report.validatorName, "EPUBCheck");
    assert.equal(report.validatorVersion, "5.3.0");
    assert.equal(report.isValid, false);
    assert.equal(report.failureKind, "conformance");
    assert.equal(report.rawExitCode, 1);
    assert.ok(report.summary.totalErrors > 0);
    assert.ok(report.messages.length > 0);

    const ruleIds = report.messages.map((m) => m.id);
    assert.ok(
      ruleIds.includes("RSC-005") || ruleIds.includes("OPF-049"),
      "Should identify missing nav or missing item rule violation",
    );
  },
);

test(
  "Gate 5 build evidence records EPUBCheck/Temurin hashes and jlink modules",
  { skip: !hasProductionRuntime || !runtime?.evidencePath },
  () => {
    assert.ok(runtime?.evidencePath);
    const evidence = readBuildEvidence(runtime.evidencePath) as {
      epubcheck: { version: string; artifactSha256: string };
      temurin: { releaseName: string; artifactSha256: string };
      jlink: { modules: string[]; runtimeSizeBytes: number };
      host: { platformKey: string };
    };
    assert.equal(evidence.epubcheck.version, "5.3.0");
    assert.equal(
      evidence.epubcheck.artifactSha256,
      "6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5",
    );
    assert.equal(evidence.temurin.releaseName, "jdk-21.0.12.1+1");
    assert.match(evidence.temurin.artifactSha256, /^[a-f0-9]{64}$/);
    assert.ok(evidence.jlink.modules.includes("java.base"));
    assert.ok(evidence.jlink.runtimeSizeBytes > 1_000_000);
    assert.equal(evidence.host.platformKey, resolveHostPlatformKey());
  },
);
