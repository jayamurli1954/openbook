// SPDX-License-Identifier: Apache-2.0
/**
 * In-memory editor book/chapter session.
 *
 * Path: Editor UI → Tiptap JSON → EditorAdapter → SemanticDocument (session)
 *        → desktop semanticDocumentBoundary → Book (canonical).
 *
 * Does not persist, does not write Book Model internals directly, and does not
 * invent a second document model.
 */
import {
  SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  type SemanticDocument,
  type SemanticDocumentMetadata,
  type SemanticInline,
  type SemanticSection,
} from "@openbook/semantic-document";
import {
  semanticDocumentToTipTapJson,
  tipTapJsonToSemanticDocument,
  type EditorConversionWarning,
  type TipTapDocJSON,
} from "./editorAdapter.js";
import {
  projectSemanticDocumentToBook,
  type SemanticDocumentProjectionResult,
} from "./semanticDocumentBoundary.js";

export type EditorBookSession = {
  document: SemanticDocument;
  selectedChapterId: string;
};

export type ChapterSummary = {
  id: string;
  title: string;
  /** Zero-based index among main-matter chapters (document section order). */
  index: number;
};

export type SessionOk = {
  ok: true;
  session: EditorBookSession;
  warnings: EditorConversionWarning[];
};

export type SessionErr = {
  ok: false;
  code: string;
  error: string;
  session: EditorBookSession;
  warnings: EditorConversionWarning[];
};

export type SessionResult = SessionOk | SessionErr;

export type CreateEditorBookSessionInput = {
  metadata: SemanticDocumentMetadata;
  /** Initial main chapters; at least one is required for an authoring session. */
  chapters: Array<{
    id?: string;
    title: string;
    tipTap?: TipTapDocJSON;
  }>;
  createId?: (prefix: string) => string;
};

function defaultCreateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function emptyParagraph(createId: (prefix: string) => string) {
  return {
    type: "paragraph" as const,
    id: createId("p"),
    inlines: [] as SemanticInline[],
  };
}

/** Main-matter chapters in deterministic document section order. */
export function listMainChapters(document: SemanticDocument): ChapterSummary[] {
  const out: ChapterSummary[] = [];
  for (const section of document.sections) {
    if (section.matter !== "main") continue;
    out.push({
      id: section.id,
      title: section.title,
      index: out.length,
    });
  }
  return out;
}

function requireMainChapter(
  document: SemanticDocument,
  chapterId: string,
): SemanticSection | undefined {
  return document.sections.find((s) => s.id === chapterId && s.matter === "main");
}

function cloneDocument(document: SemanticDocument): SemanticDocument {
  return structuredClone(document);
}

/**
 * Start an in-memory multi-chapter authoring session.
 * TipTap bodies (when provided) are converted through EditorAdapter only.
 */
export function createEditorBookSession(
  input: CreateEditorBookSessionInput,
): SessionResult {
  const createId = input.createId ?? defaultCreateId;
  const warnings: EditorConversionWarning[] = [];

  if (input.chapters.length === 0) {
    const emptyDoc: SemanticDocument = {
      schemaVersion: SEMANTIC_DOCUMENT_SCHEMA_VERSION,
      metadata: structuredClone(input.metadata),
      sections: [],
      assets: [],
    };
    return {
      ok: false,
      code: "no-chapters",
      error:
        "Authoring session requires at least one chapter (Book Model allows empty chapters[], but the editor session does not).",
      session: { document: emptyDoc, selectedChapterId: "" },
      warnings,
    };
  }

  const sections: SemanticSection[] = [];
  for (const chapter of input.chapters) {
    const sectionId = chapter.id ?? createId("sec");
    if (chapter.tipTap) {
      const converted = tipTapJsonToSemanticDocument(chapter.tipTap, {
        metadata: input.metadata,
        sectionId,
        sectionTitle: chapter.title,
        matter: "main",
        role: "chapter",
        createId,
      });
      warnings.push(...converted.warnings);
      const section = converted.document.sections[0]!;
      sections.push(section);
    } else {
      sections.push({
        id: sectionId,
        matter: "main",
        role: "chapter",
        title: chapter.title,
        blocks: [emptyParagraph(createId)],
      });
    }
  }

  const document: SemanticDocument = {
    schemaVersion: SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    metadata: structuredClone(input.metadata),
    sections,
    assets: [],
  };

  return {
    ok: true,
    session: {
      document,
      selectedChapterId: sections[0]!.id,
    },
    warnings,
  };
}

export function listSessionChapters(session: EditorBookSession): ChapterSummary[] {
  return listMainChapters(session.document);
}

/**
 * Persist TipTap transport for the selected chapter into the session SDM.
 */
export function applyTipTapToSelectedChapter(
  session: EditorBookSession,
  tipTap: TipTapDocJSON,
  createId: (prefix: string) => string = defaultCreateId,
): SessionResult {
  const chapter = requireMainChapter(session.document, session.selectedChapterId);
  if (!chapter) {
    return {
      ok: false,
      code: "chapter-not-found",
      error: `Selected chapter ${session.selectedChapterId} not found`,
      session,
      warnings: [],
    };
  }

  const converted = tipTapJsonToSemanticDocument(tipTap, {
    metadata: session.document.metadata,
    sectionId: chapter.id,
    sectionTitle: chapter.title,
    matter: chapter.matter,
    role: chapter.role,
    assets: session.document.assets,
    createId,
  });

  const nextBlocks = converted.document.sections[0]!.blocks;
  const document = cloneDocument(session.document);
  const idx = document.sections.findIndex((s) => s.id === chapter.id);
  document.sections[idx] = {
    ...document.sections[idx]!,
    blocks: nextBlocks,
  };

  return {
    ok: true,
    session: { document, selectedChapterId: session.selectedChapterId },
    warnings: converted.warnings,
  };
}

