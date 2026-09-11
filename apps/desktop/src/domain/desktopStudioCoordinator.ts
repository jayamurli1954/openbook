// SPDX-License-Identifier: Apache-2.0
/**
 * Headless Desktop Studio coordinator (ADR-0019 Gate 8 Slice 1).
 *
 * Pure TypeScript aggregate: no @tauri-apps/*, React, or DOM globals.
 * Slice 1 wires @openbook/workflow + @openbook/authoring BookSession to the
 * existing EditorAdapter and ProjectPersistence. Slices 2–5 are not implemented.
 */
import {
  BOOK_MODEL_SCHEMA_VERSION,
  type Book,
  type ContentBlock,
} from "@openbook/book-model";
import {
  BookSession,
  DomainValidationError,
  InvalidStructureOperationError,
  SectionNotFoundError,
} from "@openbook/authoring";
import {
  assertNoCanonicalBookContent,
  nextStage,
  WorkflowCoordinator,
  type JobStatus,
  type WorkflowStage,
} from "@openbook/workflow";
import { createProjectId } from "../persistence/dto.js";
import {
  PERSISTENCE_SCHEMA_VERSION,
  type OpenBookProject,
  type ProjectPersistence,
  type ProjectSummary,
  type SaveSummary,
} from "../persistence/types.js";
import {
  ensurePersistenceReady,
  listEditorProjects,
  type ActiveProjectBinding,
  type WorkflowErrorCode,
} from "../workflow/projectWorkflow.js";
import {
  bookMetadataToSemantic,
  createDesktopDraftBook,
  listMainChapters,
  sectionBlocksToTipTap,
  tipTapJsonToContentBlocks,
  type TipTapDocConversion,
} from "./editorSessionAdapter.js";
import type { EditorConversionWarning, TipTapDocJSON } from "./editorAdapter.js";

/**
 * Slice 1 studio snapshot (ADR-0019 §4.1).
 * `validationReport` stays null until Slice 4; Book Doctor is not imported.
 */
export interface DesktopStudioState {
  stage: WorkflowStage;
  jobStatus: JobStatus;
  activeJobId?: string;
  binding: ActiveProjectBinding | null;
  isDirty: boolean;
  revision: number;
  selectedSectionId: string | null;
  validationReport: null;
}

/** Slice 1 coordinator contract (ADR-0019 §4.2, methods authorized for this slice only). */
export interface IDesktopStudioCoordinator {
  getState(): DesktopStudioState;
  getBook(): Book;
  getSession(): BookSession;

  newProject(name: string, language?: string): Promise<void>;
  openProject(projectId: string, preferredSectionId?: string): Promise<void>;
  saveProject(projectName?: string): Promise<SaveSummary>;
  listProjects(): Promise<ProjectSummary[]>;

  transitionStage(to: WorkflowStage): void;

  selectSection(sectionId: string): void;
  updateActiveSectionBlocks(blocks: ContentBlock[]): void;
}

export class DesktopStudioError extends Error {
  readonly code: WorkflowErrorCode | "SECTION_NOT_FOUND" | "DOMAIN_VALIDATION" | "INVALID_STRUCTURE";

  constructor(code: DesktopStudioError["code"], message: string) {
    super(message);
    this.name = "DesktopStudioError";
    this.code = code;
  }
}

function throwFromWorkflowMessage(message: { code: string; text: string }): never {
  throw new DesktopStudioError(message.code as DesktopStudioError["code"], message.text);
}

export type DesktopStudioCoordinatorOptions = {
  persistence: ProjectPersistence;
  book?: Book;
  idSeed?: string;
  initialSelectedSectionId?: string;
  now?: () => string;
};

/**
 * Desktop Studio coordinator: BookSession + WorkflowCoordinator + persistence.
 */
export class DesktopStudioCoordinator implements IDesktopStudioCoordinator {
  readonly #persistence: ProjectPersistence;
  readonly #now: () => string;
  #session: BookSession;
  #workflow: WorkflowCoordinator;
  #binding: ActiveProjectBinding | null;
  #pendingName: string;

