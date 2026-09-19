// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 2: canonical Book persistence mapping for the project package.
 *
 * Maps Book ↔ package Book document only. Does not read/write files, wire
 * AssetStore, change SQLite schema, or perform atomic Save/Open.
 */
import {
  BOOK_MODEL_SCHEMA_VERSION,
  validateBook,
  type Book,
} from "@openbook/book-model";
import type { ProjectPackageCompatibility } from "./manifest.js";

/** Logical package Book document (not a SQLite DTO, not OpenBookProject). */
export interface PackageBookDocument {
  bookModelVersion: number;
  book: Book;
}

export interface PackageBookMappingError {
  code:
    | "INVALID_BOOK_MODEL_VERSION"
    | "INVALID_BOOK"
    | "BOOK_VALIDATION_FAILED"
    | "TIPTAP_PAYLOAD_REJECTED"
    | "UNSUPPORTED_FUTURE_VERSION"
    | "MIGRATION_REQUIRED"
    | "MALFORMED_PACKAGE_BOOK"
    | "SCHEMA_VERSION_MISMATCH";
  message: string;
}

export interface PackageBookMappingResult {
  compatibility: ProjectPackageCompatibility;
  errors: PackageBookMappingError[];
  document?: PackageBookDocument;
}

const ALLOWED_TOP_LEVEL = ["bookModelVersion", "book"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const hasOnlyKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).every((key) => keys.includes(key));

/** Detect raw Tiptap/ProseMirror JSON so it cannot become package truth. */
function isTiptapPayload(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return value.type === "doc" && Array.isArray(value.content);
}

function classifyBookModelVersion(bookModelVersion: number): PackageBookMappingResult | undefined {
  if (bookModelVersion > BOOK_MODEL_SCHEMA_VERSION) {
    return {
      compatibility: "unsupported-future-version",
      errors: [
        {
          code: "UNSUPPORTED_FUTURE_VERSION",
          message:
            "Package Book document declares a Book Model version newer than this reader supports.",
        },
      ],
    };
  }
  if (bookModelVersion < BOOK_MODEL_SCHEMA_VERSION) {
    return {
      compatibility: "migration-required",
      errors: [
        {
          code: "MIGRATION_REQUIRED",
          message:
            "Package Book document uses a recognized older Book Model version and requires migration.",
        },
      ],
    };
  }
  return undefined;
}

/** Shape checks that apply before version classification or domain validation. */
function inspectBookShape(book: unknown): PackageBookMappingError[] {
  if (!isRecord(book)) {
    return [{ code: "INVALID_BOOK", message: "book must be an object." }];
  }

  if (isTiptapPayload(book)) {
    return [
      {
        code: "TIPTAP_PAYLOAD_REJECTED",
        message:
          "Tiptap/ProseMirror JSON must not be used as the package Book document. Persist canonical Book Model instead.",
      },
    ];
  }

  if (!isNonNegativeInteger(book.schemaVersion)) {
    return [
      {
        code: "INVALID_BOOK",
        message: "book.schemaVersion must be a non-negative integer.",
      },
    ];
  }

  return [];
}

function validateCurrentBook(book: Book): PackageBookMappingError[] {
  const issues = validateBook(book);
  const bookErrors = issues.filter((issue) => issue.severity === "error");
  if (bookErrors.length === 0) return [];
  return [
    {
      code: "BOOK_VALIDATION_FAILED",
      message: `Book validation failed with ${String(bookErrors.length)} error(s): ${bookErrors
        .map((issue) => issue.message)
        .join("; ")}`,
    },
  ];
}

/**
 * Validate an unknown package Book document payload.
 * Closed schema: only `bookModelVersion` and `book` are allowed.
 *
 * Version classification happens before current-schema `validateBook`, so older
 * or future Book Model versions fail closed as migration/unsupported rather than
 * being misclassified as malformed by the current domain validator.
 */
export function validatePackageBookDocument(input: unknown): PackageBookMappingResult {
  if (!isRecord(input)) {
    return {
      compatibility: "malformed",
      errors: [
        { code: "MALFORMED_PACKAGE_BOOK", message: "Package Book document must be an object." },
      ],
    };
  }

  const errors: PackageBookMappingError[] = [];

  if (!hasOnlyKeys(input, ALLOWED_TOP_LEVEL)) {
    errors.push({
      code: "MALFORMED_PACKAGE_BOOK",
      message: "Package Book document contains unsupported fields.",
    });
  }

  if (!isNonNegativeInteger(input.bookModelVersion)) {
    errors.push({
      code: "INVALID_BOOK_MODEL_VERSION",
      message: "bookModelVersion must be a non-negative integer.",
    });
  }

  errors.push(...inspectBookShape(input.book));

  if (errors.length > 0) {
    return { compatibility: "malformed", errors };
  }

  const bookModelVersion = input.bookModelVersion as number;
  const book = input.book as Book;

  if (book.schemaVersion !== bookModelVersion) {
    return {
      compatibility: "malformed",
      errors: [
        {
          code: "SCHEMA_VERSION_MISMATCH",
          message:
            "book.schemaVersion must match bookModelVersion on the package Book document.",
        },
      ],
    };
  }

  const versionClass = classifyBookModelVersion(bookModelVersion);
  if (versionClass) {
    return {
      ...versionClass,
      document: { bookModelVersion, book },
    };
  }

  const bookErrors = validateCurrentBook(book);
  if (bookErrors.length > 0) {
    return { compatibility: "malformed", errors: bookErrors };
  }

  return {
    compatibility: "compatible",
    errors: [],
    document: { bookModelVersion, book },
  };
}

/** Map a canonical Book into a package Book document. */
export function mapBookToPackagePayload(book: Book): PackageBookMappingResult {
  const shapeErrors = inspectBookShape(book);
  if (shapeErrors.length > 0) {
    return { compatibility: "malformed", errors: shapeErrors };
  }

  const versionClass = classifyBookModelVersion(book.schemaVersion);
  if (versionClass) {
    return {
      ...versionClass,
      document: { bookModelVersion: book.schemaVersion, book },
    };
  }

  const bookErrors = validateCurrentBook(book);
  if (bookErrors.length > 0) {
    return { compatibility: "malformed", errors: bookErrors };
  }

  return {
    compatibility: "compatible",
    errors: [],
    document: {
      bookModelVersion: BOOK_MODEL_SCHEMA_VERSION,
      book,
    },
  };
}

/** Extract the canonical Book from a validated package Book document payload. */
export function parsePackagePayloadToBook(input: unknown): PackageBookMappingResult {
  return validatePackageBookDocument(input);
}

/**
 * Serialize a compatible package Book document as pretty-printed JSON.
 * Encoding is package-facing only; the nested `book` remains a canonical Book.
 */
export function serializePackageBookDocument(document: PackageBookDocument): string {
  const result = validatePackageBookDocument(document);
  if (result.compatibility !== "compatible" || !result.document) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return `${JSON.stringify(
    {
      bookModelVersion: result.document.bookModelVersion,
      book: result.document.book,
    },
    null,
    2,
  )}\n`;
}

export function parsePackageBookDocument(serialized: string): PackageBookMappingResult {
  try {
    return validatePackageBookDocument(JSON.parse(serialized) as unknown);
  } catch {
    return {
      compatibility: "malformed",
      errors: [
        {
          code: "MALFORMED_PACKAGE_BOOK",
          message: "Package Book document is not valid JSON.",
        },
      ],
    };
  }
}
