// SPDX-License-Identifier: Apache-2.0
export {
  SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  type SemanticAssetKind,
  type SemanticAssetRef,
  type SemanticBlock,
  type SemanticDocument,
  type SemanticDocumentMetadata,
  type SemanticDocumentSchemaVersion,
  type SemanticInline,
  type SemanticIssue,
  type SemanticIssueSeverity,
  type SemanticMatterKind,
  type SemanticSection,
  type SemanticSectionRole,
} from "./types.js";
export {
  EPUB_AUTHORING_LEAK_KEYS,
  validateSemanticDocument,
} from "./validate-document.js";
export {
  SemanticDocumentMappingError,
  semanticDocumentToBook,
} from "./to-book.js";
export { bookToSemanticDocument } from "./from-book.js";
