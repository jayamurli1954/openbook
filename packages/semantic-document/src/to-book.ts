// SPDX-License-Identifier: Apache-2.0
import {
  BOOK_MODEL_SCHEMA_VERSION,
  type Book,
  type ContentBlock,
  type InlineSpan,
  type StructuralSection,
} from "@openbook/book-model";
import type {
  SemanticBlock,
  SemanticDocument,
  SemanticInline,
  SemanticSection,
} from "./types.js";
import { validateSemanticDocument } from "./validate-document.js";

export class SemanticDocumentMappingError extends Error {
  readonly issues: ReturnType<typeof validateSemanticDocument>;

  constructor(message: string, issues: ReturnType<typeof validateSemanticDocument>) {
    super(message);
    this.name = "SemanticDocumentMappingError";
    this.issues = issues;
  }
}

function mapInline(inline: SemanticInline): InlineSpan {
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

function mapBlock(block: SemanticBlock): ContentBlock {
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

function mapSection(section: SemanticSection): StructuralSection {
  return {
    id: section.id,
    kind: section.matter,
    role: section.role,
    title: section.title,
    blocks: section.blocks.map(mapBlock),
  };
}

/**
 * Deterministic projection: SemanticDocument → canonical Book.
 * Book Model remains the publishing source of truth after this step.
 */
export function semanticDocumentToBook(doc: SemanticDocument): Book {
  const issues = validateSemanticDocument(doc);
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length > 0) {
    throw new SemanticDocumentMappingError(
      `SemanticDocument failed contract validation (${errors.length} error(s))`,
      issues,
    );
  }

  const frontMatter: StructuralSection[] = [];
  const chapters: StructuralSection[] = [];
  const backMatter: StructuralSection[] = [];

  for (const section of doc.sections) {
    const mapped = mapSection(section);
    switch (section.matter) {
      case "front":
        frontMatter.push(mapped);
        break;
      case "main":
        chapters.push(mapped);
        break;
      case "back":
        backMatter.push(mapped);
        break;
      default: {
        const _exhaustive: never = section.matter;
        return _exhaustive;
      }
    }
  }

  return {
    schemaVersion: BOOK_MODEL_SCHEMA_VERSION,
    metadata: {
      title: doc.metadata.title,
      subtitle: doc.metadata.subtitle,
      authors: [...doc.metadata.authors],
      contributors: [...doc.metadata.contributors],
      language: doc.metadata.language,
      identifier: doc.metadata.identifier,
      publisher: doc.metadata.publisher,
      publishedAt: doc.metadata.publishedAt,
      copyright: doc.metadata.copyright,
      description: doc.metadata.description,
      subjects: [...doc.metadata.subjects],
      rights: doc.metadata.rights,
    },
    frontMatter,
    chapters,
    backMatter,
    assets: doc.assets.map((a) => ({ ...a })),
    styles: { paragraphStyles: [], characterStyles: [] },
    theme: { id: "default", name: "Default" },
    typography: {
      bodyFontFamily: "",
      headingFontFamily: "",
      bodySizePt: 11,
      lineHeight: 1.4,
    },
    publishing: {
      intendedOutputs: [],
    },
  };
}
