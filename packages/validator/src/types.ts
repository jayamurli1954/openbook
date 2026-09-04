/**
 * OpenBook ValidatorService Types & Boundary Interfaces.
 *
 * Governing ADRs:
 * - ADR-0004: Publishing Engine Technology Architecture
 * - ADR-0005: EPUBCheck Bundling, Java Runtime Isolation & Compliance
 */

export type ValidationSeverity = 'FATAL' | 'ERROR' | 'WARNING' | 'INFO' | 'USAGE';

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
}

export interface ValidatorService {
  validateEpub(epubPath: string): Promise<ValidationReport>;
}

export interface EpubCheckAdapterOptions {
  javaExecutablePath: string;
  epubcheckJarPath: string;
  timeoutMs?: number;
}
