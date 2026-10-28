// SPDX-License-Identifier: Apache-2.0
import type {
  BookMetadata,
  ContentBlock,
  InlineSpan,
  SectionRole,
  StructuralSection,
} from "@openbook/book-model";
import type { DeterministicIdFactory } from "../ids.js";
import type { ImportIssue, ImportOptions } from "../types.js";
import type { DocxParagraph, TextRun } from "./body.js";

/**
 * Turns paragraph records into Book sections (ADR-0040 §4.1–§4.5).
 * Heuristics here are deliberately small; every guess is reported so the author can check it.
 */

/** ADR-0040 §4.3. Kannada words confirmed by the maintainer on 2026-10-28. */
const FRONT_MATTER_TITLES: ReadonlyArray<readonly [SectionRole, readonly string[]]> = [
  ["foreword", ["foreword", "ಮುನ್ನುಡಿ"]],
  ["preface", ["preface", "ಪೀಠಿಕೆ"]],
  ["introduction", ["introduction", "ಪ್ರಸ್ತಾವನೆ"]],
  ["dedication", ["dedication", "ಅರ್ಪಣೆ"]],
  ["copyright", ["copyright"]],
  [
    "custom",
    [
      "publisher's note",
      "publishers note",
      "acknowledgements",
      "acknowledgments",
      "about this book",
      "ಪ್ರಕಾಶಕರ ಮಾತು",
      "ಕೃತಜ್ಞತೆಗಳು",
    ],
  ],
];

/** ADR-0040 §4.4. */
const CONTENTS_TITLES = new Set(["contents", "table of contents", "ಪರಿವಿಡಿ"]);
const TOC_MATCH_RATIO = 0.6;

/** Word fills dc:title with these when the author never set a title. */
const DEFAULT_WORD_TITLE = /^(document|doc|untitled)\s*\d*$/i;

const KANNADA_LETTER = /[ಀ-೿]/gu;
const LATIN_LETTER = /[A-Za-z]/g;

export interface DocxStructureInput {
  readonly paragraphs: readonly DocxParagraph[];
  readonly coreTitle?: string;
  readonly coreCreator?: string;
  readonly declaredLanguage?: string;
  readonly options?: ImportOptions;
  readonly ids: DeterministicIdFactory;
  readonly issues: ImportIssue[];
}

export interface DocxStructure {
  /** Metadata found in the document; caller overrides still win (buildMetadata). */
  readonly metadata: Partial<BookMetadata>;
  readonly frontMatter: StructuralSection[];
  readonly chapters: StructuralSection[];
  readonly tocRemoved: boolean;
  readonly listsFlattened: boolean;
}

