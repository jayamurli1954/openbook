// SPDX-License-Identifier: Apache-2.0
/**
 * Persistence Data Transfer Objects (DTO) and serialization boundaries.
 *
 * Keeps storage representations cleanly decoupled from domain objects:
 * - Book remains canonical in @openbook/book-model
 * - DTOs represent row shapes stored in SQLite
 * - Tiptap JSON is NOT part of persistence
 * - EPUB packaging leaks are strictly forbidden and rejected
 * - Semantic Unicode preservation is guaranteed
 */
import {
  BOOK_MODEL_SCHEMA_VERSION,
  validateBook,
  type Book,
} from "@openbook/book-model";
import {
  PERSISTENCE_SCHEMA_VERSION,
  type OpenBookProject,
  type PersistenceResult,
  type ProjectPersistenceMetadata,
} from "./types.js";

/** Matches `projects` SQLite table row. */
export interface ProjectRecordDto {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  schema_version: number;
}

/** Matches `project_documents` SQLite table row. */
export interface ProjectDocumentDto {
  project_id: string;
  book_payload: string;
  book_schema_version: number;
  updated_at: string;
}

/** Combined persistence envelope representing a complete project state in storage. */
export interface PersistenceEnvelopeDto {
  project: ProjectRecordDto;
  document: ProjectDocumentDto;
}

/** EPUB packaging fields that must never appear in persistent project data. */
const FORBIDDEN_EPUB_KEYS = [
  "opf",
  "manifest",
  "spine",
  "ncx",
  "nav",
  "navDoc",
  "container",
  "packageDocument",
] as const;

/** Validate a project ID format (e.g. non-empty, safe string without path traversal or spaces). */
export function validateProjectId(id: unknown): PersistenceResult<string> {
  if (typeof id !== "string" || !id.trim()) {
    return {
      ok: false,
      error: {
        code: "INVALID_PROJECT_ID",
        message: "Project ID must be a non-empty string.",
      },
    };
  }

  const trimmed = id.trim();
  // Safe identifier: alphanumeric, dashes, underscores
  const validPattern = /^[a-zA-Z0-9_-]{3,128}$/;
  if (!validPattern.test(trimmed)) {
    return {
      ok: false,
      error: {
        code: "INVALID_PROJECT_ID",
        message: `Invalid project ID "${trimmed}". Must match pattern ^[a-zA-Z0-9_-]{3,128}$.`,
      },
    };
  }

  return { ok: true, value: trimmed };
}

/** Generate a standard unique project ID. */
export function createProjectId(prefix: string = "proj"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Check an object for any forbidden EPUB packaging fields. */
function findEpubLeaks(obj: unknown, path: string = ""): string[] {
  const leaks: string[] = [];
  if (!obj || typeof obj !== "object") return leaks;

  const record = obj as Record<string, unknown>;
  for (const key of FORBIDDEN_EPUB_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      leaks.push(path ? `${path}.${key}` : key);
    }
  }

  for (const [k, v] of Object.entries(record)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      leaks.push(...findEpubLeaks(v, path ? `${path}.${k}` : k));
    }
  }
  return leaks;
}

/** Check that a payload is not raw Tiptap JSON. */
function isTiptapPayload(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.type === "doc" && Array.isArray(record.content);
}

/**
 * Serialize an OpenBookProject into storage DTOs.
 * Validates project metadata, Book schema, absence of EPUB leaks, and canonical book validity.
 */
