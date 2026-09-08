// SPDX-License-Identifier: Apache-2.0

import type { ContentBlock, InlineSpan, StructuralSection } from "@openbook/book-model";
import { escapeHtmlAttr, escapeHtmlText } from "./html-utils.js";
import { sanitizeHref } from "./urls.js";
import { UnsupportedContentError } from "./types.js";

export interface ResolvedImageRef {
  htmlSrc: string;
  altText: string;
}

/**
 * Serializes an array of InlineSpans to semantic HTML inline elements.
 * Preserves Unicode (such as Kannada) intact in native UTF-8.
 */
export function serializeInlines(inlines: InlineSpan[]): string {
  return inlines
    .map((span) => {
      switch (span.type) {
        case "text":
          return escapeHtmlText(span.text);
        case "emphasis":
          return `<em>${serializeInlines(span.children)}</em>`;
        case "strong":
          return `<strong>${serializeInlines(span.children)}</strong>`;
        case "link": {
          const href = sanitizeHref(span.href);
          return `<a href="${escapeHtmlAttr(href)}">${serializeInlines(span.children)}</a>`;
        }
        default:
          return "";
      }
    })
    .join("");
}

/**
 * Serializes a ContentBlock to semantic HTML5 block elements.
 */
export function serializeBlock(
  block: ContentBlock,
  resolvedImages?: ReadonlyMap<string, ResolvedImageRef>,
): string {
  const idAttr = block.id ? ` id="${escapeHtmlAttr(block.id)}"` : "";

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
      const resolved = resolvedImages?.get(block.assetId);
      if (!resolved) {
        throw new UnsupportedContentError(
          "image",
          block.id,
          `Image block "${block.id}" references unbundled or unresolved asset "${block.assetId}".`,
        );
      }

      const altAttr = ` alt="${escapeHtmlAttr(resolved.altText || "")}"`;
      const srcAttr = ` src="${escapeHtmlAttr(resolved.htmlSrc)}"`;

      if (block.caption && block.caption.length > 0) {
        const captionHtml = serializeInlines(block.caption);
        return `      <figure${idAttr}>\n        <img${srcAttr}${altAttr}>\n        <figcaption>${captionHtml}</figcaption>\n      </figure>`;
      }

      return `      <figure${idAttr}>\n        <img${srcAttr}${altAttr}>\n      </figure>`;
    }

    default: {
      const b = block as unknown as { type?: string; id?: string };
      throw new UnsupportedContentError(
        b.type ?? "unknown",
        b.id,
        `Unsupported content block of type "${b.type}".`,
      );
    }
  }
}

function sectionClassName(section: StructuralSection): string {
  switch (section.kind) {
    case "front":
      return "front-matter";
    case "back":
      return "back-matter";
    default:
      return "chapter";
  }
}

export function serializeSection(
  section: StructuralSection,
  resolvedImages?: ReadonlyMap<string, ResolvedImageRef>,
): string {
  const className = sectionClassName(section);
  const idAttr = section.id ? ` id="${escapeHtmlAttr(section.id)}"` : "";
  const roleAttr = ` data-role="${escapeHtmlAttr(section.role)}"`;

  const titleHeading = section.title
    ? `      <h1 class="section-title">${escapeHtmlText(section.title)}</h1>\n`
    : "";

  const blocksContent = section.blocks
    .map((block) => serializeBlock(block, resolvedImages))
    .filter((line) => line.length > 0)
    .join("\n");

  const inner = titleHeading + (blocksContent ? `${blocksContent}\n` : "");

  return `    <section class="${className}"${roleAttr}${idAttr}>\n${inner}    </section>`;
}

export interface TocEntry {
  id: string;
  title: string;
}

export function serializeToc(entries: TocEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const items = entries
    .map((entry) => {
      const href = sanitizeHref(`#${entry.id}`);
      const label = entry.title ? escapeHtmlText(entry.title) : escapeHtmlText(entry.id);
      return `        <li><a href="${escapeHtmlAttr(href)}">${label}</a></li>`;
    })
    .join("\n");

  return `    <nav class="toc" aria-label="Table of contents">\n      <ol>\n${items}\n      </ol>\n    </nav>\n`;
}
