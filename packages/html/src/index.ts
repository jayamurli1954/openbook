// SPDX-License-Identifier: Apache-2.0

export type {
  AssetResolver,
  HtmlBuildOptions,
  HtmlPublication,
  HtmlPublicationFile,
  PublishingDiagnostic,
  PublishingDiagnosticSeverity,
} from "./types.js";

export {
  AssetResolutionError,
  AssetValidationError,
  UnsupportedContentError,
  UnsafeUrlError,
} from "./types.js";
export { buildHtml } from "./html-builder.js";
export {
  processBookAssets,
  validateAndSanitizeAssetId,
  SUPPORTED_IMAGE_MIME_TYPES,
} from "./assets/asset-pipeline.js";
export { escapeHtmlAttr, escapeHtmlText } from "./html-utils.js";
export { isSafeHref, sanitizeHref, ALLOWED_URL_SCHEMES } from "./urls.js";
export { serializeBlock, serializeInlines, serializeSection } from "./html-serializer.js";
export { DEFAULT_HTML_CSS } from "./css.js";
