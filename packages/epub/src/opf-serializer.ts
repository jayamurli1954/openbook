// SPDX-License-Identifier: Apache-2.0

import type { EpubManifestItem, EpubPackageMetadata } from "./types.js";
import { escapeXmlAttr, escapeXmlText } from "./xml-utils.js";

export interface OpfSerializerOptions {
  metadata: EpubPackageMetadata;
  manifest: EpubManifestItem[];
  spine: string[]; // item IDs in reading order
}

/**
 * Generates the EPUB 3.3 Package Document (package.opf).
 * Follows EPUB 3.3 specification with Dublin Core metadata, deterministic manifest,
 * and spine without NCX by default.
 */
export function serializeOpfDocument(options: OpfSerializerOptions): string {
  const { metadata, manifest, spine } = options;
  const lang = metadata.language || "und";
  const identifier = metadata.identifier || "openbook-publication";
  const title = metadata.title || "Untitled Book";

  // Metadata elements
  const metaLines: string[] = [
    `    <dc:identifier id="pub-id">${escapeXmlText(identifier)}</dc:identifier>`,
    `    <dc:title id="title">${escapeXmlText(title)}</dc:title>`,
    `    <dc:language>${escapeXmlText(lang)}</dc:language>`,
  ];

  if (metadata.authors && metadata.authors.length > 0) {
    metadata.authors.forEach((author, i) => {
      metaLines.push(`    <dc:creator id="creator-${i + 1}">${escapeXmlText(author)}</dc:creator>`);
    });
  }

  if (metadata.description) {
    metaLines.push(`    <dc:description>${escapeXmlText(metadata.description)}</dc:description>`);
  }

  if (metadata.publisher) {
    metaLines.push(`    <dc:publisher>${escapeXmlText(metadata.publisher)}</dc:publisher>`);
  }

  if (metadata.rights) {
    metaLines.push(`    <dc:rights>${escapeXmlText(metadata.rights)}</dc:rights>`);
  }

  // Mandatory EPUB 3.3 modified timestamp
  metaLines.push(`    <meta property="dcterms:modified">${escapeXmlText(metadata.modified)}</meta>`);

  // Manifest items
  const manifestLines = manifest.map((item) => {
    const propsAttr = item.properties ? ` properties="${escapeXmlAttr(item.properties)}"` : "";
    return `    <item id="${escapeXmlAttr(item.id)}" href="${escapeXmlAttr(item.href)}" media-type="${escapeXmlAttr(item.mediaType)}"${propsAttr} />`;
  });

  // Spine itemrefs
  const spineLines = spine.map((idref) => `    <itemref idref="${escapeXmlAttr(idref)}" />`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="${escapeXmlAttr(lang)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
${metaLines.join("\n")}
  </metadata>
  <manifest>
${manifestLines.join("\n")}
  </manifest>
  <spine>
${spineLines.join("\n")}
  </spine>
</package>
`;
}
