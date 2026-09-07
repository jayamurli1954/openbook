// SPDX-License-Identifier: Apache-2.0

import type { StructuralSection } from "@openbook/book-model";
import { escapeXmlAttr, escapeXmlText } from "./xml-utils.js";

export interface NavSectionEntry {
  section: StructuralSection;
  href: string; // e.g. "text/ch_001.xhtml"
}

export interface NavDocumentOptions {
  language: string;
  bookTitle: string;
  sections: NavSectionEntry[];
}

/**
 * Generates the mandatory EPUB 3.3 Navigation Document (nav.xhtml).
 * Produces a deterministic TOC and only valid landmarks backed by actual Book Model semantics.
 */
export function serializeNavDocument(options: NavDocumentOptions): string {
  const lang = options.language || "und";
  const escapedLang = escapeXmlAttr(lang);

  // 1. Generate TOC items
  const tocItems = options.sections
    .map((entry, index) => {
      const title = entry.section.title.trim() || `Section ${index + 1}`;
      return `        <li><a href="${escapeXmlAttr(entry.href)}">${escapeXmlText(title)}</a></li>`;
    })
    .join("\n");

  // 2. Generate Landmarks based solely on supported Book Model semantics (spine items only)
  const landmarkEntries: string[] = [];

  // Title page landmark (if a section has role 'title-page')
  const titlePageEntry = options.sections.find(
    (e) => e.section.kind === "front" && e.section.role === "title-page",
  );
  if (titlePageEntry) {
    const title = titlePageEntry.section.title.trim() || "Title Page";
    landmarkEntries.push(
      `        <li><a epub:type="titlepage" href="${escapeXmlAttr(titlePageEntry.href)}">${escapeXmlText(title)}</a></li>`,
    );
  }

  // Bodymatter landmark (first section with kind === 'main')
  const bodyMatterEntry = options.sections.find((e) => e.section.kind === "main");
  if (bodyMatterEntry) {
    const title = bodyMatterEntry.section.title.trim() || "Start of Content";
    landmarkEntries.push(
      `        <li><a epub:type="bodymatter" href="${escapeXmlAttr(bodyMatterEntry.href)}">${escapeXmlText(title)}</a></li>`,
    );
  }

  const landmarksNav =
    landmarkEntries.length > 0
      ? `      <nav epub:type="landmarks" id="landmarks" hidden="">
        <h2>Landmarks</h2>
        <ol>
${landmarkEntries.join("\n")}
        </ol>
      </nav>\n`
      : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escapedLang}" lang="${escapedLang}">
  <head>
    <meta charset="utf-8" />
    <title>Navigation</title>
    <link rel="stylesheet" type="text/css" href="styles/openbook.css" />
  </head>
  <body>
    <nav epub:type="toc" id="toc" role="doc-toc">
      <h1>Table of Contents</h1>
      <ol>
${tocItems}
      </ol>
    </nav>
${landmarksNav}  </body>
</html>
`;
}
