// SPDX-License-Identifier: Apache-2.0
import type { AssetRef } from "@openbook/book-model";

/**
 * Injected asynchronous resolver for retrieving raw asset bytes outside the Book Model.
 * The HTML engine remains platform-independent and never owns asset storage,
 * filesystem access, SQLite, Tauri, or browser APIs.
 */
export interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}

/**
 * Severity level for non-fatal publishing diagnostics.
 * Fatal errors throw terminal exceptions.
 */
export type PublishingDiagnosticSeverity = "warning" | "info";

export interface PublishingDiagnostic {
  code: string;
  severity: PublishingDiagnosticSeverity;
  message: string;
  assetId?: string;
  blockId?: string;
}

/**
 * An individual resource in the HTML publication.
 * Represents in-memory publication files (path, mediaType, content).
 */
export interface HtmlPublicationFile {
  path: string;
  mediaType: string;
  content: string | Uint8Array;
}

/**
 * Complete in-memory representation of a generated HTML5 publication.
 */
export interface HtmlPublication {
  html: string;
  files: HtmlPublicationFile[];
  diagnostics: PublishingDiagnostic[];
}

/**
 * Options for deterministic HTML publication generation.
 */
export interface HtmlBuildOptions {
  /**
   * Injected asynchronous resolver for binary asset bytes.
   * Required if the Book contains image content blocks.
   */
  assetResolver?: AssetResolver;

  /**
   * Callback receiver for non-fatal publishing diagnostics (e.g. missing altText).
   */
  onDiagnostic?: (diagnostic: PublishingDiagnostic) => void;
}

/**
 * Thrown when encountering content block types that are not supported.
 */
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

/**
 * Thrown when asset validation fails deterministically
 * (e.g. missing references, duplicate IDs, unsupported media types, path traversal).
 */
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

/**
 * Thrown when an injected AssetResolver fails or returns invalid/empty bytes.
 */
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

/**
 * Thrown when a link href is rejected by the HTML engine URL policy.
 */
export class UnsafeUrlError extends Error {
  readonly code: string;
  readonly href: string;

  constructor(code: string, href: string, message?: string) {
    super(message ?? `Unsafe URL rejected: "${href}".`);
    this.name = "UnsafeUrlError";
    this.code = code;
    this.href = href;
  }
}
