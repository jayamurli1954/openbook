// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 10 Slice 1: packaged resource locator (ADR-0032).
 *
 * Discovers Gate 5 EPUBCheck/jlink and Gate 6 Typst/fonts under an injected
 * application resource root. Does not walk a git/monorepo tree, does not use
 * a system JRE or Typst, and does not download runtimes.
 *
 * Tauri resource-path wiring is Gate 10 Slice 3 (`packagedPublishingHost`).
 * Installer generation is a later slice.
 */
import path from "node:path";
import {
  resolveProductionRuntime,
  type ResolvedValidatorRuntime,
} from "@openbook/validator";
import {
  resolveProductionTypstRuntime,
  type ResolvedPdfRuntime,
} from "@openbook/pdf";

export const PACKAGED_VALIDATOR_RUNTIME_DIR = "validator-runtime";
export const PACKAGED_PDF_RUNTIME_DIR = "pdf-runtime";

export type PackagedRuntimeErrorCode =
  | "MISSING_RESOURCE_ROOT"
  | "MISSING_VALIDATOR_RUNTIME"
  | "MISSING_PDF_RUNTIME"
  | "MISSING_VALIDATOR_AND_PDF_RUNTIME";

export interface PackagedRuntimeError {
  readonly code: PackagedRuntimeErrorCode;
  /** Always a runtime/process failure, never EPUB conformance. */
  readonly failureKind: "missing_runtime";
  readonly message: string;
}

export interface PackagedRuntimeLocatorOptions {
  /** Injected application resource root (Tauri resource dir in a later slice). */
  readonly resourceRoot?: string | null;
  /** Explicit Gate 5 runtime root; wins over env and resourceRoot. */
  readonly validatorRuntimeRoot?: string;
  /** Explicit Gate 6 runtime root; wins over env and resourceRoot. */
  readonly pdfRuntimeRoot?: string;
}

export type PackagedRuntimeDiscovery =
  | {
      readonly ok: true;
      readonly resourceRoot: string | undefined;
      readonly validator: ResolvedValidatorRuntime;
      readonly pdf: ResolvedPdfRuntime;
    }
  | {
      readonly ok: false;
      readonly error: PackagedRuntimeError;
    };

function nonemptyPath(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function validatorRootFrom(options: PackagedRuntimeLocatorOptions): string | undefined {
  const resourceRoot = nonemptyPath(options.resourceRoot);
  return (
    nonemptyPath(options.validatorRuntimeRoot) ??
    nonemptyPath(process.env.OPENBOOK_VALIDATOR_RUNTIME_ROOT) ??
    (resourceRoot ? path.join(resourceRoot, PACKAGED_VALIDATOR_RUNTIME_DIR) : undefined)
  );
}

function pdfRootFrom(options: PackagedRuntimeLocatorOptions): string | undefined {
  const resourceRoot = nonemptyPath(options.resourceRoot);
  return (
    nonemptyPath(options.pdfRuntimeRoot) ??
    nonemptyPath(process.env.OPENBOOK_PDF_RUNTIME_ROOT) ??
    (resourceRoot ? path.join(resourceRoot, PACKAGED_PDF_RUNTIME_DIR) : undefined)
  );
}

/**
 * Locate packaged Gate 5/6 runtimes. Fail-closed: missing roots or incomplete
 * layouts return a structured missing_runtime error. Never searches PATH,
 * JAVA_HOME, or a repository `.cache/` tree.
 */
export function locatePackagedRuntimes(
  options: PackagedRuntimeLocatorOptions = {},
): PackagedRuntimeDiscovery {
  const resourceRoot = nonemptyPath(options.resourceRoot);
  const validatorRoot = validatorRootFrom(options);
  const pdfRoot = pdfRootFrom(options);

  if (validatorRoot === undefined && pdfRoot === undefined) {
    return {
      ok: false,
      error: {
        code: "MISSING_RESOURCE_ROOT",
        failureKind: "missing_runtime",
        message:
          "Packaged runtime resource root is not configured. A shipped OpenBook must resolve EPUBCheck and Typst from application resources, not a repository cache or a system install.",
      },
    };
  }

  const validator =
    validatorRoot === undefined ? null : resolveProductionRuntime({ runtimeRoot: validatorRoot });
  const pdf =
    pdfRoot === undefined ? null : resolveProductionTypstRuntime({ runtimeRoot: pdfRoot });

  const missingValidator = validator === null;
  const missingPdf = pdf === null;

  if (missingValidator && missingPdf) {
    return {
      ok: false,
      error: {
        code: "MISSING_VALIDATOR_AND_PDF_RUNTIME",
        failureKind: "missing_runtime",
        message:
          "Packaged EPUBCheck/jlink and Typst runtimes are missing or incomplete under the application resource root.",
      },
    };
  }
  if (missingValidator) {
    return {
      ok: false,
      error: {
        code: "MISSING_VALIDATOR_RUNTIME",
        failureKind: "missing_runtime",
        message:
          "Packaged EPUBCheck/jlink runtime is missing or incomplete. System Java is not used as a fallback.",
      },
    };
  }
  if (missingPdf) {
    return {
      ok: false,
      error: {
        code: "MISSING_PDF_RUNTIME",
        failureKind: "missing_runtime",
        message:
          "Packaged Typst runtime is missing or incomplete. A system Typst install is not used as a fallback.",
      },
    };
  }

  return {
    ok: true,
    resourceRoot,
    validator,
    pdf,
  };
}
