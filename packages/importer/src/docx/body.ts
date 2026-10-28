// SPDX-License-Identifier: Apache-2.0
import {
  isW,
  rAttr,
  readNumPr,
  readRunProps,
  readToggle,
  wAttr,
  wChild,
  type DocxParts,
  type RunProps,
  type StyleClass,
} from "./parts.js";
import { xmlChildElements, type XmlElement } from "./xml.js";

/**
 * Walks `w:body` into flat paragraph records (ADR-0040 §4.2, §4.5, §7).
 * Appearance is read only to help find chapter titles; it never reaches the Book.
 */

const MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";
const MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006";

const SAFE_LINK = /^(https?:|mailto:)/i;
/** Pre-Unicode Kannada fonts that draw Kannada glyphs at Latin code points (ADR-0040 §4.5). */
const LEGACY_KANNADA_FONT = /^(nudi\s*(\d|akshar)|brh\s*kannada|baraha\s*kan)/i;

export interface TextRun {
  readonly text: string;
  /** Meaning: direct formatting or a character style (Strong / Emphasis). */
  readonly bold: boolean;
  readonly italic: boolean;
  readonly href?: string;
  /** Appearance, for chapter-title detection only: includes the paragraph style. */
  readonly looksBold: boolean;
  readonly size: number;
}

export interface DocxListRef {
  readonly numId: string;
  readonly ilvl: number;
  readonly ordered: boolean;
}

export interface DocxParagraph {
  readonly styleClass: StyleClass;
  readonly runs: readonly TextRun[];
  /** Plain text, whitespace collapsed and trimmed. */
  readonly text: string;
  readonly list?: DocxListRef;
  /** Every visible run looks bold. */
  readonly allBold: boolean;
  /** Every visible run is larger than body text. */
  readonly larger: boolean;
  /** Starts a new page (page break, section break, or “page break before”). */
  readonly pageBreakBefore: boolean;
  /** Pictures anchored in this paragraph (imported in Slice 3). */
  readonly pictures: number;
  readonly inTable: boolean;
}

export interface BodyCounts {
  trackedChanges: boolean;
  comments: boolean;
  footnotes: number;
  pictures: number;
  textBoxes: number;
  shapes: number;
  objects: number;
  equations: number;
  tables: number;
  tocFields: number;
  externalFields: number;
  embeddedDocuments: number;
  unsafeLinks: number;
  legacyFonts: Set<string>;
}

type FieldKind = "keep" | "drop" | "toc" | "external" | "hyperlink";

interface FieldFrame {
  instr: string;
  phase: "instr" | "result";
  kind: FieldKind;
  href: string | undefined;
}

interface ParagraphContext {
  readonly runs: TextRun[];
  readonly paragraphRun: RunProps;
  pictures: number;
  breakBefore: boolean;
  breakAfter: boolean;
}

export interface BodyResult {
  readonly paragraphs: DocxParagraph[];
  readonly counts: BodyCounts;
}

export function walkBody(parts: DocxParts): BodyResult {
  return new BodyWalker(parts).run();
}

class BodyWalker {
  readonly #parts: DocxParts;
  readonly #normalSize: number;
  readonly #paragraphs: DocxParagraph[] = [];
  readonly #fields: FieldFrame[] = [];
  readonly counts: BodyCounts;
  #pendingBreak = false;
  /** Runs of a paragraph whose mark was deleted: they join the next paragraph. */
  #carry: { runs: TextRun[]; pictures: number } | undefined;

  constructor(parts: DocxParts) {
    this.#parts = parts;
    this.#normalSize = parts.styles.normalSize();
    this.counts = {
      trackedChanges: false,
      comments: parts.hasComments,
      footnotes: 0,
      pictures: 0,
      textBoxes: 0,
      shapes: 0,
      objects: 0,
      equations: 0,
      tables: 0,
      tocFields: 0,
      externalFields: 0,
      embeddedDocuments: 0,
      unsafeLinks: 0,
      legacyFonts: new Set(),
    };
    this.#noteFonts(parts.styles.defaults.fonts);
  }

