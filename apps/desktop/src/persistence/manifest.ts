// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 1: project-package manifest contract.
 *
 * This module validates package metadata only. It does not read/write files,
 * perform Save/Open, run migrations, or define a second canonical document.
 */
import { BOOK_MODEL_SCHEMA_VERSION } from "@openbook/book-model";

export const PROJECT_PACKAGE_VERSION = 1 as const;
export const OPENBOOK_APPLICATION_NAME = "OpenBook" as const;
export const OPENBOOK_APPLICATION_VERSION = "0.0.0" as const;

export type ProjectPackageCompatibility =
  | "compatible"
  | "migration-required"
  | "unsupported-future-version"
  | "malformed";

export interface ProjectPackageManifest {
  packageVersion: number;
  bookModelVersion: number;
  application: {
    name: string;
    version: string;
  };
  project: {
    id: string;
    name?: string;
  };
  compatibility?: {
    minimumReaderVersion?: string;
  };
}

export interface ManifestValidationError {
  code:
    | "INVALID_PACKAGE_VERSION"
    | "INVALID_BOOK_MODEL_VERSION"
    | "INVALID_APPLICATION"
    | "INVALID_PROJECT_ID"
    | "INVALID_PROJECT_NAME"
    | "INVALID_COMPATIBILITY"
    | "UNSUPPORTED_FUTURE_VERSION"
    | "MIGRATION_REQUIRED"
    | "MALFORMED_MANIFEST";
  message: string;
}

export interface ManifestValidationResult {
  compatibility: ProjectPackageCompatibility;
  errors: ManifestValidationError[];
  manifest?: ProjectPackageManifest;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key));

const validateVersion = (
  value: unknown,
  code: ManifestValidationError["code"],
  label: string,
): ManifestValidationError | undefined => {
  if (!isNonNegativeInteger(value)) {
    return { code, message: `${label} must be a non-negative integer.` };
  }
  return undefined;
};

export function validateProjectPackageManifest(input: unknown): ManifestValidationResult {
  if (!isRecord(input)) {
    return {
      compatibility: "malformed",
      errors: [{ code: "MALFORMED_MANIFEST", message: "Manifest must be an object." }],
    };
  }

  const errors: ManifestValidationError[] = [];
  const allowedTopLevel = ["packageVersion", "bookModelVersion", "application", "project", "compatibility"] as const;

  if (!hasOnlyKeys(input, allowedTopLevel)) {
    errors.push({ code: "MALFORMED_MANIFEST", message: "Manifest contains unsupported fields." });
  }

  const packageVersionError = validateVersion(input.packageVersion, "INVALID_PACKAGE_VERSION", "packageVersion");
  if (packageVersionError) errors.push(packageVersionError);

  const bookModelVersionError = validateVersion(input.bookModelVersion, "INVALID_BOOK_MODEL_VERSION", "bookModelVersion");
  if (bookModelVersionError) errors.push(bookModelVersionError);

  if (!isRecord(input.application) || !hasOnlyKeys(input.application, ["name", "version"])) {
    errors.push({ code: "INVALID_APPLICATION", message: "application must contain only name and version." });
  } else {
    if (!isNonEmptyString(input.application.name)) errors.push({ code: "INVALID_APPLICATION", message: "application.name must be a non-empty string." });
    if (!isNonEmptyString(input.application.version)) errors.push({ code: "INVALID_APPLICATION", message: "application.version must be a non-empty string." });
  }

  if (!isRecord(input.project) || !hasOnlyKeys(input.project, ["id", "name"])) {
    errors.push({ code: "INVALID_PROJECT_ID", message: "project must contain id and optional name only." });
  } else {
    if (!isNonEmptyString(input.project.id) || /[\\/]/u.test(input.project.id)) errors.push({ code: "INVALID_PROJECT_ID", message: "project.id must be a non-empty path-safe string." });
    if (input.project.name !== undefined && !isNonEmptyString(input.project.name)) errors.push({ code: "INVALID_PROJECT_NAME", message: "project.name must be a non-empty string when provided." });
  }

  if (input.compatibility !== undefined) {
    if (!isRecord(input.compatibility) || !hasOnlyKeys(input.compatibility, ["minimumReaderVersion"])) {
      errors.push({ code: "INVALID_COMPATIBILITY", message: "compatibility may contain only minimumReaderVersion." });
    } else if (input.compatibility.minimumReaderVersion !== undefined && !isNonEmptyString(input.compatibility.minimumReaderVersion)) {
      errors.push({ code: "INVALID_COMPATIBILITY", message: "compatibility.minimumReaderVersion must be a non-empty string when provided." });
    }
  }

  if (errors.length > 0) return { compatibility: "malformed", errors };

  const manifest = input as unknown as ProjectPackageManifest;
  if (manifest.packageVersion > PROJECT_PACKAGE_VERSION || manifest.bookModelVersion > BOOK_MODEL_SCHEMA_VERSION) {
    return { compatibility: "unsupported-future-version", errors: [{ code: "UNSUPPORTED_FUTURE_VERSION", message: "Manifest declares a package or Book Model version newer than this reader supports." }], manifest };
  }
  if (manifest.packageVersion < PROJECT_PACKAGE_VERSION || manifest.bookModelVersion < BOOK_MODEL_SCHEMA_VERSION) {
    return { compatibility: "migration-required", errors: [{ code: "MIGRATION_REQUIRED", message: "Manifest uses a recognized older package or Book Model version and requires migration." }], manifest };
  }
  return { compatibility: "compatible", errors: [], manifest };
}

export function serializeProjectPackageManifest(manifest: ProjectPackageManifest): string {
  const result = validateProjectPackageManifest(manifest);
  if (result.compatibility !== "compatible") throw new Error(result.errors.map((error) => error.message).join(" "));
  return JSON.stringify(manifest);
}

export function parseProjectPackageManifest(serialized: string): ManifestValidationResult {
  try {
    return validateProjectPackageManifest(JSON.parse(serialized) as unknown);
  } catch {
    return { compatibility: "malformed", errors: [{ code: "MALFORMED_MANIFEST", message: "Manifest is not valid JSON." }] };
  }
}
