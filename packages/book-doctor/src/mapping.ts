// SPDX-License-Identifier: Apache-2.0
import type { BookDiagnosticSeverity } from "./types.js";

/** ADR-0018 §2.6 — higher = more severe. */
export function severityRank(severity: BookDiagnosticSeverity): number {
  switch (severity) {
    case "fatal":
      return 4;
    case "error":
      return 3;
    case "warning":
      return 2;
    case "info":
      return 1;
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

/**
 * Map book-model DomainIssue severity → BookDiagnosticSeverity (ADR-0018 §2.6.A).
 * book-model uses error | warning | suggestion | information (no fatal today).
 */
export function mapDomainSeverity(
  severity: string,
): BookDiagnosticSeverity {
  switch (severity) {
    case "error":
      return "error";
    case "fatal":
      return "fatal";
    case "warning":
      return "warning";
    case "suggestion":
    case "information":
    case "info":
      return "info";
    default:
      return "info";
  }
}

/** Map Gate 5 ValidationSeverity → BookDiagnosticSeverity (ADR-0018 §2.6.B). */
export function mapEpubCheckSeverity(
  severity: string,
): BookDiagnosticSeverity {
  switch (severity.toUpperCase()) {
    case "FATAL":
      return "fatal";
    case "ERROR":
      return "error";
    case "WARNING":
      return "warning";
    case "INFO":
    case "USAGE":
      return "info";
    default:
      return "info";
  }
}

/** Map Typst diagnostic severity (ADR-0018 §2.6.C). */
export function mapTypstSeverity(
  severity: "error" | "warning" | "info",
): BookDiagnosticSeverity {
  switch (severity) {
    case "error":
      return "error";
    case "warning":
      return "warning";
    case "info":
      return "info";
    default: {
      const _exhaustive: never = severity;
      return _exhaustive;
    }
  }
}

/**
 * Runtime failureKinds that are not successful EPUBCheck completion.
 * `none` and `conformance` are not treated as runtime fatals (ADR-0018 §2.6.B).
 */
export function isEpubCheckRuntimeFailure(failureKind: unknown): boolean {
  if (failureKind === undefined || failureKind === null) return false;
  if (typeof failureKind !== "string") return false;
  return failureKind !== "none" && failureKind !== "conformance";
}
