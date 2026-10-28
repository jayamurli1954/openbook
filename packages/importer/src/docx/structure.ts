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
import { inlinesToPlainText } from "../markdown-import.js";
import { IMPORTED_IMAGE_PLACEHOLDER_PREFIX } from "../types.js";
import type { DocxParagraph, PictureRef, TextRun } from "./body.js";

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
  /** One entry per distinct picture part; image blocks reference `placeholderId`. */
  readonly pictures: readonly PlacedPicture[];
  /** Reused pictures whose uses had different alt texts (one AssetRef keeps the first). */
  readonly altTextConflicts: number;
}

export interface PlacedPicture {
  readonly placeholderId: string;
  readonly part: string;
  readonly altText: string;
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
  const firstHeading = items.findIndex((p) => p.styleClass.kind === "heading");
  const subtitleItem = items.find(
    (p, index) => p.styleClass.kind === "subtitle" && (firstHeading === -1 || index < firstHeading),
  );
  const coreTitle = input.coreTitle && !DEFAULT_WORD_TITLE.test(input.coreTitle) ? input.coreTitle : undefined;
  // Some authors style every story title with Word's Title style. A lone Title paragraph is the
  // title page. With several, the first is the book's title unless the core properties name a
  // different one; the others are chapter candidates.
  const titleItems = items.filter((p) => p.styleClass.kind === "title");
  const firstTitle = titleItems[0];
  const titleItem =
    firstTitle &&
    (titleItems.length === 1 || !coreTitle || normalizeTitle(firstTitle.text) === normalizeTitle(coreTitle))
      ? firstTitle
      : undefined;
  const storyTitles = titleItems.filter((p) => p !== titleItem);
  // The Title and Subtitle paragraphs become metadata, but a picture in them stays on the title page.
  const titlePagePictures = [titleItem, subtitleItem]
    .filter((p): p is DocxParagraph => p !== undefined && p.pictures.length > 0)
    .map((p) => ({ ...p, text: "", runs: [] }));
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

