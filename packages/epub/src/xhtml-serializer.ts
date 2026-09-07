// SPDX-License-Identifier: Apache-2.0

import type { ContentBlock, InlineSpan, StructuralSection } from "@openbook/book-model";
import { escapeXmlAttr, escapeXmlText } from "./xml-utils.js";

/**
 * Serializes an array of InlineSpans to semantic XHTML inline elements.
 * Preserves Unicode (such as Kannada) intact in native UTF-8.
 */
export function serializeInlines(inlines: InlineSpan[]): string {
  return inlines
    .map((span) => {
      switch (span.type) {
        case "text":
          return escapeXmlText(span.text);
        case "emphasis":
          return `<em>${serializeInlines(span.children)}</em>`;
        case "strong":
          return `<strong>${serializeInlines(span.children)}</strong>`;
        case "link":
          return `<a href="${escapeXmlAttr(span.href)}">${serializeInlines(span.children)}</a>`;
        default:
          return "";
      }
    })
    .join("");
}

/**
 * Serializes a ContentBlock to semantic XHTML block elements.
 */
export function serializeBlock(block: ContentBlock): string {
  const idAttr = block.id ? ` id="${escapeXmlAttr(block.id)}"` : "";

  switch (block.type) {
    case "paragraph":
      return `      <p${idAttr}>${serializeInlines(block.inlines)}</p>`;

    case "heading": {
      const level = Math.max(1, Math.min(6, block.level));
      const tag = `h${level}`;
      return `      <${tag}${idAttr}>${serializeInlines(block.inlines)}</${tag}>`;
    }

    case "quote":
      return `      <blockquote${idAttr}><p>${serializeInlines(block.inlines)}</p></blockquote>`;

    case "list": {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items
        .map((itemInlines) => `        <li>${serializeInlines(itemInlines)}</li>`)
        .join("\n");
      return `      <${tag}${idAttr}>\n${items}\n      </${tag}>`;
    }

    case "image": {
      const caption =
        block.caption.length > 0
          ? `\n        <figcaption>${serializeInlines(block.caption)}</figcaption>`
          : "";
      return `      <figure${idAttr}>\n        <img src="../assets/${escapeXmlAttr(block.assetId)}" alt="" />${caption}\n      </figure>`;
    }

    default:
      return "";
  }
}

/**
 * Determines epub:type and ARIA role for a section based on its kind and role.
 */
function getSectionSemantics(section: StructuralSection): { epubType: string; role?: string } {
  switch (section.kind) {
    case "front":
      if (section.role === "title-page") {
        return { epubType: "frontmatter titlepage", role: "doc-titlepage" };
      }
      if (section.role === "dedication") {
        return { epubType: "frontmatter dedication", role: "doc-dedication" };
      }
      if (section.role === "preface") {
        return { epubType: "frontmatter preface" };
      }
      if (section.role === "foreword") {
        return { epubType: "frontmatter foreword" };
      }
      if (section.role === "introduction") {
        return { epubType: "frontmatter introduction" };
      }
      return { epubType: "frontmatter" };

    case "main":
      if (section.role === "chapter") {
        return { epubType: "bodymatter chapter", role: "doc-chapter" };
      }
      return { epubType: "bodymatter" };

    case "back":
      if (section.role === "appendix") {
        return { epubType: "backmatter appendix" };
      }
      if (section.role === "bibliography") {
        return { epubType: "backmatter bibliography", role: "doc-bibliography" };
      }
      if (section.role === "about-author") {
        return { epubType: "backmatter" };
      }
      return { epubType: "backmatter" };

    default:
      return { epubType: "bodymatter" };
  }
}

export interface SectionDocumentOptions {
  language: string;
  bookTitle: string;
}

/**
 * Serializes a complete StructuralSection to an XHTML 5 content document.
 */
export function serializeSectionDocument(
  section: StructuralSection,
  options: SectionDocumentOptions,
): string {
  const lang = options.language || "und";
  const escapedLang = escapeXmlAttr(lang);
  const docTitle = section.title ? escapeXmlText(section.title) : escapeXmlText(options.bookTitle);

  const semantics = getSectionSemantics(section);
  const epubTypeAttr = ` epub:type="${escapeXmlAttr(semantics.epubType)}"`;
  const roleAttr = semantics.role ? ` role="${escapeXmlAttr(semantics.role)}"` : "";
  const sectionIdAttr = section.id ? ` id="${escapeXmlAttr(section.id)}"` : "";

  const titleHeading = section.title
    ? `      <h1 class="section-title">${escapeXmlText(section.title)}</h1>\n`
    : "";

  const blocksContent = section.blocks
    .map((block) => serializeBlock(block))
    .filter((line) => line.length > 0)
    .join("\n");

  const bodyInner = titleHeading + (blocksContent ? blocksContent + "\n" : "");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapedLang}" lang="${escapedLang}">
  <head>
    <meta charset="utf-8" />
    <title>${docTitle}</title>
    <link rel="stylesheet" type="text/css" href="../styles/openbook.css" />
  </head>
  <body${epubTypeAttr}>
    <section class="section"${roleAttr}${sectionIdAttr}>
${bodyInner}    </section>
  </body>
</html>
`;
}
