// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 1 — Export Host Contract/Adapter (ADR-0030).
 *
 * This boundary is intentionally filesystem-agnostic. It delegates artifact
 * generation and verification to DesktopStudioCoordinator and does not open
 * native dialogs, write files, or depend on Tauri/React/DOM APIs.
 */
import type {
  EpubExportOptions,
  EpubExportResult,
  HtmlExportOptions,
  HtmlExportResult,
  PdfExportOptions,
  PdfExportResult,
} from "./desktopStudioCoordinator.js";

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

/**
 * Minimal coordinator port required by the host boundary.
 *
 * Keeping this narrower than IDesktopStudioCoordinator prevents the host
 * adapter from gaining access to persistence, authoring, or session APIs.
 */
export interface ExportCoordinatorPort {
  exportEpub(options?: EpubExportOptions): Promise<EpubExportResult>;
  exportHtml(options?: HtmlExportOptions): Promise<HtmlExportResult>;
  exportPdf(options?: PdfExportOptions): Promise<PdfExportResult>;
}

export interface IExportHostAdapter {
  export(request: ExportHostRequest): Promise<ExportHostResult>;
}

/**
 * Adapter used by a future desktop host/UI.
 *
 * Slice 1 deliberately stops at the in-memory export boundary. Native Save As,
 * destination validation, overwrite confirmation, and filesystem writes are
 * later host responsibilities.
 */
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
        return this.#coordinator.exportHtml({
          signal: request.signal,
        });
      case "pdf":
        return this.#coordinator.exportPdf({
          signal: request.signal,
        });
    }
  }
}
