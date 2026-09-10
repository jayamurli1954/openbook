// SPDX-License-Identifier: Apache-2.0
import type { BookDiagnostic, BookValidationReport } from "./types.js";
import { severityRank } from "./mapping.js";

function locationKey(d: BookDiagnostic): string {
  const loc = d.location;
  if (!loc) return "";
  return `${loc.file ?? ""}\0${loc.line ?? ""}\0${loc.column ?? ""}`;
}

/**
 * Deterministic ordering (ADR-0018 §2.5):
 * severity rank (desc) → source → code → message → location.
 */
export function compareDiagnostics(a: BookDiagnostic, b: BookDiagnostic): number {
  const bySeverity = severityRank(b.severity) - severityRank(a.severity);
  if (bySeverity !== 0) return bySeverity;
  const bySource = a.source.localeCompare(b.source);
  if (bySource !== 0) return bySource;
  const byCode = a.code.localeCompare(b.code);
  if (byCode !== 0) return byCode;
  const byMessage = a.message.localeCompare(b.message);
  if (byMessage !== 0) return byMessage;
  return locationKey(a).localeCompare(locationKey(b));
}

export function aggregateDiagnostics(
  diagnosticSets: readonly (readonly BookDiagnostic[])[],
): BookValidationReport {
  const flat = diagnosticSets.flatMap((set) => [...set]);
  // Slice 5 must never surface accessibility (defense in depth).
  const filtered = flat.filter((d) => d.source !== "accessibility");
  const diagnostics = [...filtered].sort(compareDiagnostics);

  let totalFatal = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfos = 0;
  for (const d of diagnostics) {
    switch (d.severity) {
      case "fatal":
        totalFatal += 1;
        break;
      case "error":
        totalErrors += 1;
        break;
      case "warning":
        totalWarnings += 1;
        break;
      case "info":
        totalInfos += 1;
        break;
    }
  }

  return {
    diagnostics,
    summary: {
      totalFatal,
      totalErrors,
      totalWarnings,
      totalInfos,
      isClean: totalFatal === 0 && totalErrors === 0,
    },
  };
}
