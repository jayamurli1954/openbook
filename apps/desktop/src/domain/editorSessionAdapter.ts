// SPDX-License-Identifier: Apache-2.0
/**
 * Adapter between the Tiptap editor surface and canonical BookSession.
 *
 * Retires the prototype EditorBookSession shim (ADR-0019 §3.3). Tiptap JSON is
 * converted through EditorAdapter → SemanticDocument → Book ContentBlock[] and
 * never stored. BookSession remains the aggregate root.
 */
import { createBook, type Book, type ContentBlock } from "@openbook/book-model";
import {
  bookToSemanticDocument,
  semanticDocumentToBook,
  type SemanticDocumentMetadata,
  type SemanticMatterKind,
} from "@openbook/semantic-document";
import {
  semanticDocumentToTipTapJson,
  tipTapJsonToSemanticDocument,
  type EditorConversionWarning,
  type TipTapDocJSON,
} from "./editorAdapter.js";

export type ChapterSummary = {
  id: string;
  title: string;
  /** Zero-based index among main-matter chapters. */
  index: number;
};

export type TipTapBlockConversion = {
  blocks: ContentBlock[];
  warnings: EditorConversionWarning[];
};

export type TipTapDocConversion = {
  doc: TipTapDocJSON;
  warnings: EditorConversionWarning[];
};

const EMPTY_TIPTAP: TipTapDocJSON = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export type DraftBookInput = {
  title: string;
  language?: string;
  authors?: string[];
};

/** Canonical Book used to start an unsaved desktop authoring session. */
export function createDesktopDraftBook(input: DraftBookInput): Book {
  const book = createBook({
    title: input.title,
    language: input.language ?? "en",
    authors: input.authors ?? ["OpenBook"],
  });
  book.metadata.publishedAt = "";
  return book;
}

/** Main-matter chapters in deterministic Book.chapters order. */
export function listMainChapters(book: Book): ChapterSummary[] {
  return book.chapters.map((section, index) => ({
    id: section.id,
    title: section.title,
    index,
  }));
}

export type TipTapToBlocksOptions = {
  metadata: SemanticDocumentMetadata;
  sectionId: string;
  sectionTitle: string;
  matter: SemanticMatterKind;
  role: string;
  createId?: (prefix: string) => string;
};

/**
 * EditorAdapter path: Tiptap JSON → SDM (one section) → ContentBlock[].
 * Does not mutate BookSession.
 */
export function tipTapJsonToContentBlocks(
  tipTap: TipTapDocJSON,
  options: TipTapToBlocksOptions,
): TipTapBlockConversion {
  const converted = tipTapJsonToSemanticDocument(tipTap, options);
  const projected = semanticDocumentToBook(converted.document);
  const section =
    projected.chapters[0] ??
    projected.frontMatter[0] ??
    projected.backMatter[0];
  return {
    blocks: section ? [...section.blocks] : [],
    warnings: converted.warnings,
  };
}

/**
 * EditorAdapter path: active section ContentBlock[] → Tiptap JSON.
 * Uses bookToSemanticDocument so Book remains canonical.
 */
export function sectionBlocksToTipTap(
  book: Book,
  sectionId: string,
): TipTapDocConversion {
  const document = bookToSemanticDocument(book);
  const section = document.sections.find((item) => item.id === sectionId);
  if (!section) {
    return {
      doc: structuredClone(EMPTY_TIPTAP),
      warnings: [
        {
          code: "section-not-found",
          message: `Section ${sectionId} not found`,
          path: "/selectedSectionId",
        },
      ],
    };
  }
  return semanticDocumentToTipTapJson({
    ...document,
    sections: [section],
  });
}

export function bookMetadataToSemantic(
  book: Book,
): SemanticDocumentMetadata {
  return bookToSemanticDocument(book).metadata;
}
