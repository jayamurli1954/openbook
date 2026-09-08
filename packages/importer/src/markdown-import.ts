// SPDX-License-Identifier: Apache-2.0
import type {
  Book,
  ContentBlock,
  InlineSpan,
  StructuralSection,
} from "@openbook/book-model";
import {
  BOOK_MODEL_SCHEMA_VERSION,
  validateBook,
} from "@openbook/book-model";
import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { DeterministicIdFactory } from "./ids.js";
import { sanitizeImportHref } from "./links.js";
import {
  buildMetadata,
  countWordsFromInlines,
  emptyStats,
} from "./metadata.js";
import { extractFrontmatter } from "./frontmatter.js";
import type {
  ImportIssue,
  ImportOptions,
  ImportResult,
  ImportSource,
} from "./types.js";

type SplitStrategy = NonNullable<ImportOptions["splitStrategy"]>;

function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: false,
    typographer: false,
  });
  // Accept all schemes into link tokens; Slice 2 sanitizes dangerous targets.
  md.validateLink = () => true;
  return md;
}

export function importMarkdown(
  source: ImportSource,
  options: ImportOptions | undefined,
  ids: DeterministicIdFactory,
): ImportResult {
  const issues: ImportIssue[] = [];
  const { metadata: fmMeta, body, issues: fmIssues } = extractFrontmatter(
    source.content,
  );
  issues.push(...fmIssues);

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
    frontmatter: fmMeta,
    issues,
  });

  const md = createMarkdownIt();
  const tokens = md.parse(body, {});
  const splitStrategy: SplitStrategy = options?.splitStrategy ?? "heading-1";
  const sections = partitionTokens(tokens, splitStrategy, ids, issues);

  if (sections.length === 0) {
    sections.push({
      id: ids.nextSectionId(),
      kind: "main",
      role: "chapter",
      title: metadata.title || "Chapter 1",
      blocks: [
        {
          type: "paragraph",
          id: ids.nextBlockId(),
          inlines: [{ type: "text", text: "" }],
        },
      ],
    });
  }

  const book = assembleBook(metadata, sections);
  return finalizeBookResult(book, issues);
}

function partitionTokens(
  tokens: Token[],
  strategy: SplitStrategy,
  ids: DeterministicIdFactory,
  issues: ImportIssue[],
): StructuralSection[] {
  if (strategy === "single-chapter") {
    const blocks = mapTokensToBlocks(tokens, ids, issues);
    return [
      {
        id: ids.nextSectionId(),
        kind: "main",
        role: "chapter",
        title: "Chapter 1",
        blocks: blocks.length
          ? blocks
          : [
              {
                type: "paragraph",
                id: ids.nextBlockId(),
                inlines: [{ type: "text", text: "" }],
              },
            ],
      },
    ];
  }

  const splitLevel = strategy === "heading-2" ? 2 : 1;
  const sections: StructuralSection[] = [];
  let currentTitle = "Chapter 1";
  let pending: Token[] = [];
  let sectionStarted = false;

  const flush = (): void => {
    const blocks = mapTokensToBlocks(pending, ids, issues);
    sections.push({
      id: ids.nextSectionId(),
      kind: "main",
      role: "chapter",
      title: currentTitle,
      blocks:
        blocks.length > 0
          ? blocks
          : [
              {
                type: "paragraph",
                id: ids.nextBlockId(),
                inlines: [{ type: "text", text: "" }],
              },
            ],
    });
    pending = [];
  };

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i]!;
    if (token.type === "heading_open") {
      const level = Number(token.tag.slice(1));
      if (level === splitLevel) {
        if (sectionStarted || pending.length > 0) {
          flush();
        }
        const inline = tokens[i + 1];
        const titleInlines =
          inline?.type === "inline"
            ? mapInlineChildren(inline.children ?? [], issues)
            : [{ type: "text" as const, text: "" }];
        currentTitle =
          inlinesToPlainText(titleInlines) ||
          `Chapter ${String(sections.length + 1)}`;
        sectionStarted = true;
        i += 3;
        continue;
      }
    }

    pending.push(token);
    i += 1;
  }

  flush();
  return sections;
}