export function serializeProjectToDto(
  project: OpenBookProject,
): PersistenceResult<PersistenceEnvelopeDto> {
  if (!project || typeof project !== "object") {
    return {
      ok: false,
      error: {
        code: "CORRUPT_DATA",
        message: "Project must be a non-null object.",
      },
    };
  }

  const idValidation = validateProjectId(project.metadata?.id);
  if (!idValidation.ok) {
    return idValidation;
  }
  const projectId = idValidation.value;

  if (project.metadata.schemaVersion !== PERSISTENCE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VERSION_MISMATCH",
        message: `Unsupported persistence schemaVersion ${project.metadata.schemaVersion}. Expected ${PERSISTENCE_SCHEMA_VERSION}.`,
      },
    };
  }

  if (project.metadata.bookSchemaVersion !== BOOK_MODEL_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VERSION_MISMATCH",
        message: `Unsupported bookSchemaVersion ${project.metadata.bookSchemaVersion}. Expected ${BOOK_MODEL_SCHEMA_VERSION}.`,
      },
    };
  }

  // Ensure book is not Tiptap JSON
  if (isTiptapPayload(project.book)) {
    return {
      ok: false,
      error: {
        code: "CORRUPT_DATA",
        message: "Tiptap JSON must not be used as the persistence model. Persist canonical Book Model instead.",
      },
    };
  }

  // Ensure no EPUB packaging fields leak
  const epubLeaks = findEpubLeaks(project.book);
  if (epubLeaks.length > 0) {
    return {
      ok: false,
      error: {
        code: "EPUB_LEAK_DETECTED",
        message: `Persistence payload contains forbidden EPUB packaging field(s): ${epubLeaks.join(", ")}.`,
        details: { leaks: epubLeaks },
      },
    };
  }

  // Validate canonical book domain rules
  const bookIssues = validateBook(project.book);
  const bookErrors = bookIssues.filter((i) => i.severity === "error");
  if (bookErrors.length > 0) {
    return {
      ok: false,
      error: {
        code: "BOOK_VALIDATION_FAILED",
        message: `Book validation failed with ${bookErrors.length} error(s): ${bookErrors.map((e) => e.message).join("; ")}`,
        details: { issues: bookErrors },
      },
    };
  }

  const bookPayload = JSON.stringify(project.book);

  const projectRecord: ProjectRecordDto = {
    id: projectId,
    name: project.metadata.name.trim() || "Untitled Project",
    created_at: project.metadata.createdAt || new Date().toISOString(),
    updated_at: project.metadata.updatedAt || new Date().toISOString(),
    schema_version: project.metadata.schemaVersion,
  };

  const projectDocument: ProjectDocumentDto = {
    project_id: projectId,
    book_payload: bookPayload,
    book_schema_version: project.book.schemaVersion,
    updated_at: projectRecord.updated_at,
  };

  return {
    ok: true,
    value: {
      project: projectRecord,
      document: projectDocument,
    },
  };
}

/**
 * Deserialize storage DTOs back into an OpenBookProject application aggregate.
 * Validates JSON structure, schema versions, EPUB leak absence, and Book domain validity.
 */
export function deserializeProjectFromDto(
  envelope: PersistenceEnvelopeDto,
): PersistenceResult<OpenBookProject> {
  if (!envelope || typeof envelope !== "object" || !envelope.project || !envelope.document) {
    return {
      ok: false,
      error: {
        code: "CORRUPT_DATA",
        message: "Persistence envelope must contain both project and document records.",
      },
    };
  }

  const { project, document } = envelope;

  const idValidation = validateProjectId(project.id);
  if (!idValidation.ok) {
    return idValidation;
  }
  const projectId = idValidation.value;

  if (document.project_id !== projectId) {
    return {
      ok: false,
      error: {
        code: "CORRUPT_DATA",
        message: `Mismatched project ID in document: expected "${projectId}", found "${document.project_id}".`,
      },
    };
  }

  if (project.schema_version !== PERSISTENCE_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VERSION_MISMATCH",
        message: `Unsupported persistence schema_version ${project.schema_version}. Expected ${PERSISTENCE_SCHEMA_VERSION}.`,
      },
    };
  }

  if (document.book_schema_version !== BOOK_MODEL_SCHEMA_VERSION) {
    return {
      ok: false,
      error: {
        code: "SCHEMA_VERSION_MISMATCH",
        message: `Unsupported book_schema_version ${document.book_schema_version}. Expected ${BOOK_MODEL_SCHEMA_VERSION}.`,
      },
    };
  }

  let parsedBook: unknown;
  try {
    parsedBook = JSON.parse(document.book_payload);
  } catch (err) {
    return {
      ok: false,
      error: {
        code: "CORRUPT_DATA",
        message: `Failed to parse book payload JSON: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  if (isTiptapPayload(parsedBook)) {
    return {
      ok: false,
      error: {
        code: "CORRUPT_DATA",
        message: "Deserialized payload is Tiptap JSON, not canonical Book Model.",
      },
    };
  }

  const epubLeaks = findEpubLeaks(parsedBook);
  if (epubLeaks.length > 0) {
    return {
      ok: false,
      error: {
        code: "EPUB_LEAK_DETECTED",
        message: `Deserialized payload contains forbidden EPUB packaging field(s): ${epubLeaks.join(", ")}.`,
        details: { leaks: epubLeaks },
      },
    };
  }

  const book = parsedBook as Book;
  const bookIssues = validateBook(book);
  const bookErrors = bookIssues.filter((i) => i.severity === "error");
  if (bookErrors.length > 0) {
    return {
      ok: false,
      error: {
        code: "BOOK_VALIDATION_FAILED",
        message: `Deserialized book validation failed: ${bookErrors.map((e) => e.message).join("; ")}`,
        details: { issues: bookErrors },
      },
    };
  }

  const metadata: ProjectPersistenceMetadata = {
    id: project.id,
    name: project.name,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
    schemaVersion: project.schema_version,
    bookSchemaVersion: document.book_schema_version,
  };

  return {
    ok: true,
    value: {
      metadata,
      book,
    },
  };
}
