// SPDX-License-Identifier: Apache-2.0
import type { Book } from "@openbook/book-model";

/**
 * Diagnostic sources (ADR-0018 §2.3).
 * `accessibility` is reserved — future / inactive in Slice 5.
 */
export type BookDiagnosticSource =
  | "domain-model"
  | "accessibility"
  | "epubcheck"
  | "typst-compiler";

export type BookDiagnosticSeverity = "fatal" | "error" | "warning" | "info";

export interface BookDiagnostic {
  readonly source: BookDiagnosticSource;
  readonly severity: BookDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly targetSectionId?: string;
  readonly targetAssetId?: string;
  readonly location?: {
    readonly file?: string;
    readonly line?: number;
    readonly column?: number;
  };
  readonly fixSuggestion?: string;
}

/**
 * Aggregated Book Doctor result (ADR-0018 §2.4).
 * MUST NOT be named ValidationReport — that name is reserved for Gate 5 EPUBCheck.
 */
export interface BookValidationReport {
  readonly diagnostics: readonly BookDiagnostic[];
  readonly summary: {
    readonly totalFatal: number;
    readonly totalErrors: number;
    readonly totalWarnings: number;
    readonly totalInfos: number;
    /** true iff totalFatal === 0 && totalErrors === 0 */
    readonly isClean: boolean;
  };
}

export interface TypstDiagnosticInput {
  readonly messages: readonly {
    readonly severity: "error" | "warning" | "info";
    readonly message: string;
    readonly file?: string;
    readonly line?: number;
    readonly column?: number;
    readonly code?: string;
  }[];
}

export interface IValidationCoordinator {
  runDomainValidation(book: Book): Promise<readonly BookDiagnostic[]>;
  /**
   * Normalizes an already-produced Gate 5 ValidationReport (or equivalent).
   * Does not invoke EPUBCheck subprocesses.
   */
  normalizeEpubCheckReport(report: unknown): Promise<readonly BookDiagnostic[]>;
  /**
   * Normalizes injected Typst compiler diagnostics.
   * Does not depend on or invoke @openbook/pdf.
   */
  normalizeTypstDiagnostics(
    input: TypstDiagnosticInput,
  ): Promise<readonly BookDiagnostic[]>;
  aggregate(
    diagnosticSets: readonly (readonly BookDiagnostic[])[],
  ): BookValidationReport;
}