  run(): BodyResult {
    const body = wChild(this.#parts.document, "body");
    if (body) this.#blocks(body, false);
    return { paragraphs: this.#paragraphs, counts: this.counts };
  }

  #blocks(container: XmlElement, inTable: boolean): void {
    for (const el of xmlChildElements(container)) {
      if (!isW(el)) continue;
      switch (el.local) {
        case "p":
          this.#paragraph(el, inTable);
          break;
        case "tbl":
          this.counts.tables += 1;
          for (const row of xmlChildElements(el)) {
            if (!isW(row, "tr")) continue;
            for (const cell of xmlChildElements(row)) {
              if (isW(cell, "tc")) this.#blocks(cell, true);
            }
          }
          break;
        case "sdt":
          if (isTableOfContentsSdt(el)) {
            this.counts.tocFields += 1;
          } else {
            const content = wChild(el, "sdtContent");
            if (content) this.#blocks(content, inTable);
          }
          break;
        case "customXml":
        case "ins":
        case "moveTo":
          if (el.local !== "customXml") this.counts.trackedChanges = true;
          this.#blocks(el, inTable);
          break;
        case "del":
        case "moveFrom":
          this.counts.trackedChanges = true;
          break;
        case "altChunk":
          this.counts.embeddedDocuments += 1;
          break;
        default:
          break;
      }
    }
  }

  #paragraph(p: XmlElement, inTable: boolean): void {
    const styles = this.#parts.styles;
    const pPr = wChild(p, "pPr");
    const styleId = wAttr(wChild(pPr, "pStyle"), "val");
    const outlineVal = wAttr(wChild(pPr, "outlineLvl"), "val");
    const directOutline = outlineVal !== undefined && /^\d+$/.test(outlineVal) ? Number(outlineVal) : undefined;
    const paragraphRun = styles.paragraphRunProps(styleId);
    this.#noteFonts(paragraphRun.fonts);

    const carried = this.#carry;
    this.#carry = undefined;
    const ctx: ParagraphContext = {
      runs: carried ? [...carried.runs] : [],
      paragraphRun,
      pictures: carried?.pictures ?? 0,
      breakBefore: this.#pendingBreak || readToggle(wChild(pPr, "pageBreakBefore")) === true,
      breakAfter: false,
    };
    this.#pendingBreak = false;
    this.#inline(p, ctx, undefined);

    // A deleted paragraph mark joins this paragraph to the next one (ADR-0040 §7).
    if (wChild(wChild(pPr, "rPr"), "del")) {
      this.counts.trackedChanges = true;
      this.#carry = { runs: ctx.runs, pictures: ctx.pictures };
      this.#pendingBreak = ctx.breakBefore;
      return;
    }

    const text = ctx.runs.map((run) => run.text).join("").replace(/\s+/g, " ").trim();
    const afterThis = ctx.breakAfter || wChild(pPr, "sectPr") !== undefined;
    if (text === "" && ctx.pictures === 0) {
      // Empty paragraphs vanish, but a page break they carry still starts the next page.
      this.#pendingBreak = ctx.breakBefore || afterThis;
      return;
    }
    this.#pendingBreak = afterThis;

    const styleClass = styles.paragraphClass(styleId, directOutline);
    const numRef = readNumPr(wChild(pPr, "numPr")) ?? styles.paragraphNumbering(styleId);
    const ordered = numRef ? this.#parts.numbering.isOrdered(numRef) : undefined;
    const visible = ctx.runs.filter((run) => run.text.trim() !== "");

    this.#paragraphs.push({
      styleClass,
      runs: ctx.runs,
      text,
      ...(numRef && ordered !== undefined && styleClass.kind === "normal"
        ? { list: { numId: numRef.numId, ilvl: numRef.ilvl, ordered } }
        : {}),
      allBold: visible.length > 0 && visible.every((run) => run.looksBold),
      larger: visible.length > 0 && visible.every((run) => run.size > this.#normalSize),
      pageBreakBefore: ctx.breakBefore,
      pictures: ctx.pictures,
      inTable,
    });
  }

  #inline(container: XmlElement, ctx: ParagraphContext, href: string | undefined): void {
    for (const el of xmlChildElements(container)) {
      if (el.ns === MATH_NS) {
        if (el.local === "oMath" || el.local === "oMathPara") this.counts.equations += 1;
        continue;
      }
      if (el.ns === MC_NS && el.local === "AlternateContent") {
        this.#drawing(firstChoice(el), ctx);
        continue;
      }
      if (!isW(el)) continue;
      switch (el.local) {
        case "r":
          this.#run(el, ctx, href);
          break;
        case "hyperlink":
          this.#inline(el, ctx, this.#hyperlinkTarget(el) ?? href);
          break;
        case "ins":
        case "moveTo":
          this.counts.trackedChanges = true;
          this.#inline(el, ctx, href);
          break;
        case "del":
        case "moveFrom":
          this.counts.trackedChanges = true;
          break;
        case "smartTag":
        case "customXml":
        case "bdo":
        case "dir":
          this.#inline(el, ctx, href);
          break;
        case "sdt": {
          const content = wChild(el, "sdtContent");
          if (content) this.#inline(content, ctx, href);
          break;
        }
        case "fldSimple": {
          const frame = classifyField(wAttr(el, "instr") ?? "");
          this.#noteField(frame);
          this.#fields.push({ instr: "", ...frame, phase: "result" });
          this.#inline(el, ctx, href);
          this.#fields.pop();
          break;
        }
        default:
          break;
      }
    }
  }

  #run(r: XmlElement, ctx: ParagraphContext, href: string | undefined): void {
    const styles = this.#parts.styles;
    const rPr = wChild(r, "rPr");
    const direct = readRunProps(rPr);
    const character = styles.characterRunProps(wAttr(wChild(rPr, "rStyle"), "val"));
    this.#noteFonts(direct.fonts);
    this.#noteFonts(character.fonts);
    const bold = direct.bold ?? character.bold ?? false;
    const italic = direct.italic ?? character.italic ?? false;
    const looksBold = direct.bold ?? character.bold ?? ctx.paragraphRun.bold ?? false;
    const size = direct.size ?? character.size ?? ctx.paragraphRun.size ?? this.#normalSize;

    const emit = (text: string): void => {
      if (!this.#textAllowed()) return;
      const fieldHref = this.#fieldHref();
      const link = fieldHref === undefined ? href : fieldHref ?? undefined;
      ctx.runs.push({ text, bold, italic, looksBold, size, ...(link !== undefined ? { href: link } : {}) });
    };

    for (const child of xmlChildElements(r)) {
      if (child.ns === MC_NS && child.local === "AlternateContent") {
        this.#drawing(firstChoice(child), ctx);
        continue;
      }
      if (!isW(child)) continue;
      switch (child.local) {
        case "t":
          emit(textOf(child));
          break;
        case "tab":
        case "ptab":
        case "cr":
          emit(" ");
          break;
        case "br": {
          const type = wAttr(child, "type");
          if (type === "page") {
            const hasText = ctx.runs.some((run) => run.text.trim() !== "");
            if (hasText) ctx.breakAfter = true;
            else ctx.breakBefore = true;
          } else if (type !== "column") {
            emit(" ");
          }
          break;
        }
        case "noBreakHyphen":
          emit("‑");
          break;
        case "sym": {
          const code = parseInt(wAttr(child, "char") ?? "", 16);
          const mapped = code >= 0xf000 ? code - 0xf000 : code;
          if (Number.isFinite(mapped) && mapped >= 0x20 && mapped <= 0x10ffff) {
            emit(String.fromCodePoint(mapped));
          }
          break;
        }
        case "fldChar":
          this.#fieldChar(wAttr(child, "fldCharType"));
          break;
        case "instrText": {
          const top = this.#fields[this.#fields.length - 1];
          if (top?.phase === "instr") top.instr += textOf(child);
          break;
        }
        case "delText":
        case "delInstrText":
          this.counts.trackedChanges = true;
          break;
        case "drawing":
        case "pict":
          this.#drawing(child, ctx);
          break;
        case "object":
          this.counts.objects += 1;
          break;
        case "footnoteReference":
        case "endnoteReference":
          this.counts.footnotes += 1;
          break;
        case "commentReference":
          this.counts.comments = true;
          break;
        default:
          break;
      }
    }
  }

  #fieldChar(type: string | undefined): void {
    if (type === "begin") {
      this.#fields.push({ instr: "", phase: "instr", kind: "keep", href: undefined });
    } else if (type === "separate") {
      const top = this.#fields[this.#fields.length - 1];
      if (top && top.phase === "instr") {
        const classified = classifyField(top.instr);
        top.kind = classified.kind;
        top.href = classified.href;
        top.phase = "result";
        this.#noteField(top);
      }
    } else if (type === "end") {
      const top = this.#fields.pop();
      // A field with no result part (begin…end) still had its instruction checked.
      if (top && top.phase === "instr") this.#noteField(classifyField(top.instr));
    }
  }

  #noteField(frame: { kind: FieldKind }): void {
    if (frame.kind === "toc") this.counts.tocFields += 1;
    if (frame.kind === "external") this.counts.externalFields += 1;
  }

  #textAllowed(): boolean {
    return this.#fields.every((frame) => frame.phase === "result" && (frame.kind === "keep" || frame.kind === "hyperlink"));
  }

  /** `undefined`: no hyperlink field; `null`: a hyperlink field without a usable target. */
  #fieldHref(): string | null | undefined {
    for (let index = this.#fields.length - 1; index >= 0; index -= 1) {
      const frame = this.#fields[index]!;
      if (frame.kind === "hyperlink") return frame.href ?? null;
    }
    return undefined;
  }

  #hyperlinkTarget(el: XmlElement): string | undefined {
    const id = rAttr(el, "id");
    if (id === undefined) return undefined; // internal anchor (w:anchor): plain text
    const rel = this.#parts.documentRels.get(id);
    if (!rel || !rel.external || rel.target === undefined) return undefined;
    const target = rel.target.trim();
    if (SAFE_LINK.test(target)) return target;
    this.counts.unsafeLinks += 1;
    return undefined;
  }

  #drawing(el: XmlElement | undefined, ctx: ParagraphContext): void {
    if (!el) return;
    if (hasDescendant(el, ["txbxContent", "textbox"])) {
      this.counts.textBoxes += 1;
    } else if (hasDescendant(el, ["blip", "imagedata"])) {
      this.counts.pictures += 1;
      ctx.pictures += 1;
    } else {
      this.counts.shapes += 1;
    }
  }

  #noteFonts(fonts: readonly string[]): void {
    for (const font of fonts) {
      if (LEGACY_KANNADA_FONT.test(font.trim())) this.counts.legacyFonts.add(font.trim());
    }
  }
}

