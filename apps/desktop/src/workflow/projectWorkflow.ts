// SPDX-License-Identifier: Apache-2.0
/**
 * Save/Open project workflow: canonical Book ↔ ProjectPersistence.
 *
 * Path:
 *   Save: BookSession.getBook() → ProjectPersistence → SQLite
 *   Open: SQLite → ProjectPersistence → Book → BookSession
 *
 * Tiptap JSON is never persisted. Uses PR #16 ProjectPersistence only.
 * Pipeline stage/job state lives on @openbook/workflow via DesktopStudioCoordinator.
 */
import {
  BOOK_MODEL_SCHEMA_VERSION,
  type Book,
} from "@openbook/book-model";
import {
  createProjectId,
  PERSISTENCE_SCHEMA_VERSION,
  type OpenBookProject,
  type PersistenceError,
  type PersistenceErrorCode,
  type ProjectPersistence,
  type ProjectSummary,
  type SaveSummary,
} from "../persistence/index.js";

/** Binding between the live authoring session and a persisted project row. */
export type ActiveProjectBinding = {
  projectId: string;
  projectName: string;
  createdAt: string;
};

export type WorkflowErrorCode =
  | PersistenceErrorCode
  | "NO_PROJECT_SELECTED"
  | "NO_PROJECT_NAME"
  | "SESSION_PROJECTION_FAILED"
  | "SESSION_REBUILD_FAILED"
  | "NOT_INITIALIZED";

export type WorkflowMessage = {
  code: WorkflowErrorCode | "SAVE_OK" | "OPEN_OK" | "LIST_OK" | "NEW_OK";
  text: string;
};

export type WorkflowOk<T> = {
  ok: true;
  value: T;
  message: WorkflowMessage;
};

export type WorkflowErr = {
  ok: false;
  message: WorkflowMessage;
  error: PersistenceError | { code: WorkflowErrorCode; message: string };
};

export type WorkflowResult<T> = WorkflowOk<T> | WorkflowErr;

function userMessageForPersistence(error: PersistenceError): WorkflowMessage {
  switch (error.code) {
    case "NOT_FOUND":
      return { code: "NOT_FOUND", text: `Project not found: ${error.message}` };
    case "CORRUPT_DATA":
      return { code: "CORRUPT_DATA", text: `Corrupt project data: ${error.message}` };
    case "BOOK_VALIDATION_FAILED":
      return {
        code: "BOOK_VALIDATION_FAILED",
        text: `Book validation failed: ${error.message}`,
      };
    case "DATABASE_ERROR":
      return { code: "DATABASE_ERROR", text: `Database error: ${error.message}` };
    case "INVALID_PROJECT_ID":
      return { code: "INVALID_PROJECT_ID", text: `Invalid project id: ${error.message}` };
    case "SCHEMA_VERSION_MISMATCH":
      return {
        code: "SCHEMA_VERSION_MISMATCH",
        text: `Schema version mismatch: ${error.message}`,
      };
    case "EPUB_LEAK_DETECTED":
      return {
        code: "EPUB_LEAK_DETECTED",
        text: `EPUB packaging fields are not allowed in persistence: ${error.message}`,
      };
    case "ALREADY_EXISTS":
      return { code: "ALREADY_EXISTS", text: `Project already exists: ${error.message}` };
    default:
      return { code: error.code, text: error.message };
  }
}

function err(
  code: WorkflowErrorCode,
  text: string,
  error?: PersistenceError,
): WorkflowErr {
  return {
    ok: false,
    message: { code, text },
    error: error ?? { code, message: text },
  };
}

/**
 * Build an OpenBookProject aggregate from the canonical Book.
 * Persists the Book only (never Tiptap JSON).
 */
export function buildOpenBookProjectFromBook(
  book: Book,
  binding: ActiveProjectBinding | null,
  projectName: string,
  now: string = new Date().toISOString(),
): WorkflowResult<{ project: OpenBookProject; book: Book }> {
  const name = projectName.trim();
  if (!name) {
    return err("NO_PROJECT_NAME", "Project name is required before save.");
  }

  const projectId = binding?.projectId ?? createProjectId();
  const createdAt = binding?.createdAt ?? now;
  const project: OpenBookProject = {
    metadata: {
      id: projectId,
      name,
      createdAt,
      updatedAt: now,
      schemaVersion: PERSISTENCE_SCHEMA_VERSION,
      bookSchemaVersion: BOOK_MODEL_SCHEMA_VERSION,
    },
    book,
  };

  return {
    ok: true,
    value: { project, book },
    message: { code: "SAVE_OK", text: "Project aggregate ready for persistence." },
  };
}

