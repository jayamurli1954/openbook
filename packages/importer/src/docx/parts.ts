// SPDX-License-Identifier: Apache-2.0
import { DocxReadError } from "./errors.js";
import {
  RELATIONSHIPS_NS,
  relationshipsPartFor,
  resolveInternalTarget,
  type DocxPackage,
} from "./package.js";
import { getXmlAttribute, xmlChildElements, type XmlElement } from "./xml.js";

/**
 * Readers for the WordprocessingML parts ADR-0040 §4 lists: styles, numbering,
 * relationships, and core properties. Each returns plain data; no XML leaves this layer.
 */

/** Transitional and Strict WordprocessingML namespaces. */
export const W_NAMESPACES: ReadonlySet<string> = new Set([
  "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  "http://purl.oclc.org/ooxml/wordprocessingml/main",
]);
export const R_NAMESPACES: ReadonlySet<string> = new Set([
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  "http://purl.oclc.org/ooxml/officeDocument/relationships",
]);
const CORE_PROPERTIES_REL_TYPES = new Set([
  "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
  "http://schemas.openxmlformats.org/officedocument/2006/relationships/metadata/core-properties",
]);
const STYLES_REL = /\/styles$/;
const NUMBERING_REL = /\/numbering$/;
const DC_NS = "http://purl.org/dc/elements/1.1/";

export function isW(el: XmlElement | undefined, local?: string): el is XmlElement {
  return el !== undefined && W_NAMESPACES.has(el.ns) && (local === undefined || el.local === local);
}

/** First direct child in the WordprocessingML namespace with this local name. */
export function wChild(el: XmlElement | undefined, local: string): XmlElement | undefined {
  if (!el) return undefined;
  for (const child of el.children) {
    if (typeof child !== "string" && isW(child, local)) return child;
  }
  return undefined;
}

/** `w:`-namespaced attribute value. */
export function wAttr(el: XmlElement | undefined, local: string): string | undefined {
  if (!el) return undefined;
  return el.attributes.find((attr) => W_NAMESPACES.has(attr.ns) && attr.local === local)?.value;
}

/** `r:`-namespaced attribute value (relationship ids). */
export function rAttr(el: XmlElement | undefined, local: string): string | undefined {
  if (!el) return undefined;
  return el.attributes.find((attr) => R_NAMESPACES.has(attr.ns) && attr.local === local)?.value;
}

/** OOXML on/off property: present without `w:val`, or with a true value, means on. */
export function readToggle(el: XmlElement | undefined): boolean | undefined {
  if (!el) return undefined;
  const val = wAttr(el, "val");
  if (val === undefined) return true;
  return !["0", "false", "off", "none"].includes(val.toLowerCase());
}

// --- relationships ---------------------------------------------------------------

export interface Relationship {
  readonly type: string;
  readonly external: boolean;
  /** Internal targets are resolved to a part name; external targets are kept as written. */
  readonly target: string | undefined;
}

export function readRelationships(docx: DocxPackage, sourcePart: string): Map<string, Relationship> {
  const relsPart = sourcePart === "" ? "_rels/.rels" : relationshipsPartFor(sourcePart);
  const out = new Map<string, Relationship>();
  if (!docx.hasPart(relsPart)) return out;
  const root = docx.readXmlPart(relsPart);
  for (const rel of xmlChildElements(root, RELATIONSHIPS_NS, "Relationship")) {
    const id = getXmlAttribute(rel, "", "Id");
    const type = getXmlAttribute(rel, "", "Type") ?? "";
    const target = getXmlAttribute(rel, "", "Target") ?? "";
    if (!id) continue;
    const external = getXmlAttribute(rel, "", "TargetMode") === "External";
    out.set(id, {
      type,
      external,
      target: external ? target : resolveInternalTarget(sourcePart, target),
    });
  }
  return out;
}

function findRelatedPart(rels: Map<string, Relationship>, matches: (type: string) => boolean): string | undefined {
  for (const rel of rels.values()) {
    if (!rel.external && rel.target && matches(rel.type)) return rel.target;
  }
  return undefined;
}

// --- styles ------------------------------------------------------------------------

export type StyleClass =
  | { readonly kind: "heading"; readonly level: number }
  | { readonly kind: "title" | "subtitle" | "quote" | "caption" | "toc" | "toc-heading" | "normal" };

