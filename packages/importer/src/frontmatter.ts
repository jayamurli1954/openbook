// SPDX-License-Identifier: Apache-2.0
import type { BookMetadata } from "@openbook/book-model";
import type { ImportIssue } from "./types.js";

export interface FrontmatterParseResult {
  metadata: Partial<BookMetadata>;
  body: string;
  issues: ImportIssue[];
}

/**
 * Extracts optional YAML frontmatter delimited by `---` fences.
 * Supports only the Slice 2 key set with a minimal deterministic parser
 * (no external YAML dependency — ADR-0015 lists markdown-it only).
 */
export function extractFrontmatter(source: string): FrontmatterParseResult {
  const issues: ImportIssue[] = [];
  const normalized = source.replace(/^\uFEFF/, "");
  if (!normalized.startsWith("---")) {
    return { metadata: {}, body: normalized, issues };
  }

  const end = normalized.indexOf("\n---", 3);
  if (end === -1) {
    issues.push({
      code: "MALFORMED_FRONTMATTER",
      severity: "warning",
      message: "Opening frontmatter delimiter found without a closing --- fence.",
    });
    return { metadata: {}, body: normalized, issues };
  }

  const yamlBlock = normalized.slice(3, end).replace(/^\r?\n/, "");
  let body = normalized.slice(end + 4);
  if (body.startsWith("\r\n")) body = body.slice(2);
  else if (body.startsWith("\n")) body = body.slice(1);

  const metadata: Partial<BookMetadata> = {};
  try {
    Object.assign(metadata, parseSimpleFrontmatterYaml(yamlBlock));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    issues.push({
      code: "MALFORMED_FRONTMATTER",
      severity: "warning",
      message: `Frontmatter YAML could not be fully parsed: ${message}`,
      snippet: yamlBlock.slice(0, 200),
    });
  }

  return { metadata, body, issues };
}

function parseSimpleFrontmatterYaml(yaml: string): Partial<BookMetadata> {
  const result: Partial<BookMetadata> = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      i += 1;
      continue;
    }

    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(trimmed);
    if (!match) {
      throw new Error(`Unsupported frontmatter line: ${trimmed}`);
    }
    const key = match[1]!;
    let value = match[2]!;

    if (value === "" || value === "|" || value === ">") {
      // Multi-line / empty — treat following indented lines as scalar (simple).
      const parts: string[] = value === "|" || value === ">" ? [] : [];
      i += 1;
      while (i < lines.length) {
        const next = lines[i] ?? "";
        if (/^\s+\S/.test(next) || next.trim() === "") {
          if (next.trim()) parts.push(next.trim());
          i += 1;
          continue;
        }
        break;
      }
      value = parts.join(" ");
      assignFrontmatterKey(result, key, value);
      continue;
    }

    if (value.startsWith("[") && !value.endsWith("]")) {
      // Multi-line array start — not supported; fail softly for caller warning.
      throw new Error(`Unsupported multi-line array for key "${key}"`);
    }

    assignFrontmatterKey(result, key, value);
    i += 1;
  }

  return result;
}

function assignFrontmatterKey(
  target: Partial<BookMetadata>,
  key: string,
  rawValue: string,
): void {
  const value = unquote(rawValue.trim());
  switch (key) {
    case "title":
      target.title = value;
      break;
    case "subtitle":
      target.subtitle = value;
      break;
    case "authors":
    case "author":
      target.authors = parseStringList(value);
      break;
    case "language":
    case "lang":
      target.language = value;
      break;
    case "publisher":
      target.publisher = value;
      break;
    case "identifier":
    case "id":
      target.identifier = value;
      break;
    case "publishedAt":
    case "date":
      target.publishedAt = value;
      break;
    case "rights":
      target.rights = value;
      break;
    case "copyright":
      target.copyright = value;
      break;
    case "description":
      target.description = value;
      break;
    default:
      // Unknown keys ignored (info-level could be added by caller if desired).
      break;
  }
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseStringList(value: string): string[] {
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((part) => unquote(part.trim()))
      .filter((part) => part.length > 0);
  }
  if (!value) return [];
  return [value];
}
