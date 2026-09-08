// SPDX-License-Identifier: Apache-2.0
import { BOOK_MODEL_SCHEMA_VERSION } from "@openbook/book-model";
import { DeterministicIdFactory } from "./ids.js";
import { buildMetadata, emptyStats } from "./metadata.js";
import { finalizeBookResult } from "./markdown-import.js";
import type {
  ImportIssue,
  ImportOptions,
  ImportResult,
  ImportSource,
} from "./types.js";

/**
 * Plain-text import: double-newline paragraph segmentation into one chapter.
 */
export function importPlainText(
  source: ImportSource,
  options: ImportOptions | undefined,
  ids: DeterministicIdFactory,
): ImportResult {
  const issues: ImportIssue[] = [];

  if (!source.content.trim()) {
    return {
      success: false,
      issues: [
        {
          code: "EMPTY_SOURCE",
          severity: "fatal",
          message: "Import source content is empty.",
        },
      ],
      stats: emptyStats(),
    };
  }

  const metadata = buildMetadata({
    source,
    options,
    frontmatter: {},
    issues,
  });

  const paragraphs = source.content
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  const blocks = (paragraphs.length ? paragraphs : [""]).map((text) => ({
    type: "paragraph" as const,
    id: ids.nextBlockId(),
    inlines: [{ type: "text" as const, text: text.replace(/\n/g, " ") }],
  }));

  const book = {
    schemaVersion: BOOK_MODEL_SCHEMA_VERSION,
    metadata,
    frontMatter: [],
    chapters: [
      {
        id: ids.nextSectionId(),
        kind: "main" as const,
        role: "chapter",
        title: metadata.title || "Chapter 1",
        blocks,
      },
    ],
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
    publishing: { intendedOutputs: [] },
  };

  return finalizeBookResult(book, issues);
}
