// SPDX-License-Identifier: Apache-2.0
/**
 * Test-only Word (.docx) builders for desktop tests (ADR-0040 Slices 3–4).
 * A stored (uncompressed) ZIP writer keeps ZIP libraries out of apps/desktop (ADR-0040 §3.1).
 * Not imported by any shipped module.
 */
/** Minimal stored (uncompressed) ZIP writer, so these tests need no ZIP library. */
export function storedZip(files: Record<string, string | Uint8Array>): Uint8Array {
  const crcTable = new Uint32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc32 = (data: Uint8Array): number => {
    let crc = 0xffffffff;
    for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, value] of Object.entries(files)) {
    const data = typeof value === "string" ? encoder.encode(value) : value;
    const nameBytes = encoder.encode(name);
    const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, c) => sum + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
export const R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
export const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
export const EMF_BYTES = new Uint8Array([0x01, 0x00, 0x00, 0x00, 0x6c, 0x00, 0x00, 0x00, 0x20, 0x45, 0x4d, 0x46]);

export function wordPicture(rid: string, alt: string): string {
  return (
    `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:docPr id="1" name="Picture" descr="${alt}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData>` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip r:embed="${rid}"/></pic:blipFill></pic:pic>` +
    `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

export function chapter(title: string): string {
  return `<w:p><w:pPr><w:outlineLvl w:val="0"/></w:pPr><w:r><w:t>${title}</w:t></w:r></w:p>`;
}

export function para(content: string): string {
  return `<w:p>${content}</w:p>`;
}

export function wordDocx(body: string): Uint8Array {
  return storedZip({
    "[Content_Types].xml":
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    "_rels/.rels":
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${R_NS}/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/_rels/document.xml.rels":
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId20" Type="${R_NS}/image" Target="media/image1.png"/>` +
      `<Relationship Id="rId21" Type="${R_NS}/image" Target="media/image2.emf"/></Relationships>`,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}</w:body></w:document>`,
    "word/media/image1.png": PNG_BYTES,
    "word/media/image2.emf": EMF_BYTES,
  });
}

export const PICTURE_BOOK = wordDocx(
  chapter("The Butter Thief") +
    para(`<w:r><w:t>Krishna by the river.</w:t></w:r>` + wordPicture("rId20", "Krishna with the cows")) +
    para(wordPicture("rId21", "A Word drawing")) +
    chapter("The Serpent") +
    para(wordPicture("rId20", "Krishna again")) +
    para(`<w:r><w:t>Kaliya lived in the river.</w:t></w:r>`),
);

// --- Manuscript-shaped books (ADR-0040 Slice 5) ---------------------------------------------

/** A JPEG start marker followed by filler, distinct per picture so each is its own asset. */
export function jpegBytes(seed: number): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  for (let i = 10; i < bytes.length; i += 1) bytes[i] = (seed * 31 + i) & 0xff;
  return bytes;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const MANUSCRIPT_STYLES =
  `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="${W_NS}">` +
  `<w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault></w:docDefaults>` +
  `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:outlineLvl w:val="0"/></w:pPr></w:style>` +
  `</w:styles>`;

export interface ManuscriptStory {
  readonly title: string;
  readonly paragraphs: readonly string[];
  /** Alt text of the story's picture; the picture is a distinct JPEG per story. */
  readonly pictureAlt: string;
}

export interface ManuscriptSpec {
  readonly title: string;
  readonly creator: string;
  /** Title-page line after the title (not Subtitle-styled, as in real manuscripts). */
  readonly tagline: string;
  readonly contentsHeading: string;
  /** How a contents line names a story, e.g. (i, t) => `${i}. ${t} - Lesson`. */
  readonly contentsLine: (index: number, title: string) => string;
  readonly frontTitle: string;
  readonly frontText: string;
  readonly stories: readonly ManuscriptStory[];
  /** Heading 1 story titles, or bold lines at the top of a page (no heading styles). */
  readonly storyTitles: "heading-style" | "bold-page-top";
}

/** A Word manuscript shaped like the maintainer's book (no content from it). */
export function manuscriptDocx(spec: ManuscriptSpec): Uint8Array {
  const t = (text: string) => `<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  const bold = (text: string) => `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
  const p = (content: string, props = "") => `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ""}${content}</w:p>`;
  const pageBreak = `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
  const picture = (index: number, alt: string) => {
    const docPr = `<wp:docPr id="${index}" name="Picture ${index}" descr="${escapeXml(alt)}"/>`;
    return (
      `<w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">${docPr}` +
      `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData>` +
      `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:blipFill><a:blip r:embed="rIdPic${index}"/></pic:blipFill></pic:pic>` +
      `</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
    );
  };

  let body = "";
  body += p(t(spec.title), `<w:pStyle w:val="Title"/>`);
  body += p(t(spec.tagline));
  body += p(picture(0, "Cover illustration"));
  body += pageBreak;
  body += p(t(spec.contentsHeading), `<w:pStyle w:val="Heading1"/>`);
  spec.stories.forEach((story, i) => {
    body += p(t(spec.contentsLine(i + 1, story.title)));
  });
  body += p(bold(spec.frontTitle), "<w:pageBreakBefore/>");
  body += p(t(spec.frontText));
  spec.stories.forEach((story, i) => {
    body +=
      spec.storyTitles === "heading-style"
        ? p(t(story.title), `<w:pStyle w:val="Heading1"/>`)
        : p(bold(story.title), "<w:pageBreakBefore/>");
    for (const text of story.paragraphs) body += p(t(text));
    body += p(picture(i + 1, story.pictureAlt));
  });

  const pictureRels = [0, ...spec.stories.map((_, i) => i + 1)]
    .map((i) => `<Relationship Id="rIdPic${i}" Type="${R_NS}/image" Target="media/image${i}.jpeg"/>`)
    .join("");
  const media: Record<string, Uint8Array> = {};
  for (let i = 0; i <= spec.stories.length; i += 1) media[`word/media/image${i}.jpeg`] = jpegBytes(i + 1);

  return storedZip({
    "[Content_Types].xml":
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="jpeg" ContentType="image/jpeg"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    "_rels/.rels":
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${R_NS}/officeDocument" Target="word/document.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    "docProps/core.xml":
      `<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
      `<dc:title></dc:title><dc:creator>${escapeXml(spec.creator)}</dc:creator></cp:coreProperties>`,
    "word/_rels/document.xml.rels":
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rIdStyles" Type="${R_NS}/styles" Target="styles.xml"/>${pictureRels}</Relationships>`,
    "word/styles.xml": MANUSCRIPT_STYLES,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="${W_NS}" xmlns:r="${R_NS}"><w:body>${body}</w:body></w:document>`,
    ...media,
  });
}
