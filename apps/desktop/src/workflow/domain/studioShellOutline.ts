// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 3 — the book outline.
 *
 * One tree of front matter, chapters, and back matter with word counts.
 * It replaces the separate chapter list, matter rail list, and reading-order
 * preview as the way to move around the book. Pure; no React.
 */
import type { Book, MatterKind } from "@openbook/book-model";

export interface StudioOutlineItem {
  readonly id: string;
  readonly title: string;
  readonly words: number;
  /** Compact count for the outline, e.g. "980" or "1.2k". */
  readonly wordsLabel: string;
}

export interface StudioOutlineGroup {
  readonly matter: MatterKind;
  readonly label: string;
  readonly items: readonly StudioOutlineItem[];
}

const GROUPS: readonly { matter: MatterKind; label: string; key: "frontMatter" | "chapters" | "backMatter" }[] = [
  { matter: "front", label: "Front matter", key: "frontMatter" },
  { matter: "main", label: "Chapters", key: "chapters" },
  { matter: "back", label: "Back matter", key: "backMatter" },
];

export function formatOutlineWords(words: number): string {
  if (words < 1000) return String(Math.max(0, words));
  const thousands = words / 1000;
  return `${thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10}k`;
}

export function buildStudioOutline(
  book: Book,
  wordsFor: (sectionId: string) => number,
): StudioOutlineGroup[] {
  return GROUPS.map((group) => ({
    matter: group.matter,
    label: group.label,
    items: book[group.key].map((section, index) => {
      const words = wordsFor(section.id);
      const title = section.title.trim() || "Untitled";
      return {
        id: section.id,
        title: group.matter === "main" ? `${index + 1} · ${title}` : title,
        words,
        wordsLabel: formatOutlineWords(words),
      };
    }),
  }));
}

/** True when the section is a chapter (main matter), which the outline can rename or delete. */
export function isOutlineChapter(book: Book, sectionId: string | null): boolean {
  return sectionId !== null && book.chapters.some((chapter) => chapter.id === sectionId);
}

/**
 * Title of any section (front matter, chapter, or back matter) for author-facing
 * notes such as "Selected “Publisher’s Note”". Never returns an internal id.
 */
export function outlineSectionTitle(book: Book, sectionId: string | null): string {
  if (sectionId !== null) {
    for (const group of GROUPS) {
      const section = book[group.key].find((candidate) => candidate.id === sectionId);
      const title = section?.title.trim();
      if (title) return title;
    }
  }
  return "Untitled section";
}
