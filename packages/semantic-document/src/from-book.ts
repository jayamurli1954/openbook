// SPDX-License-Identifier: Apache-2.0
import type { Book, ContentBlock, InlineSpan, StructuralSection } from "@openbook/book-model";
import {
  SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  type SemanticBlock,
  type SemanticDocument,
  type SemanticInline,
  type SemanticSection,
} from "./types.js";

function mapInline(inline: InlineSpan): SemanticInline {
  switch (inline.type) {
    case "text":
      return { type: "text", text: inline.text };
    case "emphasis":
      return { type: "emphasis", children: inline.children.map(mapInline) };
    case "strong":
      return { type: "strong", children: inline.children.map(mapInline) };
    case "link":
      return {
        type: "link",
        href: inline.href,
        children: inline.children.map(mapInline),
      };
    default: {
      const _exhaustive: never = inline;
      return _exhaustive;
    }
  }
}

function mapBlock(block: ContentBlock): SemanticBlock {
  switch (block.type) {
    case "paragraph":
      return {
        type: "paragraph",
        id: block.id,
        inlines: block.inlines.map(mapInline),
      };
    case "heading":
      return {
        type: "heading",
        id: block.id,
        level: block.level,
        inlines: block.inlines.map(mapInline),
      };
    case "quote":
      return {
        type: "quote",
        id: block.id,
        inlines: block.inlines.map(mapInline),
      };
    case "list":
      return {
        type: "list",
        id: block.id,
        ordered: block.ordered,
        items: block.items.map((item) => item.map(mapInline)),
      };
    case "image":
      return {
        type: "image",
        id: block.id,
        assetId: block.assetId,
        caption: block.caption.map(mapInline),
      };
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

function mapSection(section: StructuralSection): SemanticSection {
  return {
    id: section.id,
    matter: section.kind,
    role: section.role,
    title: section.title,
    blocks: section.blocks.map(mapBlock),
  };
}

/**
 * Extract the semantic content contract from a canonical Book.
 * Drops styles/theme/typography/publishing (not part of SDM).
 */
export function bookToSemanticDocument(book: Book): SemanticDocument {
  const sections: SemanticSection[] = [
    ...book.frontMatter.map(mapSection),
    ...book.chapters.map(mapSection),
    ...book.backMatter.map(mapSection),
  ];

  return {
    schemaVersion: SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    metadata: {
      title: book.metadata.title,
      subtitle: book.metadata.subtitle,
      authors: [...book.metadata.authors],
      contributors: [...book.metadata.contributors],
      language: book.metadata.language,
      identifier: book.metadata.identifier,
      publisher: book.metadata.publisher,
      publishedAt: book.metadata.publishedAt,
      copyright: book.metadata.copyright,
      description: book.metadata.description,
      subjects: [...book.metadata.subjects],
      rights: book.metadata.rights,
    },
    sections,
    assets: book.assets.map((a) => ({ ...a })),
  };
}
