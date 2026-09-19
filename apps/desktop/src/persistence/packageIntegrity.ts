// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 5: package integrity evidence for committed project state.
 *
 * Digests the exact on-disk bytes of manifest.json, book.json, and assets.json.
 * Does not hash CAS blobs (Slice 4), run migrations (Slice 6), or invent Book content.
 */
import { assertSha256Key, sha256Hex } from "@openbook/assets";
import type { ProjectPackageCompatibility } from "./manifest.js";

export const PACKAGE_INTEGRITY_FILE = "integrity.json";
export const PACKAGE_INTEGRITY_SCHEMA_VERSION = 1 as const;
export const PACKAGE_INTEGRITY_ALGORITHM = "sha256" as const;

export type PackageIntegrityComponent =
  | "manifest.json"
  | "book.json"
  | "assets.json";

export interface PackageIntegrityEvidence {
  schemaVersion: typeof PACKAGE_INTEGRITY_SCHEMA_VERSION;
  algorithm: typeof PACKAGE_INTEGRITY_ALGORITHM;
  digests: Record<PackageIntegrityComponent, string>;
}

export interface PackageIntegrityError {
  code:
    | "MALFORMED_INTEGRITY"
    | "UNSUPPORTED_FUTURE_VERSION"
    | "INTEGRITY_MISMATCH";
  message: string;
  path?: PackageIntegrityComponent;
  expected?: string;
  actual?: string;
}

export interface PackageIntegrityValidationResult {
  compatibility: ProjectPackageCompatibility;
  errors: PackageIntegrityError[];
  evidence?: PackageIntegrityEvidence;
}

export type PackageComponentTexts = Record<PackageIntegrityComponent, string>;

const ALLOWED_TOP_LEVEL = ["schemaVersion", "algorithm", "digests"] as const;
const REQUIRED_DIGEST_KEYS: readonly PackageIntegrityComponent[] = [
  "manifest.json",
  "book.json",
  "assets.json",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key));

function digestUtf8(text: string): string {
  return sha256Hex(new TextEncoder().encode(text));
}

function normalizeDigest(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    return assertSha256Key(value);
  } catch {
    return undefined;
  }
}

/** Build integrity evidence from the exact UTF-8 texts that will be / were written. */
export function buildPackageIntegrityEvidence(
  parts: PackageComponentTexts,
): PackageIntegrityEvidence {
  return {
    schemaVersion: PACKAGE_INTEGRITY_SCHEMA_VERSION,
    algorithm: PACKAGE_INTEGRITY_ALGORITHM,
    digests: {
      "manifest.json": digestUtf8(parts["manifest.json"]),
      "book.json": digestUtf8(parts["book.json"]),
      "assets.json": digestUtf8(parts["assets.json"]),
    },
  };
}

export function validatePackageIntegrityEvidence(
  input: unknown,
): PackageIntegrityValidationResult {
  if (!isRecord(input)) {
    return {
      compatibility: "malformed",
      errors: [
        { code: "MALFORMED_INTEGRITY", message: "Integrity evidence must be an object." },
      ],
    };
  }

  const errors: PackageIntegrityError[] = [];

  if (!hasOnlyKeys(input, ALLOWED_TOP_LEVEL)) {
    errors.push({
      code: "MALFORMED_INTEGRITY",
      message: "Integrity evidence contains unsupported fields.",
    });
  }

  if (
    typeof input.schemaVersion !== "number" ||
    !Number.isInteger(input.schemaVersion) ||
    input.schemaVersion < 0
  ) {
    errors.push({
      code: "MALFORMED_INTEGRITY",
      message: "schemaVersion must be a non-negative integer.",
    });
  }

  if (input.algorithm !== PACKAGE_INTEGRITY_ALGORITHM) {
    errors.push({
      code: "MALFORMED_INTEGRITY",
      message: `algorithm must be "${PACKAGE_INTEGRITY_ALGORITHM}".`,
    });
  }

  if (!isRecord(input.digests) || !hasOnlyKeys(input.digests, REQUIRED_DIGEST_KEYS)) {
    errors.push({
      code: "MALFORMED_INTEGRITY",
      message: "digests must contain only manifest.json, book.json, and assets.json.",
    });
  } else {
    for (const key of REQUIRED_DIGEST_KEYS) {
      const digest = normalizeDigest(input.digests[key]);
      if (!digest) {
        errors.push({
          code: "MALFORMED_INTEGRITY",
          message: `digests["${key}"] must be a 64-character lowercase hex SHA-256 digest.`,
          path: key,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { compatibility: "malformed", errors };
  }

  const schemaVersion = input.schemaVersion as number;
  if (schemaVersion > PACKAGE_INTEGRITY_SCHEMA_VERSION) {
    return {
      compatibility: "unsupported-future-version",
      errors: [
        {
          code: "UNSUPPORTED_FUTURE_VERSION",
          message: "Integrity evidence declares a schemaVersion newer than this reader supports.",
        },
      ],
    };
  }
  if (schemaVersion < PACKAGE_INTEGRITY_SCHEMA_VERSION) {
    return {
      compatibility: "migration-required",
      errors: [
        {
          code: "MALFORMED_INTEGRITY",
          message: "Integrity evidence uses an older schemaVersion and requires migration.",
        },
      ],
    };
  }

  const digests = input.digests as Record<string, string>;
  const evidence: PackageIntegrityEvidence = {
    schemaVersion: PACKAGE_INTEGRITY_SCHEMA_VERSION,
    algorithm: PACKAGE_INTEGRITY_ALGORITHM,
    digests: {
      "manifest.json": assertSha256Key(String(digests["manifest.json"])),
      "book.json": assertSha256Key(String(digests["book.json"])),
      "assets.json": assertSha256Key(String(digests["assets.json"])),
    },
  };

  return { compatibility: "compatible", errors: [], evidence };
}

export function serializePackageIntegrityEvidence(
  evidence: PackageIntegrityEvidence,
): string {
  const result = validatePackageIntegrityEvidence(evidence);
  if (result.compatibility !== "compatible" || !result.evidence) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }
  return `${JSON.stringify(result.evidence, null, 2)}\n`;
}

export function parsePackageIntegrityEvidence(
  serialized: string,
): PackageIntegrityValidationResult {
  try {
    return validatePackageIntegrityEvidence(JSON.parse(serialized) as unknown);
  } catch {
    return {
      compatibility: "malformed",
      errors: [
        {
          code: "MALFORMED_INTEGRITY",
          message: "Integrity evidence is not valid JSON.",
        },
      ],
    };
  }
}

/** Compare stored digests to the exact component texts read from disk. */
export function verifyComponentDigests(
  evidence: PackageIntegrityEvidence,
  parts: PackageComponentTexts,
): PackageIntegrityValidationResult {
  const errors: PackageIntegrityError[] = [];
  for (const key of REQUIRED_DIGEST_KEYS) {
    const actual = digestUtf8(parts[key]);
    const expected = evidence.digests[key];
    if (actual !== expected) {
      errors.push({
        code: "INTEGRITY_MISMATCH",
        message: `Integrity digest mismatch for ${key}.`,
        path: key,
        expected,
        actual,
      });
    }
  }
  if (errors.length > 0) {
    return { compatibility: "malformed", errors, evidence };
  }
  return { compatibility: "compatible", errors: [], evidence };
}
