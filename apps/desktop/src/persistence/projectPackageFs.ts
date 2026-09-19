// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 4–5: atomic project-package Save/Open + CAS layout + integrity evidence.
 *
 * Composes Slices 1–3 into a filesystem package under a project root.
 * Does not change SQLite schema, coordinator UI, autosave, or migrations.
 */
import {
  DirectoryAssetStore,
  MemoryAssetStore,
  sha256Hex,
  type IAssetStore,
} from "@openbook/assets";
import type { Book } from "@openbook/book-model";
import { access, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  mapBookToPackagePayload,
  parsePackageBookDocument,
  serializePackageBookDocument,
} from "./bookPackageMapping.js";
import {
  OPENBOOK_APPLICATION_NAME,
  OPENBOOK_APPLICATION_VERSION,
  PROJECT_PACKAGE_VERSION,
  parseProjectPackageManifest,
  serializeProjectPackageManifest,
  type ProjectPackageManifest,
  validateProjectPackageManifest,
} from "./manifest.js";
import {
  mapAssetRefsToPackageEntries,
  packageEntriesToBindings,
  parsePackageAssetManifest,
  serializePackageAssetManifest,
  validatePackageAssetsAgainstBook,
  type PackageAssetBinding,
} from "./packageAssetMapping.js";
import {
  PACKAGE_INTEGRITY_FILE,
  buildPackageIntegrityEvidence,
  parsePackageIntegrityEvidence,
  serializePackageIntegrityEvidence,
  verifyComponentDigests,
} from "./packageIntegrity.js";

export const PACKAGE_MANIFEST_FILE = "manifest.json";
export const PACKAGE_BOOK_FILE = "book.json";
export const PACKAGE_ASSETS_INDEX_FILE = "assets.json";
export const PACKAGE_ASSETS_DIR = "assets";

export type ProjectPackageFsErrorCode =
  | "MALFORMED_PACKAGE"
  | "UNSUPPORTED_FUTURE_VERSION"
  | "MIGRATION_REQUIRED"
  | "MISSING_ASSET_BYTES"
  | "INVALID_ASSET_BYTES"
  | "MISSING_PACKAGE_ASSET"
  | "PACKAGE_IO_ERROR"
  | "ATOMIC_COMMIT_FAILED"
  | "INTEGRITY_EVIDENCE_MISSING"
  | "MALFORMED_INTEGRITY"
  | "INTEGRITY_MISMATCH";

export interface ProjectPackageFsError {
  code: ProjectPackageFsErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ProjectPackageFsResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ProjectPackageFsError };

export interface ProjectPackageSaveInput {
  projectRoot: string;
  book: Book;
  project: { id: string; name?: string };
  assetBindings: PackageAssetBinding;
  assetStore: IAssetStore;
  application?: { name: string; version: string };
}

export interface ProjectPackageSaveSummary {
  projectRoot: string;
  projectId: string;
  assetCount: number;
}

export interface ProjectPackageOpenResult {
  projectRoot: string;
  manifest: ProjectPackageManifest;
  book: Book;
  assetBindings: Map<string, string>;
  assetStore: DirectoryAssetStore;
}

export function packageAssetsDirectory(projectRoot: string): string {
  return path.join(path.resolve(projectRoot), PACKAGE_ASSETS_DIR);
}

