// SPDX-License-Identifier: Apache-2.0

export type {
  BookDiagnosticSource,
  BookDiagnosticSeverity,
  BookDiagnostic,
  BookValidationReport,
  TypstDiagnosticInput,
  IValidationCoordinator,
} from "./types.js";

export {
  severityRank,
  mapDomainSeverity,
  mapEpubCheckSeverity,
  mapTypstSeverity,
  isEpubCheckRuntimeFailure,
} from "./mapping.js";

export { compareDiagnostics, aggregateDiagnostics } from "./aggregate.js";
export { mapDomainIssues, runDomainValidationSync } from "./domain.js";
export { normalizeEpubCheckReportSync } from "./epubcheck.js";
export { normalizeTypstDiagnosticsSync } from "./typst.js";
export { ValidationCoordinator } from "./coordinator.js";
