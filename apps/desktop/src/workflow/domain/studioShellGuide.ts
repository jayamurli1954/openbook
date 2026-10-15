// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 1 — Guide panel content.
 *
 * Per-step help: an introduction, a checklist evaluated against the Book,
 * tips, and questions. All copy is plain language and lives here so it can
 * be reviewed, tested, and translated later.
 */
import {
  countDetailsRecommendedMissing,
  isDetailsRequiredFilled,
  type StudioShellSnapshot,
  type StudioStepId,
} from "./studioShellContract.js";

export interface StudioGuideChecklistItem {
  readonly id: string;
  readonly text: string;
  readonly optional?: boolean;
  /** Absent when OpenBook cannot tell; the item then shows as not done. */
  readonly isDone?: (snapshot: StudioShellSnapshot) => boolean;
}

export interface StudioGuideQuestion {
  readonly question: string;
  readonly answer: string;
}

export interface StudioGuide {
  readonly intro: string;
  readonly checklist: readonly StudioGuideChecklistItem[];
  readonly tips: readonly string[];
  readonly questions: readonly StudioGuideQuestion[];
}

export interface StudioGuideChecklistResult {
  readonly id: string;
  readonly text: string;
  readonly optional: boolean;
  readonly done: boolean;
}

const filled = (value: string): boolean => value.trim().length > 0;

export const STUDIO_GUIDE: Readonly<Record<StudioStepId, StudioGuide>> = {
  write: {
    intro:
      "Write your chapters here. Once your book is saved to a folder, OpenBook saves as you type.",
    checklist: [
      {
        id: "first-words",
        text: "Write the opening of your first chapter",
        isDone: (s) => s.bookWordCount > 0,
      },
      {
        id: "name-chapters",
        text: "Give each chapter a title in the outline",
        isDone: (s) => s.book.chapters.every((chapter) => filled(chapter.title)),
      },
      { id: "finish-draft", text: "Keep going until the draft is complete" },
    ],
    tips: [
      "Draft first, polish later. Getting words down matters more than getting them perfect.",
      "Chapters come from the outline on the left. Use Heading only for sections inside a chapter.",
      "Focus hides everything except your page.",
    ],
    questions: [
      {
        question: "How do I add a chapter?",
        answer: "Use Add chapter in the outline. You can change the order later in Structure.",
      },
      {
        question: "Where is my work saved?",
        answer:
          "In your book’s folder on this computer. After you save the first time, OpenBook saves automatically a few seconds after you stop typing.",
      },
      {
        question: "I don’t know what to write next",
        answer:
          "Write the scene you are most excited about, even if it comes later in the book. You can move it in Structure.",
      },
    ],
  },
  structure: {
    intro: "Decide the order of everything in your book.",
    checklist: [
      {
        id: "chapters-in-order",
        text: "Put your chapters in reading order",
        isDone: (s) => s.book.chapters.length > 0,
      },
      {
        id: "titles",
        text: "Make sure every part has a title",
        isDone: (s) =>
          [...s.book.frontMatter, ...s.book.chapters, ...s.book.backMatter].every((section) =>
            filled(section.title),
          ),
      },
      {
        id: "front-matter",
        text: "Add a title page or preface",
        optional: true,
        isDone: (s) => s.book.frontMatter.length > 0,
      },
      {
        id: "back-matter",
        text: "Add acknowledgements or an about-the-author page",
        optional: true,
        isDone: (s) => s.book.backMatter.length > 0,
      },
    ],
    tips: [
      "Front matter comes before chapter 1: a title page, a dedication, a preface.",
      "Back matter comes after the last chapter: acknowledgements, notes, about the author.",
      "Your ebook’s table of contents follows this order, so you never edit it by hand.",
    ],
    questions: [
      {
        question: "What is front matter?",
        answer: "The pages before chapter 1, such as the title page, a dedication, or a preface.",
      },
      {
        question: "Do I need to write a table of contents?",
        answer: "No. OpenBook builds the table of contents for your ebook from this order.",
      },
    ],
  },
  design: {
    intro: "Choose how your book looks. Your words stay the same.",
    checklist: [
      {
        id: "pick-look",
        text: "Pick a look for your book",
        isDone: (s) => s.book.theme.id !== "default",
      },
      {
        id: "typefaces",
        text: "Choose the typefaces",
        optional: true,
        isDone: (s) => filled(s.book.typography.bodyFontFamily),
      },
    ],
    tips: [
      "Most novels and memoirs use a serif typeface. Guides often use a sans-serif one.",
      "Writing in Kannada? Choose the Kannada look so every letter displays correctly.",
    ],
    questions: [
      {
        question: "Will the ebook look exactly like this?",
        answer:
          "Ebook readers let people change the text size and font. The PDF keeps your exact choices.",
      },
      {
        question: "Can I change the design later?",
        answer: "Yes, any time. Changing the design never changes your words.",
      },
    ],
  },
  details: {
    intro: "Fill in what stores and readers see about your book.",
    checklist: [
      {
        id: "title-language",
        text: "Title and language",
        isDone: (s) => isDetailsRequiredFilled(s.book),
      },
      {
        id: "author",
        text: "Author name",
        isDone: (s) => s.book.metadata.authors.some(filled),
      },
      {
        id: "description",
        text: "A short description",
        isDone: (s) => filled(s.book.metadata.description),
      },
      {
        id: "subjects",
        text: "A few subjects",
        optional: true,
        isDone: (s) => s.book.metadata.subjects.some(filled),
      },
    ],
    tips: [
      "Write the description like a back cover: two or three sentences about what the reader gets.",
      "Subjects help stores place your book. Three to five is plenty.",
    ],
    questions: [
      {
        question: "Do I need an ISBN?",
        answer: "Not to make your book. Some stores give you one for free. You can add it here later.",
      },
      {
        question: "Why does the language matter?",
        answer:
          "It tells reading devices which language the book is in, so text and line breaks display correctly.",
      },
    ],
  },
  cover: {
    intro: "Adding a cover image is coming soon. You can still publish without one.",
    checklist: [
      {
        id: "prepare-image",
        text: "Get a cover image ready: JPEG or PNG, portrait, at least 1600 × 2560 pixels",
      },
    ],
    tips: [
      "Check that the title is easy to read when the cover is shown small, as stores do.",
    ],
    questions: [
      {
        question: "Can I publish without a cover?",
        answer: "Yes. Stores will show a plain cover until you add one.",
      },
      {
        question: "Where can I get a cover?",
        answer:
          "A cover designer, or an image you have the rights to use. Designing covers inside OpenBook comes later.",
      },
    ],
  },
  publish: {
    intro: "Check your book, then export the files you need.",
    checklist: [
      {
        id: "check-book",
        text: "Press Check my book",
        isDone: (s) => s.validation !== null,
      },
      {
        id: "fix-errors",
        text: "Fix anything the check says must be fixed",
        isDone: (s) => s.validation !== null && s.validation.errors === 0,
      },
      { id: "export", text: "Export your ebook" },
    ],
    tips: [
      "OpenBook checks your book before it exports, so you don’t send a broken file to a store.",
      "Changed something? Check again, then export again.",
    ],
    questions: [
      {
        question: "Which file do I need?",
        answer: "EPUB for ebook stores, PDF for a printable copy, and HTML for a website.",
      },
      {
        question: "Can I export with a warning?",
        answer: "Yes. Warnings are advice. Errors must be fixed before you can export.",
      },
    ],
  },
};

