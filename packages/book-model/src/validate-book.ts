import type { Book, DomainIssue, StructuralSection } from "./types.js";

const EPUB_AUTHORING_LEAK_KEYS = [
  "opf",
  "manifest",
  "spine",
  "ncx",
  "navDoc",
  "packageDocument",
] as const;

export function validateBook(book: Book): DomainIssue[] {
  const issues: DomainIssue[] = [];

  if (book.schemaVersion !== 1) {
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
        noteId(block.id, `${sectionPath}.blocks[${String(blockIndex)}].id`);
      }
    }
  };

  walkSections(book.frontMatter, "frontMatter");
  walkSections(book.chapters, "chapters");
  walkSections(book.backMatter, "backMatter");

  for (const [index, asset] of book.assets.entries()) {
    noteId(asset.id, `assets[${String(index)}].id`);
  }

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
