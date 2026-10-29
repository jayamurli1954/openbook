// SPDX-License-Identifier: Apache-2.0

import { escapeXmlAttr } from "./xml-utils.js";

export interface CoverDocumentOptions {
  language: string;
  /** Image path relative to the cover document, e.g. "../images/asset-1.jpg". */
  imageHref: string;
  altText: string;
}

/**
 * Generates the EPUB cover page (ADR-0038 §2.4): the cover image alone,
 * scaled to fit without cropping. The style lives in the page itself so
 * books without a cover keep the shared stylesheet unchanged.
 */
export function serializeCoverDocument(options: CoverDocumentOptions): string {
  const lang = escapeXmlAttr(options.language || "und");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${lang}" lang="${lang}">
  <head>
    <meta charset="utf-8" />
    <title>Cover</title>
    <style>
      body.ob-cover { margin: 0; padding: 0; text-align: center; }
      body.ob-cover img { max-width: 100%; max-height: 100vh; height: auto; }
    </style>
  </head>
  <body class="ob-cover" epub:type="cover">
    <section>
      <img src="${escapeXmlAttr(options.imageHref)}" alt="${escapeXmlAttr(options.altText)}" />
    </section>
  </body>
</html>
`;
}
