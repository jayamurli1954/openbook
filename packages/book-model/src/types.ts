// SPDX-License-Identifier: Apache-2.0

/** Increment when a breaking Book Model change ships with a migration. */
export const BOOK_MODEL_SCHEMA_VERSION = 1 as const;

export type BookModelSchemaVersion = typeof BOOK_MODEL_SCHEMA_VERSION;

export type PublishingOutput = "epub" | "pdf" | "html";

export type MatterKind = "front" | "main" | "back";

/**
 * Publishing roles, not EPUB landmark/OPF types.
 * Additional roles may be added without changing schemaVersion if unknown roles are stored as strings.
 */
export type SectionRole =
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

export interface BookMetadata {
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

export type InlineSpan =
  | { type: "text"; text: string }
  | { type: "emphasis"; children: InlineSpan[] }
  | { type: "strong"; children: InlineSpan[] }
  | { type: "link"; href: string; children: InlineSpan[] };

export type ContentBlock =
  | { type: "paragraph"; id: string; inlines: InlineSpan[] }
  | { type: "heading"; id: string; level: 1 | 2 | 3 | 4 | 5 | 6; inlines: InlineSpan[] }
  | { type: "quote"; id: string; inlines: InlineSpan[] }
  | { type: "list"; id: string; ordered: boolean; items: InlineSpan[][] }
  | { type: "image"; id: string; assetId: string; caption: InlineSpan[] };

export interface StructuralSection {
  id: string;
  kind: MatterKind;
  role: SectionRole | string;
  title: string;
  blocks: ContentBlock[];
}

export type AssetKind = "image" | "font" | "audio" | "video" | "other";

export interface AssetRef {
  id: string;
  kind: AssetKind;
  fileName: string;
  mediaType: string;
  altText: string;
  licence: string;
}

export interface NamedStyle {
  id: string;
  name: string;
}

export interface StyleSystem {
  paragraphStyles: NamedStyle[];
  characterStyles: NamedStyle[];
}

export interface ThemeRef {
  id: string;
  name: string;
}

export interface TypographySettings {
  bodyFontFamily: string;
  headingFontFamily: string;
  bodySizePt: number;
  lineHeight: number;
}

export interface PublishingSettings {
  /** Intended projections. This is not an EPUB/PDF/HTML document. */
  intendedOutputs: PublishingOutput[];
}

export interface Book {
  schemaVersion: number;
  metadata: BookMetadata;
  frontMatter: StructuralSection[];
  chapters: StructuralSection[];
  backMatter: StructuralSection[];
  assets: AssetRef[];
  styles: StyleSystem;
  theme: ThemeRef;
  typography: TypographySettings;
  publishing: PublishingSettings;
}

export type IssueSeverity = "error" | "warning" | "suggestion" | "information";

export interface DomainIssue {
  code: string;
  severity: IssueSeverity;
  message: string;
  path: string;
}

export interface CreateBookInput {
  title?: string;
  authors?: string[];
  language?: string;
  withOpeningChapter?: boolean;
}
