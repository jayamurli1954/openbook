#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 6 PDF packaging builder (ADR-0013).
 *
 * Downloads checksum-pinned Typst v0.15.1 and OFL fonts for the current host,
 * verifies SHA-256, extracts into `.cache/pdf-runtime/`.
 *
 * Does not download anything at application runtime — build/CI step only.
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
const inventoryPath = path.join(repoRoot, "packages/pdf/packaging/inventory.json");
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));

function hostPlatformKey() {
  const arch =
    process.arch === "x64" ? "x64" : process.arch === "arm64" ? "aarch64" : process.arch;
  if (process.platform === "win32") return `windows-${arch}`;
  if (process.platform === "linux") return `linux-${arch}`;
  if (process.platform === "darwin") return `mac-${arch}`;
  throw new Error(`Unsupported host platform: ${process.platform}/${process.arch}`);
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
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
      execFileSync("unzip", ["-q", archivePath, "-d", destDir], { stdio: "inherit" });
    }
    return;
  }

  if (format === "tar.xz") {
    execFileSync("tar", ["-xJf", archivePath, "-C", destDir], { stdio: "inherit" });
    return;
  }

  throw new Error(`Unsupported archive format: ${format}`);
}

function findTypstExecutable(extractRoot, platformKey) {
  const want =
    platformKey.startsWith("windows-") ? "typst.exe" : "typst";
  const stack = [extractRoot];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.name === want) {
        return full;
      }
    }
  }
  throw new Error(`Could not locate ${want} under ${extractRoot}`);
}

function directorySizeBytes(root) {
  let total = 0;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else total += statSync(full).size;
    }
  }
  return total;
}

async function main() {
  const platformKey = hostPlatformKey();
  const platform = inventory.typst.platforms[platformKey];
  if (!platform) {
    throw new Error(`No Typst pin for platform ${platformKey} in inventory.json`);
  }

  const cacheRoot = path.join(repoRoot, inventory.layout.cacheRoot);
  const downloadDir = path.join(cacheRoot, "downloads");
  const extractRoot = path.join(cacheRoot, "typst-extracted");
  const typstDir = path.join(cacheRoot, inventory.layout.typstDir);
  const fontsDir = path.join(cacheRoot, inventory.layout.fontsDir);

  mkdirSync(downloadDir, { recursive: true });
  mkdirSync(fontsDir, { recursive: true });

  const archivePath = path.join(downloadDir, platform.artifactName);
  await download(platform.url, archivePath);
  verifySha256(archivePath, platform.sha256);
  extractArchive(archivePath, extractRoot, platform.archiveFormat);

  const extractedExe = findTypstExecutable(extractRoot, platformKey);
  if (existsSync(typstDir)) rmSync(typstDir, { recursive: true, force: true });
  mkdirSync(typstDir, { recursive: true });
  const destExe = path.join(typstDir, path.basename(extractedExe));
  cpSync(extractedExe, destExe);

  const fontHashes = {};
  for (const [fileName, meta] of Object.entries(inventory.fonts.files)) {
    const dest = path.join(fontsDir, fileName);
    await download(meta.url, dest);
    fontHashes[fileName] = verifySha256(dest, meta.sha256);
  }

  const evidence = {
    builtAt: new Date().toISOString(),
    host: {
      platform: process.platform,
      arch: process.arch,
      platformKey,
    },
    typst: {
      version: inventory.typst.version,
      gitCommit: inventory.typst.gitCommit,
      artifactName: platform.artifactName,
      artifactSha256: platform.sha256,
      executablePath: path.relative(repoRoot, destExe).split(path.sep).join("/"),
    },
    fonts: {
      directory: path.relative(repoRoot, fontsDir).split(path.sep).join("/"),
      files: fontHashes,
    },
    sizes: {
      typstExecutableBytes: statSync(destExe).size,
      fontsDirectoryBytes: directorySizeBytes(fontsDir),
    },
  };

  writeFileSync(
    path.join(cacheRoot, inventory.layout.evidenceFile),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );

  console.log(`Typst runtime ready: ${destExe}`);
  console.log(`Fonts ready: ${fontsDir}`);
  console.log(
    `Evidence: ${path.join(cacheRoot, inventory.layout.evidenceFile)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