export interface RunProps {
  readonly bold?: boolean;
  readonly italic?: boolean;
  /** Font size in half-points (`w:sz`). */
  readonly size?: number;
  /** Word's Hidden font option (`w:vanish`). */
  readonly hidden?: boolean;
  readonly fonts: readonly string[];
}

interface StyleInfo {
  readonly id: string;
  readonly type: string;
  readonly name: string;
  readonly basedOn?: string;
  readonly outlineLevel?: number;
  readonly numPr?: NumberingRef;
  readonly run: RunProps;
}

export interface NumberingRef {
  readonly numId: string;
  readonly ilvl: number;
}

export class StyleSheet {
  readonly #styles: Map<string, StyleInfo>;
  readonly #defaultParagraphStyle: string | undefined;
  readonly #defaultCharacterStyle: string | undefined;
  readonly defaults: RunProps;
  readonly defaultLanguage: string | undefined;

  constructor(root: XmlElement | undefined) {
    this.#styles = new Map();
    let defaultParagraph: string | undefined;
    let defaultCharacter: string | undefined;
    const rPrDefault = wChild(wChild(wChild(root, "docDefaults"), "rPrDefault"), "rPr");
    this.defaults = readRunProps(rPrDefault);
    this.defaultLanguage = wAttr(wChild(rPrDefault, "lang"), "val");

    for (const el of root ? xmlChildElements(root) : []) {
      if (!isW(el, "style")) continue;
      const id = wAttr(el, "styleId");
      if (!id) continue;
      const type = wAttr(el, "type") ?? "paragraph";
      const isDefault = ["1", "true", "on"].includes((wAttr(el, "default") ?? "").toLowerCase());
      if (isDefault && type === "paragraph") defaultParagraph = id;
      if (isDefault && type === "character") defaultCharacter = id;
      const pPr = wChild(el, "pPr");
      const outline = wAttr(wChild(pPr, "outlineLvl"), "val");
      const numPr = readNumPr(wChild(pPr, "numPr"));
      const basedOn = wAttr(wChild(el, "basedOn"), "val");
      this.#styles.set(id, {
        id,
        type,
        name: (wAttr(wChild(el, "name"), "val") ?? "").trim().toLowerCase(),
        ...(basedOn !== undefined ? { basedOn } : {}),
        ...(outline !== undefined && /^\d+$/.test(outline) ? { outlineLevel: Number(outline) } : {}),
        ...(numPr !== undefined ? { numPr } : {}),
        run: readRunProps(wChild(el, "rPr")),
      });
    }
    this.#defaultParagraphStyle = defaultParagraph;
    this.#defaultCharacterStyle = defaultCharacter;
  }

  /** Style chain from the given style up through `w:basedOn` (cycle-safe). */
  #chain(styleId: string | undefined, fallback: string | undefined): StyleInfo[] {
    const out: StyleInfo[] = [];
    const seen = new Set<string>();
    let current = styleId !== undefined && this.#styles.has(styleId) ? styleId : fallback;
    while (current !== undefined && !seen.has(current) && out.length < 32) {
      seen.add(current);
      const style = this.#styles.get(current);
      if (!style) break;
      out.push(style);
      current = style.basedOn;
    }
    return out;
  }

  paragraphClass(styleId: string | undefined, directOutline: number | undefined): StyleClass {
    for (const style of this.#chain(styleId, this.#defaultParagraphStyle)) {
      const byName = classifyStyleName(style.name) ?? classifyStyleName(styleIdAsName(style.id));
      if (byName) return byName;
    }
    const outline = directOutline ?? this.paragraphOutlineLevel(styleId);
    if (outline !== undefined && outline >= 0 && outline <= 5) {
      return { kind: "heading", level: outline + 1 };
    }
    return { kind: "normal" };
  }

  paragraphOutlineLevel(styleId: string | undefined): number | undefined {
    for (const style of this.#chain(styleId, this.#defaultParagraphStyle)) {
      if (style.outlineLevel !== undefined) return style.outlineLevel;
    }
    return undefined;
  }

  paragraphNumbering(styleId: string | undefined): NumberingRef | undefined {
    for (const style of this.#chain(styleId, this.#defaultParagraphStyle)) {
      if (style.numPr) return style.numPr;
    }
    return undefined;
  }

  /** Run properties from a paragraph style chain (nearest wins), used for detection only. */
  paragraphRunProps(styleId: string | undefined): RunProps {
    return mergeChain(this.#chain(styleId, this.#defaultParagraphStyle));
  }

  /** Run properties from a character style chain (nearest wins). */
  characterRunProps(styleId: string | undefined): RunProps {
    const chain = this.#chain(styleId, styleId === undefined ? this.#defaultCharacterStyle : undefined);
    const merged = mergeChain(chain);
    // Built-in Strong / Emphasis character styles carry their meaning even if formatted otherwise.
    const names = chain.map((style) => style.name);
    return {
      ...merged,
      ...(names.includes("strong") ? { bold: true } : {}),
      ...(names.includes("emphasis") ? { italic: true } : {}),
    };
  }

  /** Font size of body text (Normal style, then document defaults; OOXML default 10 pt). */
  normalSize(): number {
    return this.paragraphRunProps(undefined).size ?? this.defaults.size ?? 20;
  }
}

