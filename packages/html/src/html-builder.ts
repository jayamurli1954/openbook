// SPDX-License-Identifier: Apache-2.0

import type { Book, StructuralSection } from "@openbook/book-model";
import { processBookAssets } from "./assets/asset-pipeline.js";
import { DEFAULT_HTML_CSS } from "./css.js";
import { escapeHtmlAttr, escapeHtmlText } from "./html-utils.js";
import { serializeSection, serializeToc, type TocEntry } from "./html-serializer.js";
import type { HtmlBuildOptions, HtmlPublication, HtmlPublicationFile } from "./types.js";

function collectSections(book: Readonly<Book>): StructuralSection[] {
  return [
    ...(book.frontMatter ?? []),
    ...(book.chapters ?? []),
    ...(book.backMatter ?? []),
  ];
}

function serializeAuthors(authors: readonly string[]): string {
  if (!authors.length) {
    return "";
  }
  const names = authors.map((name) => escapeHtmlText(name)).join(", ");
  return `    <p class="authors">${names}</p>\n`;
}

function serializeMetaAuthors(authors: readonly string[]): string {
  if (!authors.length) {
    return "";
  }
  const content = escapeHtmlAttr(authors.join(", "));
  return `  <meta name="author" content="${content}">\n`;
}

/**
 * Builds an in-memory, deterministic semantic HTML5 publication from a canonical Book Model.
 *
 * Guarantees:
 * 1. Consumes the Book Model as strictly read-only.
 * 2. Does not mutate the Book or leak HTML packaging fields back to the caller.
 * 3. Never derives timestamps from the runtime clock (never calls `new Date()`).
 * 4. Yields identical HTML for identical Book + assets + options.
 * 5. Emits no scripts and does not execute URLs.
 */
export async function buildHtml(
  book: Readonly<Book>,
  options?: HtmlBuildOptions,
): Promise<HtmlPublication> {
  const language = book.metadata.language || "und";
  const bookTitle = book.metadata.title || "Untitled Book";
  const escapedLang = escapeHtmlAttr(language);

  const assetResult = await processBookAssets(
    book,
    options?.assetResolver,
    options?.onDiagnostic,
  );

  const resolvedImages = new Map<string, { htmlSrc: string; altText: string }>();
  for (const [assetId, meta] of assetResult.resolvedImagesByAssetId) {
    resolvedImages.set(assetId, {
      htmlSrc: meta.htmlSrc,
      altText: meta.asset.altText || "",
    });
  }

  const sections = collectSections(book);
  const tocEntries: TocEntry[] = sections
    .filter((section) => section.id)
    .map((section) => ({
      id: section.id,
      title: section.title,
    }));

  const sectionHtml = sections
    .map((section) => serializeSection(section, resolvedImages))
    .join("\n");

  const descriptionMeta = book.metadata.description
    ? `  <meta name="description" content="${escapeHtmlAttr(book.metadata.description)}">\n`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${escapedLang}" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtmlText(bookTitle)}</title>
${serializeMetaAuthors(book.metadata.authors ?? [])}${descriptionMeta}  <style>
${DEFAULT_HTML_CSS}  </style>
</head>
<body>
  <article class="book">
    <header>
      <h1 class="book-title">${escapeHtmlText(bookTitle)}</h1>
${serializeAuthors(book.metadata.authors ?? [])}    </header>
${serializeToc(tocEntries)}    <main>
${sectionHtml ? `${sectionHtml}\n` : ""}    </main>
  </article>
</body>
</html>
`;

  const files: HtmlPublicationFile[] = [
    {
      path: "index.html",
      mediaType: "text/html; charset=utf-8",
      content: html,
    },
    ...assetResult.files,
  ];

  return {
    html,
    files,
    diagnostics: assetResult.diagnostics,
  };
}