export function structureDocx(input: DocxStructureInput): DocxStructure {
  const { ids, issues } = input;
  let items = [...input.paragraphs];

  // TOC-styled paragraphs (TOC 1–9, TOC Heading) are generated navigation (§4.4).
  const beforeTocStyles = items.length;
  items = items.filter((p) => p.styleClass.kind !== "toc" && p.styleClass.kind !== "toc-heading");
  let tocRemoved = items.length !== beforeTocStyles;

  // --- metadata (§4.1) -------------------------------------------------------------
  const metadata: { -readonly [K in keyof BookMetadata]?: BookMetadata[K] } = {};
  const titleItem = items.find((p) => p.styleClass.kind === "title");
  const firstHeading = items.findIndex((p) => p.styleClass.kind === "heading");
  const subtitleItem = items.find(
    (p, index) => p.styleClass.kind === "subtitle" && (firstHeading === -1 || index < firstHeading),
  );
  const coreTitle = input.coreTitle && !DEFAULT_WORD_TITLE.test(input.coreTitle) ? input.coreTitle : undefined;
  const title = coreTitle ?? titleItem?.text;
  if (title) metadata.title = title;
  if (subtitleItem) metadata.subtitle = subtitleItem.text;
  items = items.filter((p) => p !== titleItem && p !== subtitleItem);

  if (input.coreCreator) {
    const authors = input.coreCreator.split(";").map((name) => name.trim()).filter(Boolean);
    if (authors.length > 0) {
      metadata.authors = authors;
      issues.push({
        code: "DOCX_AUTHOR_FROM_PROPERTIES",
        severity: "info",
        message: `The author name “${authors.join(", ")}” came from the Word file's properties. Word often fills this in with the computer's user name, so please check it in Details.`,
      });
    }
  }

  const language = resolveLanguage(input.declaredLanguage, input.paragraphs, issues);
  if (language) metadata.language = language;

  // --- typed table of contents (§4.4) -------------------------------------------------
  const typedToc = findTypedToc(items);
  let tocTitles: ReadonlySet<string> = new Set();
  let tocStart = 0;
  if (typedToc) {
    tocTitles = typedToc.titles;
    tocStart = typedToc.start;
    items = [...items.slice(0, typedToc.start), ...items.slice(typedToc.end)];
    tocRemoved = true;
  }

  const strategy = input.options?.splitStrategy ?? "heading-1";
  const builder = new SectionBuilder(ids);

  if (strategy === "single-chapter") {
    builder.startChapter("Chapter 1");
    for (const p of items) builder.add(p);
    builder.close();
    return { metadata, frontMatter: [], chapters: builder.chapters, tocRemoved, listsFlattened: builder.listsFlattened };
  }

  // --- chapter titles (§4.2) ---------------------------------------------------------------
  const splitLevel = strategy === "heading-2" ? 2 : 1;
  const isStyledChapter = (p: DocxParagraph): boolean =>
    p.styleClass.kind === "heading" && p.styleClass.level === splitLevel;
  let promoted = new Set<DocxParagraph>();

  if (!items.some(isStyledChapter)) {
    promoted = chaptersFromToc(items, tocTitles, tocStart);
    if (promoted.size >= 2) {
      issues.push({
        code: "DOCX_CHAPTERS_FROM_CONTENTS",
        severity: "warning",
        message: `This file has no heading styles, so OpenBook used your table of contents to find ${promoted.size} chapters. Please check them in Structure.`,
      });
    } else {
      promoted = handFormattedChapters(items);
      if (promoted.size >= 2) {
        issues.push({
          code: "DOCX_CHAPTERS_FROM_FORMATTING",
          severity: "warning",
          message: `This file has no heading styles, so OpenBook guessed ${promoted.size} chapter titles from bold or large text at the top of a page. Please check them in Structure.`,
        });
      } else {
        issues.push({
          code: "DOCX_NO_CHAPTERS",
          severity: "warning",
          message:
            "OpenBook could not find chapter titles in this file, so everything was imported as one chapter. You can split it in Structure, or use Word's Heading 1 style for chapter titles and import again.",
        });
        builder.startChapter("Chapter 1");
        for (const p of items) builder.add(p);
        builder.close();
        return { metadata, frontMatter: [], chapters: builder.chapters, tocRemoved, listsFlattened: builder.listsFlattened };
      }
    }
  }
  const isChapterTitle = (p: DocxParagraph): boolean => isStyledChapter(p) || promoted.has(p);

  // --- sections and front matter (§4.3) --------------------------------------------------------
  const before: DocxParagraph[] = [];
  let chapterStarted = false;
  for (const p of items) {
    const role = chapterStarted || p.list || p.inTable ? undefined : frontMatterRole(p.text);
    if (isChapterTitle(p)) {
      if (role) {
        builder.startFront(role, p.text);
      } else {
        chapterStarted = true;
        builder.startChapter(p.text);
      }
      continue;
    }
    if (role && p.styleClass.kind !== "quote") {
      builder.startFront(role, p.text);
      continue;
    }
    if (!builder.hasSection) {
      before.push(p);
      continue;
    }
    builder.add(p);
  }

  // Content before any section: drop what only repeats the title page; keep the rest for review.
  const repeated = new Set(
    [metadata.title, metadata.subtitle, ...(metadata.authors ?? []), ...(input.options?.metadataOverrides?.authors ?? []),
      input.options?.metadataOverrides?.title]
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .map(normalizeTitle),
  );
  const leftover = before.filter((p) => {
    const text = normalizeTitle(p.text.replace(/^by\s+/i, ""));
    return p.pictures > 0 || !repeated.has(text);
  });
  if (leftover.some((p) => p.text !== "")) {
    const first = leftover.find((p) => p.text !== "")!;
    builder.prependFront(first, leftover.filter((p) => p !== first));
    issues.push({
      code: "DOCX_FRONT_MATTER_REVIEW",
      severity: "warning",
      message: `Some text before the first chapter did not have a recognised title. OpenBook put it in a front section called “${first.text}”. Please check it in Structure.`,
    });
  }

  if (builder.chapters.length === 0) {
    builder.startChapter("Chapter 1");
  }
  builder.close();
  return {
    metadata,
    frontMatter: builder.front,
    chapters: builder.chapters,
    tocRemoved,
    listsFlattened: builder.listsFlattened,
  };
}

