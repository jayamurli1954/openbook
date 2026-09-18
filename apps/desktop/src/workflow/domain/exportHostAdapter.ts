// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 1 — Export Host Contract/Adapter (ADR-0030).
 *
 * Filesystem-agnostic host boundary. Native dialogs, filesystem writes, and
 * Tauri/React/DOM concerns remain outside this adapter.
 */
import type {
  EpubExportOptions,
  EpubExportResult,
  HtmlExportOptions,
  HtmlExportResult,
  PdfExportOptions,
  PdfExportResult,
} from "../../domain/desktopStudioCoordinator.js";

export type ExportFormat = "epub" | "html" | "pdf";

export interface ExportHostRequest {
  readonly format: ExportFormat;
  readonly signal?: AbortSignal;
  readonly verificationMode?: "fast" | "verified";
}

export type ExportHostResult =
  | EpubExportResult
  | HtmlExportResult
  | PdfExportResult;

export interface ExportCoordinatorPort {
  exportEpub(options?: EpubExportOptions): Promise<EpubExportResult>;
  exportHtml(options?: HtmlExportOptions): Promise<HtmlExportResult>;
  exportPdf(options?: PdfExportOptions): Promise<PdfExportResult>;
}

export interface IExportHostAdapter {
  export(request: ExportHostRequest): Promise<ExportHostResult>;
}

export class ExportHostAdapter implements IExportHostAdapter {
  readonly #coordinator: ExportCoordinatorPort;

  constructor(coordinator: ExportCoordinatorPort) {
    this.#coordinator = coordinator;
  }

  export(request: ExportHostRequest): Promise<ExportHostResult> {
    switch (request.format) {
      case "epub":
        return this.#coordinator.exportEpub({
          signal: request.signal,
          ...(request.verificationMode === undefined
            ? {}
            : { verificationMode: request.verificationMode }),
        });
      case "html":
        return this.#coordinator.exportHtml({ signal: request.signal });
      case "pdf":
        return this.#coordinator.exportPdf({ signal: request.signal });
    }
  }
}
