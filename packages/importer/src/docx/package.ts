// SPDX-License-Identifier: Apache-2.0
import type { ImportIssue } from "../types.js";
import { DocxReadError, docxReadErrorToIssue } from "./errors.js";
import { resolveDocxLimits, type DocxLimits } from "./limits.js";
import { getXmlAttribute, parseXmlPart, xmlChildElements, type XmlElement } from "./xml.js";
import { isXmlPart, ZipArchive } from "./zip.js";

/**
 * Opens a Word `.docx` package and finds its main document (ADR-0040 Slice 1).
 * Reads only `[Content_Types].xml` and `_rels/.rels` here; later slices read
 * the parts listed in ADR-0040 §4 through `readXmlPart` / `readPart`.
 */

export const WORD_DOCUMENT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
const WORD_TEMPLATE_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml";

const CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const RELATIONSHIPS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_DOCUMENT_REL_TYPES = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
  "http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument",
]);

/**
 * Parts that are never read, whatever a later slice asks for (ADR-0040 §5).
 * OPC lets these parts live at any name, so they are blocked by content type;
 * the conventional paths are blocked as well, in case a type is missing.
 */
const BLOCKED_PATHS = [
  /(^|\/)vbaProject\.bin$/i,
  /(^|\/)vbaData\.xml$/i,
  /^word\/embeddings\//i,
  /^word\/activeX\//i,
];
const BLOCKED_TYPES = [
  /vbaProject|vbaData|activeX|oleObject|macroEnabled/i,
  // Whole embedded Office packages (an embedded .docx, .xlsx, .pptx), not their +xml parts.
  /officedocument\.[a-z]+ml\.(document|sheet|presentation|template|slideshow)$/i,
  /officedocument\.package$/i,
];

export interface DocxPackage {
  /** Part name of the main document, without a leading slash (usually `word/document.xml`). */
  readonly mainDocumentPart: string;
  readonly partNames: readonly string[];
  hasPart(name: string): boolean;
  /** Raw bytes of a part. Throws `DocxReadError` on any limit or integrity failure. */
  readPart(name: string): Uint8Array;
  /** A part parsed with the restricted XML reader. Throws `DocxReadError`. */
  readXmlPart(name: string): XmlElement;
}

export type DocxOpenResult =
  | { readonly ok: true; readonly docx: DocxPackage }
  | { readonly ok: false; readonly issue: ImportIssue };

export function openDocxPackage(bytes: Uint8Array, limits?: Partial<DocxLimits>): DocxOpenResult {
  try {
    return { ok: true, docx: openOrThrow(bytes, resolveDocxLimits(limits)) };
  } catch (err) {
    if (err instanceof DocxReadError) {
      return { ok: false, issue: docxReadErrorToIssue(err) };
    }
    throw err;
  }
}

function openOrThrow(bytes: Uint8Array, limits: DocxLimits): DocxPackage {
  const archive = ZipArchive.open(bytes, limits);
  let contentTypes: ContentTypes | undefined;
  const xmlCache = new Map<string, XmlElement>();

  const readPart = (name: string): Uint8Array => {
    const normalized = normalizePartName(name);
    const type = contentTypes ? contentTypeOf(normalized, contentTypes) : undefined;
    if (
      BLOCKED_PATHS.some((pattern) => pattern.test(normalized)) ||
      (type !== undefined && BLOCKED_TYPES.some((pattern) => pattern.test(type)))
    ) {
      throw new DocxReadError("DOCX_PART_BLOCKED", "OpenBook does not read macros or embedded objects.", normalized);
    }
    return archive.read(normalized);
  };
  const readXmlPart = (name: string): XmlElement => {
    const normalized = normalizePartName(name);
    const key = normalized.toLowerCase();
    const cached = xmlCache.get(key);
    if (cached) return cached;

    const type = contentTypes ? contentTypeOf(normalized, contentTypes) : undefined;
    const isXml = isXmlPart(normalized) || (type !== undefined && /[/+]xml$/i.test(type));
    if (!isXml) {
      throw new DocxReadError("DOCX_XML_INVALID", "This Word file is damaged: an expected XML part is not XML.", normalized);
    }
    const raw = readPart(normalized);
    // The ZIP layer sizes parts by extension; XML found by content type gets the XML cap here.
    if (raw.length > limits.maxXmlPartBytes) {
      throw new DocxReadError(
        "DOCX_ENTRY_TOO_LARGE",
        "One part of this file is larger than OpenBook allows.",
        normalized,
      );
    }
    const element = parseXmlPart(raw, limits, normalized);
    xmlCache.set(key, element);
    return element;
  };

  if (!archive.find("[Content_Types].xml")) {
    throw notWord();
  }
  contentTypes = readContentTypes(readXmlPart("[Content_Types].xml"));

  if (!archive.find("_rels/.rels")) {
    throw notWord();
  }
  const mainDocumentPart = findMainDocument(readXmlPart("_rels/.rels"));
  const mainType = contentTypeOf(mainDocumentPart, contentTypes);
  // Only the main document decides .docm/.dotm. An embedded macro-enabled object is never read.
  if (mainType !== undefined && /macroenabled/i.test(mainType)) {
    throw new DocxReadError(
      "DOCX_MACRO_ENABLED",
      "This document contains macros. Save it as a regular .docx (Word Document) and try again.",
    );
  }
  if (mainType === WORD_TEMPLATE_CONTENT_TYPE) {
    throw new DocxReadError(
      "DOCX_NOT_WORD_DOCUMENT",
      "This is a Word template. Create a document from it, save that as .docx, and try again.",
    );
  }
  if (mainType !== WORD_DOCUMENT_CONTENT_TYPE || !archive.find(mainDocumentPart)) {
    throw notWord();
  }

  const partNames = archive.entries.map((entry) => entry.name).filter((name) => !name.endsWith("/"));
  return {
    mainDocumentPart,
    partNames,
    hasPart: (name) => archive.find(normalizePartName(name)) !== undefined,
    readPart,
    readXmlPart,
  };
}

