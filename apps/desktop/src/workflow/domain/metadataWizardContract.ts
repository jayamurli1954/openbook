// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 1 — Metadata Wizard contract.
 *
 * Capability matrix + command port over Book.metadata.
 * React chrome stays outside this module.
 * Cover and accessibility metadata stay deferred. No OPF or ONIX is written.
 */
import type { Book, BookMetadata } from "@openbook/book-model";
import {
  DomainValidationError,
  InvalidStructureOperationError,
} from "@openbook/authoring";

export type MetadataField = keyof BookMetadata;

export type MetadataWizardCapabilityId =
  | MetadataField
  | "cover-metadata"
  | "accessibility-metadata"
  | "book-type"
  | "audience"
  | "length"
  | "writing-goal";

export type MetadataWizardCapabilityStatus = "in-scope" | "deferred" | "out-of-scope";

export interface MetadataWizardCapability {
  readonly id: MetadataWizardCapabilityId;
  readonly status: MetadataWizardCapabilityStatus;
  readonly note?: string;
}

/**
 * ROADMAP §3.6 capability matrix under ADR-0037 §2.2.
 * Only fields the Book Model already stores are in scope.
 */
export const METADATA_WIZARD_CAPABILITIES: readonly MetadataWizardCapability[] = [
  { id: "title", status: "in-scope", note: "A blank title fails closed." },
  { id: "subtitle", status: "in-scope" },
  { id: "authors", status: "in-scope" },
  { id: "contributors", status: "in-scope" },
  { id: "language", status: "in-scope", note: "A blank language fails closed." },
  {
    id: "identifier",
    status: "in-scope",
    note: "Stored as text. No ISBN checksum or agency lookup.",
  },
  { id: "publisher", status: "in-scope" },
  { id: "publishedAt", status: "in-scope" },
  { id: "copyright", status: "in-scope" },
  { id: "description", status: "in-scope" },
  { id: "subjects", status: "in-scope" },
  { id: "rights", status: "in-scope" },
  {
    id: "cover-metadata",
    status: "deferred",
    note: "Cover Wizard (ROADMAP §3.7).",
  },
  {
    id: "accessibility-metadata",
    status: "deferred",
    note: "No Book field stores accessibility metadata.",
  },
  { id: "book-type", status: "out-of-scope", note: "Guided Start terminology; not a Book field." },
  { id: "audience", status: "out-of-scope", note: "Guided Start terminology; not a Book field." },
  { id: "length", status: "out-of-scope", note: "Guided Start terminology; not a Book field." },
  { id: "writing-goal", status: "out-of-scope", note: "Guided Start terminology; not a Book field." },
] as const;

const TEXT_FIELDS = [
  "title",
  "subtitle",
  "language",
  "identifier",
  "publisher",
  "publishedAt",
  "copyright",
  "description",
  "rights",
] as const satisfies readonly MetadataField[];

const LIST_FIELDS = [
  "authors",
  "contributors",
  "subjects",
] as const satisfies readonly MetadataField[];

const METADATA_FIELDS: ReadonlySet<string> = new Set<string>([
  ...TEXT_FIELDS,
  ...LIST_FIELDS,
]);

export type MetadataWizardCommand = {
  readonly type: "set-metadata";
  readonly metadata: Partial<BookMetadata>;
};

export type MetadataWizardErrorCode =
  | "EMPTY_TITLE"
  | "EMPTY_LANGUAGE"
  | "UNKNOWN_FIELD"
  | "METADATA_REJECTED";

export type MetadataWizardResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: MetadataWizardErrorCode;
      readonly message: string;
    };

/** Narrow session surface. BookSession satisfies it. No React or TipTap. */
export interface MetadataWizardSessionPort {
  getBook(): Book;
  updateMetadata(metadata: Partial<BookMetadata>): void;
}

export function readBookMetadata(book: Book): BookMetadata {
  return {
    ...book.metadata,
    authors: [...book.metadata.authors],
    contributors: [...book.metadata.contributors],
    subjects: [...book.metadata.subjects],
  };
}

export function getMetadataWizardCapability(
  id: MetadataWizardCapabilityId,
): MetadataWizardCapability | undefined {
  return METADATA_WIZARD_CAPABILITIES.find((capability) => capability.id === id);
}

export function isMetadataWizardCommandType(value: string): boolean {
  return value === "set-metadata";
}

function fail(code: MetadataWizardErrorCode, message: string): MetadataWizardResult {
  return { ok: false, code, message };
}

function normalizeList(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 0);
}

/**
 * Apply one metadata command. Fail-closed checks run before BookSession
 * mutation so a rejected command leaves the Book unchanged.
 */
export function executeMetadataCommand(
  session: MetadataWizardSessionPort,
  command: MetadataWizardCommand,
): MetadataWizardResult {
  if (command.type !== "set-metadata") {
    return fail(
      "METADATA_REJECTED",
      `Unsupported metadata command: ${String((command as { type: unknown }).type)}`,
    );
  }

  const unknown = Object.keys(command.metadata).filter(
    (key) => !METADATA_FIELDS.has(key),
  );
  if (unknown.length > 0) {
    return fail("UNKNOWN_FIELD", `Unknown metadata field: ${unknown.join(", ")}.`);
  }

  const update: Partial<BookMetadata> = {};
  for (const field of TEXT_FIELDS) {
    const value = command.metadata[field];
    if (value !== undefined) update[field] = value.trim();
  }
  for (const field of LIST_FIELDS) {
    const value = command.metadata[field];
    if (value !== undefined) update[field] = normalizeList(value);
  }

  if (update.title !== undefined && update.title.length === 0) {
    return fail("EMPTY_TITLE", "A book title is required.");
  }
  if (update.language !== undefined && update.language.length === 0) {
    return fail("EMPTY_LANGUAGE", "A book language is required.");
  }

  try {
    session.updateMetadata(update);
    return { ok: true };
  } catch (err) {
    if (
      err instanceof DomainValidationError ||
      err instanceof InvalidStructureOperationError
    ) {
      return fail("METADATA_REJECTED", err.message);
    }
    throw err;
  }
}
