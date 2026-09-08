// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedValidatorRuntime } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the Gate 5 production runtime layout produced by
 * `scripts/validator/build-runtime.mjs`.
 *
 * Lookup order:
 * 1. OPENBOOK_VALIDATOR_RUNTIME_ROOT
 * 2. <repo>/.cache/validator-runtime
 *
 * Never downloads artifacts. Never uses a system JRE by default.
 */
export function resolveHostPlatformKey(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  const normalizedArch = arch === "x64" ? "x64" : arch === "arm64" ? "aarch64" : arch;
  if (platform === "win32") return `windows-${normalizedArch}`;
  if (platform === "linux") return `linux-${normalizedArch}`;
  if (platform === "darwin") return `mac-${normalizedArch}`;
  throw new Error(`Unsupported platform for validator runtime: ${platform}/${arch}`);
}

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, "package.json")) && existsSync(path.join(dir, "packages"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not locate OpenBook repository root from validator package");
    }
    dir = parent;
  }
}

export function resolveProductionRuntime(
  options: { runtimeRoot?: string; repoRoot?: string } = {},
): ResolvedValidatorRuntime | null {
  const repoRoot = options.repoRoot ?? findRepoRoot(path.resolve(__dirname, "../../.."));
  const cacheRoot =
    options.runtimeRoot ??
    process.env.OPENBOOK_VALIDATOR_RUNTIME_ROOT ??
    path.join(repoRoot, ".cache", "validator-runtime");

  const javaExecutablePath =
    process.platform === "win32"
      ? path.join(cacheRoot, "runtime", "bin", "java.exe")
      : path.join(cacheRoot, "runtime", "bin", "java");
  const epubcheckJarPath = path.join(cacheRoot, "epubcheck-5.3.0", "epubcheck.jar");
  const evidencePath = path.join(cacheRoot, "build-evidence.json");

  if (!existsSync(javaExecutablePath) || !existsSync(epubcheckJarPath)) {
    return null;
  }

  return {
    platformKey: resolveHostPlatformKey(),
    javaExecutablePath,
    epubcheckJarPath,
    cacheRoot,
    evidencePath: existsSync(evidencePath) ? evidencePath : undefined,
  };
}

export function readBuildEvidence(evidencePath: string): unknown {
  return JSON.parse(readFileSync(evidencePath, "utf8"));
}