interface ContentTypes {
  readonly defaults: Map<string, string>;
  readonly overrides: Map<string, string>;
}

function readContentTypes(root: XmlElement): ContentTypes {
  if (root.ns !== CONTENT_TYPES_NS || root.local !== "Types") {
    throw notWord();
  }
  const defaults = new Map<string, string>();
  for (const el of xmlChildElements(root, CONTENT_TYPES_NS, "Default")) {
    const extension = getXmlAttribute(el, "", "Extension");
    const type = getXmlAttribute(el, "", "ContentType");
    if (extension && type) defaults.set(extension.toLowerCase(), type.trim());
  }
  const overrides = new Map<string, string>();
  for (const el of xmlChildElements(root, CONTENT_TYPES_NS, "Override")) {
    const partName = getXmlAttribute(el, "", "PartName");
    const type = getXmlAttribute(el, "", "ContentType");
    if (partName && type) overrides.set(normalizePartName(partName).toLowerCase(), type.trim());
  }
  return { defaults, overrides };
}

function contentTypeOf(partName: string, types: ContentTypes): string | undefined {
  const override = types.overrides.get(partName.toLowerCase());
  if (override !== undefined) return override;
  const dot = partName.lastIndexOf(".");
  return dot === -1 ? undefined : types.defaults.get(partName.slice(dot + 1).toLowerCase());
}

function findMainDocument(root: XmlElement): string {
  if (root.ns !== RELATIONSHIPS_NS || root.local !== "Relationships") {
    throw notWord();
  }
  for (const rel of xmlChildElements(root, RELATIONSHIPS_NS, "Relationship")) {
    const type = getXmlAttribute(rel, "", "Type");
    if (!type || !OFFICE_DOCUMENT_REL_TYPES.has(type)) continue;
    if (getXmlAttribute(rel, "", "TargetMode") === "External") {
      throw new DocxReadError(
        "DOCX_EXTERNAL_TARGET",
        "This document's main text is stored outside the file. OpenBook never fetches outside content.",
      );
    }
    const target = getXmlAttribute(rel, "", "Target");
    if (!target) throw notWord();
    return resolvePackageTarget(target);
  }
  throw notWord();
}

/**
 * Resolves a relationship target from the package root; refuses anything that leaves it.
 * Targets stay percent-encoded: OPC stores ZIP item names in the same encoded form.
 */
function resolvePackageTarget(target: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.includes("\\")) {
    throw notWord();
  }
  const segments: string[] = [];
  for (const segment of target.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (segments.length === 0) throw notWord();
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  if (segments.length === 0) throw notWord();
  return segments.join("/");
}

function normalizePartName(name: string): string {
  return name.replace(/^\/+/, "");
}

function notWord(): DocxReadError {
  return new DocxReadError("DOCX_NOT_WORD_DOCUMENT", "This file is not a Word .docx document.");
}