function mergeChain(chain: readonly StyleInfo[]): RunProps {
  let bold: boolean | undefined;
  let italic: boolean | undefined;
  let size: number | undefined;
  let hidden: boolean | undefined;
  const fonts: string[] = [];
  for (const style of chain) {
    bold ??= style.run.bold;
    italic ??= style.run.italic;
    size ??= style.run.size;
    hidden ??= style.run.hidden;
    fonts.push(...style.run.fonts);
  }
  return {
    ...(bold !== undefined ? { bold } : {}),
    ...(italic !== undefined ? { italic } : {}),
    ...(size !== undefined ? { size } : {}),
    ...(hidden !== undefined ? { hidden } : {}),
    fonts,
  };
}

function classifyStyleName(name: string): StyleClass | undefined {
  const heading = /^heading\s*([1-9])$/.exec(name);
  if (heading) {
    const level = Number(heading[1]);
    return level <= 6 ? { kind: "heading", level } : { kind: "normal" };
  }
  if (/^toc\s*[1-9]$/.test(name)) return { kind: "toc" };
  switch (name) {
    case "title":
      return { kind: "title" };
    case "subtitle":
      return { kind: "subtitle" };
    case "quote":
    case "intense quote":
      return { kind: "quote" };
    case "caption":
      return { kind: "caption" };
    case "toc heading":
      return { kind: "toc-heading" };
    default:
      return undefined;
  }
}

/** `Heading1` → `heading 1`, `IntenseQuote` → `intense quote`, for styles without a usable name. */
function styleIdAsName(id: string): string {
  return id
    .replace(/([a-z])([A-Z0-9])/g, "$1 $2")
    .toLowerCase();
}

export function readRunProps(rPr: XmlElement | undefined): RunProps {
  const bold = readToggle(wChild(rPr, "b"));
  const italic = readToggle(wChild(rPr, "i"));
  const hidden = readToggle(wChild(rPr, "vanish"));
  const szVal = wAttr(wChild(rPr, "sz"), "val");
  const rFonts = wChild(rPr, "rFonts");
  const fonts = ["ascii", "hAnsi", "cs", "eastAsia"]
    .map((attr) => wAttr(rFonts, attr))
    .filter((font): font is string => typeof font === "string" && font.length > 0);
  return {
    ...(bold !== undefined ? { bold } : {}),
    ...(italic !== undefined ? { italic } : {}),
    ...(szVal !== undefined && /^\d+$/.test(szVal) ? { size: Number(szVal) } : {}),
    ...(hidden !== undefined ? { hidden } : {}),
    fonts,
  };
}

export function readNumPr(numPr: XmlElement | undefined): NumberingRef | undefined {
  if (!numPr) return undefined;
  const numId = wAttr(wChild(numPr, "numId"), "val");
  if (numId === undefined) return undefined;
  const ilvl = Number(wAttr(wChild(numPr, "ilvl"), "val") ?? "0");
  return { numId, ilvl: Number.isFinite(ilvl) ? ilvl : 0 };
}

// --- numbering -------------------------------------------------------------------

export class Numbering {
  /** numId → (ilvl → numFmt) */
  readonly #formats = new Map<string, Map<number, string>>();

