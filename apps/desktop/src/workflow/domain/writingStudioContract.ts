// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 1 — Writing Studio contract.
 *
 * Capability matrix + pure Book Model helpers for toolbar commands, word count,
 * and document search. React/TipTap/host wiring remain outside this module.
 * Formatting chrome / UI delivery are later slices.
 */
import type {
  Book,
  ContentBlock,
  InlineSpan,
  StructuralSection,
} from "@openbook/book-model";

export type WritingStudioCapabilityId =
  | "chapter-section-editor"
  | "headings"
  | "paragraphs"
  | "emphasis"
  | "lists"
  | "quotes"
  | "links"
  | "basic-tables"
  | "image-insertion"
  | "undo-redo"
  | "autosave"
  | "word-count"
  | "chapter-navigation"
  | "document-search";

export type WritingStudioCapabilityStatus =
  | "in-scope"
  | "reuse-existing"
  | "deferred";

export interface WritingStudioCapability {
  readonly id: WritingStudioCapabilityId;
  readonly status: WritingStudioCapabilityStatus;
  readonly note?: string;
}

/**
 * ROADMAP §3.3 capability matrix under ADR-0034.
 * Tables are deferred until a Book Model / SDM extension ADR.
 */
export const WRITING_STUDIO_CAPABILITIES: readonly WritingStudioCapability[] = [
  { id: "chapter-section-editor", status: "in-scope" },
  { id: "headings", status: "in-scope" },
  { id: "paragraphs", status: "in-scope" },
  { id: "emphasis", status: "in-scope" },
  { id: "lists", status: "in-scope" },
  { id: "quotes", status: "in-scope" },
  { id: "links", status: "in-scope" },
  {
    id: "basic-tables",
    status: "deferred",
    note: "Requires Book Model + SDM ContentBlock extension ADR",
  },
  { id: "image-insertion", status: "in-scope" },
  { id: "undo-redo", status: "in-scope" },
  {
    id: "autosave",
    status: "reuse-existing",
    note: "ADR-0031 PackageAutosavePort — no second autosave protocol",
  },
  { id: "word-count", status: "in-scope" },
  { id: "chapter-navigation", status: "in-scope" },
  { id: "document-search", status: "in-scope" },
] as const;

/** Toolbar commands that map to Book Model–supported blocks/inlines (no tables). */
export type WritingStudioToolbarCommand =
  | "toggle-bold"
  | "toggle-italic"
  | "toggle-heading-1"
  | "toggle-heading-2"
  | "toggle-heading-3"
  | "toggle-heading-4"
  | "toggle-heading-5"
  | "toggle-heading-6"
  | "toggle-bullet-list"
  | "toggle-ordered-list"
  | "toggle-blockquote"
  | "set-link"
  | "unset-link"
  | "undo"
  | "redo";

export const WRITING_STUDIO_TOOLBAR_COMMANDS: readonly WritingStudioToolbarCommand[] =
  [
    "toggle-bold",
    "toggle-italic",
    "toggle-heading-1",
    "toggle-heading-2",
    "toggle-heading-3",
    "toggle-heading-4",
    "toggle-heading-5",
    "toggle-heading-6",
    "toggle-bullet-list",
    "toggle-ordered-list",
    "toggle-blockquote",
    "set-link",
    "unset-link",
    "undo",
    "redo",
  ] as const;

export interface WritingStudioWordCountSnapshot {
  readonly bookWordCount: number;
  readonly sectionWordCount: number;
  readonly sectionId: string | null;
}

export type WritingStudioSearchQuery =
  | { readonly ok: true; readonly query: string }
  | {
      readonly ok: false;
      readonly code: "EMPTY_QUERY";
      readonly message: string;
    };

export type WritingStudioMatter = "front" | "main" | "back";

export interface WritingStudioSearchHit {
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly matter: WritingStudioMatter;
  readonly blockId: string;
  readonly excerpt: string;
  readonly matchOffset: number;
}

export interface WritingStudioToolbarCommandArgs {
  readonly href?: string;
}

/** Shape-only port — TipTap/editor execution is a later slice. */
export interface WritingStudioToolbarPort {
  executeCommand(
    command: WritingStudioToolbarCommand,
    args?: WritingStudioToolbarCommandArgs,
  ): void | Promise<void>;
}

/** Shape-only port — counts must come from Book Model text, never TipTap JSON. */
export interface WritingStudioWordCountPort {
  getWordCounts(sectionId?: string): WritingStudioWordCountSnapshot;
}

/** Shape-only port — fail-closed empty query; Book/section text only. */
export interface WritingStudioSearchPort {
  search(rawQuery: string): readonly WritingStudioSearchHit[];
}

export function isWritingStudioToolbarCommand(
  value: string,
): value is WritingStudioToolbarCommand {
  return (WRITING_STUDIO_TOOLBAR_COMMANDS as readonly string[]).includes(value);
}

