// SPDX-License-Identifier: Apache-2.0
import type { AssetRef } from "@openbook/book-model";

/**
 * Established publishing AssetResolver contract (ADR-0010 / ADR-0017 §2.5).
 * ADR-0017 does not redefine this interface.
 */
export interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}

export type AssetIngestKind = "image" | "font";

export type AssetIssueSeverity = "fatal" | "error" | "warning" | "info";

export interface AssetIssue {
  readonly code: string;
  readonly severity: AssetIssueSeverity;
  readonly message: string;
  readonly assetId?: string;
}

export interface AssetIngestInput {
  readonly content: Uint8Array;
  readonly originalFilename: string;
  readonly kind: AssetIngestKind;
  readonly altText?: string;
  readonly licence?: string;
  readonly idSeed?: string;
}

export interface AssetIngestResult {
  readonly success: boolean;
  readonly assetRef?: AssetRef;
  readonly sha256?: string;
  readonly byteLength?: number;
  readonly issues: readonly AssetIssue[];
}

/** Bytes; default 50 MiB per ADR-0017. */
export const DEFAULT_ASSET_SIZE_LIMIT_BYTES = 50 * 1024 * 1024;

export interface AssetSizeLimits {
  readonly image?: number;
  readonly font?: number;
}

export interface AssetIngestionOptions {
  readonly sizeLimits?: AssetSizeLimits;
}

export interface DetectedAssetType {
  readonly mediaType: string;
  readonly kind: AssetIngestKind;
  readonly format: string;
}
