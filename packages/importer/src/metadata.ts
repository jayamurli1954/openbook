// SPDX-License-Identifier: Apache-2.0
import type { BookMetadata } from "@openbook/book-model";
import type { ImportIssue, ImportOptions, ImportSource } from "./types.js";

export function emptyStats() {
  return { sectionCount: 0, blockCount: 0, wordCount: 0 };
}

export function filenameTitleFallback(filename?: string): string | undefined {
  if (!filename) return undefined;
  const base = filename.replace(/^.*[\\/]/, "").replace(/\.[^.]+$/, "");
  const trimmed = base.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * publishedAt rule (ADR-0015): preserve if explicitly provided; otherwise "".
 * Never invent artificial dates.
 */
export function resolvePublishedAt(
  candidates: Array<string | undefined>,
): string {
  for (const value of candidates) {
    if (value !== undefined && value !== null) {
      const trimmed = String(value).trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
      // Explicit empty string from a source that set the key → keep "".
      if (value === "") {
        return "";
      }
    }
  }
  return "";
}

export function buildMetadata(args: {
  source: ImportSource;
  options?: ImportOptions;
  frontmatter: Partial<BookMetadata>;
  issues: ImportIssue[];
}): BookMetadata {
  const { source, options, frontmatter, issues } = args;
  const overrides = options?.metadataOverrides ?? {};
  const defaultLanguage = options?.defaultLanguage ?? "en";

  const title =
    overrides.title?.trim() ||
    frontmatter.title?.trim() ||
    filenameTitleFallback(source.filename) ||
    "Untitled Document";

  if (
    !overrides.title?.trim() &&
    !frontmatter.title?.trim() &&
    !filenameTitleFallback(source.filename)
  ) {
    issues.push({
      code: "DEFAULT_TITLE",
      severity: "info",
      message: 'Applied default title "Untitled Document".',
    });
  }

  const language =
    overrides.language?.trim() ||
    frontmatter.language?.trim() ||
    defaultLanguage;

  if (!overrides.language?.trim() && !frontmatter.language?.trim()) {
    issues.push({
      code: "DEFAULT_LANGUAGE",
      severity: "info",
      message: `Applied default language "${defaultLanguage}".`,
    });
  }

  const publishedAt = resolvePublishedAt([
    overrides.publishedAt,
    frontmatter.publishedAt,
  ]);

  return {
    title,
    subtitle: overrides.subtitle ?? frontmatter.subtitle ?? "",
    authors: overrides.authors ?? frontmatter.authors ?? [],
    contributors: overrides.contributors ?? frontmatter.contributors ?? [],
    language,
    identifier: overrides.identifier ?? frontmatter.identifier ?? "",
    publisher: overrides.publisher ?? frontmatter.publisher ?? "",
    publishedAt,
    copyright: overrides.copyright ?? frontmatter.copyright ?? "",
    description: overrides.description ?? frontmatter.description ?? "",
    subjects: overrides.subjects ?? frontmatter.subjects ?? [],
    rights: overrides.rights ?? frontmatter.rights ?? "",
  };
}

export function countWordsFromInlines(
  inlines: ReadonlyArray<{ type: string; text?: string; children?: unknown }>,
): number {
  let total = 0;
  for (const span of inlines) {
    if (span.type === "text" && typeof span.text === "string") {
      total += span.text.trim().split(/\s+/).filter(Boolean).length;
    } else if (Array.isArray(span.children)) {
      total += countWordsFromInlines(
        span.children as ReadonlyArray<{
          type: string;
          text?: string;
          children?: unknown;
        }>,
      );
    }
  }
  return total;
}
