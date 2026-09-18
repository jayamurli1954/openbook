// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 3 — Export + Save-As host wiring (ADR-0030).
 *
 * Composes the Slice 1 export host with the Slice 2 Save-As host:
 *
 *   ExportHostRequest → ExportHostAdapter → Coordinator → ExportResult
 *                                              │
 *                                              ▼
 *                                      SaveAsHostAdapter → native file
 *
 * React/UI, Tauri dialog/plugin implementations, and publishing engines remain
 * outside this module. Filesystem access stays behind the Save-As ports.
 */
import {
  ExportHostAdapter,
  type ExportCoordinatorPort,
  type ExportFormat,
  type ExportHostRequest,
  type ExportHostResult,
  type IExportHostAdapter,
} from "./exportHostAdapter.js";
import {
  type ISaveAsHostAdapter,
  type SaveAsCompanionFile,
  type SaveAsHostErrorCode,
  type SaveAsHostOutcome,
  type SaveAsHostRequest,
} from "./saveAsHostAdapter.js";

export interface ExportSaveHostRequest {
  readonly format: ExportFormat;
  readonly suggestedTitle: string;
  readonly signal?: AbortSignal;
  readonly verificationMode?: "fast" | "verified";
}

export type ExportSaveHostResult =
  | {
      readonly ok: true;
      readonly path: string;
      readonly writtenPaths: readonly string[];
      readonly exportResult: ExportHostResult;
    }
  | {
      readonly ok: false;
      readonly stage: "export";
      readonly error: unknown;
    }
  | {
      readonly ok: false;
      readonly stage: "save";
      readonly code: SaveAsHostErrorCode;
      readonly message: string;
    };

export interface IExportSaveHostAdapter {
  exportAndSave(request: ExportSaveHostRequest): Promise<ExportSaveHostResult>;
}

const textEncoder = new TextEncoder();

function contentToBytes(content: string | Uint8Array): Uint8Array {
  return typeof content === "string" ? textEncoder.encode(content) : content;
}

/**
 * Maps an in-memory export result into a Save-As request.
 * HTML keeps companion publication resources; the selected destination receives
 * the primary HTML bytes rather than forcing a misleading single-file drop.
 */
export function exportResultToSaveAsRequest(
  exportResult: ExportHostResult,
  suggestedTitle: string,
  signal?: AbortSignal,
): SaveAsHostRequest {
  switch (exportResult.format) {
    case "epub":
      return {
        suggestedTitle,
        format: "epub",
        bytes: exportResult.bytes,
        ...(signal === undefined ? {} : { signal }),
      };
    case "pdf":
      return {
        suggestedTitle,
        format: "pdf",
        bytes: exportResult.bytes,
        ...(signal === undefined ? {} : { signal }),
      };
    case "html": {
      const primary =
        exportResult.files.find((file) => file.path === "index.html") ??
        ({
          path: "index.html",
          mediaType: "text/html; charset=utf-8",
          content: exportResult.html,
        } as const);
      const companions: SaveAsCompanionFile[] = exportResult.files
        .filter((file) => file.path !== "index.html")
        .map((file) => ({
          relativePath: file.path,
          bytes: contentToBytes(file.content),
        }));
      return {
        suggestedTitle,
        format: "html",
        bytes: contentToBytes(primary.content),
        ...(companions.length > 0 ? { companionFiles: companions } : {}),
        ...(signal === undefined ? {} : { signal }),
      };
    }
  }
}

export class ExportSaveHostAdapter implements IExportSaveHostAdapter {
  readonly #exportHost: IExportHostAdapter;
  readonly #saveAsHost: ISaveAsHostAdapter;

  constructor(exportHost: IExportHostAdapter, saveAsHost: ISaveAsHostAdapter) {
    this.#exportHost = exportHost;
    this.#saveAsHost = saveAsHost;
  }

  static fromPorts(
    coordinator: ExportCoordinatorPort,
    saveAsHost: ISaveAsHostAdapter,
  ): ExportSaveHostAdapter {
    return new ExportSaveHostAdapter(new ExportHostAdapter(coordinator), saveAsHost);
  }

  async exportAndSave(request: ExportSaveHostRequest): Promise<ExportSaveHostResult> {
    const exportRequest: ExportHostRequest = {
      format: request.format,
      ...(request.signal === undefined ? {} : { signal: request.signal }),
      ...(request.verificationMode === undefined
        ? {}
        : { verificationMode: request.verificationMode }),
    };

    let exportResult: ExportHostResult;
    try {
      exportResult = await this.#exportHost.export(exportRequest);
    } catch (error) {
      return { ok: false, stage: "export", error };
    }

    const saveRequest = exportResultToSaveAsRequest(
      exportResult,
      request.suggestedTitle,
      request.signal,
    );
    const saveOutcome: SaveAsHostOutcome = await this.#saveAsHost.save(saveRequest);

    if (!saveOutcome.ok) {
      return {
        ok: false,
        stage: "save",
        code: saveOutcome.code,
        message: saveOutcome.message,
      };
    }

    return {
      ok: true,
      path: saveOutcome.path,
      writtenPaths: saveOutcome.writtenPaths,
      exportResult,
    };
  }
}