function fail<T>(
  code: ProjectPackageFsErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ProjectPackageFsResult<T> {
  return { ok: false, error: { code, message, details } };
}

function mapCompatibilityFailure(
  compatibility: string,
  errors: unknown,
  label: string,
): ProjectPackageFsResult<never> {
  if (compatibility === "unsupported-future-version") {
    return fail("UNSUPPORTED_FUTURE_VERSION", `${label} declares an unsupported future version.`, {
      errors,
    });
  }
  if (compatibility === "migration-required") {
    return fail("MIGRATION_REQUIRED", `${label} requires migration before it can be opened.`, {
      errors,
    });
  }
  return fail("MALFORMED_PACKAGE", `${label} is malformed or incompatible.`, { errors });
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

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function readUtf8(filePath: string): Promise<ProjectPackageFsResult<string>> {
  try {
    return { ok: true, value: await readFile(filePath, "utf8") };
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
    return fail(
      "PACKAGE_IO_ERROR",
      code === "ENOENT"
        ? `Required package file is missing: ${path.basename(filePath)}.`
        : `Failed to read package file ${path.basename(filePath)}.`,
      { cause: String(err) },
    );
  }
}

/**
 * Atomically save a project package to `projectRoot`.
 * Staging is written beside the target; the previous package is preserved until commit.
 */
export async function saveProjectPackage(
  input: ProjectPackageSaveInput,
): Promise<ProjectPackageFsResult<ProjectPackageSaveSummary>> {
  const projectRoot = path.resolve(input.projectRoot);
  const parent = path.dirname(projectRoot);
  const base = path.basename(projectRoot);
  const stamp = `${process.pid}-${Date.now()}`;
  const stagingRoot = path.join(parent, `${base}.openbook-staging-${stamp}`);
  const backupRoot = path.join(parent, `${base}.openbook-backup-${stamp}`);

  const application = input.application ?? {
    name: OPENBOOK_APPLICATION_NAME,
    version: OPENBOOK_APPLICATION_VERSION,
  };

  const manifestCandidate: ProjectPackageManifest = {
    packageVersion: PROJECT_PACKAGE_VERSION,
    bookModelVersion: input.book.schemaVersion,
    application,
    project: {
      id: input.project.id,
      ...(input.project.name !== undefined ? { name: input.project.name } : {}),
    },
  };
  const manifestResult = validateProjectPackageManifest(manifestCandidate);
  if (manifestResult.compatibility !== "compatible" || !manifestResult.manifest) {
    return mapCompatibilityFailure(
      manifestResult.compatibility,
      manifestResult.errors,
      "Project package manifest",
    );
  }

  const bookResult = mapBookToPackagePayload(input.book);
  if (bookResult.compatibility !== "compatible" || !bookResult.document) {
    return mapCompatibilityFailure(
      bookResult.compatibility,
      bookResult.errors,
      "Package Book document",
    );
  }

  const assetsResult = mapAssetRefsToPackageEntries(input.book, input.assetBindings);
  if (assetsResult.compatibility !== "compatible" || !assetsResult.manifest) {
    const missing = assetsResult.errors.some((error) => error.code === "MISSING_PACKAGE_ASSET");
    return fail(
      missing ? "MISSING_PACKAGE_ASSET" : "MALFORMED_PACKAGE",
      "Package asset index could not be built from Book bindings.",
      { errors: assetsResult.errors },
    );
  }

  const uniqueHashes = [...new Set(assetsResult.manifest.assets.map((entry) => entry.sha256))];
  const stagedBytes = new Map<string, Uint8Array>();
  for (const sha256 of uniqueHashes) {
    const bytes = await input.assetStore.get(sha256);
    if (!bytes) {
      return fail(
        "MISSING_ASSET_BYTES",
        `Referenced asset bytes are missing from the source store (sha256=${sha256}).`,
        { sha256 },
      );
    }
    const actual = sha256Hex(bytes);
    if (actual !== sha256) {
      return fail(
        "INVALID_ASSET_BYTES",
        `Source asset bytes do not match CAS key (expected ${sha256}, got ${actual}).`,
        { sha256, actual },
      );
    }
    stagedBytes.set(sha256, bytes);
  }

  try {
    await mkdir(path.join(stagingRoot, PACKAGE_ASSETS_DIR), { recursive: true });
    const manifestText = serializeProjectPackageManifest(manifestResult.manifest);
    const bookText = serializePackageBookDocument(bookResult.document);
    const assetsText = serializePackageAssetManifest(assetsResult.manifest);
    const integrityText = serializePackageIntegrityEvidence(
      buildPackageIntegrityEvidence({
        "manifest.json": manifestText,
        "book.json": bookText,
        "assets.json": assetsText,
      }),
    );

    await writeTextAtomic(path.join(stagingRoot, PACKAGE_MANIFEST_FILE), manifestText);
    await writeTextAtomic(path.join(stagingRoot, PACKAGE_BOOK_FILE), bookText);
    await writeTextAtomic(path.join(stagingRoot, PACKAGE_ASSETS_INDEX_FILE), assetsText);
    await writeTextAtomic(path.join(stagingRoot, PACKAGE_INTEGRITY_FILE), integrityText);

    const stagingStore = new DirectoryAssetStore(path.join(stagingRoot, PACKAGE_ASSETS_DIR));
    for (const [sha256, bytes] of stagedBytes) {
      await stagingStore.put(sha256, bytes);
    }

    const liveExists = await pathExists(projectRoot);
    if (!liveExists) {
      await rename(stagingRoot, projectRoot);
    } else {
      try {
        await rename(projectRoot, backupRoot);
      } catch (err: unknown) {
        await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
        return fail("ATOMIC_COMMIT_FAILED", "Failed to move the live package aside for commit.", {
          cause: String(err),
        });
      }

      try {
        await rename(stagingRoot, projectRoot);
      } catch (err: unknown) {
        try {
          await rename(backupRoot, projectRoot);
        } catch (restoreErr: unknown) {
          return fail(
            "ATOMIC_COMMIT_FAILED",
            "Failed to commit staged package and restore the previous package.",
            { cause: String(err), restoreCause: String(restoreErr) },
          );
        }
        await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
        return fail("ATOMIC_COMMIT_FAILED", "Failed to commit staged package; previous package restored.", {
          cause: String(err),
        });
      }

      await rm(backupRoot, { recursive: true, force: true }).catch(() => undefined);
    }

    return {
      ok: true,
      value: {
        projectRoot,
        projectId: manifestResult.manifest.project.id,
        assetCount: assetsResult.manifest.assets.length,
      },
    };
  } catch (err: unknown) {
    await rm(stagingRoot, { recursive: true, force: true }).catch(() => undefined);
    if (await pathExists(backupRoot) && !(await pathExists(projectRoot))) {
      await rename(backupRoot, projectRoot).catch(() => undefined);
    } else {
      await rm(backupRoot, { recursive: true, force: true }).catch(() => undefined);
    }
    return fail("PACKAGE_IO_ERROR", "Failed to write the project package.", {
      cause: String(err),
    });
  }
}

/**
 * Open and validate a project package. Fail-closed for migration/future versions.
 * Does not mutate the package or invent empty Book/asset state on failure.
 */
export async function openProjectPackage(
  projectRootInput: string,
): Promise<ProjectPackageFsResult<ProjectPackageOpenResult>> {
  const projectRoot = path.resolve(projectRootInput);

  try {
    const info = await stat(projectRoot);
    if (!info.isDirectory()) {
      return fail("MALFORMED_PACKAGE", "Project package root must be a directory.");
    }
  } catch (err: unknown) {
    return fail("PACKAGE_IO_ERROR", "Project package root does not exist or cannot be read.", {
      cause: String(err),
    });
  }

  const manifestText = await readUtf8(path.join(projectRoot, PACKAGE_MANIFEST_FILE));
  if (!manifestText.ok) return manifestText;
  const bookText = await readUtf8(path.join(projectRoot, PACKAGE_BOOK_FILE));
  if (!bookText.ok) return bookText;
  const assetsText = await readUtf8(path.join(projectRoot, PACKAGE_ASSETS_INDEX_FILE));
  if (!assetsText.ok) return assetsText;

  const integrityPath = path.join(projectRoot, PACKAGE_INTEGRITY_FILE);
  if (!(await pathExists(integrityPath))) {
    return fail(
      "INTEGRITY_EVIDENCE_MISSING",
      "Required package integrity evidence file is missing (integrity.json).",
    );
  }
  const integrityText = await readUtf8(integrityPath);
  if (!integrityText.ok) return integrityText;

  const integrityParse = parsePackageIntegrityEvidence(integrityText.value);
  if (integrityParse.compatibility !== "compatible" || !integrityParse.evidence) {
    if (integrityParse.compatibility === "unsupported-future-version") {
      return fail(
        "UNSUPPORTED_FUTURE_VERSION",
        "Integrity evidence declares an unsupported future version.",
        { errors: integrityParse.errors },
      );
    }
    if (integrityParse.compatibility === "migration-required") {
      return fail("MIGRATION_REQUIRED", "Integrity evidence requires migration before open.", {
        errors: integrityParse.errors,
      });
    }
    return fail("MALFORMED_INTEGRITY", "Package integrity evidence is malformed.", {
      errors: integrityParse.errors,
    });
  }

  const digestCheck = verifyComponentDigests(integrityParse.evidence, {
    "manifest.json": manifestText.value,
    "book.json": bookText.value,
    "assets.json": assetsText.value,
  });
  if (digestCheck.compatibility !== "compatible") {
    return fail("INTEGRITY_MISMATCH", "Package component digests do not match integrity evidence.", {
      errors: digestCheck.errors,
    });
  }

  const manifestResult = parseProjectPackageManifest(manifestText.value);
  if (manifestResult.compatibility !== "compatible" || !manifestResult.manifest) {
    return mapCompatibilityFailure(
      manifestResult.compatibility,
      manifestResult.errors,
      "Project package manifest",
    );
  }

  const bookResult = parsePackageBookDocument(bookText.value);
  if (bookResult.compatibility !== "compatible" || !bookResult.document) {
    return mapCompatibilityFailure(
      bookResult.compatibility,
      bookResult.errors,
      "Package Book document",
    );
  }

  if (
    manifestResult.manifest.bookModelVersion !== bookResult.document.bookModelVersion ||
    bookResult.document.book.schemaVersion !== bookResult.document.bookModelVersion
  ) {
    return fail(
      "MALFORMED_PACKAGE",
      "Manifest bookModelVersion does not match the package Book document.",
      {
        manifestBookModelVersion: manifestResult.manifest.bookModelVersion,
        documentBookModelVersion: bookResult.document.bookModelVersion,
        bookSchemaVersion: bookResult.document.book.schemaVersion,
      },
    );
  }

  const assetsParse = parsePackageAssetManifest(assetsText.value);
  if (assetsParse.compatibility !== "compatible" || !assetsParse.manifest) {
    return mapCompatibilityFailure(
      assetsParse.compatibility,
      assetsParse.errors,
      "Package asset index",
    );
  }

  const againstBook = validatePackageAssetsAgainstBook(
    bookResult.document.book,
    assetsParse.manifest,
  );
  if (againstBook.compatibility !== "compatible" || !againstBook.manifest) {
    return fail("MALFORMED_PACKAGE", "Package asset index is inconsistent with Book.assets.", {
      errors: againstBook.errors,
    });
  }

  const assetStore = new DirectoryAssetStore(packageAssetsDirectory(projectRoot));
  for (const entry of againstBook.manifest.assets) {
    const bytes = await assetStore.get(entry.sha256);
    if (!bytes) {
      return fail(
        "MISSING_ASSET_BYTES",
        `Required asset bytes are missing from the package CAS store (sha256=${entry.sha256}).`,
        { assetId: entry.assetId, sha256: entry.sha256 },
      );
    }
    const actual = sha256Hex(bytes);
    if (actual !== entry.sha256) {
      return fail(
        "INVALID_ASSET_BYTES",
        `Package CAS object hash mismatch (expected ${entry.sha256}, got ${actual}).`,
        { assetId: entry.assetId, sha256: entry.sha256, actual },
      );
    }
  }

  return {
    ok: true,
    value: {
      projectRoot,
      manifest: manifestResult.manifest,
      book: bookResult.document.book,
      assetBindings: packageEntriesToBindings(againstBook.manifest),
      assetStore,
    },
  };
}

/** Test helper: in-memory store preloaded for Save inputs. */
export async function createMemoryAssetStoreWith(
  entries: ReadonlyArray<{ sha256: string; bytes: Uint8Array }>,
): Promise<MemoryAssetStore> {
  const store = new MemoryAssetStore();
  for (const entry of entries) {
    await store.put(entry.sha256, entry.bytes);
  }
  return store;
}
