// SPDX-License-Identifier: Apache-2.0
/**
 * Desktop domain/service boundary for the Semantic Document Model.
 *
 * Path: Desktop application → SemanticDocument → Book (canonical)
 * In-memory only — no persistence, editor UI, or publishing engines.
 */
import {
  validateBook,
  type Book,
  type DomainIssue,
} from "@openbook/book-model";
import {
  SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  semanticDocumentToBook,
  validateSemanticDocument,
  type SemanticDocument,
  type SemanticIssue,
} from "@openbook/semantic-document";

export type CreateSemanticDocumentInput = {
  title: string;
  language: string;
  authors?: string[];
  chapterTitle?: string;
  openingParagraph?: string;
};

export type SemanticDocumentProjectionOk = {
  ok: true;
  document: SemanticDocument;
  book: Book;
  semanticIssues: SemanticIssue[];
  bookIssues: DomainIssue[];
};

export type SemanticDocumentProjectionErr = {
  ok: false;
  stage: "load" | "validate-document" | "map" | "validate-book";
  error: string;
  semanticIssues?: SemanticIssue[];
  bookIssues?: DomainIssue[];
};

export type SemanticDocumentProjectionResult =
  | SemanticDocumentProjectionOk
  | SemanticDocumentProjectionErr;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function emptyMetadata(
  overrides: Partial<SemanticDocument["metadata"]>,
): SemanticDocument["metadata"] {
  return {
    title: "",
    subtitle: "",
    authors: [],
    contributors: [],
    language: "",
    identifier: "",
    publisher: "",
    publishedAt: "",
    copyright: "",
    description: "",
    subjects: [],
    rights: "",
    ...overrides,
  };
}

/**
 * Create an in-memory SemanticDocument for the desktop domain boundary.
 * Not an editor — builds a minimal structured manuscript contract object.
 */
export function createSemanticDocument(
  input: CreateSemanticDocumentInput,
): SemanticDocument {
  const chapterTitle = input.chapterTitle ?? "Chapter 1";
  const opening =
    input.openingParagraph ?? "In-memory semantic document created by the desktop boundary.";

  return {
    schemaVersion: SEMANTIC_DOCUMENT_SCHEMA_VERSION,
    metadata: emptyMetadata({
      title: input.title,
      authors: [...(input.authors ?? [])],
      language: input.language,
    }),
    sections: [
      {
        id: newId("sec"),
        matter: "main",
        role: "chapter",
        title: chapterTitle,
        blocks: [
          {
            type: "paragraph",
            id: newId("p"),
            inlines: [{ type: "text", text: opening }],
          },
        ],
      },
    ],
    assets: [],
  };
}

/**
 * Load a SemanticDocument from an in-memory JSON value (e.g. fixture).
 * Does not read the filesystem or SQLite.
 */
export function loadSemanticDocument(raw: unknown): SemanticDocument {
  if (raw === null || typeof raw !== "object") {
    throw new TypeError("SemanticDocument load requires a JSON object");
  }
  const doc = raw as SemanticDocument;
  if (typeof doc.schemaVersion !== "number" || !doc.metadata || !Array.isArray(doc.sections)) {
    throw new TypeError("SemanticDocument load: missing required fields");
  }
  return doc;
}

/**
 * Validate SDM → map to Book → validate Book.
 * Book Model remains the canonical publishing source of truth.
 */
export function projectSemanticDocumentToBook(
  document: SemanticDocument,
): SemanticDocumentProjectionResult {
  const semanticIssues = validateSemanticDocument(document);
  const semanticErrors = semanticIssues.filter((i) => i.severity === "error");
  if (semanticErrors.length > 0) {
    return {
      ok: false,
      stage: "validate-document",
      error: `SemanticDocument has ${semanticErrors.length} error(s)`,
      semanticIssues,
    };
  }

  let book: Book;
  try {
    book = semanticDocumentToBook(document);
  } catch (err) {
    return {
      ok: false,
      stage: "map",
      error: err instanceof Error ? err.message : String(err),
      semanticIssues,
    };
  }

  const bookIssues = validateBook(book);
  const bookErrors = bookIssues.filter((i) => i.severity === "error");
  if (bookErrors.length > 0) {
    return {
      ok: false,
      stage: "validate-book",
      error: `Book has ${bookErrors.length} domain error(s)`,
      semanticIssues,
      bookIssues,
    };
  }

  return {
    ok: true,
    document,
    book,
    semanticIssues,
    bookIssues,
  };
}

/**
 * Convenience: load raw JSON and project through the full desktop boundary path.
 */
export function loadAndProjectSemanticDocument(
  raw: unknown,
): SemanticDocumentProjectionResult {
  try {
    const document = loadSemanticDocument(raw);
    return projectSemanticDocumentToBook(document);
  } catch (err) {
    return {
      ok: false,
      stage: "load",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