export async function ensurePersistenceReady(
  persistence: ProjectPersistence,
): Promise<WorkflowResult<void>> {
  const init = await persistence.initialize();
  if (!init.ok) {
    return {
      ok: false,
      message: userMessageForPersistence(init.error),
      error: init.error,
    };
  }
  return {
    ok: true,
    value: undefined,
    message: { code: "NEW_OK", text: "Persistence ready." },
  };
}

/**
 * Save a canonical Book through ProjectPersistence.
 * Requires an active binding or a project name for first-time save.
 */
export async function saveBookProject(input: {
  persistence: ProjectPersistence;
  book: Book;
  binding: ActiveProjectBinding | null;
  /** Required when binding is null (first save). Ignored name falls back to binding name. */
  projectName?: string;
}): Promise<
  WorkflowResult<{ binding: ActiveProjectBinding; summary: SaveSummary; book: Book }>
> {
  const ready = await ensurePersistenceReady(input.persistence);
  if (!ready.ok) return ready;

  let name: string;
  if (input.binding) {
    name = input.projectName?.trim() || input.binding.projectName;
  } else {
    name = input.projectName?.trim() ?? "";
    if (!name) {
      return err(
        "NO_PROJECT_SELECTED",
        "No project selected. Provide a project name to save a new project.",
      );
    }
  }

  const built = buildOpenBookProjectFromBook(
    input.book,
    input.binding,
    name,
  );
  if (!built.ok) return built;

  const saved = await input.persistence.saveProject(built.value.project);
  if (!saved.ok) {
    return {
      ok: false,
      message: userMessageForPersistence(saved.error),
      error: saved.error,
    };
  }

  const binding: ActiveProjectBinding = {
    projectId: built.value.project.metadata.id,
    projectName: built.value.project.metadata.name,
    createdAt: built.value.project.metadata.createdAt,
  };

  return {
    ok: true,
    value: { binding, summary: saved.value, book: built.value.book },
    message: {
      code: "SAVE_OK",
      text: `Saved project “${binding.projectName}” (${binding.projectId}).`,
    },
  };
}

/**
 * Open a saved project and return the canonical Book (no Tiptap, no SDM session).
 */
export async function openBookProject(input: {
  persistence: ProjectPersistence;
  projectId: string;
}): Promise<
  WorkflowResult<{
    book: Book;
    binding: ActiveProjectBinding;
  }>
> {
  const trimmed = input.projectId.trim();
  if (!trimmed) {
    return err("NO_PROJECT_SELECTED", "No project selected to open.");
  }

  const ready = await ensurePersistenceReady(input.persistence);
  if (!ready.ok) return ready;

  const loaded = await input.persistence.loadProject(trimmed);
  if (!loaded.ok) {
    return {
      ok: false,
      message: userMessageForPersistence(loaded.error),
      error: loaded.error,
    };
  }

  const binding: ActiveProjectBinding = {
    projectId: loaded.value.metadata.id,
    projectName: loaded.value.metadata.name,
    createdAt: loaded.value.metadata.createdAt,
  };

  return {
    ok: true,
    value: {
      book: loaded.value.book,
      binding,
    },
    message: {
      code: "OPEN_OK",
      text: `Opened project “${binding.projectName}” (${loaded.value.book.chapters.length} chapter(s)).`,
    },
  };
}

export async function listEditorProjects(
  persistence: ProjectPersistence,
): Promise<WorkflowResult<ProjectSummary[]>> {
  const ready = await ensurePersistenceReady(persistence);
  if (!ready.ok) return ready;

  const listed = await persistence.listProjects();
  if (!listed.ok) {
    return {
      ok: false,
      message: userMessageForPersistence(listed.error),
      error: listed.error,
    };
  }

  return {
    ok: true,
    value: listed.value,
    message: {
      code: "LIST_OK",
      text: `Found ${listed.value.length} saved project(s).`,
    },
  };
}