/** TipTap JSON for the currently selected chapter only (EditorAdapter). */
export function selectedChapterToTipTap(
  session: EditorBookSession,
): { doc: TipTapDocJSON; warnings: EditorConversionWarning[] } {
  const chapter = requireMainChapter(session.document, session.selectedChapterId);
  if (!chapter) {
    return {
      doc: { type: "doc", content: [{ type: "paragraph" }] },
      warnings: [
        {
          code: "chapter-not-found",
          message: `Selected chapter ${session.selectedChapterId} not found`,
          path: "/selectedChapterId",
        },
      ],
    };
  }

  const slice: SemanticDocument = {
    ...session.document,
    sections: [chapter],
  };
  return semanticDocumentToTipTapJson(slice);
}

export function selectChapter(
  session: EditorBookSession,
  chapterId: string,
): SessionResult {
  if (!requireMainChapter(session.document, chapterId)) {
    return {
      ok: false,
      code: "chapter-not-found",
      error: `Chapter ${chapterId} not found`,
      session,
      warnings: [],
    };
  }
  return {
    ok: true,
    session: { ...session, selectedChapterId: chapterId },
    warnings: [],
  };
}

/**
 * Create a new main-matter chapter after the last existing main chapter
 * (before any trailing back-matter). Deterministic append ordering.
 */
export function createChapter(
  session: EditorBookSession,
  title: string,
  createId: (prefix: string) => string = defaultCreateId,
): SessionResult {
  const document = cloneDocument(session.document);
  const newSection: SemanticSection = {
    id: createId("sec"),
    matter: "main",
    role: "chapter",
    title: title.trim() || "Untitled chapter",
    blocks: [emptyParagraph(createId)],
  };

  let insertAt = document.sections.length;
  for (let i = document.sections.length - 1; i >= 0; i -= 1) {
    if (document.sections[i]!.matter === "main") {
      insertAt = i + 1;
      break;
    }
  }
  // If no main chapters yet, place after last front-matter (or at 0).
  if (listMainChapters(document).length === 0) {
    insertAt = 0;
    for (let i = 0; i < document.sections.length; i += 1) {
      if (document.sections[i]!.matter === "front") insertAt = i + 1;
      if (document.sections[i]!.matter === "back") {
        insertAt = i;
        break;
      }
    }
  }

  document.sections.splice(insertAt, 0, newSection);

  return {
    ok: true,
    session: { document, selectedChapterId: newSection.id },
    warnings: [],
  };
}

export function renameChapter(
  session: EditorBookSession,
  chapterId: string,
  title: string,
): SessionResult {
  if (!requireMainChapter(session.document, chapterId)) {
    return {
      ok: false,
      code: "chapter-not-found",
      error: `Chapter ${chapterId} not found`,
      session,
      warnings: [],
    };
  }

  const document = cloneDocument(session.document);
  const idx = document.sections.findIndex((s) => s.id === chapterId);
  document.sections[idx] = {
    ...document.sections[idx]!,
    title: title.trim() || "Untitled chapter",
  };

  return {
    ok: true,
    session: { document, selectedChapterId: session.selectedChapterId },
    warnings: [],
  };
}

/**
 * Delete a main-matter chapter.
 * Safe behavior: refuse when it would leave zero main chapters — Book Model
 * allows empty chapters[], but the in-memory editor session always keeps at
 * least one editable chapter.
 */
export function deleteChapter(
  session: EditorBookSession,
  chapterId: string,
): SessionResult {
  const chapters = listMainChapters(session.document);
  if (!chapters.some((c) => c.id === chapterId)) {
    return {
      ok: false,
      code: "chapter-not-found",
      error: `Chapter ${chapterId} not found`,
      session,
      warnings: [],
    };
  }

  if (chapters.length <= 1) {
    return {
      ok: false,
      code: "last-chapter",
      error:
        "Cannot delete the last chapter; the editor session requires at least one main chapter.",
      session,
      warnings: [],
    };
  }

  const document = cloneDocument(session.document);
  const removeIndex = document.sections.findIndex((s) => s.id === chapterId);
  document.sections.splice(removeIndex, 1);

  let selectedChapterId = session.selectedChapterId;
  if (selectedChapterId === chapterId) {
    const remaining = listMainChapters(document);
    const deletedSummary = chapters.find((c) => c.id === chapterId)!;
    const fallback =
      remaining[Math.max(0, deletedSummary.index - 1)] ?? remaining[0]!;
    selectedChapterId = fallback.id;
  }

  return {
    ok: true,
    session: { document, selectedChapterId },
    warnings: [],
  };
}

/** Project the full in-memory SDM through the existing desktop boundary. */
export function projectSessionToBook(
  session: EditorBookSession,
): SemanticDocumentProjectionResult {
  return projectSemanticDocumentToBook(session.document);
}
