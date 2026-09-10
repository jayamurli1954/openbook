// SPDX-License-Identifier: Apache-2.0
import type { Book } from "@openbook/book-model";
import { aggregateDiagnostics } from "./aggregate.js";
import { runDomainValidationSync } from "./domain.js";
import { normalizeEpubCheckReportSync } from "./epubcheck.js";
import { normalizeTypstDiagnosticsSync } from "./typst.js";
import type {
  BookDiagnostic,
  BookValidationReport,
  IValidationCoordinator,
  TypstDiagnosticInput,
} from "./types.js";

/**
 * Headless Book Doctor validation coordinator (ADR-0018).
 * Coordinates and normalizes diagnostics; never mutates Book; no subprocesses.
 */
export class ValidationCoordinator implements IValidationCoordinator {
  async runDomainValidation(book: Book): Promise<readonly BookDiagnostic[]> {
    return runDomainValidationSync(book);
  }

  async normalizeEpubCheckReport(
    report: unknown,
  ): Promise<readonly BookDiagnostic[]> {
    return normalizeEpubCheckReportSync(report);
  }

  async normalizeTypstDiagnostics(
    input: TypstDiagnosticInput,
  ): Promise<readonly BookDiagnostic[]> {
    return normalizeTypstDiagnosticsSync(input);
  }

  aggregate(
    diagnosticSets: readonly (readonly BookDiagnostic[])[],
  ): BookValidationReport {
    return aggregateDiagnostics(diagnosticSets);
  }
}
