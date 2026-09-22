// SPDX-License-Identifier: Apache-2.0
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ResolvedPdfRuntime } from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function nonemptyPath(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Resolves the Gate 6 production Typst + fonts layout produced by
 * `scripts/pdf/build-runtime.mjs`.
 *
 * Lookup order:
 * 1. options.runtimeRoot
 * 2. OPENBOOK_PDF_RUNTIME_ROOT
 * 3. <repo>/.cache/pdf-runtime
 *
 * An explicit runtime root must not walk the filesystem for a git/monorepo root
 * (Gate 10 packaged desktop has no repository). Never downloads artifacts.
 * Never uses a system Typst install by default.
 */
export function resolveHostPlatformKey(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  const normalizedArch = arch === "x64" ? "x64" : arch === "arm64" ? "aarch64" : arch;
  if (platform === "win32") return `windows-${normalizedArch}`;
  if (platform === "linux") return `linux-${normalizedArch}`;
  if (platform === "darwin") return `mac-${normalizedArch}`;
  throw new Error(`Unsupported platform for PDF runtime: ${platform}/${arch}`);
}

function findRepoRoot(startDir: string): string {
  let dir = startDir;
  for (;;) {
    if (existsSync(path.join(dir, "package.json")) && existsSync(path.join(dir, "packages"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error("Could not locate OpenBook repository root from pdf package");
    }
    dir = parent;
  }
}

export function resolveProductionTypstRuntime(
  options: { runtimeRoot?: string; repoRoot?: string } = {},
): ResolvedPdfRuntime | null {
  const explicitRoot =
    nonemptyPath(options.runtimeRoot) ?? nonemptyPath(process.env.OPENBOOK_PDF_RUNTIME_ROOT);
  const cacheRoot =
    explicitRoot ??
    path.join(
      options.repoRoot ?? findRepoRoot(path.resolve(__dirname, "../../..")),
      ".cache",
      "pdf-runtime",
    );

  const typstExecutablePath =
    process.platform === "win32"
      ? path.join(cacheRoot, "typst", "typst.exe")
      : path.join(cacheRoot, "typst", "typst");
  const fontsDirectory = path.join(cacheRoot, "fonts");
  const evidencePath = path.join(cacheRoot, "build-evidence.json");

  if (!existsSync(typstExecutablePath) || !existsSync(fontsDirectory)) {
    return null;
  }

  return {
    platformKey: resolveHostPlatformKey(),
    typstExecutablePath,
    fontsDirectory,
    cacheRoot,
    evidencePath: existsSync(evidencePath) ? evidencePath : undefined,
  };
}

export function readBuildEvidence(evidencePath: string): unknown {
  return JSON.parse(readFileSync(evidencePath, "utf8"));
}
