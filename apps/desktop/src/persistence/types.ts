// SPDX-License-Identifier: Apache-2.0
/**
 * Persistence contracts and types for OpenBook desktop.
 *
 * ARCHITECTURAL BOUNDARY:
 * - Book Model (@openbook/book-model) remains the canonical publishing model.
 * - OpenBookProject is an application/persistence aggregate (project metadata + Book),
 *   NOT a new domain model.
 * - SQLite is persistence infrastructure, not the canonical domain model.
 * - EPUB packaging fields (opf, manifest, spine, nav, container, ncx) are forbidden.
 */
import type { Book } from "@openbook/book-model";

/** Current persistence container schema version. */
export const PERSISTENCE_SCHEMA_VERSION = 1 as const;

/**
 * Metadata for project persistence and container lifecycle.
 * Distinguishable from BookMetadata (which describes the editorial book work).
 */
export interface ProjectPersistenceMetadata {
  /** Unique project identifier (e.g. "proj-550e8400-..."). */
  id: string;
  /** Human-readable project name. */
  name: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-modified timestamp. */
  updatedAt: string;
  /** Persistence container schema version (PERSISTENCE_SCHEMA_VERSION = 1). */
  schemaVersion: number;
  /** Book Model schema version (BOOK_MODEL_SCHEMA_VERSION = 1). */
  bookSchemaVersion: number;
}

/**
 * Persistence/application aggregate packaging project metadata and canonical Book.
 *
 * NOTE: This is NOT a second canonical domain model. The canonical publishing
 * document remains Book from @openbook/book-model.
 */
export interface OpenBookProject {
  metadata: ProjectPersistenceMetadata;
  book: Book;
}

/**
 * Lightweight project listing summary.
 */
export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  schemaVersion: number;
}

/**
 * Summary returned after a successful save operation.
 */
export interface SaveSummary {
  projectId: string;
  updatedAt: string;
}

export type PersistenceErrorCode =
  | "NOT_FOUND"
  | "INVALID_PROJECT_ID"
  | "CORRUPT_DATA"
  | "SCHEMA_VERSION_MISMATCH"
  | "EPUB_LEAK_DETECTED"
  | "BOOK_VALIDATION_FAILED"
  | "DATABASE_ERROR"
  | "ALREADY_EXISTS";

export interface PersistenceError {
  code: PersistenceErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type PersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: PersistenceError };

/**
 * Contract for OpenBook project persistence operations.
 * Allows swappable storage infrastructure (SQLite in production, in-memory for testing).
 */
export interface ProjectPersistence {
  /** Initialize database tables and migrations. */
  initialize(): Promise<PersistenceResult<void>>;

  /** Save (insert or update) an OpenBook project. */
  saveProject(project: OpenBookProject): Promise<PersistenceResult<SaveSummary>>;

  /** Load an OpenBook project by ID. */
  loadProject(projectId: string): Promise<PersistenceResult<OpenBookProject>>;

  /** Get metadata only for a project by ID. */
  getProjectMetadata(projectId: string): Promise<PersistenceResult<ProjectPersistenceMetadata>>;

  /** List all stored projects. */
  listProjects(): Promise<PersistenceResult<ProjectSummary[]>>;

  /** Delete a project and its documents by ID. */
  deleteProject(projectId: string): Promise<PersistenceResult<void>>;

  /** Close the persistence connection. */
  close(): Promise<PersistenceResult<void>>;
}
