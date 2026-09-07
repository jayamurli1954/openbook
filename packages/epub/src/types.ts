// SPDX-License-Identifier: Apache-2.0
import type { AssetRef } from "@openbook/book-model";

/**
 * Injected asynchronous resolver for retrieving raw asset bytes outside the Book Model.
 * In accordance with ADR-0010 §3, the EPUB engine remains platform-independent
 * and never owns asset storage or direct filesystem access.
 */
export interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}

/**
 * Severity level for non-fatal publishing diagnostics.
 * For Gate 3, diagnostics are non-fatal advisories ("warning" | "info").
 * Fatal errors (such as invalid asset IDs, resolver failures, or missing references)
 * throw terminal exceptions (AssetValidationError / AssetResolutionError).
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
 * An individual resource in the EPUB package.
 * Represents in-memory package files (path, mediaType, content).
 */
export interface EpubPackageFile {
  path: string;
  mediaType: string;
  content: string | Uint8Array;
}

/**
 * An item in the OPF package manifest.
 */
export interface EpubManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties?: string;
}

/**
 * Package metadata projection for EPUB 3.3.
 */
export interface EpubPackageMetadata {
  title: string;
  language: string;
  identifier: string;
  modified: string;
  authors?: string[];
  description?: string;
  publisher?: string;
  rights?: string;
}

/**
 * Complete in-memory representation of a generated EPUB 3.3 package.
 */
export interface EpubPackage {
  files: EpubPackageFile[];
  metadata: EpubPackageMetadata;
  manifest: EpubManifestItem[];
  spine: string[];
  diagnostics?: PublishingDiagnostic[];
}

/**
 * Options for deterministic EPUB package generation.
 */
export interface EpubBuildOptions {
  /**
   * Explicit package modification timestamp.
   * If not provided, derived deterministically from book.metadata.publishedAt,
   * or falls back to a deterministic fixed reference date.
   * Never calls the system clock / new Date().
   */
  modifiedDate?: string | Date;

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
 * Options for OCF ZIP archive packaging.
 */
export interface EpubArchiveOptions {
  /**
   * Override timestamp for archive entries.
   * Defaults to pkg.metadata.modified.
   * Never calls the system clock / new Date().
   */
  archiveDate?: string | Date;
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

