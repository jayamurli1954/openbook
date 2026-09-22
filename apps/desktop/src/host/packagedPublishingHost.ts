// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 3: desktop publishing host ↔ packaged runtime locator (ADR-0032).
 *
 * Prefers Slice 1 `locatePackagedRuntimes` under an assembled Slice 2 resource
 * tree. Falls back to repository `.cache/` resolution only when no packaged
 * resource root is in effect. Never uses a system JRE or system Typst.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import type { ResolvedPdfRuntime } from "@openbook/pdf";
import type {
  ResolvedValidatorRuntime,
  ValidationReport,
} from "@openbook/validator";
import {
  locatePackagedRuntimes,
  PACKAGED_PDF_RUNTIME_DIR,
  PACKAGED_VALIDATOR_RUNTIME_DIR,
  type PackagedRuntimeError,
  type PackagedRuntimeLocatorOptions,
} from "./packagedRuntimeLocator.js";

export type DesktopRuntimeResolution =
  | {
      readonly mode: "packaged";
      readonly resourceRoot: string | undefined;
      readonly validator: ResolvedValidatorRuntime;
      readonly pdf: ResolvedPdfRuntime;
    }
  | {
      readonly mode: "developer";
      readonly validator: ResolvedValidatorRuntime | null;
      readonly pdf: ResolvedPdfRuntime | null;
    }
  | {
      readonly mode: "missing_runtime";
      readonly error: PackagedRuntimeError;
    };

function nonemptyPath(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * True when a resource root looks like a Slice 2 assembled tree (not empty
 * placeholder dirs). Empty Tauri resource folders must not force fail-closed
 * over developer `.cache/` resolution during `tauri dev`.
 */
export function isAssembledDesktopResourceRoot(resourceRoot: string): boolean {
  const root = path.resolve(resourceRoot);
  if (existsSync(path.join(root, "assembly-evidence.json"))) {
    return true;
  }
  const epubJar = path.join(
    root,
    PACKAGED_VALIDATOR_RUNTIME_DIR,
    "epubcheck-5.3.0",
    "epubcheck.jar",
  );
  const typstWin = path.join(root, PACKAGED_PDF_RUNTIME_DIR, "typst", "typst.exe");
  const typstUnix = path.join(root, PACKAGED_PDF_RUNTIME_DIR, "typst", "typst");
  return existsSync(epubJar) || existsSync(typstWin) || existsSync(typstUnix);
}

/**
 * Synchronous resource-root candidates (explicit options + env). Does not call
 * Tauri APIs. Explicit/env roots are returned even when incomplete so packaging
 * fails closed instead of silently walking `.cache/`.
 */
export function resolveDesktopResourceRootSync(
  options: { resourceRoot?: string | null } = {},
): string | undefined {
  const fromOptions = nonemptyPath(options.resourceRoot);
  if (fromOptions) return path.resolve(fromOptions);

  const fromEnv = nonemptyPath(process.env.OPENBOOK_DESKTOP_RESOURCE_ROOT);
  if (fromEnv) return path.resolve(fromEnv);

  return undefined;
}

/**
 * Resolve the desktop resource root, optionally consulting Tauri `resourceDir`
 * when no explicit root is configured. Auto-discovered Tauri dirs are used only
 * when they look assembled (Slice 2).
 */
export async function resolveDesktopResourceRoot(
  options: { resourceRoot?: string | null } = {},
): Promise<string | undefined> {
  const sync = resolveDesktopResourceRootSync(options);
  if (sync !== undefined) return sync;

  try {
    const { resourceDir } = await import("@tauri-apps/api/path");
    const dir = nonemptyPath(await resourceDir());
    if (dir && isAssembledDesktopResourceRoot(dir)) {
      return path.resolve(dir);
    }
  } catch {
    // Not running inside a Tauri webview / API unavailable — developer host.
  }

  return undefined;
}

/** Clarify that the fix is the package/bundle — never a system install. */
export function packagedMissingRuntimeMessage(error: PackagedRuntimeError): string {
  return `${error.message} System Java and system Typst are not used as a recovery path.`;
}

/**
 * Resolve Gate 5/6 runtimes for the desktop publishing host.
 *
 * When a packaged resource root is in effect, locator failures are
 * `missing_runtime` — never a `.cache/` walk and never a system install.
 * Without a packaged root, falls back to developer `resolveProduction*`.
 */
export async function resolveDesktopPublishingRuntimes(
  options: PackagedRuntimeLocatorOptions = {},
): Promise<DesktopRuntimeResolution> {
  const resourceRoot = await resolveDesktopResourceRoot(options);
  const discovered = locatePackagedRuntimes({
    ...options,
    resourceRoot,
  });

  if (discovered.ok) {
    return {
      mode: "packaged",
      resourceRoot: discovered.resourceRoot,
      validator: discovered.validator,
      pdf: discovered.pdf,
    };
  }

  if (discovered.error.code === "MISSING_RESOURCE_ROOT") {
    const { resolveProductionRuntime } = await import("@openbook/validator");
    const { resolveProductionTypstRuntime } = await import("@openbook/pdf");
    return {
      mode: "developer",
      validator: resolveProductionRuntime({
        runtimeRoot: options.validatorRuntimeRoot,
      }),
      pdf: resolveProductionTypstRuntime({
        runtimeRoot: options.pdfRuntimeRoot,
      }),
    };
  }

  return {
    mode: "missing_runtime",
    error: discovered.error,
  };
}

export function missingRuntimeValidationReport(
  epubPath: string,
  error: PackagedRuntimeError,
): ValidationReport {
  return {
    validatorName: "EPUBCheck",
    validatorVersion: "5.3.0",
    targetPath: epubPath,
    isValid: false,
    summary: {
      totalFatal: 1,
      totalErrors: 1,
      totalWarnings: 0,
      totalInfos: 0,
      isValid: false,
    },
    messages: [
      {
        id: "MISSING-RUNTIME",
        severity: "FATAL",
        message: packagedMissingRuntimeMessage(error),
        locations: [],
      },
    ],
    rawExitCode: 1,
    failureKind: "missing_runtime",
  };
}

export function developerMissingRuntimeValidationReport(epubPath: string): ValidationReport {
  return {
    validatorName: "EPUBCheck",
    validatorVersion: "5.3.0",
    targetPath: epubPath,
    isValid: false,
    summary: {
      totalFatal: 1,
      totalErrors: 1,
      totalWarnings: 0,
      totalInfos: 0,
      isValid: false,
    },
    messages: [
      {
        id: "MISSING-RUNTIME",
        severity: "FATAL",
        message:
          "Production EPUBCheck runtime is not available. Assemble Gate 5/6 into the desktop resource tree or set OPENBOOK_VALIDATOR_RUNTIME_ROOT. System Java is not used as a recovery path.",
        locations: [],
      },
    ],
    rawExitCode: 1,
    failureKind: "missing_runtime",
  };
}