function mapTokensToBlocks(
  tokens: Token[],
  ids: DeterministicIdFactory,
  issues: ImportIssue[],
): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.type === "paragraph_open") {
      const inline = tokens[i + 1];
      const inlines =
        inline?.type === "inline"
          ? mapInlineChildren(inline.children ?? [], issues)
          : [{ type: "text" as const, text: "" }];
      blocks.push({
        type: "paragraph",
        id: ids.nextBlockId(),
        inlines: inlines.length ? inlines : [{ type: "text", text: "" }],
      });
      i += 3;
      continue;
    }

    if (token.type === "heading_open") {
      const level = Math.min(6, Math.max(1, Number(token.tag.slice(1)))) as
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6;
      const inline = tokens[i + 1];
      const inlines =
        inline?.type === "inline"
          ? mapInlineChildren(inline.children ?? [], issues)
          : [{ type: "text" as const, text: "" }];
      blocks.push({
        type: "heading",
        id: ids.nextBlockId(),
        level,
        inlines: inlines.length ? inlines : [{ type: "text", text: "" }],
      });
      i += 3;
      continue;
    }

    if (token.type === "blockquote_open") {
      const inner: Token[] = [];
      let depth = 1;
      i += 1;
      while (i < tokens.length) {
        const t = tokens[i]!;
        if (t.type === "blockquote_open") depth += 1;
        if (t.type === "blockquote_close") {
          depth -= 1;
          if (depth === 0) {
            i += 1;
            break;
          }
        }
        inner.push(t);
        i += 1;
      }
      const quoteInlines = collectParagraphInlines(inner, issues);
      blocks.push({
        type: "quote",
        id: ids.nextBlockId(),
        inlines: quoteInlines.length
          ? quoteInlines
          : [{ type: "text", text: "" }],
      });
      continue;
    }

    if (token.type === "bullet_list_open" || token.type === "ordered_list_open") {
      const ordered = token.type === "ordered_list_open";
      const items: InlineSpan[][] = [];
      let depth = 1;
      i += 1;
      while (i < tokens.length) {
        const t = tokens[i]!;
        if (t.type === "bullet_list_open" || t.type === "ordered_list_open") {
          depth += 1;
          i += 1;
          continue;
        }
        if (t.type === "bullet_list_close" || t.type === "ordered_list_close") {
          depth -= 1;
          i += 1;
          if (depth === 0) break;
          continue;
        }
        if (t.type === "list_item_open" && depth === 1) {
          const itemTokens: Token[] = [];
          let itemDepth = 1;
          i += 1;
          while (i < tokens.length) {
            const it = tokens[i]!;
            if (it.type === "list_item_open") itemDepth += 1;
            if (it.type === "list_item_close") {
              itemDepth -= 1;
              if (itemDepth === 0) {
                i += 1;
                break;
              }
            }
            itemTokens.push(it);
            i += 1;
          }
          items.push(collectParagraphInlines(itemTokens, issues));
          continue;
        }
        i += 1;
      }
      blocks.push({
        type: "list",
        id: ids.nextBlockId(),
        ordered,
        items: items.length ? items : [[{ type: "text", text: "" }]],
      });
      continue;
    }

    if (
      token.type === "fence" ||
      token.type === "code_block" ||
      token.type === "hr" ||
      token.type === "html_block"
    ) {
      issues.push({
        code: "UNMAPPED_TOKEN",
        severity: "warning",
        message: `Unmapped Markdown token "${token.type}" was omitted.`,
      });
      i += 1;
      continue;
    }

    i += 1;
  }

  return blocks;
}

function collectParagraphInlines(
  tokens: Token[],
  issues: ImportIssue[],
): InlineSpan[] {
  const parts: InlineSpan[] = [];
  for (const token of tokens) {
    if (token.type === "inline") {
      parts.push(...mapInlineChildren(token.children ?? [], issues));
    }
  }
  return parts.length ? parts : [{ type: "text", text: "" }];
}

