// SPDX-License-Identifier: Apache-2.0
/**
 * EditorAdapter: Tiptap/ProseMirror JSON ↔ SemanticDocument.
 *
 * Tiptap JSON is editor transport only — never part of the Book Model.
 * The adapter consumes/produces SemanticDocument; Book projection stays
 * behind the desktop semanticDocumentBoundary.
 */
import {
  SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  type SemanticAssetRef,
  type SemanticBlock,
  type SemanticDocument,
  type SemanticDocumentMetadata,
  type SemanticInline,
  type SemanticMatterKind,
} from "@openbook/semantic-document";

/** Minimal Tiptap/ProseMirror JSON shapes used as editor transport. */
export type TipTapMarkJSON = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TipTapNodeJSON = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: TipTapMarkJSON[];
  text?: string;
  content?: TipTapNodeJSON[];
};

export type TipTapDocJSON = {
  type: "doc";
  content?: TipTapNodeJSON[];
};

export type EditorConversionWarning = {
  code: string;
  message: string;
  path: string;
};

export type TipTapToSemanticOptions = {
  metadata: SemanticDocumentMetadata;
  sectionId?: string;
  sectionTitle?: string;
  matter?: SemanticMatterKind;
  role?: string;
  assets?: SemanticAssetRef[];
  /** Injectable ids for deterministic fixtures/tests. */
  createId?: (prefix: string) => string;
};

export type TipTapToSemanticResult = {
  document: SemanticDocument;
  warnings: EditorConversionWarning[];
};

export type SemanticToTipTapResult = {
  doc: TipTapDocJSON;
  warnings: EditorConversionWarning[];
};

const EMPTY_DOC: TipTapDocJSON = { type: "doc", content: [{ type: "paragraph" }] };

function defaultCreateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function warn(
  warnings: EditorConversionWarning[],
  code: string,
  message: string,
  path: string,
): void {
  warnings.push({ code, message, path });
}

/** Mark nesting order when collapsing Tiptap marks into SDM wrappers. */
const MARK_PRIORITY = ["link", "bold", "italic"] as const;

function wrapWithMark(inline: SemanticInline, mark: TipTapMarkJSON): SemanticInline {
  if (mark.type === "bold") {
    return { type: "strong", children: [inline] };
  }
  if (mark.type === "italic") {
    return { type: "emphasis", children: [inline] };
  }
  if (mark.type === "link") {
    const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
    return { type: "link", href, children: [inline] };
  }
  return inline;
}

function tipTapTextToInline(
  node: TipTapNodeJSON,
  warnings: EditorConversionWarning[],
  path: string,
): SemanticInline | null {
  const text = node.text ?? "";
  if (text.length === 0) return null;

  let inline: SemanticInline = { type: "text", text };
  const marks = [...(node.marks ?? [])];

  for (const mark of marks) {
    if (mark.type === "code" || mark.type === "strike") {
      warn(
        warnings,
        "unsupported-mark",
        `Unsupported mark "${mark.type}" stripped; text retained`,
        path,
      );
      continue;
    }
    if (mark.type !== "bold" && mark.type !== "italic" && mark.type !== "link") {
      warn(
        warnings,
        "unsupported-mark",
        `Unsupported mark "${mark.type}" stripped; text retained`,
        path,
      );
      continue;
    }
  }

  const supported = MARK_PRIORITY.filter((type) =>
    marks.some((m) => m.type === type),
  );
  // Apply outer-first so link wraps strong wraps emphasis wraps text.
  for (const type of [...supported].reverse()) {
    const mark = marks.find((m) => m.type === type);
    if (mark) inline = wrapWithMark(inline, mark);
  }
  return inline;
}

function tipTapInlineContentToInlines(
  nodes: TipTapNodeJSON[] | undefined,
  warnings: EditorConversionWarning[],
  path: string,
): SemanticInline[] {
  const out: SemanticInline[] = [];
  for (let i = 0; i < (nodes?.length ?? 0); i += 1) {
    const node = nodes![i]!;
    const childPath = `${path}/content[${i}]`;
    if (node.type === "text") {
      const inline = tipTapTextToInline(node, warnings, childPath);
      if (inline) out.push(inline);
      continue;
    }
    if (node.type === "hardBreak") {
      out.push({ type: "text", text: "\n" });
      continue;
    }
    warn(
      warnings,
      "unsupported-inline",
      `Unsupported inline node "${node.type}" ignored`,
      childPath,
    );
  }
  return out;
}

function firstParagraphInlines(
  nodes: TipTapNodeJSON[] | undefined,
  warnings: EditorConversionWarning[],
  path: string,
): SemanticInline[] {
  for (let i = 0; i < (nodes?.length ?? 0); i += 1) {
    const n = nodes![i]!;
    if (n.type === "bulletList" || n.type === "orderedList") {
      warn(
        warnings,
        "unsupported-nested-list",
        "Nested list ignored; list items use first paragraph only",
        `${path}/content[${i}]`,
      );
    }
  }

  const paragraphs = (nodes ?? []).filter((n) => n.type === "paragraph");
  if (paragraphs.length === 0) {
    return [];
  }
  if (paragraphs.length > 1) {
    warn(
      warnings,
      "list-item-extra-blocks",
      "List item has multiple paragraphs; only the first is mapped",
      path,
    );
  }
  const first = paragraphs[0]!;
  return tipTapInlineContentToInlines(first.content, warnings, `${path}/paragraph`);
}

