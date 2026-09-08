// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as fs from "node:fs/promises";
import { existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type {
  EpubCheckAdapterOptions,
  ValidationFailureKind,
  ValidationLocation,
  ValidationMessage,
  ValidationReport,
  ValidationSeverity,
  ValidatorService,
} from "./types.js";

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

function processFailureReport(
  targetPath: string,
  failureKind: ValidationFailureKind,
  message: string,
  rawExitCode: number,
  executionTimeMs: number,
): ValidationReport {
  return {
    validatorName: "EPUBCheck",
    validatorVersion: "5.3.0",
    targetPath,
    isValid: false,
    summary: {
      totalFatal: 1,
      totalErrors: 1,
      totalWarnings: 0,
      totalInfos: 0,
      isValid: false,
    },
    messages: [
      {
        id:
          failureKind === "timeout"
            ? "PROCESS-TIMEOUT"
            : failureKind === "missing_runtime"
              ? "MISSING-RUNTIME"
              : failureKind === "missing_epubcheck"
                ? "MISSING-EPUBCHECK"
                : failureKind === "invalid_path"
                  ? "INVALID-PATH"
                  : "PROCESS-ERROR",
        severity: "FATAL",
        message,
        locations: [],
      },
    ],
    rawExitCode,
    executionTimeMs,
    failureKind,
  };
}

/**
 * Adapter executing official EPUBCheck in an isolated subprocess using a bundled/private Java runtime.
 * Implements the ValidatorService boundary required by ADR-0005 / ADR-0012.
 *
 * Arguments are passed as a discrete argv array (no shell interpolation).
 */
export class EpubCheckSubprocessAdapter implements ValidatorService {
  constructor(private readonly options: EpubCheckAdapterOptions) {}

  async validateEpub(epubPath: string): Promise<ValidationReport> {
    const startTime = Date.now();

    if (typeof epubPath !== "string" || epubPath.trim().length === 0) {
      return processFailureReport(
        String(epubPath),
        "invalid_path",
        "EPUB path must be a non-empty string.",
        1,
        Date.now() - startTime,
      );
    }

    if (!existsSync(epubPath)) {
      return processFailureReport(
        epubPath,
        "invalid_path",
        `EPUB path does not exist: ${epubPath}`,
        1,
        Date.now() - startTime,
      );
    }

    if (!existsSync(this.options.javaExecutablePath)) {
      return processFailureReport(
        epubPath,
        "missing_runtime",
        `Bundled Java executable not found: ${this.options.javaExecutablePath}`,
        1,
        Date.now() - startTime,
      );
    }

    if (!existsSync(this.options.epubcheckJarPath)) {
      return processFailureReport(
        epubPath,
        "missing_epubcheck",
        `EPUBCheck JAR not found: ${this.options.epubcheckJarPath}`,
        1,
        Date.now() - startTime,
      );
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "openbook-epubcheck-"));
    const reportJsonPath = path.join(tempDir, "report.json");

    let rawExitCode = 0;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let spawnFailed = false;
    let spawnErrorMessage = "";

    try {
      const args = [
        "-jar",
        this.options.epubcheckJarPath,
        epubPath,
        "-j",
        reportJsonPath,
      ];

      try {
        const res = await execFileAsync(this.options.javaExecutablePath, args, {
          timeout: this.options.timeoutMs ?? 60000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true,
        });
        stdout = res.stdout;
        stderr = res.stderr;
        rawExitCode = 0;
      } catch (err: unknown) {
        const execError = err as {
          code?: number | string;
          killed?: boolean;
          signal?: string;
          stdout?: string;
          stderr?: string;
          message?: string;
        };
        stdout = execError.stdout ?? "";
        stderr = execError.stderr ?? "";

        if (execError.killed && (execError.signal === "SIGTERM" || execError.code === "ETIMEDOUT")) {
          timedOut = true;
          rawExitCode = 1;
        } else if (execError.code === "ENOENT") {
          spawnFailed = true;
          spawnErrorMessage = execError.message ?? "Failed to spawn Java executable";
          rawExitCode = 1;
        } else if (typeof execError.code === "number") {
          rawExitCode = execError.code;
        } else {
          spawnFailed = true;
          spawnErrorMessage = execError.message ?? "EPUBCheck process failed";
          rawExitCode = 1;
        }
      }

      const executionTimeMs = Date.now() - startTime;

      if (timedOut) {
        return processFailureReport(
          epubPath,
          "timeout",
          `EPUBCheck timed out after ${this.options.timeoutMs ?? 60000}ms`,
          rawExitCode,
          executionTimeMs,
        );
      }

      if (spawnFailed) {
        return processFailureReport(
          epubPath,
          "process_error",
          spawnErrorMessage || stderr.trim() || stdout.trim() || "Failed to start EPUBCheck process",
          rawExitCode,
          executionTimeMs,
        );
      }

      try {
        const jsonContent = await fs.readFile(reportJsonPath, "utf-8");
        const rawData: RawEpubCheckReport = JSON.parse(jsonContent);

        const messages: ValidationMessage[] = (rawData.messages ?? []).map((m) => {
          const severity = (m.severity?.toUpperCase() ?? "ERROR") as ValidationSeverity;
          const locations: ValidationLocation[] = (m.locations ?? []).map((loc) => ({
            path: loc.path,
            line: loc.line,
            column: loc.column,
            context: loc.context,
          }));

          return {
            id: m.ID ?? "UNKNOWN",
            severity,
            message: m.message ?? "",
            locations,
            suggestion: m.suggestion ?? null,
          };
        });

        const fatalCount = messages.filter((m) => m.severity === "FATAL").length;
        const errorCount = messages.filter((m) => m.severity === "ERROR").length;
        const warningCount = messages.filter((m) => m.severity === "WARNING").length;
        const infoCount = messages.filter((m) => m.severity === "INFO").length;

        const isValid = rawExitCode === 0 && errorCount === 0 && fatalCount === 0;

        return {
          validatorName: "EPUBCheck",
          validatorVersion: rawData.checker?.checkerVersion ?? "5.3.0",
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
          failureKind: isValid ? "none" : "conformance",
        };
      } catch {
        return processFailureReport(
          epubPath,
          "process_error",
          stderr.trim() ||
            stdout.trim() ||
            "EPUBCheck process failed to generate a readable JSON report",
          rawExitCode === 0 ? 1 : rawExitCode,
          executionTimeMs,
        );
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
