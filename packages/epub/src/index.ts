// SPDX-License-Identifier: Apache-2.0

export type {
  AssetResolver,
  EpubArchiveOptions,
  EpubBuildOptions,
  EpubManifestItem,
  EpubPackage,
  EpubPackageFile,
  EpubPackageMetadata,
  PublishingDiagnostic,
  PublishingDiagnosticSeverity,
} from "./types.js";

export {
  AssetResolutionError,
  AssetValidationError,
  UnsupportedContentError,
} from "./types.js";
export { buildEpub, buildEpubPackage } from "./epub-builder.js";
export { buildEpubArchive } from "./archive/epub-archive.js";
export {
  processBookAssets,
  validateAndSanitizeAssetId,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "./assets/asset-pipeline.js";
export { normalizeDateForZip } from "./archive/archive-timestamps.js";
export { orderArchiveFiles, normalizeZipPath } from "./archive/archive-order.js";
export { escapeXmlAttr, escapeXmlText } from "./xml-utils.js";
export { serializeSectionDocument } from "./xhtml-serializer.js";
export { serializeNavDocument } from "./nav-serializer.js";
export { serializeOpfDocument } from "./opf-serializer.js";