function classifyField(instr: string): { kind: FieldKind; href: string | undefined } {
  const tokens = [...instr.matchAll(/"([^"]*)"|(\S+)/g)].map((match) => match[1] ?? match[2] ?? "");
  const name = (tokens[0] ?? "").toUpperCase();
  switch (name) {
    case "TOC":
      return { kind: "toc", href: undefined };
    case "HYPERLINK": {
      let url: string | undefined;
      for (let index = 1; index < tokens.length; index += 1) {
        const token = tokens[index]!;
        if (token.startsWith("\\")) {
          if (/^\\[lotm]$/i.test(token)) index += 1; // switch argument
          continue;
        }
        url ??= token.trim();
      }
      return { kind: "hyperlink", href: url !== undefined && SAFE_LINK.test(url) ? url : undefined };
    }
    case "INCLUDEPICTURE":
    case "INCLUDETEXT":
    case "LINK":
    case "DDE":
    case "DDEAUTO":
    case "IMPORT":
      return { kind: "external", href: undefined };
    case "PAGE":
    case "NUMPAGES":
    case "PAGEREF":
    case "SECTIONPAGES":
      return { kind: "drop", href: undefined };
    default:
      return { kind: "keep", href: undefined };
  }
}

function isTableOfContentsSdt(sdt: XmlElement): boolean {
  const gallery = wAttr(wChild(wChild(wChild(sdt, "sdtPr"), "docPartObj"), "docPartGallery"), "val");
  return gallery !== undefined && /table of contents/i.test(gallery);
}

function firstChoice(alternate: XmlElement): XmlElement | undefined {
  return (
    xmlChildElements(alternate, MC_NS, "Choice")[0] ?? xmlChildElements(alternate, MC_NS, "Fallback")[0]
  );
}

function hasDescendant(el: XmlElement, locals: readonly string[]): boolean {
  for (const child of el.children) {
    if (typeof child === "string") continue;
    if (locals.includes(child.local) || hasDescendant(child, locals)) return true;
  }
  return false;
}

function textOf(el: XmlElement): string {
  return el.children.filter((child): child is string => typeof child === "string").join("");
}