export function getWritingStudioCapability(
  id: WritingStudioCapabilityId,
): WritingStudioCapability | undefined {
  return WRITING_STUDIO_CAPABILITIES.find((c) => c.id === id);
}

export function countWordsFromInlineSpans(
  inlines: readonly InlineSpan[],
): number {
  let total = 0;
  for (const span of inlines) {
    if (span.type === "text") {
      total += span.text.trim().split(/\s+/).filter(Boolean).length;
    } else if (span.type === "emphasis" || span.type === "strong") {
      total += countWordsFromInlineSpans(span.children);
    } else if (span.type === "link") {
      total += countWordsFromInlineSpans(span.children);
    }
  }
  return total;
}

export function countWordsFromContentBlock(block: ContentBlock): number {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return countWordsFromInlineSpans(block.inlines);
    case "list":
      return block.items.reduce(
        (sum, item) => sum + countWordsFromInlineSpans(item),
        0,
      );
    case "image":
      return countWordsFromInlineSpans(block.caption);
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

export function countWordsFromSection(section: StructuralSection): number {
  return section.blocks.reduce(
    (sum, block) => sum + countWordsFromContentBlock(block),
    0,
  );
}

export function countWordsFromBook(book: Book): number {
  const all = [
    ...book.frontMatter,
    ...book.chapters,
    ...book.backMatter,
  ];
  return all.reduce((sum, section) => sum + countWordsFromSection(section), 0);
}

/**
 * Build a word-count snapshot from a Book Model book.
 * TipTap JSON must never be passed here.
 */
export function wordCountSnapshotForBook(
  book: Book,
  sectionId?: string | null,
): WritingStudioWordCountSnapshot {
  const bookWordCount = countWordsFromBook(book);
  if (!sectionId) {
    return { bookWordCount, sectionWordCount: 0, sectionId: null };
  }
  const section = findSection(book, sectionId);
  return {
    bookWordCount,
    sectionWordCount: section ? countWordsFromSection(section) : 0,
    sectionId: section ? sectionId : null,
  };
}

/**
 * Normalize a document-search query. Empty / whitespace-only fails closed.
 */
export function normalizeSearchQuery(raw: string): WritingStudioSearchQuery {
  const query = typeof raw === "string" ? raw.trim() : "";
  if (query.length === 0) {
    return {
      ok: false,
      code: "EMPTY_QUERY",
      message: "Search query must not be empty.",
    };
  }
  return { ok: true, query };
}

/**
 * Search Book Model section text for a validated query.
 * Matching is case-insensitive on the plain-text projection; never TipTap JSON.
 */
export function searchBookText(
  book: Book,
  validated: Extract<WritingStudioSearchQuery, { ok: true }>,
): readonly WritingStudioSearchHit[] {
  const needle = validated.query.toLocaleLowerCase();
  const hits: WritingStudioSearchHit[] = [];

  const scan = (
    sections: readonly StructuralSection[],
    matter: WritingStudioMatter,
  ): void => {
    for (const section of sections) {
      for (const block of section.blocks) {
        const plain = plainTextFromContentBlock(block);
        const haystack = plain.toLocaleLowerCase();
        const matchOffset = haystack.indexOf(needle);
        if (matchOffset < 0) continue;
        hits.push({
          sectionId: section.id,
          sectionTitle: section.title,
          matter,
          blockId: block.id,
          excerpt: excerptAround(plain, matchOffset, validated.query.length),
          matchOffset,
        });
      }
    }
  };

  scan(book.frontMatter, "front");
  scan(book.chapters, "main");
  scan(book.backMatter, "back");
  return hits;
}

export function plainTextFromInlineSpans(inlines: readonly InlineSpan[]): string {
  const parts: string[] = [];
  for (const span of inlines) {
    if (span.type === "text") {
      parts.push(span.text);
    } else if (
      span.type === "emphasis" ||
      span.type === "strong" ||
      span.type === "link"
    ) {
      parts.push(plainTextFromInlineSpans(span.children));
    }
  }
  return parts.join("");
}

export function plainTextFromContentBlock(block: ContentBlock): string {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return plainTextFromInlineSpans(block.inlines);
    case "list":
      return block.items
        .map((item) => plainTextFromInlineSpans(item))
        .join(" ");
    case "image":
      return plainTextFromInlineSpans(block.caption);
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

function findSection(
  book: Book,
  sectionId: string,
): StructuralSection | undefined {
  return (
    book.frontMatter.find((s) => s.id === sectionId) ??
    book.chapters.find((s) => s.id === sectionId) ??
    book.backMatter.find((s) => s.id === sectionId)
  );
}

function excerptAround(
  plain: string,
  matchOffset: number,
  matchLength: number,
  radius = 24,
): string {
  const start = Math.max(0, matchOffset - radius);
  const end = Math.min(plain.length, matchOffset + matchLength + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < plain.length ? "…" : "";
  return `${prefix}${plain.slice(start, end)}${suffix}`;
}
