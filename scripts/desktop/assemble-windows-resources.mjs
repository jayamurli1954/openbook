#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 2 — assemble Windows Tauri resource layout (ADR-0032).
 *
 * Verifies Gate 5/6 `.cache/*-runtime` trees against committed inventories,
 * then copies shippable layouts into `apps/desktop/src-tauri/resources/`.
 *
 * Does not download runtimes. Does not wire the desktop host (Slice 3).
 * Does not produce an installer (Slice 4).
 *
 * Usage (repo root):
 *   node scripts/desktop/assemble-windows-resources.mjs
 *
 * Prerequisites:
 *   npm run packaging:build -w @openbook/validator
 *   npm run packaging:build -w @openbook/pdf
 *
 * Override roots:
 *   OPENBOOK_VALIDATOR_RUNTIME_ROOT
 *   OPENBOOK_PDF_RUNTIME_ROOT
 *   OPENBOOK_DESKTOP_RESOURCE_ROOT
 *   OPENBOOK_GATE10_PLATFORM_KEY   (default: windows-x64)
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const desktopRoot = path.join(repoRoot, "apps/desktop");

function readInventory(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), "utf8"));
}

function ensureCompiledAssemblyModule() {
  const outJs = path.join(desktopRoot, "dist-workflow/host/packagedResourceAssembly.js");
  const srcTs = path.join(desktopRoot, "src/host/packagedResourceAssembly.ts");
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

async function main() {
  const compiled = ensureCompiledAssemblyModule();
  const {
    GATE10_WINDOWS_PLATFORM_KEY,
    assembleWindowsResourceLayout,
  } = await import(pathToFileURL(compiled).href);

  const validatorInventory = readInventory("packages/validator/packaging/inventory.json");
  const pdfInventory = readInventory("packages/pdf/packaging/inventory.json");

  const validatorSourceRoot =
    process.env.OPENBOOK_VALIDATOR_RUNTIME_ROOT?.trim() ||
    path.join(repoRoot, validatorInventory.layout.cacheRoot);
  const pdfSourceRoot =
    process.env.OPENBOOK_PDF_RUNTIME_ROOT?.trim() ||
    path.join(repoRoot, pdfInventory.layout.cacheRoot);
  const destinationResourceRoot =
    process.env.OPENBOOK_DESKTOP_RESOURCE_ROOT?.trim() ||
    path.join(desktopRoot, "src-tauri/resources");

  const requiredPlatformKey =
    process.env.OPENBOOK_GATE10_PLATFORM_KEY?.trim() || GATE10_WINDOWS_PLATFORM_KEY;

  if (requiredPlatformKey !== GATE10_WINDOWS_PLATFORM_KEY) {
    console.warn(
      `Warning: assembling for ${requiredPlatformKey} (default production pin is ${GATE10_WINDOWS_PLATFORM_KEY}).`,
    );
  }

  const result = assembleWindowsResourceLayout({
    validatorSourceRoot,
    pdfSourceRoot,
    destinationResourceRoot,
    validatorInventory,
    pdfInventory,
    requiredPlatformKey,
  });

  if (!result.ok) {
    console.error(`Assemble failed [${result.error.code}]: ${result.error.message}`);
    if (result.error.details) {
      console.error(JSON.stringify(result.error.details, null, 2));
    }
    process.exit(1);
  }

  console.log("Gate 10 Slice 2 Windows resource layout assembled.");
  console.log(`  resourceRoot: ${result.value.destinationResourceRoot}`);
  console.log(`  validator:    ${result.value.validatorRuntimeRoot}`);
  console.log(`  pdf:          ${result.value.pdfRuntimeRoot}`);
  console.log(`  evidence:     ${result.value.assemblyEvidencePath}`);
  console.log(`  jlink java:   ${result.value.checksums.jlinkJavaSha256}`);
  console.log(`  typst exe:    ${result.value.checksums.typstExecutableSha256}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
