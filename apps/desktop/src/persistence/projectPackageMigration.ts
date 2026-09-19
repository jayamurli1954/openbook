// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 6: project-package migration (M1 — add integrity.json).
 *
 * Explicit, version-aware upgrade of Slice 4 packages that lack integrity evidence.
 * Does not invent Book content, rewrite CAS bytes, or auto-heal integrity mismatches.
 */
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parsePackageBookDocument } from "./bookPackageMapping.js";
import { parseProjectPackageManifest } from "./manifest.js";
import {
  parsePackageAssetManifest,
  validatePackageAssetsAgainstBook,
} from "./packageAssetMapping.js";
import {
  PACKAGE_INTEGRITY_FILE,
  buildPackageIntegrityEvidence,
  serializePackageIntegrityEvidence,
} from "./packageIntegrity.js";
import {
  PACKAGE_ASSETS_INDEX_FILE,
  PACKAGE_BOOK_FILE,
  PACKAGE_MANIFEST_FILE,
  type ProjectPackageFsResult,
} from "./projectPackageFs.js";

export type ProjectPackageMigrationId = "add-integrity-v1";

export interface ProjectPackageMigrateSummary {
  projectRoot: string;
  migrationsApplied: ProjectPackageMigrationId[];
}

type MigrateErrorCode =
  | "MALFORMED_PACKAGE"
  | "UNSUPPORTED_FUTURE_VERSION"
  | "MIGRATION_REQUIRED"
  | "PACKAGE_IO_ERROR"
  | "INTEGRITY_MISMATCH"
  | "MALFORMED_INTEGRITY";

function fail(
  code: MigrateErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ProjectPackageFsResult<never> {
  return { ok: false, error: { code, message, details } };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function writeTextAtomic(filePath: string, contents: string): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  const temp = path.join(
    dir,
    `.tmp-${path.basename(filePath)}-${process.pid}-${Date.now()}`,
  );
  await writeFile(temp, contents, "utf8");
  try {
    await rename(temp, filePath);
  } catch {
    await rm(filePath, { force: true });
    await rename(temp, filePath);
  }
}

async function readUtf8(filePath: string): Promise<ProjectPackageFsResult<string>> {
  try {
    return { ok: true, value: await readFile(filePath, "utf8") };
  } catch (err: unknown) {
    return fail("PACKAGE_IO_ERROR", `Failed to read ${path.basename(filePath)}.`, {
      cause: String(err),
    });
  }
}

/**
 * Migrate a project package to the current on-disk contract.
 * Currently applies M1: add `integrity.json` when the Slice 4 layout is otherwise valid.
 */
export async function migrateProjectPackage(
  projectRootInput: string,
): Promise<ProjectPackageFsResult<ProjectPackageMigrateSummary>> {
  const projectRoot = path.resolve(projectRootInput);
  const migrationsApplied: ProjectPackageMigrationId[] = [];

  if (!(await pathExists(projectRoot))) {
    return fail("PACKAGE_IO_ERROR", "Project package root does not exist.");
  }

  const integrityPath = path.join(projectRoot, PACKAGE_INTEGRITY_FILE);
  if (await pathExists(integrityPath)) {
    return {
      ok: true,
      value: { projectRoot, migrationsApplied: [] },
    };
  }

  const manifestText = await readUtf8(path.join(projectRoot, PACKAGE_MANIFEST_FILE));
  if (!manifestText.ok) return manifestText;
  const bookText = await readUtf8(path.join(projectRoot, PACKAGE_BOOK_FILE));
  if (!bookText.ok) return bookText;
  const assetsText = await readUtf8(path.join(projectRoot, PACKAGE_ASSETS_INDEX_FILE));
  if (!assetsText.ok) return assetsText;

  const manifestResult = parseProjectPackageManifest(manifestText.value);
  if (manifestResult.compatibility === "unsupported-future-version") {
    return fail(
      "UNSUPPORTED_FUTURE_VERSION",
      "Cannot migrate a package that declares an unsupported future version.",
      { errors: manifestResult.errors },
    );
  }
  if (manifestResult.compatibility === "migration-required") {
    return fail(
      "MIGRATION_REQUIRED",
      "Package declares an older package/Book version with no supported Book rewrite migration.",
      { errors: manifestResult.errors },
    );
  }
  if (manifestResult.compatibility !== "compatible" || !manifestResult.manifest) {
    return fail("MALFORMED_PACKAGE", "Package manifest is malformed; refusing migration.", {
      errors: manifestResult.errors,
    });
  }

  const bookResult = parsePackageBookDocument(bookText.value);
  if (bookResult.compatibility !== "compatible" || !bookResult.document) {
    if (bookResult.compatibility === "unsupported-future-version") {
      return fail(
        "UNSUPPORTED_FUTURE_VERSION",
        "Cannot migrate a Book document with an unsupported future schema.",
        { errors: bookResult.errors },
      );
    }
    if (bookResult.compatibility === "migration-required") {
      return fail(
        "MIGRATION_REQUIRED",
        "Book document requires a Book Model migration that is not implemented.",
        { errors: bookResult.errors },
      );
    }
    return fail("MALFORMED_PACKAGE", "Package Book document is malformed; refusing migration.", {
      errors: bookResult.errors,
    });
  }

  const assetsParse = parsePackageAssetManifest(assetsText.value);
  if (assetsParse.compatibility !== "compatible" || !assetsParse.manifest) {
    return fail("MALFORMED_PACKAGE", "Package asset index is malformed; refusing migration.", {
      errors: assetsParse.errors,
    });
  }

  const againstBook = validatePackageAssetsAgainstBook(
    bookResult.document.book,
    assetsParse.manifest,
  );
  if (againstBook.compatibility !== "compatible") {
    return fail(
      "MALFORMED_PACKAGE",
      "Package asset index is inconsistent with Book.assets; refusing migration.",
      { errors: againstBook.errors },
    );
  }

  try {
    const integrityText = serializePackageIntegrityEvidence(
      buildPackageIntegrityEvidence({
        "manifest.json": manifestText.value,
        "book.json": bookText.value,
        "assets.json": assetsText.value,
      }),
    );
    await writeTextAtomic(integrityPath, integrityText);
    migrationsApplied.push("add-integrity-v1");
  } catch (err: unknown) {
    return fail("PACKAGE_IO_ERROR", "Failed to write integrity evidence during migration.", {
      cause: String(err),
    });
  }

  return {
    ok: true,
    value: { projectRoot, migrationsApplied },
  };
}
