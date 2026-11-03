// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0041 Slice 3 — lesson-box editing rules, kept free of TipTap so they can be tested.
 *
 * The Write editor's openbookCallout commands use these; the Book follows through the usual
 * editor → Book path.
 */
import type { Book } from "@openbook/book-model";
import type { TipTapNodeJSON } from "../../domain/editorAdapter.js";

/** Title for the very first lesson box in a book. */
export const DEFAULT_LESSON_BOX_TITLE = "What We Learned";

/**
 * Title a new box starts with: the title of the last titled box in reading order, or the
 * default when the book has none yet (maintainer decision, 2026-11-02: "Last used title").
 */
export function lastLessonBoxTitle(book: Book): string {
  let last: string | undefined;
  for (const section of [...book.frontMatter, ...book.chapters, ...book.backMatter]) {
    for (const block of section.blocks) {
      if (block.type === "callout" && block.title.trim()) last = block.title;
    }
  }
  return last ?? DEFAULT_LESSON_BOX_TITLE;
}

/**
 * Turns a lesson-box node back into a paragraph without losing anything: the title becomes
 * bold text followed by ": " at the start (ADR-0041 §2.3). An untitled box becomes a plain paragraph.
 */
export function lessonBoxToParagraph(node: TipTapNodeJSON): TipTapNodeJSON {
  const title = typeof node.attrs?.title === "string" ? node.attrs.title.trim() : "";
  const content = structuredClone(node.content ?? []);
  if (!title) return { type: "paragraph", content };
  return {
    type: "paragraph",
    content: [{ type: "text", text: `${title}: `, marks: [{ type: "bold" }] }, ...content],
  };
}
