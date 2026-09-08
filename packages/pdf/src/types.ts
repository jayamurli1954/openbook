// SPDX-License-Identifier: Apache-2.0
import type { AssetRef } from "@openbook/book-model";

/**
 * Injected asynchronous resolver for retrieving raw asset bytes outside the Book Model.
 * The PDF engine remains platform-independent and never owns asset storage,
 * filesystem access, SQLite, Tauri, or browser APIs.
 */
export interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}

export type PublishingDiagnosticSeverity = "warning" | "info";

export interface PublishingDiagnostic {
  code: string;
  severity: PublishingDiagnosticSeverity;
  message: string;
  assetId?: string;
  blockId?: string;
}

/**
 * Complete in-memory representation of a generated PDF publication.
 */
export interface PdfPublication {
  pdf: Uint8Array;
  diagnostics: PublishingDiagnostic[];
  /** Generated Typst source (always returned for testability / diagnostics). */
  typstSource: string;
}

/**
 * Options for deterministic PDF publication generation.
 */
export interface PdfBuildOptions {
  /**
   * Injected asynchronous resolver for binary asset bytes.
   * Required if the Book contains image content blocks.
   */
  assetResolver?: AssetResolver;

  /**
   * Callback receiver for non-fatal publishing diagnostics.
   */
  onDiagnostic?: (diagnostic: PublishingDiagnostic) => void;

  /**
   * Absolute path to the Typst executable. Defaults to the Gate 6 packaging layout.
   */
  typstExecutablePath?: string;

  /**
   * Font directory passed to Typst `--font-path`. Defaults to packaging fonts dir.
   */
  fontPath?: string;

  /**
   * Unix timestamp (seconds) for `--creation-timestamp`.
   * Defaults to `Book.metadata.publishedAt` when parseable, otherwise `0`.
   */
  creationTimestamp?: number;

  /**
   * Working directory for intermediate Typst/image files. Defaults to an OS temp dir.
   */
  workDirectory?: string;
}

export class UnsupportedContentError extends Error {
  readonly blockType: string;
  readonly blockId?: string;

  constructor(blockType: string, blockId?: string, message?: string) {
    super(
      message ??
        `Unsupported content block: "${blockType}"${blockId ? ` (id: "${blockId}")` : ""}.`,
    );
    this.name = "UnsupportedContentError";
    this.blockType = blockType;
    this.blockId = blockId;
  }
}

export class AssetValidationError extends Error {
  readonly code: string;
  readonly assetId?: string;

  constructor(code: string, message: string, assetId?: string) {
    super(message);
    this.name = "AssetValidationError";
    this.code = code;
    this.assetId = assetId;
  }
}

export class AssetResolutionError extends Error {
  readonly code: string;
  readonly assetId: string;

  constructor(
    code: string,
    message: string,
    assetId: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AssetResolutionError";
    this.code = code;
    this.assetId = assetId;
  }
}

export class TypstRuntimeError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TypstRuntimeError";
    this.code = code;
  }
}

export interface ResolvedPdfRuntime {
  platformKey: string;
  typstExecutablePath: string;
  fontsDirectory: string;
  cacheRoot: string;
  evidencePath?: string;
}