  constructor(options: DesktopStudioCoordinatorOptions) {
    this.#persistence = options.persistence;
    this.#now = options.now ?? (() => new Date().toISOString());
    const book = options.book ?? createDesktopDraftBook({ title: "Untitled Project" });
    this.#session = new BookSession({
      book,
      idSeed: options.idSeed ?? (book.metadata.title || "desktop-studio"),
      initialSelectedSectionId: options.initialSelectedSectionId,
    });
    this.#workflow = new WorkflowCoordinator();
    this.#binding = null;
    this.#pendingName = book.metadata.title.trim();
  }

  getState(): DesktopStudioState {
    const workflow = this.#workflow.getState();
    assertNoCanonicalBookContent(workflow);
    const session = this.#session.getState();
    const state: DesktopStudioState = {
      stage: workflow.stage,
      jobStatus: workflow.jobStatus,
      binding: this.#binding ? { ...this.#binding } : null,
      isDirty: session.isDirty,
      revision: session.revision,
      selectedSectionId: session.selectedSectionId,
      validationReport: null,
    };
    if (workflow.jobId !== undefined) {
      state.activeJobId = workflow.jobId;
    }
    return state;
  }

  getBook(): Book {
    return this.#session.getBook();
  }

  getSession(): BookSession {
    return this.#session;
  }

  async newProject(name: string, language: string = "en"): Promise<void> {
    const title = name.trim();
    if (!title) {
      throw new DesktopStudioError("NO_PROJECT_NAME", "Project name is required.");
    }
    const ready = await ensurePersistenceReady(this.#persistence);
    if (!ready.ok) {
      throwFromWorkflowMessage(ready.message);
    }
    this.#replaceSession(
      createDesktopDraftBook({ title, language }),
      title,
    );
    this.#binding = null;
    this.#pendingName = title;
    this.#workflow = new WorkflowCoordinator();
  }

  async openProject(projectId: string, preferredSectionId?: string): Promise<void> {
    const trimmed = projectId.trim();
    if (!trimmed) {
      throw new DesktopStudioError("NO_PROJECT_SELECTED", "No project selected to open.");
    }
    const ready = await ensurePersistenceReady(this.#persistence);
    if (!ready.ok) {
      throwFromWorkflowMessage(ready.message);
    }
    const loaded = await this.#persistence.loadProject(trimmed);
    if (!loaded.ok) {
      throw new DesktopStudioError(loaded.error.code, loaded.error.message);
    }

    try {
      this.#replaceSession(loaded.value.book, loaded.value.metadata.name, preferredSectionId);
    } catch (err) {
      if (
        err instanceof InvalidStructureOperationError ||
        err instanceof DomainValidationError
      ) {
        throw new DesktopStudioError("SESSION_REBUILD_FAILED", err.message);
      }
      throw err;
    }

    this.#binding = {
      projectId: loaded.value.metadata.id,
      projectName: loaded.value.metadata.name,
      createdAt: loaded.value.metadata.createdAt,
    };
    this.#pendingName = loaded.value.metadata.name;
    this.#workflow = new WorkflowCoordinator();
    this.#session.markSaved();
  }

  async saveProject(projectName?: string): Promise<SaveSummary> {
    const ready = await ensurePersistenceReady(this.#persistence);
    if (!ready.ok) {
      throwFromWorkflowMessage(ready.message);
    }

    let name: string;
    if (this.#binding) {
      name = projectName?.trim() || this.#binding.projectName;
    } else if (projectName !== undefined) {
      name = projectName.trim();
      if (!name) {
        throw new DesktopStudioError("NO_PROJECT_NAME", "Project name is required before save.");
      }
    } else {
      name = this.#pendingName.trim();
      if (!name) {
        throw new DesktopStudioError(
          "NO_PROJECT_SELECTED",
          "No project selected. Provide a project name to save a new project.",
        );
      }
    }

    const book = this.#session.getBook();
    const project = this.#buildProject(book, name);
    const saved = await this.#persistence.saveProject(project);
    if (!saved.ok) {
      throw new DesktopStudioError(saved.error.code, saved.error.message);
    }

    this.#binding = {
      projectId: project.metadata.id,
      projectName: project.metadata.name,
      createdAt: project.metadata.createdAt,
    };
    this.#pendingName = project.metadata.name;
    this.#session.markSaved();
    return saved.value;
  }

  async listProjects(): Promise<ProjectSummary[]> {
    const listed = await listEditorProjects(this.#persistence);
    if (!listed.ok) {
      throwFromWorkflowMessage(listed.message);
    }
    return listed.value;
  }

  transitionStage(to: WorkflowStage): void {
    this.#workflow.requestTransition({ to });
  }

  canTransitionTo(to: WorkflowStage): boolean {
    return this.#workflow.canTransitionTo(to);
  }

  advanceStage(): WorkflowStage | undefined {
    const to = nextStage(this.#workflow.getStage());
    if (!to) return undefined;
    this.transitionStage(to);
    return to;
  }

  selectSection(sectionId: string): void {
    try {
      this.#session.selectSection(sectionId);
    } catch (err) {
      if (err instanceof SectionNotFoundError) {
        throw new DesktopStudioError("SECTION_NOT_FOUND", err.message);
      }
      throw err;
    }
  }

  updateActiveSectionBlocks(blocks: ContentBlock[]): void {
    const selectedId = this.#session.getState().selectedSectionId;
    try {
      this.#session.setSectionBlocks(selectedId, blocks);
    } catch (err) {
      this.#rethrowAuthoring(err);
    }
  }

  /**
   * Connect EditorAdapter: persist Tiptap transport into the active section
   * via ContentBlock[] and BookSession (never stores Tiptap JSON).
   */
  applyActiveSectionTipTap(
    tipTap: TipTapDocJSON,
    createId?: (prefix: string) => string,
  ): EditorConversionWarning[] {
    const selected = this.#session.getSelectedSection();
    if (!selected) {
      throw new DesktopStudioError(
        "SECTION_NOT_FOUND",
        "No section is selected for editor updates.",
      );
    }
    const { blocks, warnings } = tipTapJsonToContentBlocks(tipTap, {
      metadata: bookMetadataToSemantic(this.#session.getBook()),
      sectionId: selected.id,
      sectionTitle: selected.title,
      matter: selected.kind,
      role: String(selected.role),
      createId,
    });
    this.updateActiveSectionBlocks(blocks);
    return warnings;
  }

  activeSectionToTipTap(): TipTapDocConversion {
    const selectedId = this.#session.getState().selectedSectionId;
    return sectionBlocksToTipTap(this.#session.getBook(), selectedId);
  }

  listChapters() {
    return listMainChapters(this.#session.getBook());
  }

  async close(): Promise<void> {
    await this.#persistence.close();
  }

  #replaceSession(book: Book, idSeed: string, preferredSectionId?: string): void {
    const preferredOk =
      preferredSectionId !== undefined &&
      [...book.frontMatter, ...book.chapters, ...book.backMatter].some(
        (section) => section.id === preferredSectionId,
      );
    this.#session = new BookSession({
      book,
      idSeed,
      initialSelectedSectionId: preferredOk ? preferredSectionId : undefined,
    });
  }

  #buildProject(book: Book, projectName: string): OpenBookProject {
    const name = projectName.trim();
    if (!name) {
      throw new DesktopStudioError("NO_PROJECT_NAME", "Project name is required before save.");
    }
    const now = this.#now();
    const projectId = this.#binding?.projectId ?? createProjectId();
    const createdAt = this.#binding?.createdAt ?? now;
    return {
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
  }

  #rethrowAuthoring(err: unknown): never {
    if (err instanceof DomainValidationError) {
      throw new DesktopStudioError("DOMAIN_VALIDATION", err.message);
    }
    if (err instanceof InvalidStructureOperationError) {
      throw new DesktopStudioError("INVALID_STRUCTURE", err.message);
    }
    if (err instanceof SectionNotFoundError) {
      throw new DesktopStudioError("SECTION_NOT_FOUND", err.message);
    }
    throw err;
  }
}
