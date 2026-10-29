// SPDX-License-Identifier: Apache-2.0
import { BOOK_MODEL_SCHEMA_VERSION } from "./types.js";
import type { Book, ContentBlock, DomainIssue, InlineSpan, StructuralSection } from "./types.js";

// The authoring Book must stay format-neutral. None of these EPUB packaging,
// container, or navigation keys may appear on a Book object; publishing engines
// derive them as projections instead (see docs/adr/0006 and ADR-0004).
const EPUB_AUTHORING_LEAK_KEYS = [
  "opf",
  "manifest",
  "spine",
  "ncx",
  "nav",
  "navDoc",
  "container",
  "packageDocument",
] as const;

export function validateBook(book: Book): DomainIssue[] {
  const issues: DomainIssue[] = [];

  if (book.schemaVersion !== BOOK_MODEL_SCHEMA_VERSION) {
    issues.push({
      code: "schema-version",
      severity: "error",
      message: `Unsupported schemaVersion ${String(book.schemaVersion)}.`,
      path: "schemaVersion",
    });
  }

  if (!book.metadata.title.trim()) {
    issues.push({
      code: "missing-title",
      severity: "warning",
      message: "Book title is empty.",
      path: "metadata.title",
    });
  }

  if (!book.metadata.language.trim()) {
    issues.push({
      code: "missing-language",
      severity: "error",
      message: "Language is required (BCP-47 tag such as en or kn).",
      path: "metadata.language",
    });
  }

  const seen = new Map<string, string>();
  const noteId = (id: string, path: string): void => {
    const previous = seen.get(id);
    if (previous) {
      issues.push({
        code: "duplicate-id",
        severity: "error",
        message: `Duplicate id ${id} (${previous} and ${path}).`,
        path,
      });
    } else {
      seen.set(id, path);
    }
  };

  const walkSections = (sections: readonly StructuralSection[], prefix: string): void => {
    for (const [index, section] of sections.entries()) {
      const sectionPath = `${prefix}[${String(index)}]`;
      noteId(section.id, `${sectionPath}.id`);
      for (const [blockIndex, block] of section.blocks.entries()) {
        const blockPath = `${sectionPath}.blocks[${String(blockIndex)}]`;
        noteId(block.id, `${blockPath}.id`);
        if (block.type === "callout") issues.push(...validateCallout(block, blockPath));
      }
    }
  };

  walkSections(book.frontMatter, "frontMatter");
  walkSections(book.chapters, "chapters");
  walkSections(book.backMatter, "backMatter");

  for (const [index, asset] of book.assets.entries()) {
    noteId(asset.id, `assets[${String(index)}].id`);
  }

  issues.push(...validateCover(book));

  const record = book as unknown as Record<string, unknown>;
  for (const key of EPUB_AUTHORING_LEAK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      issues.push({
        code: "epub-authoring-leak",
        severity: "error",
        message: `Authoring Book must not contain EPUB package key "${key}".`,
        path: key,
      });
    }
  }

  return issues;
}

// ADR-0038 §2.1: a cover, when set, is an existing JPEG or PNG image asset
// with non-empty alt text.
const COVER_MEDIA_TYPES = ["image/jpeg", "image/png"] as const;

function validateCover(book: Book): DomainIssue[] {
  const coverAssetId = book.publishing.coverAssetId;
  if (coverAssetId === undefined) {
    return [];
  }
  const path = "publishing.coverAssetId";
  const asset = book.assets.find((candidate) => candidate.id === coverAssetId);
  if (!asset) {
    return [
      {
        code: "cover-asset-missing",
        severity: "error",
        message: `Cover asset ${String(coverAssetId)} is not on this Book.`,
        path,
      },
    ];
  }
  const issues: DomainIssue[] = [];
  if (
    asset.kind !== "image" ||
    !(COVER_MEDIA_TYPES as readonly string[]).includes(asset.mediaType)
  ) {
    issues.push({
      code: "cover-asset-not-image",
      severity: "error",
      message: `Cover asset ${asset.id} must be a JPEG or PNG image.`,
      path,
    });
  }
  if (typeof asset.altText !== "string" || !asset.altText.trim()) {
    issues.push({
      code: "cover-alt-text-missing",
      severity: "error",
      message: `Cover asset ${asset.id} needs alt text.`,
      path,
    });
  }
  return issues;
}

// ADR-0041 §2.1: a callout has a plain-text title, a body of inline spans, and some visible text.
function validateCallout(
  block: Extract<ContentBlock, { type: "callout" }>,
  path: string,
): DomainIssue[] {
  if (typeof block.title !== "string") {
    return [{ code: "callout-title-not-text", severity: "error", message: "A lesson box title must be text.", path: `${path}.title` }];
  }
  if (!Array.isArray(block.inlines)) {
    return [{ code: "callout-inlines-not-array", severity: "error", message: "A lesson box needs text.", path: `${path}.inlines` }];
  }
  if (!block.title.trim() && !hasInlineText(block.inlines)) {
    return [{ code: "empty-callout", severity: "error", message: "A lesson box has no title and no text.", path }];
  }
  return [];
}

function hasInlineText(inlines: readonly InlineSpan[]): boolean {
  return inlines.some((span) =>
    span.type === "text" ? span.text.trim().length > 0 : hasInlineText(span.children ?? []),
  );
}
