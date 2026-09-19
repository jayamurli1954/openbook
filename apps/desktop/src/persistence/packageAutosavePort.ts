// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0031 Slice 2: AutosaveSavePort adapter over ADR-0029 saveProjectPackage.
 *
 * Resolves a bound package Save input at call time and maps package FS results
 * into AutosaveSaveResult. Does not wire DesktopStudioCoordinator or React.
 */
import type { AutosaveSavePort, AutosaveSaveResult } from "./autosaveController.js";
import {
  saveProjectPackage,
  type ProjectPackageFsResult,
  type ProjectPackageSaveInput,
  type ProjectPackageSaveSummary,
} from "./projectPackageFs.js";

export const AUTOSAVE_UNBOUND_PACKAGE = "AUTOSAVE_UNBOUND_PACKAGE";
export const AUTOSAVE_INVALID_PACKAGE_ROOT = "AUTOSAVE_INVALID_PACKAGE_ROOT";

/**
 * Supplies the current package Save input when autosave runs.
 * Return `null` when no project package root is bound — autosave must not invent a path.
 */
export interface PackageAutosaveBinding {
  resolveSaveInput(): ProjectPackageSaveInput | null;
}

export type PackageAutosaveSaveFn = (
  input: ProjectPackageSaveInput,
) => Promise<ProjectPackageFsResult<ProjectPackageSaveSummary>>;

export interface PackageAutosavePortOptions {
  binding: PackageAutosaveBinding;
  /** Injectable for tests; defaults to `saveProjectPackage`. */
  save?: PackageAutosaveSaveFn;
}

/**
 * AutosaveSavePort that persists through the ADR-0029 package boundary only.
 * Callers must supply canonical Book (+ bindings/store) via `PackageAutosaveBinding`;
 * this adapter never accepts Tiptap/ProseMirror JSON.
 */
export class PackageAutosavePort implements AutosaveSavePort {
  readonly #binding: PackageAutosaveBinding;
  readonly #save: PackageAutosaveSaveFn;

  constructor(options: PackageAutosavePortOptions) {
    this.#binding = options.binding;
    this.#save = options.save ?? saveProjectPackage;
  }

  async save(): Promise<AutosaveSaveResult> {
    const input = this.#binding.resolveSaveInput();
    if (input === null) {
      return {
        ok: false,
        error: {
          code: AUTOSAVE_UNBOUND_PACKAGE,
          message:
            "Autosave requires a bound project package root; no package path is configured.",
        },
      };
    }

    const root = typeof input.projectRoot === "string" ? input.projectRoot.trim() : "";
    if (!root) {
      return {
        ok: false,
        error: {
          code: AUTOSAVE_INVALID_PACKAGE_ROOT,
          message: "Autosave package root is empty or invalid.",
        },
      };
    }

    let result: ProjectPackageFsResult<ProjectPackageSaveSummary>;
    try {
      result = await this.#save({ ...input, projectRoot: root });
    } catch (err: unknown) {
      return {
        ok: false,
        error: {
          code: "AUTOSAVE_THROWN",
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }

    if (result.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
      },
    };
  }
}

export function createPackageAutosavePort(
  options: PackageAutosavePortOptions,
): PackageAutosavePort {
  return new PackageAutosavePort(options);
}