  constructor(root: XmlElement | undefined) {
    const abstract = new Map<string, Map<number, string>>();
    for (const el of root ? xmlChildElements(root) : []) {
      if (!isW(el, "abstractNum")) continue;
      const id = wAttr(el, "abstractNumId");
      if (id === undefined) continue;
      abstract.set(id, readLevels(el));
    }
    for (const el of root ? xmlChildElements(root) : []) {
      if (!isW(el, "num")) continue;
      const numId = wAttr(el, "numId");
      const abstractId = wAttr(wChild(el, "abstractNumId"), "val");
      if (numId === undefined || abstractId === undefined) continue;
      const levels = new Map(abstract.get(abstractId) ?? []);
      for (const override of xmlChildElements(el)) {
        if (!isW(override, "lvlOverride")) continue;
        const ilvl = Number(wAttr(override, "ilvl"));
        const lvl = wChild(override, "lvl");
        const fmt = wAttr(wChild(lvl, "numFmt"), "val");
        if (Number.isFinite(ilvl) && fmt !== undefined) levels.set(ilvl, fmt);
      }
      this.#formats.set(numId, levels);
    }
  }

  /** `undefined` when the paragraph is not really in a list (numId 0 or unknown). */
  isOrdered(ref: NumberingRef): boolean | undefined {
    if (ref.numId === "0") return undefined;
    const levels = this.#formats.get(ref.numId);
    if (!levels) return undefined;
    const fmt = levels.get(ref.ilvl) ?? levels.get(0);
    if (fmt === undefined || fmt === "none") return undefined;
    return fmt !== "bullet";
  }
}

function readLevels(abstractNum: XmlElement): Map<number, string> {
  const levels = new Map<number, string>();
  for (const lvl of xmlChildElements(abstractNum)) {
    if (!isW(lvl, "lvl")) continue;
    const ilvl = Number(wAttr(lvl, "ilvl"));
    const fmt = wAttr(wChild(lvl, "numFmt"), "val");
    if (Number.isFinite(ilvl) && fmt !== undefined) levels.set(ilvl, fmt);
  }
  return levels;
}

// --- core properties -------------------------------------------------------------

export interface CoreProperties {
  readonly title?: string;
  readonly creator?: string;
  readonly language?: string;
}

function readCoreProperties(docx: DocxPackage): CoreProperties {
  const part = findRelatedPart(readRelationships(docx, ""), (type) => CORE_PROPERTIES_REL_TYPES.has(type));
  if (!part || !docx.hasPart(part)) return {};
  const root = docx.readXmlPart(part);
  const text = (local: string): string | undefined => {
    const el = xmlChildElements(root, DC_NS, local)[0];
    const value = el?.children.filter((child): child is string => typeof child === "string").join("").trim();
    return value ? value : undefined;
  };
  const title = text("title");
  const creator = text("creator");
  const language = text("language");
  return {
    ...(title !== undefined ? { title } : {}),
    ...(creator !== undefined ? { creator } : {}),
    ...(language !== undefined ? { language } : {}),
  };
}

// --- everything the body mapper needs ---------------------------------------------

export interface DocxParts {
  readonly document: XmlElement;
  readonly styles: StyleSheet;
  readonly numbering: Numbering;
  /** Relationships of the main document part (hyperlinks, images). */
  readonly documentRels: Map<string, Relationship>;
  readonly core: CoreProperties;
  readonly hasComments: boolean;
}

export function readDocxParts(docx: DocxPackage): DocxParts {
  const document = docx.readXmlPart(docx.mainDocumentPart);
  if (!isW(document, "document")) {
    throw new DocxReadError(
      "DOCX_NOT_WORD_DOCUMENT",
      "This file is not a Word .docx document.",
      docx.mainDocumentPart,
    );
  }
  const documentRels = readRelationships(docx, docx.mainDocumentPart);
  const optionalPart = (pattern: RegExp): XmlElement | undefined => {
    const part = findRelatedPart(documentRels, (type) => pattern.test(type));
    return part && docx.hasPart(part) ? docx.readXmlPart(part) : undefined;
  };
  return {
    document,
    styles: new StyleSheet(optionalPart(STYLES_REL)),
    numbering: new Numbering(optionalPart(NUMBERING_REL)),
    documentRels,
    core: readCoreProperties(docx),
    hasComments: [...documentRels.values()].some((rel) => /\/comments$/.test(rel.type)),
  };
}
