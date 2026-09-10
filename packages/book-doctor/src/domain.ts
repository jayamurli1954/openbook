// SPDX-License-Identifier: Apache-2.0
import type { Book, DomainIssue } from "@openbook/book-model";
import { validateBook } from "@openbook/book-model";
import { mapDomainSeverity } from "./mapping.js";
import type { BookDiagnostic } from "./types.js";

/**
 * Map validateBook DomainIssue[] → BookDiagnostic[] (source: domain-model).
 * Never emits accessibility. Does not mutate the Book.
 */
export function mapDomainIssues(issues: readonly DomainIssue[]): BookDiagnostic[] {
  return issues.map((issue) => ({
    source: "domain-model" as const,
    severity: mapDomainSeverity(issue.severity),
    code: issue.code,
    message: issue.message,
    // DomainIssue.path is a JSON-ish path, not a filesystem location.
    location: issue.path ? { file: issue.path } : undefined,
  }));
}

export function runDomainValidationSync(book: Book): readonly BookDiagnostic[] {
  const issues = validateBook(book);
  return mapDomainIssues(issues);
}
