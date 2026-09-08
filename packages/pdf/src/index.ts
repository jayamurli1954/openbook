// SPDX-License-Identifier: Apache-2.0

export type {
  AssetResolver,
  PdfBuildOptions,
  PdfPublication,
  PublishingDiagnostic,
  PublishingDiagnosticSeverity,
  ResolvedPdfRuntime,
} from "./types.js";

export {
  AssetResolutionError,
  AssetValidationError,
  TypstRuntimeError,
  UnsupportedContentError,
} from "./types.js";
export { buildPdf, resolveCreationTimestamp } from "./pdf-builder.js";
export {
  processBookAssets,
  validateAndSanitizeAssetId,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "./assets/asset-pipeline.js";
export {
  resolveHostPlatformKey,
  resolveProductionTypstRuntime,
  readBuildEvidence,
} from "./resolve-typst.js";
export { serializeBookToTypst, escapeTypstText } from "./typst-serializer.js";
export { compileTypstToPdf } from "./typst-runner.js";
export { DEFAULT_PDF_PROFILE } from "./default-profile.js";
