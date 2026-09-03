// SPDX-License-Identifier: Apache-2.0
import { createId } from "./ids.js";
import type {
  Book,
  ContentBlock,
  CreateBookInput,
  MatterKind,
  SectionRole,
  StructuralSection,
} from "./types.js";

export type { CreateBookInput };

function emptyParagraph(): ContentBlock {
  return {
    type: "paragraph",
    id: createId(),
    inlines: [{ type: "text", text: "" }],
  };
}

export function createSection(
  kind: MatterKind,
  title: string,
  role: SectionRole | string = kind === "main" ? "chapter" : "custom",
): StructuralSection {
  return {
    id: createId(),
    kind,
    role,
    title,
    blocks: [emptyParagraph()],
  };
}

export function createBook(input: CreateBookInput = {}): Book {
  const withOpeningChapter = input.withOpeningChapter !== false;
  return {
    schemaVersion: 1,
    metadata: {
      title: input.title ?? "",
      subtitle: "",
      authors: [...(input.authors ?? [])],
      contributors: [],
      language: input.language ?? "",
      identifier: "",
      publisher: "",
      publishedAt: "",
      copyright: "",
      description: "",
      subjects: [],
      rights: "",
    },
    frontMatter: [],
    chapters: withOpeningChapter ? [createSection("main", "Chapter 1", "chapter")] : [],
    backMatter: [],
    assets: [],
    styles: { paragraphStyles: [], characterStyles: [] },
    theme: { id: "default", name: "Default" },
    typography: {
      bodyFontFamily: "",
      headingFontFamily: "",
      bodySizePt: 11,
      lineHeight: 1.4,
    },
    publishing: {
      // Format-neutral by default: do not implicitly preselect EPUB. Callers
      // choose projections explicitly (see ADR-0006 and ADR-0004).
      intendedOutputs: [...(input.intendedOutputs ?? [])],
    },
  };
}

export function addChapter(book: Book, title: string): Book {
  return {
    ...book,
    chapters: [...book.chapters, createSection("main", title, "chapter")],
  };
}
