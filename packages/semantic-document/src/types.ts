// SPDX-License-Identifier: Apache-2.0

/**
 * Semantic Document Model — editor-facing, format-neutral content contract.
 * Maps deterministically to `@openbook/book-model`. Not an EPUB/HTML/PDF document.
 */

/** Increment when a breaking SDM contract change ships. Independent of Book Model schemaVersion. */
export const SEMANTIC_DOCUMENT_SCHEMA_VERSION = 1 as const;

export type SemanticDocumentSchemaVersion = typeof SEMANTIC_DOCUMENT_SCHEMA_VERSION;

export type SemanticMatterKind = "front" | "main" | "back";

/**
 * Publishing roles aligned with Book Model SectionRole — not EPUB landmarks.
 */
export type SemanticSectionRole =
  | "chapter"
  | "half-title"
  | "title-page"
  | "copyright"
  | "dedication"
  | "preface"
  | "foreword"
  | "introduction"
  | "appendix"
  | "notes"
  | "references"
  | "bibliography"
  | "about-author"
  | "other-books"
  | "custom";

export interface SemanticDocumentMetadata {
  title: string;
  subtitle: string;
  authors: string[];
  contributors: string[];
  language: string;
  identifier: string;
  publisher: string;
  publishedAt: string;
  copyright: string;
  description: string;
  subjects: string[];
  rights: string;
}

export type SemanticInline =
  | { type: "text"; text: string }
  | { type: "emphasis"; children: SemanticInline[] }
  | { type: "strong"; children: SemanticInline[] }
  | { type: "link"; href: string; children: SemanticInline[] };

export type SemanticBlock =
  | { type: "paragraph"; id: string; inlines: SemanticInline[] }
  | { type: "heading"; id: string; level: 1 | 2 | 3 | 4 | 5 | 6; inlines: SemanticInline[] }
  | { type: "quote"; id: string; inlines: SemanticInline[] }
  | { type: "list"; id: string; ordered: boolean; items: SemanticInline[][] }
  | { type: "image"; id: string; assetId: string; caption: SemanticInline[] };

export interface SemanticSection {
  id: string;
  matter: SemanticMatterKind;
  role: SemanticSectionRole | string;
  title: string;
  blocks: SemanticBlock[];
}

export type SemanticAssetKind = "image" | "font" | "audio" | "video" | "other";

export interface SemanticAssetRef {
  id: string;
  kind: SemanticAssetKind;
  fileName: string;
  mediaType: string;
  altText: string;
  licence: string;
}

/**
 * Editor-independent semantic manuscript document.
 * Does not include styles/theme/typography/publishing — those remain Book Model concerns
 * with deterministic defaults applied during mapping.
 */
export interface SemanticDocument {
  schemaVersion: number;
  metadata: SemanticDocumentMetadata;
  sections: SemanticSection[];
  assets: SemanticAssetRef[];
}

export type SemanticIssueSeverity = "error" | "warning" | "suggestion" | "information";

export interface SemanticIssue {
  code: string;
  severity: SemanticIssueSeverity;
  message: string;
  path: string;
}
