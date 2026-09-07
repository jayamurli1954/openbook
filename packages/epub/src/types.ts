// SPDX-License-Identifier: Apache-2.0

/**
 * An individual resource in the EPUB package.
 * Gate 1 represents in-memory package files only (path, mediaType, content).
 * Binary packing/compression is deferred to Gate 2.
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
}