function flattenBlockquoteInlines(
  nodes: TipTapNodeJSON[] | undefined,
  warnings: EditorConversionWarning[],
  path: string,
): SemanticInline[] {
  const inlines: SemanticInline[] = [];
  for (let i = 0; i < (nodes?.length ?? 0); i += 1) {
    const node = nodes![i]!;
    const childPath = `${path}/content[${i}]`;
    if (node.type === "paragraph") {
      const part = tipTapInlineContentToInlines(node.content, warnings, childPath);
      if (inlines.length > 0 && part.length > 0) {
        inlines.push({ type: "text", text: " " });
      }
      inlines.push(...part);
      continue;
    }
    warn(
      warnings,
      "unsupported-blockquote-child",
      `Unsupported blockquote child "${node.type}" ignored`,
      childPath,
    );
  }
  return inlines;
}

function tipTapBlockToSemantic(
  node: TipTapNodeJSON,
  warnings: EditorConversionWarning[],
  path: string,
  createId: (prefix: string) => string,
): SemanticBlock | null {
  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        id: createId("p"),
        inlines: tipTapInlineContentToInlines(node.content, warnings, path),
      };
    case "heading": {
      const rawLevel = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const level = Math.min(6, Math.max(1, Math.trunc(rawLevel))) as
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6;
      return {
        type: "heading",
        id: createId("h"),
        level,
        inlines: tipTapInlineContentToInlines(node.content, warnings, path),
      };
    }
    case "blockquote":
      return {
        type: "quote",
        id: createId("q"),
        inlines: flattenBlockquoteInlines(node.content, warnings, path),
      };
    case "bulletList":
    case "orderedList": {
      const items: SemanticInline[][] = [];
      for (let i = 0; i < (node.content?.length ?? 0); i += 1) {
        const item = node.content![i]!;
        const itemPath = `${path}/content[${i}]`;
        if (item.type !== "listItem") {
          warn(
            warnings,
            "unsupported-list-child",
            `Expected listItem, got "${item.type}" — ignored`,
            itemPath,
          );
          continue;
        }
        items.push(firstParagraphInlines(item.content, warnings, itemPath));
      }
      return {
        type: "list",
        id: createId("l"),
        ordered: node.type === "orderedList",
        items,
      };
    }
    case "codeBlock": {
      const text = (node.content ?? [])
        .filter((c) => c.type === "text")
        .map((c) => c.text ?? "")
        .join("");
      warn(
        warnings,
        "unsupported-block",
        'codeBlock mapped to paragraph (plain text)',
        path,
      );
      return {
        type: "paragraph",
        id: createId("p"),
        inlines: text ? [{ type: "text", text }] : [],
      };
    }
    case "horizontalRule":
      warn(
        warnings,
        "unsupported-block",
        "horizontalRule ignored",
        path,
      );
      return null;
    default:
      warn(
        warnings,
        "unsupported-block",
        `Unsupported block "${node.type}" ignored`,
        path,
      );
      return null;
  }
}

/**
 * Convert editor transport (Tiptap JSON) into a SemanticDocument.
 * Produces a single section; does not write Book Model fields.
 */
export function tipTapJsonToSemanticDocument(
  tipTap: TipTapDocJSON,
  options: TipTapToSemanticOptions,
): TipTapToSemanticResult {
  const warnings: EditorConversionWarning[] = [];
  const createId = options.createId ?? defaultCreateId;

  if (tipTap.type !== "doc") {
    warn(warnings, "invalid-doc", `Expected type "doc", got "${tipTap.type}"`, "/");
  }

  const blocks: SemanticBlock[] = [];
  for (let i = 0; i < (tipTap.content?.length ?? 0); i += 1) {
    const node = tipTap.content![i]!;
    const block = tipTapBlockToSemantic(node, warnings, `/content[${i}]`, createId);
    if (block) blocks.push(block);
  }

  const document: SemanticDocument = {
    schemaVersion: SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    metadata: { ...options.metadata, authors: [...options.metadata.authors], contributors: [...options.metadata.contributors], subjects: [...options.metadata.subjects] },
    sections: [
      {
        id: options.sectionId ?? createId("sec"),
        matter: options.matter ?? "main",
        role: options.role ?? "chapter",
        title: options.sectionTitle ?? (options.metadata.title || "Chapter 1"),
        blocks,
      },
    ],
    assets: options.assets ? options.assets.map((a) => ({ ...a })) : [],
  };

  return { document, warnings };
}

