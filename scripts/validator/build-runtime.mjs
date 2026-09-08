#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 5 production packaging builder (ADR-0012).
 *
 * Downloads checksum-pinned EPUBCheck 5.3.0 and Eclipse Temurin 21 LTS for the
 * current host, verifies SHA-256, extracts, and builds a jlink minimized runtime.
 *
 * Does not download anything at application runtime — this is a build/CI step only.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const inventoryPath = path.join(
  repoRoot,
  "packages/validator/packaging/inventory.json",
);

const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));

function hostPlatformKey() {
  const arch =
    process.arch === "x64"
      ? "x64"
      : process.arch === "arm64"
        ? "aarch64"
        : process.arch;
  if (process.platform === "win32") return `windows-${arch}`;
  if (process.platform === "linux") return `linux-${arch}`;
  if (process.platform === "darwin") return `mac-${arch}`;
  throw new Error(`Unsupported host platform: ${process.platform}/${process.arch}`);
}

function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(readFileSync(filePath));
  return hash.digest("hex");
}

async function download(url, dest) {
  if (existsSync(dest)) return;
  mkdirSync(path.dirname(dest), { recursive: true });
  console.log(`Downloading ${url}`);
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function verifySha256(filePath, expected) {
  const actual = sha256File(filePath);
  if (actual.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(
      `SHA-256 mismatch for ${path.basename(filePath)}: expected ${expected}, got ${actual}`,
    );
  }
  console.log(`Checksum OK: ${path.basename(filePath)} = ${actual}`);
  return actual;
}

function findJavaHome(extractRoot) {
  const entries = readdirSync(extractRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = path.join(extractRoot, entry.name);
    const javaBin =
      process.platform === "win32"
        ? path.join(candidate, "bin", "java.exe")
        : path.join(candidate, "bin", "java");
    // macOS Temurin tarballs nest Contents/Home
    const macHome = path.join(candidate, "Contents", "Home", "bin", "java");
    if (existsSync(javaBin)) return candidate;
    if (existsSync(macHome)) return path.join(candidate, "Contents", "Home");
  }
  throw new Error(`Could not locate JDK home under ${extractRoot}`);
}

function extractArchive(archivePath, destDir, format) {
  if (existsSync(destDir)) rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });

  if (format === "zip") {
    if (process.platform === "win32") {
      execFileSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-Command",
          `Expand-Archive -LiteralPath '${archivePath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
        ],
        { stdio: "inherit" },
      );
    } else {
      execFileSync("unzip", ["-q", archivePath, "-d", destDir], {
        stdio: "inherit",
      });
    }
    return;
  }

  if (format === "tar.gz") {
    execFileSync("tar", ["-xzf", archivePath, "-C", destDir], {
      stdio: "inherit",
    });
    return;
  }

  throw new Error(`Unsupported archive format: ${format}`);
}

function dirSizeBytes(root) {
  let total = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else total += statSync(full).size;
    }
  };
  walk(root);
  return total;
}

async function main() {
  const platformKey = hostPlatformKey();
  const platform = inventory.temurin.platforms[platformKey];
  if (!platform) {
    throw new Error(`No Temurin pin for platform key ${platformKey}`);
  }

  const cacheRoot = path.join(repoRoot, inventory.layout.cacheRoot);
  const downloads = path.join(cacheRoot, "downloads");
  const jdkExtract = path.join(cacheRoot, "jdk-extracted");
  const epubcheckRoot = path.join(cacheRoot, inventory.layout.epubcheckDir);
  const runtimeRoot = path.join(cacheRoot, inventory.layout.runtimeDir);
  mkdirSync(downloads, { recursive: true });

  // 1. EPUBCheck
  const epubZip = path.join(downloads, inventory.epubcheck.artifactName);
  await download(inventory.epubcheck.releaseUrl, epubZip);
  const epubSha = verifySha256(epubZip, inventory.epubcheck.sha256);

  const epubExtractTmp = path.join(cacheRoot, "_epubcheck_extract");
  extractArchive(epubZip, epubExtractTmp, "zip");
  const extractedEpubDir = path.join(epubExtractTmp, "epubcheck-5.3.0");
  if (existsSync(epubcheckRoot)) rmSync(epubcheckRoot, { recursive: true, force: true });
  cpSync(extractedEpubDir, epubcheckRoot, { recursive: true });
  rmSync(epubExtractTmp, { recursive: true, force: true });

  const epubJar = path.join(epubcheckRoot, "epubcheck.jar");
  if (!existsSync(epubJar)) {
    throw new Error(`Missing epubcheck.jar at ${epubJar}`);
  }

  // 2. Temurin JDK
  const jdkArchive = path.join(downloads, platform.artifactName);
  await download(platform.url, jdkArchive);
  const temurinSha = verifySha256(jdkArchive, platform.sha256);
  extractArchive(jdkArchive, jdkExtract, platform.archiveFormat);
  const jdkHome = findJavaHome(jdkExtract);
  const jlink =
    process.platform === "win32"
      ? path.join(jdkHome, "bin", "jlink.exe")
      : path.join(jdkHome, "bin", "jlink");
  const java =
    process.platform === "win32"
      ? path.join(jdkHome, "bin", "java.exe")
      : path.join(jdkHome, "bin", "java");

  // 3. jlink
  if (existsSync(runtimeRoot)) rmSync(runtimeRoot, { recursive: true, force: true });
  const modules = inventory.jlink.modules.join(",");
  const jlinkArgs = [
    "--module-path",
    path.join(jdkHome, "jmods"),
    "--add-modules",
    modules,
    "--output",
    runtimeRoot,
    ...inventory.jlink.flags,
  ];
  console.log(`Running jlink for ${platformKey}...`);
  execFileSync(jlink, jlinkArgs, { stdio: "inherit" });

  const runtimeJava =
    process.platform === "win32"
      ? path.join(runtimeRoot, "bin", "java.exe")
      : path.join(runtimeRoot, "bin", "java");
  if (!existsSync(runtimeJava)) {
    throw new Error(`jlink did not produce java at ${runtimeJava}`);
  }

  // Smoke: java -version
  execFileSync(runtimeJava, ["-version"], { stdio: "inherit" });

  const evidence = {
    builtAt: new Date().toISOString(),
    host: {
      platform: process.platform,
      arch: process.arch,
      platformKey,
    },
    epubcheck: {
      version: inventory.epubcheck.version,
      artifactSha256: epubSha,
      jarPath: path.relative(repoRoot, epubJar).replace(/\\/g, "/"),
    },
    temurin: {
      releaseName: inventory.temurin.releaseName,
      openjdkVersion: inventory.temurin.openjdkVersion,
      artifactName: platform.artifactName,
      artifactSha256: temurinSha,
      jdkHome: path.relative(repoRoot, jdkHome).replace(/\\/g, "/"),
    },
    jlink: {
      modules: inventory.jlink.modules,
      flags: inventory.jlink.flags,
      runtimePath: path.relative(repoRoot, runtimeRoot).replace(/\\/g, "/"),
      runtimeJavaPath: path.relative(repoRoot, runtimeJava).replace(/\\/g, "/"),
      runtimeSizeBytes: dirSizeBytes(runtimeRoot),
      fullJdkSizeBytes: dirSizeBytes(jdkHome),
    },
    layout: {
      cacheRoot: path.relative(repoRoot, cacheRoot).replace(/\\/g, "/"),
      epubcheckDir: path.relative(repoRoot, epubcheckRoot).replace(/\\/g, "/"),
    },
  };

  const evidencePath = path.join(cacheRoot, inventory.layout.evidenceFile);
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + "\n", "utf8");
  console.log(`Wrote evidence: ${evidencePath}`);
  console.log(
    `Runtime size: ${(evidence.jlink.runtimeSizeBytes / (1024 * 1024)).toFixed(2)} MiB`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