export function getStudioGuide(id: StudioStepId): StudioGuide {
  return STUDIO_GUIDE[id];
}

export function evaluateStudioGuideChecklist(
  id: StudioStepId,
  snapshot: StudioShellSnapshot,
): StudioGuideChecklistResult[] {
  return STUDIO_GUIDE[id].checklist.map((item) => ({
    id: item.id,
    text: item.text,
    optional: item.optional === true,
    done: item.isDone ? item.isDone(snapshot) : false,
  }));
}

/** Internal and engineering terms that must never appear in author-facing copy. */
const INTERNAL_TERMS = [
  "schema",
  "slice",
  "gate",
  "adr",
  "tiptap",
  "prosemirror",
  "sdm",
  "semantic document",
  "sqlite",
  "json",
  "coordinator",
  "book model",
  "booksession",
  "epubcheck",
  "typst",
  "undefined",
  "null",
  "exception",
] as const;

/** Return the internal terms found in `text` (whole words, case-insensitive). */
export function findInternalTerms(text: string): string[] {
  const lower = text.toLowerCase();
  return INTERNAL_TERMS.filter((term) =>
    new RegExp(`(^|[^a-z])${term.replace(/ /g, "\\s+")}([^a-z]|$)`).test(lower),
  );
}

/** Every author-facing string in the guide, for copy checks. */
export function allStudioGuideCopy(): string[] {
  return Object.values(STUDIO_GUIDE).flatMap((guide) => [
    guide.intro,
    ...guide.checklist.map((item) => item.text),
    ...guide.tips,
    ...guide.questions.flatMap((entry) => [entry.question, entry.answer]),
  ]);
}

/** Recommended Details fields still missing; exported for the Details step. */
export { countDetailsRecommendedMissing };
