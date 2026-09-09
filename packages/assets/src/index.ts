// SPDX-License-Identifier: Apache-2.0

export type {
  AssetResolver,
  AssetIngestKind,
  AssetIssueSeverity,
  AssetIssue,
  AssetIngestInput,
  AssetIngestResult,
  AssetSizeLimits,
  AssetIngestionOptions,
  DetectedAssetType,
} from "./types.js";
export {
  DEFAULT_ASSET_SIZE_LIMIT_BYTES,
} from "./types.js";

export type { IAssetStore } from "./store.js";
export { assertSha256Key } from "./store.js";
export { MemoryAssetStore } from "./memory-store.js";
export { DirectoryAssetStore } from "./directory-store.js";
export { AssetRegistry } from "./registry.js";
export { sha256Hex, synthesizeAssetId } from "./hash.js";
export { detectAssetType, isKindCompatible } from "./magic.js";
export {
  findUnsafeSvgConstructs,
  isSvgMediaType,
} from "./svg-security.js";
export type { SvgSecurityFinding } from "./svg-security.js";
export {
  AssetIngestionPipeline,
  metadataFileName,
} from "./ingestion.js";
export { StoreBackedAssetResolver } from "./resolver.js";
export { AssetAuditor } from "./auditor.js";
export type { AssetAuditResult } from "./auditor.js";
