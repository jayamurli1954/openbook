// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 Slice 4 — find paragraphs that start with a label ("What We Learned:") and turn
 * them all into lesson boxes. Kept free of TipTap and React so it can be tested.
 *
 * The Write panel shows what `findLabelledParagraphs` finds, then hands what
 * `convertLabelledParagraphs` builds to `BookSession.replaceSectionsBlocks` as one change.
 */
import type { Book, ContentBlock, InlineSpan, StructuralSection } from "@openbook/book-model";

export interface LabelledParagraph {
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly blockId: string;
  /** The start of the text after the label, for showing where the match is. */
  readonly excerpt: string;
}

export interface LessonBoxConversion {
  readonly count: number;
  readonly changes: readonly { readonly sectionId: string; readonly blocks: ContentBlock[] }[];
}

const EXCERPT_LENGTH = 60;

/** The box title for a label: the label as typed, without its trailing colon (maintainer, 2026-11-02). */
export function lessonBoxTitleFromLabel(label: string): string {
  return label.trim().replace(/[:：]+$/u, "").trim();
}

export function findLabelledParagraphs(book: Book, label: string): LabelledParagraph[] {
  const found: LabelledParagraph[] = [];
  forEachLabelled(book, label, (section, block, rest) => {
    found.push({
      sectionId: section.id,
      sectionTitle: section.title,
      blockId: block.id,
      excerpt: excerpt(plainText(rest)),
    });
  });
  return found;
}

export function convertLabelledParagraphs(book: Book, label: string): LessonBoxConversion {
  const title = lessonBoxTitleFromLabel(label);
  const replaced = new Map<string, Map<string, ContentBlock>>();
  let count = 0;
  forEachLabelled(book, label, (section, block, rest) => {
    let blocks = replaced.get(section.id);
    if (!blocks) replaced.set(section.id, (blocks = new Map()));
    blocks.set(block.id, { type: "callout", id: block.id, title, inlines: rest });
    count += 1;
  });
  const changes: { sectionId: string; blocks: ContentBlock[] }[] = [];
  for (const section of allSections(book)) {
    const blocks = replaced.get(section.id);
    if (!blocks) continue;
    changes.push({
      sectionId: section.id,
      blocks: section.blocks.map((block) => blocks.get(block.id) ?? structuredClone(block)),
    });
  }
  return { count, changes };
}

function allSections(book: Book): StructuralSection[] {
  return [...book.frontMatter, ...book.chapters, ...book.backMatter];
}

function forEachLabelled(
  book: Book,
  label: string,
  visit: (section: StructuralSection, block: ContentBlock, rest: InlineSpan[]) => void,
): void {
  const core = comparable(lessonBoxTitleFromLabel(label));
  if (!core) return;
  for (const section of allSections(book)) {
    for (const block of section.blocks) {
      if (block.type !== "paragraph") continue;
      const cut = labelEnd(plainText(block.inlines), core);
      if (cut !== undefined) visit(section, block, dropLeadingText(block.inlines, cut));
    }
  }
}

/** Case, curly quotes, and Unicode form don't matter when comparing. */
function comparable(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[‘’‚‛′]/gu, "'")
    .replace(/[“”„‟″]/gu, '"')
    .toLocaleLowerCase();
}

/**
 * Where the text after the label (and any colon and spaces) begins, or undefined when the
 * paragraph doesn't start with the label. The label must end at a word boundary.
 */
function labelEnd(text: string, core: string): number | undefined {
  const start = text.length - text.trimStart().length;
  // Lowercasing and normalizing can change lengths, so try each prefix length near the label's.
  const longest = Math.min(text.length - start, core.length * 2 + 4);
  for (let length = 1; length <= longest; length += 1) {
    if (comparable(text.slice(start, start + length)) !== core) continue;
    let end = start + length;
    if (/^[\p{L}\p{N}\p{M}]/u.test(text.slice(end))) return undefined;
    end += /^[ \t ]*[:：]?/u.exec(text.slice(end))![0].length;
    end += /^\s*/u.exec(text.slice(end))![0].length;
    return end;
  }
  return undefined;
}

function plainText(inlines: readonly InlineSpan[]): string {
  return inlines.map((span) => (span.type === "text" ? span.text : plainText(span.children))).join("");
}

/** Removes the first `count` characters of text, keeping the formatting of what remains. */
function dropLeadingText(inlines: readonly InlineSpan[], count: number): InlineSpan[] {
  let remaining = count;
  const walk = (spans: readonly InlineSpan[]): InlineSpan[] => {
    const kept: InlineSpan[] = [];
    for (const span of spans) {
      if (remaining === 0) {
        kept.push(structuredClone(span));
        continue;
      }
      if (span.type === "text") {
        const cut = Math.min(remaining, span.text.length);
        remaining -= cut;
        if (cut < span.text.length) kept.push({ type: "text", text: span.text.slice(cut) });
        continue;
      }
      const children = walk(span.children);
      if (children.length > 0) kept.push({ ...span, children });
    }
    return kept;
  };
  return walk(inlines);
}

function excerpt(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > EXCERPT_LENGTH ? `${trimmed.slice(0, EXCERPT_LENGTH).trimEnd()}…` : trimmed;
}
