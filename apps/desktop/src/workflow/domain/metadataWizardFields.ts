// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 2 — guided metadata fields.
 *
 * Converts between form text and Book.metadata. List fields are one entry
 * per line. Commands go through the Slice 1 metadata port.
 */
import type { BookMetadata } from "@openbook/book-model";
import type {
  MetadataWizardResult,
  MetadataWizardSessionPort,
} from "./metadataWizardContract.js";
import { executeMetadataCommand, readBookMetadata } from "./metadataWizardContract.js";

/** Form values as typed. Every field is text; lists hold one entry per line. */
export type MetadataFieldValues = { [K in keyof BookMetadata]: string };

export interface MetadataWizardFields {
  read(): MetadataFieldValues;
  apply(values: MetadataFieldValues): MetadataWizardResult;
}

const LIST_KEYS = ["authors", "contributors", "subjects"] as const;

export function toMetadataFieldValues(metadata: BookMetadata): MetadataFieldValues {
  return {
    title: metadata.title,
    subtitle: metadata.subtitle,
    authors: metadata.authors.join("\n"),
    contributors: metadata.contributors.join("\n"),
    language: metadata.language,
    identifier: metadata.identifier,
    publisher: metadata.publisher,
    publishedAt: metadata.publishedAt,
    copyright: metadata.copyright,
    description: metadata.description,
    subjects: metadata.subjects.join("\n"),
    rights: metadata.rights,
  };
}

/** Split list fields on new lines. Trimming and blank lines are left to the port. */
export function fromMetadataFieldValues(values: MetadataFieldValues): BookMetadata {
  const lists = Object.fromEntries(
    LIST_KEYS.map((key) => [key, values[key].split(/\r?\n/)]),
  ) as Pick<BookMetadata, (typeof LIST_KEYS)[number]>;
  return { ...values, ...lists };
}

export function createMetadataWizardFields(
  session: MetadataWizardSessionPort,
): MetadataWizardFields {
  return {
    read(): MetadataFieldValues {
      return toMetadataFieldValues(readBookMetadata(session.getBook()));
    },
    apply(values: MetadataFieldValues): MetadataWizardResult {
      return executeMetadataCommand(session, {
        type: "set-metadata",
        metadata: fromMetadataFieldValues(values),
      });
    },
  };
}
