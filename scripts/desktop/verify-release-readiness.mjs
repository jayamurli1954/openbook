#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 5 — verify release-readiness checks (ADR-0032).
 *
 * Checks that a packaged resource tree contains Gate 5/6 runtimes, validation
 * sources do not invite first-run/network runtime acquisition, and failure
 * kinds remain distinct. Never declares FOUNDATION-READY.
 *
 * Usage (repo root):
 *   node scripts/desktop/verify-release-readiness.mjs
 *
 * Optional:
 *   --resource-root apps/desktop/src-tauri/resources
 *   --packaging-out apps/desktop/packaging-out
 *   --output apps/desktop/packaging-out/gate10-release-readiness.json
 *
 * Env:
 *   OPENBOOK_DESKTOP_RESOURCE_ROOT
 *   OPENBOOK_WINDOWS_DISTRIBUTABLE_OUTPUT_DIR
 */

import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const desktopRoot = path.join(repoRoot, "apps/desktop");

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

function ensureCompiledModule() {
  const outJs = path.join(desktopRoot, "dist-workflow/host/releaseReadinessVerification.js");
  const srcTs = path.join(desktopRoot, "src/host/releaseReadinessVerification.ts");
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

function defaultOfflineSources() {
  return [
    path.join(repoRoot, "packages/validator/src/resolve-runtime.ts"),
    path.join(repoRoot, "packages/pdf/src/resolve-typst.ts"),
    path.join(desktopRoot, "src/host/packagedRuntimeLocator.ts"),
    path.join(desktopRoot, "src/host/packagedPublishingHost.ts"),
  ].filter((p) => existsSync(p));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const compiled = ensureCompiledModule();
  const { verifyGate10ReleaseReadiness } = await import(pathToFileURL(compiled).href);

  const resourceRoot =
    args["resource-root"] ||
    process.env.OPENBOOK_DESKTOP_RESOURCE_ROOT?.trim() ||
    path.join(desktopRoot, "src-tauri/resources");

  const packagingOut =
    args["packaging-out"] ||
    process.env.OPENBOOK_WINDOWS_DISTRIBUTABLE_OUTPUT_DIR?.trim() ||
    path.join(desktopRoot, "packaging-out");

  const outputPath =
    args.output || path.join(packagingOut, "gate10-release-readiness.json");

  const result = verifyGate10ReleaseReadiness({
    resourceRoot: path.resolve(repoRoot, resourceRoot),
    packagingOutDir: existsSync(path.resolve(repoRoot, packagingOut))
      ? path.resolve(repoRoot, packagingOut)
      : undefined,
    offlinePostureSourcePaths: defaultOfflineSources(),
    outputPath: path.resolve(repoRoot, outputPath),
  });

  if (!result.ok) {
    console.error(`Verification failed to run [${result.error.code}]: ${result.error.message}`);
    if (result.error.details) {
      console.error(JSON.stringify(result.error.details, null, 2));
    }
    process.exit(1);
  }

  const report = result.value;
  console.log("Gate 10 Slice 5 release-readiness verification");
  console.log(`  overallStatus:              ${report.overallStatus}`);
  console.log(`  foundationReady:            ${report.foundationReady}`);
  console.log(`  foundationGovernanceReady:  ${report.foundationGovernanceReady}`);
  console.log(`  resourceRoot:               ${report.resourceRoot}`);
  for (const c of report.checks) {
    console.log(`  [${c.status}] ${c.id}: ${c.notes}`);
  }
  console.log(`  report: ${outputPath}`);

  if (report.overallStatus === "failed") {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