// --- section building --------------------------------------------------------------------

class SectionBuilder {
  readonly front: StructuralSection[] = [];
  readonly chapters: StructuralSection[] = [];
  listsFlattened = false;
  readonly #ids: DeterministicIdFactory;
  #current: StructuralSection | undefined;
  #openList: { numId: string; block: Extract<ContentBlock, { type: "list" }> } | undefined;
  #previousHadPicture = false;

  constructor(ids: DeterministicIdFactory) {
    this.#ids = ids;
  }

  get hasSection(): boolean {
    return this.#current !== undefined;
  }

  startFront(role: SectionRole, title: string): void {
    this.#start(this.front, "front", role, title);
  }

  startChapter(title: string): void {
    this.#start(this.chapters, "main", "chapter", title || `Chapter ${String(this.chapters.length + 1)}`);
  }

  /** A front section placed before every other front section (content before any title). */
  prependFront(titleItem: DocxParagraph, rest: readonly DocxParagraph[]): void {
    const saved = this.#current;
    const section = this.#newSection("front", "custom", titleItem.text);
    this.#current = section;
    this.#openList = undefined;
    for (const p of rest.length > 0 ? rest : [titleItem]) this.add(p);
    this.#finish(section);
    this.front.unshift(section);
    this.#current = saved;
    this.#openList = undefined;
  }

