// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 4 — thin desktop export controller (ADR-0030).
 *
 * Maps ExportSaveHostAdapter outcomes into UI-facing status without owning
 * EPUB/HTML/PDF generation, filesystem writes, or Tauri details.
 */
import type { WorkflowStage } from "@openbook/workflow";
import type { ExportFormat } from "../workflow/domain/exportHostAdapter.js";
import type {
  ExportSaveHostRequest,
  ExportSaveHostResult,
  IExportSaveHostAdapter,
} from "../workflow/domain/exportSaveHostAdapter.js";
import type { SaveAsHostErrorCode } from "../workflow/domain/saveAsHostAdapter.js";
import { DesktopStudioError } from "../domain/desktopStudioCoordinator.js";

export type ExportUiPhase =
  | "idle"
  | "exporting"
  | "saving"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface ExportUiStatus {
  readonly phase: ExportUiPhase;
  readonly message: string;
  readonly format?: ExportFormat;
  readonly path?: string;
  readonly code?: string;
}

export interface DesktopExportControllerDeps {
  readonly exportSaveHost: IExportSaveHostAdapter;
  readonly getSuggestedTitle: () => string;
  readonly getStage: () => WorkflowStage;
}

function messageFromUnknown(error: unknown): string {
  if (error instanceof DesktopStudioError) {
    return `${error.code}: ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function messageFromSaveFailure(
  code: SaveAsHostErrorCode,
  message: string,
): { phase: ExportUiPhase; message: string; code: SaveAsHostErrorCode } {
  if (code === "EXPORT_CANCELLED" || code === "EXPORT_OVERWRITE_DECLINED") {
    return { phase: "cancelled", message, code };
  }
  return { phase: "failed", message: `${code}: ${message}`, code };
}

export function isExportStage(stage: WorkflowStage): boolean {
  return stage === "PREVIEW" || stage === "PUBLISH";
}

export function defaultVerificationMode(
  stage: WorkflowStage,
): "fast" | "verified" | undefined {
  if (stage === "PREVIEW") {
    return "fast";
  }
  if (stage === "PUBLISH") {
    return "verified";
  }
  return undefined;
}

export class DesktopExportController {
  readonly #exportSaveHost: IExportSaveHostAdapter;
  readonly #getSuggestedTitle: () => string;
  readonly #getStage: () => WorkflowStage;

  constructor(deps: DesktopExportControllerDeps) {
    this.#exportSaveHost = deps.exportSaveHost;
    this.#getSuggestedTitle = deps.getSuggestedTitle;
    this.#getStage = deps.getStage;
  }

  canExport(): boolean {
    return isExportStage(this.#getStage());
  }

  async exportFormat(
    format: ExportFormat,
    options?: { signal?: AbortSignal },
  ): Promise<ExportUiStatus> {
    const stage = this.#getStage();
    if (!isExportStage(stage)) {
      return {
        phase: "failed",
        format,
        code: "PUBLISH_NOT_PERMITTED",
        message: `Export is available only in PREVIEW or PUBLISH (current: ${stage}).`,
      };
    }

    const request: ExportSaveHostRequest = {
      format,
      suggestedTitle: this.#getSuggestedTitle().trim() || "Untitled Book",
      ...(options?.signal === undefined ? {} : { signal: options.signal }),
      ...(format === "epub"
        ? {
            verificationMode: defaultVerificationMode(stage) ?? "verified",
          }
        : {}),
    };

    let result: ExportSaveHostResult;
    try {
      result = await this.#exportSaveHost.exportAndSave(request);
    } catch (error) {
      return {
        phase: "failed",
        format,
        message: messageFromUnknown(error),
        code: error instanceof DesktopStudioError ? error.code : "PUBLISH_FAILED",
      };
    }

    if (result.ok) {
      return {
        phase: "succeeded",
        format,
        path: result.path,
        message: `Exported ${format.toUpperCase()} to ${result.path}`,
      };
    }

    if (result.stage === "export") {
      return {
        phase: "failed",
        format,
        message: messageFromUnknown(result.error),
        code:
          result.error instanceof DesktopStudioError
            ? result.error.code
            : "PUBLISH_FAILED",
      };
    }

    const save = messageFromSaveFailure(result.code, result.message);
    return {
      phase: save.phase,
      format,
      code: save.code,
      message: save.message,
    };
  }
}
