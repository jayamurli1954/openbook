// SPDX-License-Identifier: Apache-2.0
import {
  isEpubCheckRuntimeFailure,
  mapEpubCheckSeverity,
} from "./mapping.js";
import type { BookDiagnostic } from "./types.js";

/**
 * Structural shape compatible with Gate 5 ValidationReport
 * (@openbook/validator) without importing that package (ADR-0018 §2.2).
 */
interface EpubCheckReportLike {
  readonly messages?: readonly {
    readonly id?: string;
    readonly severity?: string;
    readonly message?: string;
    readonly suggestion?: string | null;
    readonly locations?: readonly {
      readonly path?: string;
      readonly line?: number;
      readonly column?: number;
    }[];
  }[];
  readonly failureKind?: string;
  readonly isValid?: boolean;
  readonly targetPath?: string;
  readonly validatorName?: string;
}

function asReport(report: unknown): EpubCheckReportLike | undefined {
  if (report === null || typeof report !== "object") return undefined;
  return report as EpubCheckReportLike;
}

/**
 * Normalize an already-produced Gate 5 ValidationReport (ADR-0018 §2.6.B).
 * Does not execute EPUBCheck or spawn subprocesses.
 */
export function normalizeEpubCheckReportSync(
  report: unknown,
): readonly BookDiagnostic[] {
  const parsed = asReport(report);
  if (!parsed) {
    return [
      {
        source: "epubcheck",
        severity: "fatal",
        code: "epubcheck-invalid-report",
        message: "EPUBCheck report payload is missing or not an object.",
      },
    ];
  }

  const diagnostics: BookDiagnostic[] = [];

  if (isEpubCheckRuntimeFailure(parsed.failureKind)) {
    diagnostics.push({
      source: "epubcheck",
      severity: "fatal",
      code: `epubcheck-runtime-${String(parsed.failureKind)}`,
      message: `EPUBCheck runtime failure (${String(parsed.failureKind)})${
        parsed.targetPath ? ` for ${parsed.targetPath}` : ""
      }.`,
      location: parsed.targetPath ? { file: parsed.targetPath } : undefined,
    });
  }

  for (const msg of parsed.messages ?? []) {
    const loc = msg.locations?.[0];
    diagnostics.push({
      source: "epubcheck",
      severity: mapEpubCheckSeverity(msg.severity ?? "INFO"),
      code: msg.id ?? "epubcheck-message",
      message: msg.message ?? "",
      location: loc
        ? {
            file: loc.path,
            line: loc.line,
            column: loc.column,
          }
        : parsed.targetPath
          ? { file: parsed.targetPath }
          : undefined,
      fixSuggestion: msg.suggestion ?? undefined,
    });
  }

  return diagnostics;
}
