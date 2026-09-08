// SPDX-License-Identifier: Apache-2.0
import type { Book, BookMetadata } from "@openbook/book-model";

export type SupportedImportFormat = "markdown" | "text";

export interface ImportSource {
  /** Target format parser to invoke */
  readonly format: SupportedImportFormat;
  /**
   * Pre-decoded JavaScript Unicode string.
   * Byte decoding and UTF-8 validation are performed by the caller before import.
   */
  readonly content: string;
  /** Optional source document filename (used as fallback for title if metadata is absent) */
  readonly filename?: string;
}

export interface ImportOptions {
  /** Strategy for partitioning document into chapters */
  readonly splitStrategy?: "heading-1" | "heading-2" | "single-chapter";
  /** Fallback language code if unstated in source (default: 'en') */
  readonly defaultLanguage?: string;
  /** Caller-provided metadata overrides */
  readonly metadataOverrides?: Partial<BookMetadata>;
  /** Optional deterministic seed for reproducible ID generation */
  readonly idSeed?: string;
}

export type ImportIssueSeverity = "fatal" | "error" | "warning" | "info";

export interface ImportIssue {
  readonly code: string;
  readonly severity: ImportIssueSeverity;
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly snippet?: string;
}

export interface ImportResult {
  readonly success: boolean;
  /** Populated only if success === true and validateBook() passed with zero errors */
  readonly book?: Book;
  /** Diagnostic warnings or failure errors */
  readonly issues: readonly ImportIssue[];
  /** Summary metrics of imported content */
  readonly stats: {
    readonly sectionCount: number;
    readonly blockCount: number;
    readonly wordCount: number;
  };
}

export interface IImportService {
  canImport(format: string): boolean;
  import(source: ImportSource, options?: ImportOptions): Promise<ImportResult>;
}
