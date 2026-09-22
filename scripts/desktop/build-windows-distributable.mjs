#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 4 — build a reviewable Windows NSIS distributable (ADR-0032).
 *
 * Orchestrates:
 *   1. Slice 2 resource assembly (inventory-verified Gate 5/6 trees)
 *   2. `tauri build --bundles nsis`
 *   3. Slice 4 identity + ADR-0028 manifest recording
 *
 * Requires Windows + MSVC Rust toolchain + prior Gate 5/6 packaging:build.
 * Does not code-sign, publish, or declare FOUNDATION-READY.
 *
 * Usage (repo root, on Windows):
 *   node scripts/desktop/build-windows-distributable.mjs
 *
 * Flags:
 *   --skip-assemble   reuse existing src-tauri/resources/
 *   --skip-build      only record identity for an existing NSIS artifact
 *   --artifact <path> explicit NSIS setup.exe (implies --skip-build)
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const desktopRoot = path.join(repoRoot, "apps/desktop");
const nsisBundleDir = path.join(
  desktopRoot,
  "src-tauri/target/release/bundle/nsis",
);

function parseArgs(argv) {
  const out = { skipAssemble: false, skipBuild: false, artifact: "" };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--skip-assemble") out.skipAssemble = true;
    else if (arg === "--skip-build") out.skipBuild = true;
    else if (arg === "--artifact") {
      out.artifact = argv[i + 1] ?? "";
      out.skipBuild = true;
      i += 1;
    }
  }
  return out;
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): ${command} ${args.join(" ")}`);
  }
}

function findNsisArtifact(explicit) {
  if (explicit) {
    const resolved = path.resolve(repoRoot, explicit);
    if (!existsSync(resolved)) {
      throw new Error(`Explicit artifact not found: ${resolved}`);
    }
    return resolved;
  }
  if (!existsSync(nsisBundleDir)) {
    throw new Error(`NSIS bundle directory missing: ${nsisBundleDir}`);
  }
  const candidates = readdirSync(nsisBundleDir)
    .filter((name) => name.toLowerCase().endsWith(".exe"))
    .map((name) => path.join(nsisBundleDir, name))
    .sort();
  if (candidates.length === 0) {
    throw new Error(`No .exe found under ${nsisBundleDir}`);
  }
  return candidates[candidates.length - 1];
}

function main() {
  if (process.platform !== "win32") {
    console.error(
      "Gate 10 Slice 4 Windows distributable build is Windows-x64 only on this host.",
    );
    process.exit(2);
  }

  const args = parseArgs(process.argv.slice(2));

  if (!args.skipAssemble) {
    console.log("→ Assembling Windows Tauri resources (Slice 2)…");
    run(process.execPath, [path.join(repoRoot, "scripts/desktop/assemble-windows-resources.mjs")], repoRoot);
  } else {
    console.log("→ Skipping resource assembly (--skip-assemble)");
  }

  if (!args.skipBuild) {
    console.log("→ Building Tauri NSIS bundle…");
    run(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["tauri", "build", "--bundles", "nsis"],
      desktopRoot,
    );
  } else {
    console.log("→ Skipping tauri build (--skip-build / --artifact)");
  }

  const artifactPath = findNsisArtifact(args.artifact);
  console.log(`→ Recording identity for ${artifactPath}`);
  run(
    process.execPath,
    [
      path.join(repoRoot, "scripts/desktop/record-windows-distributable-identity.mjs"),
      "--artifact",
      artifactPath,
    ],
    repoRoot,
  );

  console.log("Gate 10 Slice 4 Windows distributable build + identity complete.");
  console.log("Outputs under apps/desktop/packaging-out/ (gitignored).");
  console.log("Unresolved ADR-0028 evidence remains unresolved; no FOUNDATION-READY.");
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
