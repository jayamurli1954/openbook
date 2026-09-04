import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type {
  EpubCheckAdapterOptions,
  ValidationLocation,
  ValidationMessage,
  ValidationReport,
  ValidationSeverity,
  ValidatorService,
} from './types.js';

const execFileAsync = promisify(execFile);

interface RawEpubCheckMessage {
  ID?: string;
  severity?: string;
  message?: string;
  locations?: Array<{
    path?: string;
    line?: number;
    column?: number;
    context?: string | null;
  }>;
  suggestion?: string | null;
}

interface RawEpubCheckReport {
  messages?: RawEpubCheckMessage[];
  checker?: {
    checkerVersion?: string;
    elapsedTime?: number;
    nFatal?: number;
    nError?: number;
    nWarning?: number;
    nUsage?: number;
  };
}

/**
 * Adapter executing official EPUBCheck in an isolated subprocess using a bundled/private Java runtime.
 * Implements the ValidatorService boundary required by ADR-0005.
 */
export class EpubCheckSubprocessAdapter implements ValidatorService {
  constructor(private readonly options: EpubCheckAdapterOptions) {}

  async validateEpub(epubPath: string): Promise<ValidationReport> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openbook-epubcheck-'));
    const reportJsonPath = path.join(tempDir, 'report.json');
    const startTime = Date.now();

    let rawExitCode = 0;
    let stdout = '';
    let stderr = '';

    try {
      const args = [
        '-jar',
        this.options.epubcheckJarPath,
        epubPath,
        '-j',
        reportJsonPath,
      ];

      const res = await execFileAsync(this.options.javaExecutablePath, args, {
        timeout: this.options.timeoutMs ?? 60000,
        maxBuffer: 10 * 1024 * 1024,
      });

      stdout = res.stdout;
      stderr = res.stderr;
      rawExitCode = 0;
    } catch (err: unknown) {
      const execError = err as { code?: number; stdout?: string; stderr?: string };
      rawExitCode = typeof execError.code === 'number' ? execError.code : 1;
      stdout = execError.stdout ?? '';
      stderr = execError.stderr ?? '';
    }

    const executionTimeMs = Date.now() - startTime;

    try {
      const jsonContent = await fs.readFile(reportJsonPath, 'utf-8');
      const rawData: RawEpubCheckReport = JSON.parse(jsonContent);

      const messages: ValidationMessage[] = (rawData.messages ?? []).map((m) => {
        const severity = (m.severity?.toUpperCase() ?? 'ERROR') as ValidationSeverity;
        const locations: ValidationLocation[] = (m.locations ?? []).map((loc) => ({
          path: loc.path,
          line: loc.line,
          column: loc.column,
          context: loc.context,
        }));

        return {
          id: m.ID ?? 'UNKNOWN',
          severity,
          message: m.message ?? '',
          locations,
          suggestion: m.suggestion ?? null,
        };
      });

      const fatalCount = messages.filter((m) => m.severity === 'FATAL').length;
      const errorCount = messages.filter((m) => m.severity === 'ERROR').length;
      const warningCount = messages.filter((m) => m.severity === 'WARNING').length;
      const infoCount = messages.filter((m) => m.severity === 'INFO').length;

      const isValid = rawExitCode === 0 && errorCount === 0 && fatalCount === 0;

      return {
        validatorName: 'EPUBCheck',
        validatorVersion: rawData.checker?.checkerVersion ?? '5.3.0',
        targetPath: epubPath,
        isValid,
        summary: {
          totalFatal: fatalCount,
          totalErrors: errorCount,
          totalWarnings: warningCount,
          totalInfos: infoCount,
          isValid,
        },
        messages,
        rawExitCode,
        executionTimeMs,
      };
    } catch {
      // Fallback if JSON report could not be read (e.g. process launch failure)
      const isError = rawExitCode !== 0;
      return {
        validatorName: 'EPUBCheck',
        validatorVersion: '5.3.0',
        targetPath: epubPath,
        isValid: !isError,
        summary: {
          totalFatal: isError ? 1 : 0,
          totalErrors: isError ? 1 : 0,
          totalWarnings: 0,
          totalInfos: 0,
          isValid: !isError,
        },
        messages: isError
          ? [
              {
                id: 'PROCESS-ERROR',
                severity: 'FATAL',
                message: stderr.trim() || stdout.trim() || 'EPUBCheck process failed to generate report',
                locations: [],
              },
            ]
          : [],
        rawExitCode,
        executionTimeMs,
      };
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
