// SPDX-License-Identifier: Apache-2.0
/**
 * OpenBook ValidatorService Types & Boundary Interfaces.
 *
 * Governing ADRs:
 * - ADR-0004: Publishing Engine Technology Architecture
 * - ADR-0005: EPUBCheck Bundling, Java Runtime Isolation & Compliance
 * - ADR-0012: Production EPUBCheck Runtime & Packaging Architecture (Gate 5)
 */

export type ValidationSeverity = "FATAL" | "ERROR" | "WARNING" | "INFO" | "USAGE";

/**
 * Distinguishes EPUB conformance outcomes from runtime/process failures (ADR-0012 §10).
 * Omitted (or "none") when EPUBCheck completed and produced a structured report.
 */
export type ValidationFailureKind =
  | "none"
  | "conformance"
  | "missing_runtime"
  | "missing_epubcheck"
  | "invalid_path"
  | "timeout"
  | "process_error";

export interface ValidationLocation {
  path?: string;
  line?: number;
  column?: number;
  context?: string | null;
}

export interface ValidationMessage {
  id: string;
  severity: ValidationSeverity;
  message: string;
  locations: ValidationLocation[];
  suggestion?: string | null;
}

export interface ValidationSummary {
  totalFatal: number;
  totalErrors: number;
  totalWarnings: number;
  totalInfos: number;
  isValid: boolean;
}

export interface ValidationReport {
  validatorName: string;
  validatorVersion: string;
  targetPath: string;
  isValid: boolean;
  summary: ValidationSummary;
  messages: ValidationMessage[];
  rawExitCode: number;
  executionTimeMs?: number;
  /**
   * Gate 5: callers can tell "EPUB is non-conformant" from "validator did not run".
   */
  failureKind?: ValidationFailureKind;
}

export interface ValidatorService {
  validateEpub(epubPath: string): Promise<ValidationReport>;
}

export interface EpubCheckAdapterOptions {
  javaExecutablePath: string;
  epubcheckJarPath: string;
  timeoutMs?: number;
}

export interface ResolvedValidatorRuntime {
  platformKey: string;
  javaExecutablePath: string;
  epubcheckJarPath: string;
  cacheRoot: string;
  evidencePath?: string;
}