  add(p: DocxParagraph): void {
    const section = this.#current;
    if (!section) return;
    const hadPicture = this.#previousHadPicture;
    this.#previousHadPicture = p.pictures > 0;

    // A caption right after a picture belongs to that picture, imported in Slice 3.
    if (p.styleClass.kind === "caption" && hadPicture) return;
    if (p.text === "") return;

    if (p.list) {
      if (p.list.ilvl > 0) this.listsFlattened = true;
      const item = toInlines(p.runs);
      if (this.#openList && this.#openList.numId === p.list.numId && this.#openList.block.ordered === p.list.ordered) {
        this.#openList.block.items.push(item);
        return;
      }
      const block: Extract<ContentBlock, { type: "list" }> = {
        type: "list",
        id: this.#ids.nextBlockId(),
        ordered: p.list.ordered,
        items: [item],
      };
      section.blocks.push(block);
      this.#openList = { numId: p.list.numId, block };
      return;
    }
    this.#openList = undefined;

    const inlines = toInlines(p.runs);
    if (p.styleClass.kind === "heading") {
      const level = Math.min(6, Math.max(1, p.styleClass.level)) as 1 | 2 | 3 | 4 | 5 | 6;
      section.blocks.push({ type: "heading", id: this.#ids.nextBlockId(), level, inlines: plain(inlines) });
      return;
    }
    if (p.styleClass.kind === "quote") {
      section.blocks.push({ type: "quote", id: this.#ids.nextBlockId(), inlines });
      return;
    }
    section.blocks.push({ type: "paragraph", id: this.#ids.nextBlockId(), inlines });
  }

  #start(list: StructuralSection[], kind: StructuralSection["kind"], role: SectionRole, title: string): void {
    if (this.#current) this.#finish(this.#current);
    const section = this.#newSection(kind, role, title);
    list.push(section);
    this.#current = section;
    this.#openList = undefined;
    this.#previousHadPicture = false;
  }

  #newSection(kind: StructuralSection["kind"], role: SectionRole, title: string): StructuralSection {
    return { id: this.#ids.nextSectionId(), kind, role, title, blocks: [] };
  }

  #finish(section: StructuralSection): void {
    if (section.blocks.length === 0) {
      section.blocks.push({ type: "paragraph", id: this.#ids.nextBlockId(), inlines: [{ type: "text", text: "" }] });
    }
  }

  /** Ensures the last open section is not left empty. */
  close(): void {
    if (this.#current) this.#finish(this.#current);
  }
}

// --- inline text (§4.5) ----------------------------------------------------------------------

/** Runs → Book inlines: bold → strong, italic → emphasis, links; adjacent equal runs merged. */
export function toInlines(runs: readonly TextRun[]): InlineSpan[] {
  const merged: Array<{ text: string; bold: boolean; italic: boolean; href: string | undefined }> = [];
  for (const run of runs) {
    const text = run.text.replace(/\s+/g, " ");
    if (text === "") continue;
    const last = merged[merged.length - 1];
    if (last && last.bold === run.bold && last.italic === run.italic && last.href === run.href) {
      last.text += text;
    } else {
      merged.push({ text, bold: run.bold, italic: run.italic, href: run.href });
    }
  }
  // Trim the paragraph's outer whitespace and collapse spaces across run boundaries.
  for (let index = 0; index < merged.length; index += 1) {
    const run = merged[index]!;
    if (index > 0 && merged[index - 1]!.text.endsWith(" ")) run.text = run.text.replace(/^ +/, "");
  }
  if (merged.length > 0) {
    merged[0]!.text = merged[0]!.text.replace(/^ +/, "");
    merged[merged.length - 1]!.text = merged[merged.length - 1]!.text.replace(/ +$/, "");
  }
  const visible = merged.filter((run) => run.text !== "");
  if (visible.length === 0) return [{ type: "text", text: "" }];

  const out: InlineSpan[] = [];
  let index = 0;
  while (index < visible.length) {
    const href = visible[index]!.href;
    const group: typeof visible = [];
    while (index < visible.length && visible[index]!.href === href) {
      group.push(visible[index]!);
      index += 1;
    }
    const spans = group.map(markSpan);
    if (href !== undefined) out.push({ type: "link", href, children: spans });
    else out.push(...spans);
  }
  return out;
}

function markSpan(run: { text: string; bold: boolean; italic: boolean }): InlineSpan {
  let span: InlineSpan = { type: "text", text: run.text };
  if (run.italic) span = { type: "emphasis", children: [span] };
  if (run.bold) span = { type: "strong", children: [span] };
  return span;
}

/** Headings carry their text; Word's bold on a heading is appearance, not meaning. */
function plain(inlines: InlineSpan[]): InlineSpan[] {
  const text = (spans: InlineSpan[]): string =>
    spans.map((span) => (span.type === "text" ? span.text : text(span.children))).join("");
  return [{ type: "text", text: text(inlines) }];
}

// --- heuristics --------------------------------------------------------------------------

export function normalizeTitle(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, "")
    .trim();
}

function frontMatterRole(text: string): SectionRole | undefined {
  if (wordCount(text) > 6) return undefined;
  const normalized = normalizeTitle(text);
  for (const [role, titles] of FRONT_MATTER_TITLES) {
    if (titles.includes(normalized)) return role;
  }
  return undefined;
}

const PAGE_NUMBER_TAIL = /[\s.…·_\-–—]*([0-9೦-೯]+|[ivxlcdm]+)\s*$/iu;

interface TypedToc {
  readonly start: number;
  readonly end: number;
  readonly titles: ReadonlySet<string>;
}

/** A “Contents” line followed by entries most of which name later paragraphs (§4.4). */
function findTypedToc(items: readonly DocxParagraph[]): TypedToc | undefined {
  for (let start = 0; start < items.length; start += 1) {
    const heading = items[start]!;
    if (!CONTENTS_TITLES.has(normalizeTitle(heading.text))) continue;

    const entries: string[] = [];
    let end = start + 1;
    while (end < items.length) {
      const entry = items[end]!;
      if (entry.styleClass.kind === "heading" || entry.text === "" || wordCount(entry.text) > 20) break;
      if (end > start + 1 && entry.pageBreakBefore) break;
      entries.push(entry.text);
      end += 1;
    }
    if (entries.length < 2) continue;

    const later = new Set(items.slice(end).map((p) => normalizeTitle(p.text)));
    const titles = new Set<string>();
    let matched = 0;
    let lastMatch = -1;
    entries.forEach((entry, index) => {
      const raw = normalizeTitle(entry);
      const stripped = normalizeTitle(entry.replace(PAGE_NUMBER_TAIL, ""));
      const hit = later.has(raw) ? raw : later.has(stripped) ? stripped : undefined;
      if (hit) {
        matched += 1;
        titles.add(hit);
        lastMatch = index;
      }
    });
    if (matched / entries.length < TOC_MATCH_RATIO || lastMatch === -1) continue;
    // The contents page ends at its last entry that names a later paragraph.
    return { start, end: start + 1 + lastMatch + 1, titles };
  }
  return undefined;
}

function chaptersFromToc(
  items: readonly DocxParagraph[],
  titles: ReadonlySet<string>,
  from: number,
): Set<DocxParagraph> {
  const promoted = new Set<DocxParagraph>();
  const seen = new Set<string>();
  for (const p of items.slice(from)) {
    if (p.list || p.inTable || wordCount(p.text) > 20) continue;
    const key = normalizeTitle(p.text);
    if (titles.has(key) && !seen.has(key)) {
      seen.add(key);
      promoted.add(p);
    }
  }
  return promoted;
}

function handFormattedChapters(items: readonly DocxParagraph[]): Set<DocxParagraph> {
  const promoted = new Set<DocxParagraph>();
  items.forEach((p, index) => {
    if (p.list || p.inTable || p.styleClass.kind !== "normal") return;
    if (p.text === "" || wordCount(p.text) > 12 || /[.!?।]$/.test(p.text)) return;
    if (!(p.allBold || p.larger)) return;
    if (p.pageBreakBefore || index === 0) promoted.add(p);
  });
  return promoted;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** dc:language or the Normal style's language; Kannada script wins over an English default. */
function resolveLanguage(
  declared: string | undefined,
  paragraphs: readonly DocxParagraph[],
  issues: ImportIssue[],
): string | undefined {
  const sample = paragraphs.map((p) => p.text).join(" ");
  const kannada = sample.match(KANNADA_LETTER)?.length ?? 0;
  const latin = sample.match(LATIN_LETTER)?.length ?? 0;
  if (kannada > latin && !(declared ?? "").toLowerCase().startsWith("kn")) {
    issues.push({
      code: "DOCX_LANGUAGE_FROM_TEXT",
      severity: "info",
      message: `Most of the text is in Kannada, so the book's language was set to Kannada${declared ? ` (the file said “${declared}”)` : ""}. You can change it in Details.`,
    });
    return "kn";
  }
  return declared;
}