function mapInlineChildren(
  children: Token[],
  issues: ImportIssue[],
): InlineSpan[] {
  const result: InlineSpan[] = [];
  let i = 0;

  while (i < children.length) {
    const token = children[i]!;

    if (token.type === "text") {
      result.push({ type: "text", text: token.content });
      i += 1;
      continue;
    }

    if (token.type === "code_inline") {
      result.push({ type: "text", text: token.content });
      i += 1;
      continue;
    }

    if (token.type === "softbreak" || token.type === "hardbreak") {
      result.push({ type: "text", text: " " });
      i += 1;
      continue;
    }

    if (token.type === "em_open") {
      const { inner, next } = takeUntil(children, i + 1, "em_close");
      result.push({
        type: "emphasis",
        children: mapInlineChildren(inner, issues),
      });
      i = next;
      continue;
    }

    if (token.type === "strong_open") {
      const { inner, next } = takeUntil(children, i + 1, "strong_close");
      result.push({
        type: "strong",
        children: mapInlineChildren(inner, issues),
      });
      i = next;
      continue;
    }

    if (token.type === "link_open") {
      const hrefAttr = token.attrs?.find((a) => a[0] === "href")?.[1] ?? "";
      const { inner, next } = takeUntil(children, i + 1, "link_close");
      const childrenSpans = mapInlineChildren(inner, issues);
      const safe = sanitizeImportHref(hrefAttr, issues);
      if (safe) {
        result.push({ type: "link", href: safe, children: childrenSpans });
      } else {
        result.push(...childrenSpans);
      }
      i = next;
      continue;
    }

    if (token.type === "image") {
      issues.push({
        code: "UNMAPPED_TOKEN",
        severity: "warning",
        message:
          "Inline image omitted (asset pipeline is out of Slice 2 scope).",
      });
      const alt = token.content?.trim();
      if (alt) result.push({ type: "text", text: alt });
      i += 1;
      continue;
    }

    issues.push({
      code: "UNMAPPED_TOKEN",
      severity: "warning",
      message: `Unmapped inline token "${token.type}" was omitted.`,
    });
    i += 1;
  }

  return result;
}

function takeUntil(
  children: Token[],
  start: number,
  closeType: string,
): { inner: Token[]; next: number } {
  const inner: Token[] = [];
  let i = start;
  let depth = 1;
  const openType = closeType.replace("_close", "_open");
  while (i < children.length) {
    const t = children[i]!;
    if (t.type === openType) depth += 1;
    if (t.type === closeType) {
      depth -= 1;
      if (depth === 0) {
        return { inner, next: i + 1 };
      }
    }
    inner.push(t);
    i += 1;
  }
  return { inner, next: i };
}

function inlinesToPlainText(inlines: InlineSpan[]): string {
  return inlines
    .map((span) => {
      switch (span.type) {
        case "text":
          return span.text;
        case "emphasis":
        case "strong":
        case "link":
          return inlinesToPlainText(span.children);
        default:
          return "";
      }
    })
    .join("");
}

function assembleBook(
  metadata: Book["metadata"],
  chapters: StructuralSection[],
): Book {
  return {
    schemaVersion: BOOK_MODEL_SCHEMA_VERSION,
    metadata,
    frontMatter: [],
    chapters,
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
}

export function finalizeBookResult(
  book: Book,
  issues: ImportIssue[],
): ImportResult {
  const domainIssues = validateBook(book);
  const errors = domainIssues.filter((issue) => issue.severity === "error");
  for (const issue of domainIssues) {
    if (issue.severity === "error") {
      issues.push({
        code: `DOMAIN_${issue.code}`.toUpperCase().replace(/-/g, "_"),
        severity: "error",
        message: issue.message,
      });
    } else if (issue.severity === "warning") {
      issues.push({
        code: `DOMAIN_${issue.code}`.toUpperCase().replace(/-/g, "_"),
        severity: "warning",
        message: issue.message,
      });
    }
  }

  let blockCount = 0;
  let wordCount = 0;
  for (const section of [
    ...book.frontMatter,
    ...book.chapters,
    ...book.backMatter,
  ]) {
    blockCount += section.blocks.length;
    for (const block of section.blocks) {
      if (block.type === "list") {
        for (const item of block.items) {
          wordCount += countWordsFromInlines(item);
        }
      } else if (block.type === "image") {
        wordCount += countWordsFromInlines(block.caption);
      } else {
        wordCount += countWordsFromInlines(block.inlines);
      }
    }
  }

  const stats = {
    sectionCount:
      book.frontMatter.length + book.chapters.length + book.backMatter.length,
    blockCount,
    wordCount,
  };

  if (errors.length > 0) {
    return { success: false, issues, stats };
  }

  return { success: true, book, issues, stats };
}