function collectMarks(
  inline: SemanticInline,
  inherited: TipTapMarkJSON[],
): { text: string; marks: TipTapMarkJSON[] }[] {
  switch (inline.type) {
    case "text":
      return [{ text: inline.text, marks: inherited }];
    case "emphasis":
      return inline.children.flatMap((c) =>
        collectMarks(c, [...inherited, { type: "italic" }]),
      );
    case "strong":
      return inline.children.flatMap((c) =>
        collectMarks(c, [...inherited, { type: "bold" }]),
      );
    case "link":
      return inline.children.flatMap((c) =>
        collectMarks(c, [
          ...inherited,
          { type: "link", attrs: { href: inline.href, target: "_blank" } },
        ]),
      );
    default: {
      const _exhaustive: never = inline;
      return _exhaustive;
    }
  }
}

function dedupeMarks(marks: TipTapMarkJSON[]): TipTapMarkJSON[] {
  const seen = new Set<string>();
  const out: TipTapMarkJSON[] = [];
  for (const mark of marks) {
    const key =
      mark.type === "link"
        ? `link:${typeof mark.attrs?.href === "string" ? mark.attrs.href : ""}`
        : mark.type;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mark);
  }
  return out;
}

function inlinesToTipTapContent(inlines: SemanticInline[]): TipTapNodeJSON[] {
  const nodes: TipTapNodeJSON[] = [];
  for (const inline of inlines) {
    for (const piece of collectMarks(inline, [])) {
      if (piece.text.length === 0) continue;
      const marks = dedupeMarks(piece.marks);
      const node: TipTapNodeJSON = { type: "text", text: piece.text };
      if (marks.length > 0) node.marks = marks;
      nodes.push(node);
    }
  }
  return nodes;
}

function semanticBlockToTipTap(
  block: SemanticBlock,
  warnings: EditorConversionWarning[],
  path: string,
): TipTapNodeJSON | null {
  switch (block.type) {
    case "paragraph":
      return {
        type: "paragraph",
        content: inlinesToTipTapContent(block.inlines),
      };
    case "heading":
      return {
        type: "heading",
        attrs: { level: block.level },
        content: inlinesToTipTapContent(block.inlines),
      };
    case "quote":
      return {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: inlinesToTipTapContent(block.inlines),
          },
        ],
      };
    case "list":
      return {
        type: block.ordered ? "orderedList" : "bulletList",
        content: block.items.map((item) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: inlinesToTipTapContent(item),
            },
          ],
        })),
      };
    case "image": {
      warn(
        warnings,
        "unsupported-sdm-block",
        "image block mapped to paragraph placeholder (no Image extension in first editor)",
        path,
      );
      const caption = inlinesToTipTapContent(block.caption);
      const prefix: TipTapNodeJSON = {
        type: "text",
        text: `[image:${block.assetId}]`,
      };
      return {
        type: "paragraph",
        content: caption.length > 0 ? [prefix, { type: "text", text: " " }, ...caption] : [prefix],
      };
    }
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

/**
 * Convert SemanticDocument content blocks into Tiptap JSON transport.
 * Section metadata stays on the SDM; body blocks are concatenated in order.
 */
export function semanticDocumentToTipTapJson(
  document: SemanticDocument,
): SemanticToTipTapResult {
  const warnings: EditorConversionWarning[] = [];
  const content: TipTapNodeJSON[] = [];

  for (let s = 0; s < document.sections.length; s += 1) {
    const section = document.sections[s]!;
    for (let b = 0; b < section.blocks.length; b += 1) {
      const block = section.blocks[b]!;
      const node = semanticBlockToTipTap(
        block,
        warnings,
        `/sections[${s}]/blocks[${b}]`,
      );
      if (node) content.push(node);
    }
  }

  if (content.length === 0) {
    return { doc: structuredClone(EMPTY_DOC), warnings };
  }

  return { doc: { type: "doc", content }, warnings };
}

/**
 * Normalize Tiptap JSON for structural equality (ignore empty content arrays).
 */
export function normalizeTipTapDoc(doc: TipTapDocJSON): TipTapDocJSON {
  const normalizeNode = (node: TipTapNodeJSON): TipTapNodeJSON => {
    const next: TipTapNodeJSON = { type: node.type };
    if (node.attrs && Object.keys(node.attrs).length > 0) {
      next.attrs = { ...node.attrs };
    }
    if (node.text !== undefined) next.text = node.text;
    if (node.marks && node.marks.length > 0) {
      next.marks = node.marks.map((m) => {
        const mark: TipTapMarkJSON = { type: m.type };
        if (m.attrs) {
          // Round-trip compares href only for links.
          if (m.type === "link" && typeof m.attrs.href === "string") {
            mark.attrs = { href: m.attrs.href };
          } else if (m.type !== "link") {
            mark.attrs = { ...m.attrs };
          }
        }
        return mark;
      });
    }
    if (node.content && node.content.length > 0) {
      next.content = node.content.map(normalizeNode);
    }
    return next;
  };

  return {
    type: "doc",
    content: (doc.content ?? []).map(normalizeNode),
  };
}
