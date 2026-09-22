#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 4 — record Windows distributable identity (ADR-0032).
 *
 * Hashes a produced Windows NSIS installer and writes:
 *   - windows-distributable-identity.json
 *   - release-artifact-manifest.json (ADR-0028 schema; status unresolved)
 *
 * Does not build the installer, code-sign, publish, or declare FOUNDATION-READY.
 *
 * Usage (repo root):
 *   node scripts/desktop/record-windows-distributable-identity.mjs \
 *     --artifact path/to/OpenBook-Studio_0.0.0_x64-setup.exe
 *
 * Optional:
 *   --output-dir apps/desktop/packaging-out
 *   --assembly-evidence apps/desktop/src-tauri/resources/assembly-evidence.json
 *   --source-commit <sha>   (default: git rev-parse HEAD)
 *
 * Env overrides:
 *   OPENBOOK_WINDOWS_DISTRIBUTABLE_ARTIFACT
 *   OPENBOOK_WINDOWS_DISTRIBUTABLE_OUTPUT_DIR
 *   OPENBOOK_ASSEMBLY_EVIDENCE_PATH
 *   OPENBOOK_SOURCE_COMMIT
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const desktopRoot = path.join(repoRoot, "apps/desktop");
const tauriConfPath = path.join(desktopRoot, "src-tauri/tauri.conf.json");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) {
      out[key] = true;
      continue;
    }
    out[key] = value;
    i += 1;
  }
  return out;
}

function gitHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error("Failed to resolve source commit via git rev-parse HEAD");
  }
  return result.stdout.trim();
}

function ensureCompiledIdentityModule() {
  const outJs = path.join(desktopRoot, "dist-workflow/host/windowsDistributableIdentity.js");
  const srcTs = path.join(desktopRoot, "src/host/windowsDistributableIdentity.ts");
  const needsBuild =
    !existsSync(outJs) ||
    (existsSync(srcTs) && statSync(srcTs).mtimeMs > statSync(outJs).mtimeMs);

  if (needsBuild) {
    const tsc = spawnSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tsc", "-p", "tsconfig.workflow.json"],
      { cwd: desktopRoot, stdio: "inherit", shell: false },
    );
    if (tsc.status !== 0) {
      throw new Error("Failed to compile desktop host modules (tsconfig.workflow.json)");
    }
  }
  return outJs;
}

function readTauriIdentity() {
  const conf = JSON.parse(readFileSync(tauriConfPath, "utf8"));
  return {
    applicationName: String(conf.productName ?? ""),
    applicationVersion: String(conf.version ?? ""),
    applicationIdentifier: String(conf.identifier ?? ""),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const compiled = ensureCompiledIdentityModule();
  const { recordWindowsDistributableIdentity } = await import(pathToFileURL(compiled).href);
  const tauri = readTauriIdentity();

  const artifactPath =
    args.artifact ||
    process.env.OPENBOOK_WINDOWS_DISTRIBUTABLE_ARTIFACT?.trim() ||
    "";
  if (!artifactPath) {
    console.error(
      "Missing --artifact (or OPENBOOK_WINDOWS_DISTRIBUTABLE_ARTIFACT). Pass the NSIS setup.exe path.",
    );
    process.exit(2);
  }

  const outputDir =
    args["output-dir"] ||
    process.env.OPENBOOK_WINDOWS_DISTRIBUTABLE_OUTPUT_DIR?.trim() ||
    path.join(desktopRoot, "packaging-out");

  const assemblyEvidencePath =
    args["assembly-evidence"] ||
    process.env.OPENBOOK_ASSEMBLY_EVIDENCE_PATH?.trim() ||
    path.join(desktopRoot, "src-tauri/resources/assembly-evidence.json");

  const sourceCommit =
    args["source-commit"] ||
    process.env.OPENBOOK_SOURCE_COMMIT?.trim() ||
    gitHead();

  const result = recordWindowsDistributableIdentity({
    artifactPath: path.resolve(repoRoot, artifactPath),
    applicationName: tauri.applicationName,
    applicationVersion: tauri.applicationVersion,
    applicationIdentifier: tauri.applicationIdentifier,
    sourceCommit,
    outputDir: path.resolve(repoRoot, outputDir),
    assemblyEvidencePath: path.resolve(repoRoot, assemblyEvidencePath),
    dependencyLock: "package-lock.json",
    environment: "windows-x64-msvc",
  });

  if (!result.ok) {
    console.error(`Identity record failed [${result.error.code}]: ${result.error.message}`);
    if (result.error.details) {
      console.error(JSON.stringify(result.error.details, null, 2));
    }
    process.exit(1);
  }

  console.log("Gate 10 Slice 4 Windows distributable identity recorded.");
  console.log(`  installerFamily: ${result.value.installerFamily}`);
  console.log(`  artifact:        ${result.value.artifact.path}`);
  console.log(`  sha256:          ${result.value.artifact.sha256}`);
  console.log(`  sourceCommit:    ${result.value.sourceCommit}`);
  console.log(`  identity:        ${result.value.identityRecordPath}`);
  console.log(`  adr0028:         ${result.value.releaseArtifactManifestPath}`);
  console.log(`  releaseStatus:   ${result.value.releaseStatus} (fonts: ${result.value.fontEvidenceStatus})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