  // Text that only repeats the title page: never a chapter title, and dropped before the first section.
  const repeated = new Set(
    [metadata.title, metadata.subtitle, ...(metadata.authors ?? []), ...(input.options?.metadataOverrides?.authors ?? []),
      input.options?.metadataOverrides?.title]
      .filter((value): value is string => typeof value === "string" && value.trim() !== "")
      .map(normalizeTitle),
  );
  const repeatsTitlePage = (p: DocxParagraph): boolean => repeated.has(normalizeTitle(p.text.replace(/^by\s+/i, "")));

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
    for (const p of [...titlePagePictures, ...items]) builder.add(p);
    builder.close();
    return { metadata, frontMatter: [], chapters: builder.chapters, tocRemoved, listsFlattened: builder.listsFlattened, pictures: builder.pictures, altTextConflicts: builder.altTextConflicts };
  }

  // --- chapter titles (§4.2) ---------------------------------------------------------------
  const splitLevel = strategy === "heading-2" ? 2 : 1;
  const isStyledChapter = (p: DocxParagraph): boolean =>
    p.styleClass.kind === "heading" && p.styleClass.level === splitLevel;
  let promoted = new Set<DocxParagraph>();

  if (!items.some(isStyledChapter) && storyTitles.length >= 2) {
    promoted = new Set(storyTitles);
    issues.push({
      code: "DOCX_CHAPTERS_FROM_TITLE_STYLE",
      severity: "warning",
      message: `This file uses Word's Title style for ${storyTitles.length} titles, so OpenBook made each one a chapter. Please check them in Structure.`,
    });
  } else if (!items.some(isStyledChapter)) {
    promoted = chaptersFromToc(items, tocTitles, tocStart);
    if (promoted.size >= 2) {
      issues.push({
        code: "DOCX_CHAPTERS_FROM_CONTENTS",
        severity: "warning",
        message: `This file has no heading styles, so OpenBook used your table of contents to find ${promoted.size} chapters. Please check them in Structure.`,
      });
    } else {
      promoted = handFormattedChapters(items, repeatsTitlePage);
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
        for (const p of [...titlePagePictures, ...items]) builder.add(p);
        builder.close();
        return { metadata, frontMatter: [], chapters: builder.chapters, tocRemoved, listsFlattened: builder.listsFlattened, pictures: builder.pictures, altTextConflicts: builder.altTextConflicts };
      }
    }
  }
  const isChapterTitle = (p: DocxParagraph): boolean => isStyledChapter(p) || promoted.has(p);

  // --- sections and front matter (§4.3) --------------------------------------------------------
  const before: DocxParagraph[] = [];
  // Headings above the split level (a Part title with the heading-2 strategy) open the next chapter.
  let pendingParts: DocxParagraph[] = [];
  let chapterStarted = false;
  for (const p of items) {
    const role = chapterStarted || p.list || p.inTable ? undefined : frontMatterRole(p.text);
    // A title paragraph names its section; a picture anchored to it opens the section.
    if (isChapterTitle(p)) {
      if (role) {
        builder.startFront(role, p.text);
      } else {
        chapterStarted = true;
        builder.startChapter(p.text);
        for (const part of pendingParts) builder.add(part);
        pendingParts = [];
      }
      builder.addPictures(p);
      continue;
    }
    if (role && p.styleClass.kind !== "quote") {
      builder.startFront(role, p.text);
      builder.addPictures(p);
      continue;
    }
    if (p.styleClass.kind === "heading" && p.styleClass.level < splitLevel) {
      pendingParts.push(p);
      continue;
    }
    if (!builder.hasSection) {
      before.push(p);
      continue;
    }
    builder.add(p);
  }
  // Part headings with no chapter after them stay at the end of the last section.
  for (const part of pendingParts) {
    if (builder.hasSection) builder.add(part);
    else before.push(part);
  }

  before.unshift(...titlePagePictures);

  // Content before any section: drop what only repeats the title page; keep the rest for review.
  const leftover = before.filter((p) => p.pictures.length > 0 || !repeatsTitlePage(p));
  if (leftover.some((p) => p.text !== "" || p.pictures.length > 0)) {
    // Repeated title-page text is dropped, but a picture in that paragraph is kept.
    const kept = leftover.map((p) => (repeatsTitlePage(p) ? { ...p, text: "", runs: [] } : p));
    const first = kept.find((p) => p.text !== "");
    const title = first?.text ?? "Title page";
    const rest = first ? kept.filter((p) => p !== first) : kept;
    builder.prependFront(title, rest.length > 0 ? rest : first ? [first] : []);
    issues.push({
      code: "DOCX_FRONT_MATTER_REVIEW",
      severity: "warning",
      message: `Some ${first ? "text" : "pictures"} before the first chapter did not have a recognised title. OpenBook put ${first ? "it" : "them"} in a front section called “${title}”. Please check it in Structure.`,
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
    pictures: builder.pictures, altTextConflicts: builder.altTextConflicts,
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
  /** Image blocks from the previous paragraph, so a Caption paragraph can attach to the last one. */
  #lastImages: Array<Extract<ContentBlock, { type: "image" }>> = [];
  readonly #placed = new Map<string, { placeholderId: string; part: string; altText: string }>();
  /** Pictures inside list items wait until the list ends, so they do not split it. */
  #deferred: PictureRef[] = [];
  altTextConflicts = 0;

  constructor(ids: DeterministicIdFactory) {
    this.#ids = ids;
  }

  get hasSection(): boolean {
    return this.#current !== undefined;
  }

  get pictures(): PlacedPicture[] {
    return [...this.#placed.values()];
  }

  /** The same picture part used twice shares one placeholder (and so one asset). */
  #placeholderFor(picture: PictureRef): string {
    const existing = this.#placed.get(picture.part);
    if (existing) {
      if (!existing.altText && picture.altText) existing.altText = picture.altText;
      else if (existing.altText && picture.altText && existing.altText !== picture.altText) this.altTextConflicts += 1;
      return existing.placeholderId;
    }
    const placeholderId = `${IMPORTED_IMAGE_PLACEHOLDER_PREFIX}${String(this.#placed.size + 1)}`;
    this.#placed.set(picture.part, { placeholderId, part: picture.part, altText: picture.altText });
    return placeholderId;
  }

  startFront(role: SectionRole, title: string): void {
    this.#start(this.front, "front", role, title);
  }

  startChapter(title: string): void {
    this.#start(this.chapters, "main", "chapter", title || `Chapter ${String(this.chapters.length + 1)}`);
  }

  /** A front section placed before every other front section (content before any title). */
  prependFront(title: string, items: readonly DocxParagraph[]): void {
    const saved = this.#current;
    const savedDeferred = this.#deferred;
    const section = this.#newSection("front", "custom", title);
    this.#current = section;
    this.#openList = undefined;
    this.#lastImages = [];
    this.#deferred = [];
    for (const p of items) this.add(p);
    this.#finish(section);
    this.front.unshift(section);
    this.#current = saved;
    this.#openList = undefined;
    this.#lastImages = [];
    this.#deferred = savedDeferred;
  }

  /** Pictures from a paragraph that was used as a section title. */
  addPictures(p: DocxParagraph): void {
    if (this.#current && p.pictures.length > 0) this.#pushPictures(this.#current, p.pictures);
  }

  add(p: DocxParagraph): void {
    const section = this.#current;
    if (!section) return;

    // A Caption paragraph right after a picture becomes that picture's caption (ADR-0040 §4.6).
    const previousImage = this.#lastImages[this.#lastImages.length - 1];
    this.#lastImages = [];
    if (p.styleClass.kind === "caption" && previousImage && p.pictures.length === 0) {
      previousImage.caption = toInlines(p.runs);
      return;
    }

    if (!p.list) this.#flushDeferred(section);
    if (p.text !== "") this.#addText(section, p);

    if (p.list) {
      this.#deferred.push(...p.pictures);
      return;
    }
    // Pictures follow their paragraph's text, in reading order (floating pictures included).
    this.#pushPictures(section, p.pictures);
  }

  #pushPictures(section: StructuralSection, pictures: readonly PictureRef[]): void {
    for (const picture of pictures) {
      const block: Extract<ContentBlock, { type: "image" }> = {
        type: "image",
        id: this.#ids.nextBlockId(),
        assetId: this.#placeholderFor(picture),
        caption: [],
      };
      section.blocks.push(block);
      this.#lastImages.push(block);
      this.#openList = undefined;
    }
  }

  #flushDeferred(section: StructuralSection): void {
    if (this.#deferred.length === 0) return;
    const pictures = this.#deferred;
    this.#deferred = [];
    this.#pushPictures(section, pictures);
  }

  #addText(section: StructuralSection, p: DocxParagraph): void {
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
    this.#lastImages = [];
  }

  #newSection(kind: StructuralSection["kind"], role: SectionRole, title: string): StructuralSection {
    return { id: this.#ids.nextSectionId(), kind, role, title, blocks: [] };
  }

  #finish(section: StructuralSection): void {
    this.#flushDeferred(section);
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
  // Collapse spaces inside merged runs and across run boundaries; trim the paragraph's outer whitespace.
  for (let index = 0; index < merged.length; index += 1) {
    const run = merged[index]!;
    run.text = run.text.replace(/ {2,}/g, " ");
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
  return [{ type: "text", text: inlinesToPlainText(inlines) }];
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

/** A page number after at least one separator (space, tab, leader dots, dash); never letters glued to a word. */
const PAGE_NUMBER_TAIL = /[\s.…·_\-–—]+([0-9೦-೯]+|[ivxlcdm]+)\s*$/iu;

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
    // The contents page runs through its last entry that names a later paragraph, plus any
    // following lines that still look like entries (text then a page number), such as
    // “Glossary ..... 101” for a section titled differently in the book.
    let last = lastMatch;
    while (last + 1 < entries.length && PAGE_NUMBER_TAIL.test(entries[last + 1]!)) last += 1;
    return { start, end: start + 1 + last + 1, titles };
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

/** Short bold or large lines at the top of a page; never a line that only repeats the title page. */
function handFormattedChapters(
  items: readonly DocxParagraph[],
  repeatsTitlePage: (p: DocxParagraph) => boolean,
): Set<DocxParagraph> {
  const promoted = new Set<DocxParagraph>();
  items.forEach((p, index) => {
    if (p.list || p.inTable || p.styleClass.kind !== "normal") return;
    if (p.text === "" || wordCount(p.text) > 12 || /[.!?।]$/.test(p.text)) return;
    if (!(p.allBold || p.larger) || repeatsTitlePage(p)) return;
    // The very first line counts too (a book that opens straight into its first story).
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
