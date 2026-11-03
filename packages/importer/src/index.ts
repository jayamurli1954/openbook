// SPDX-License-Identifier: Apache-2.0

export type {
  SupportedImportFormat,
  ImportSource,
  DocxImportSource,
  TextImportSource,
  ImportOptions,
  ImportIssueSeverity,
  ImportIssue,
  ImportResult,
  ImportedImagePayload,
  IImportService,
} from "./types.js";
export { IMPORTED_IMAGE_PLACEHOLDER_PREFIX } from "./types.js";

export { ImportService } from "./import-service.js";
export { DeterministicIdFactory } from "./ids.js";
export { extractFrontmatter } from "./frontmatter.js";
export { sanitizeImportHref } from "./links.js";
export { resolvePublishedAt } from "./metadata.js";

export { openDocxPackage, WORD_DOCUMENT_CONTENT_TYPE } from "./docx/package.js";
export {
  LARGE_PICTURES,
  PICTURES_WITHOUT_ALT_TEXT,
  largePicturesIssue,
  picturesWithoutAltTextIssue,
} from "./docx/docx-import.js";
export type { DocxPackage, DocxOpenResult } from "./docx/package.js";
export { DEFAULT_DOCX_LIMITS } from "./docx/limits.js";
export type { DocxLimits } from "./docx/limits.js";
export { DocxReadError } from "./docx/errors.js";
export type { DocxReadErrorCode } from "./docx/errors.js";
export { getXmlAttribute, xmlChildElements } from "./docx/xml.js";
export type { XmlAttribute, XmlElement, XmlNode } from "./docx/xml.js";
