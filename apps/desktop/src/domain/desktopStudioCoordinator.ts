// SPDX-License-Identifier: Apache-2.0
/**
 * Headless Desktop Studio coordinator (ADR-0019 Gate 8 Slice 1–2).
 *
 * Pure TypeScript aggregate: no @tauri-apps/*, React, or DOM globals.
 * Slice 1 wires @openbook/workflow + @openbook/authoring BookSession to the
 * existing EditorAdapter and ProjectPersistence.
 * Slice 2 (ADR-0020) adds @openbook/importer ingestion. Slices 3–5 are not implemented.
 */
import {
  BOOK_MODEL_SCHEMA_VERSION,
  validateBook,
  type Book,
  type ContentBlock,
  type StructuralSection,
} from "@openbook/book-model";
import {
  BookSession,
  DomainValidationError,
  InvalidStructureOperationError,
  SectionNotFoundError,
} from "@openbook/authoring";
import {
  ImportService,
  type ImportIssue,
  type ImportOptions,
  type ImportSource,
  type SupportedImportFormat,
} from "@openbook/importer";
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
  type ChapterSummary,
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

export type StudioImportMode = "new-project" | "append-sections";

/** Slice 2 ingestion options (ADR-0020 §4.1). */
export interface StudioImportOptions extends ImportOptions {
  readonly mode?: StudioImportMode;
  readonly projectName?: string;
}

export interface StudioImportResult {
  readonly success: boolean;
  readonly mode: StudioImportMode;
  readonly sectionCount: number;
  readonly blockCount: number;
  readonly wordCount: number;
  readonly issues: readonly ImportIssue[];
}

/** Slice 1–2 coordinator contract (ADR-0019 §4.2, ADR-0020 §4.2). */
export interface IDesktopStudioCoordinator {
  getState(): DesktopStudioState;
  getBook(): Book;
  getSession(): BookSession;

  newProject(name: string, language?: string): Promise<void>;
  openProject(projectId: string, preferredSectionId?: string): Promise<void>;
  saveProject(projectName?: string): Promise<SaveSummary>;
  listProjects(): Promise<ProjectSummary[]>;

  transitionStage(to: WorkflowStage): void;
  canTransitionTo(to: WorkflowStage): boolean;
  advanceStage(): WorkflowStage | undefined;

  selectSection(sectionId: string): void;
  updateActiveSectionBlocks(blocks: ContentBlock[]): void;
  applyActiveSectionTipTap(
    tipTap: TipTapDocJSON,
    createId?: (prefix: string) => string,
  ): EditorConversionWarning[];
  activeSectionToTipTap(): TipTapDocConversion;
  listChapters(): ChapterSummary[];
  close(): Promise<void>;

  importContent(source: ImportSource, options?: StudioImportOptions): Promise<StudioImportResult>;
}

export class DesktopStudioError extends Error {
  readonly code:
    | WorkflowErrorCode
    | "SECTION_NOT_FOUND"
    | "DOMAIN_VALIDATION"
    | "INVALID_STRUCTURE"
    | "IMPORT_FAILED"
    | "UNSUPPORTED_FORMAT"
    | "IMPORT_NOT_PERMITTED";

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
  #idSeed: string;
  #session: BookSession;
  #workflow: WorkflowCoordinator;
  #binding: ActiveProjectBinding | null;
  #pendingName: string;
  readonly #importer: ImportService;

  constructor(options: DesktopStudioCoordinatorOptions) {
    this.#persistence = options.persistence;
    this.#now = options.now ?? (() => new Date().toISOString());
    const book = options.book ?? createDesktopDraftBook({ title: "Untitled Project" });
    this.#idSeed = options.idSeed ?? (book.metadata.title || "desktop-studio");
    this.#session = new BookSession({
      book,
      idSeed: this.#idSeed,
      initialSelectedSectionId: options.initialSelectedSectionId,
    });
    this.#workflow = new WorkflowCoordinator();
    this.#binding = null;
    this.#pendingName = book.metadata.title.trim();
    this.#importer = new ImportService();
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

  async importContent(
    source: ImportSource,
    options?: StudioImportOptions,
  ): Promise<StudioImportResult> {
    const mode: StudioImportMode = options?.mode ?? "new-project";
    if (mode === "new-project") {
      return this.#importNewProject(source, options);
    }
    return this.#importAppendSections(source, options);
  }

  async #importNewProject(
    source: ImportSource,
    options?: StudioImportOptions,
  ): Promise<StudioImportResult> {
    if (this.#workflow.getStage() !== "IMPORT") {
      throw new DesktopStudioError(
        "IMPORT_NOT_PERMITTED",
        `Ingestion is permitted only during the IMPORT stage (current stage: ${this.#workflow.getStage()}).`,
      );
    }

    const jobId = createProjectId("import");
    this.#beginImportJob(jobId);

    try {
      this.#assertSupportedFormat(source.format);
      const result = await this.#runImport(source, options);
      if (!result.success || result.book === undefined) {
        this.#failImportJob();
        throw new DesktopStudioError("IMPORT_FAILED", combinedIssueMessages(result.issues));
      }

      const imported = result.book;
      const seed = options?.idSeed ?? (imported.metadata.title || this.#idSeed);
      this.#replaceSession(imported, seed);
      this.#binding = null;
      this.#pendingName = (options?.projectName ?? imported.metadata.title).trim();
      this.#session.updateMetadata({ title: imported.metadata.title });

      const firstChapterId = this.#session.getBook().chapters[0]?.id ?? null;
      if (firstChapterId) {
        this.#session.selectSection(firstChapterId);
      }

      this.#succeedImportJob();
      this.#workflow.requestTransition({ to: "STRUCTURE" });

      return toStudioImportResult("new-project", result.issues, result.stats);
    } catch (err) {
      this.#failImportJob();
      if (err instanceof DesktopStudioError) {
        throw err;
      }
      throw new DesktopStudioError(
        "IMPORT_FAILED",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async #importAppendSections(
    source: ImportSource,
    options?: StudioImportOptions,
  ): Promise<StudioImportResult> {
    if (this.#session.getBook().chapters.length < 1) {
      throw new DesktopStudioError(
        "IMPORT_FAILED",
        "append-sections requires an active session with at least one chapter.",
      );
    }

    const preImportSnapshot = this.#session.getBook();
    const preSelected = this.#session.getState().selectedSectionId;
    const restoreSeed = this.#idSeed;
    const jobId = createProjectId("import-append");
    this.#beginImportJob(jobId);

    const restore = (): void => {
      this.#replaceSession(preImportSnapshot, restoreSeed, preSelected);
    };

    try {
      this.#assertSupportedFormat(source.format);
      const result = await this.#runImport(source, options);
      if (!result.success || result.book === undefined) {
        this.#failImportJob();
        throw new DesktopStudioError("IMPORT_FAILED", combinedIssueMessages(result.issues));
      }

      const importedBook = result.book;
      const partitions: ReadonlyArray<readonly StructuralSection[]> = [
        importedBook.frontMatter,
        importedBook.chapters,
        importedBook.backMatter,
      ];
      let firstImportedMainId: string | undefined;

      for (const sections of partitions) {
        for (const section of sections) {
          try {
            const added = this.#session.addSection({
              matter: section.kind,
              title: section.title,
              role: section.role,
              initialBlocks: section.blocks,
            });
            if (section.kind === "main" && firstImportedMainId === undefined) {
              firstImportedMainId = added.id;
            }
          } catch (err) {
            restore();
            this.#failImportJob();
            const message = err instanceof Error ? err.message : String(err);
            throw new DesktopStudioError(
              "IMPORT_FAILED",
              `Append failed on section "${section.title}": ${message}. All changes rolled back.`,
            );
          }
        }
      }

      const errors = validateBook(this.#session.getBook()).filter((i) => i.severity === "error");
      if (errors.length > 0) {
        restore();
        this.#failImportJob();
        throw new DesktopStudioError(
          "IMPORT_FAILED",
          `Append failed on section "${importedBook.chapters[0]?.title ?? "unknown"}": ${errors.map((e) => e.message).join("; ")}. All changes rolled back.`,
        );
      }

      if (firstImportedMainId) {
        this.#session.selectSection(firstImportedMainId);
      }

      this.#succeedImportJob();
      return toStudioImportResult("append-sections", result.issues, result.stats);
    } catch (err) {
      this.#failImportJob();
      if (err instanceof DesktopStudioError) {
        throw err;
      }
      restore();
      throw new DesktopStudioError(
        "IMPORT_FAILED",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  #beginImportJob(jobId: string): void {
    const status = this.#workflow.getJobStatus();
    if (status === "running") {
      throw new DesktopStudioError("IMPORT_FAILED", "An import job is already running.");
    }
    this.#workflow.requestJobStatus({ to: "running", jobId });
  }

  #failImportJob(): void {
    if (this.#workflow.getJobStatus() === "running") {
      this.#workflow.requestJobStatus({ to: "failed" });
    }
  }

  #succeedImportJob(): void {
    this.#workflow.requestJobStatus({ to: "succeeded" });
    this.#workflow.requestJobStatus({ to: "idle" });
  }

  #assertSupportedFormat(format: string): asserts format is SupportedImportFormat {
    if (format !== "markdown" && format !== "text") {
      throw new DesktopStudioError(
        "UNSUPPORTED_FORMAT",
        `Unsupported import format "${format}". Supported: markdown, text.`,
      );
    }
  }

  async #runImport(source: ImportSource, options?: StudioImportOptions) {
    const splitStrategy =
      options?.splitStrategy ??
      (source.format === "text" ? "single-chapter" : "heading-1");
    return this.#importer.import(source, {
      splitStrategy,
      defaultLanguage: options?.defaultLanguage,
      metadataOverrides: options?.metadataOverrides,
      idSeed: options?.idSeed,
    });
  }

  #replaceSession(book: Book, idSeed: string, preferredSectionId?: string): void {
    const preferredOk =
      preferredSectionId !== undefined &&
      [...book.frontMatter, ...book.chapters, ...book.backMatter].some(
        (section) => section.id === preferredSectionId,
      );
    this.#idSeed = idSeed;
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

function combinedIssueMessages(issues: readonly ImportIssue[]): string {
  if (issues.length === 0) {
    return "Import failed.";
  }
  return issues.map((issue) => issue.message).join("; ");
}

function toStudioImportResult(
  mode: StudioImportMode,
  issues: readonly ImportIssue[],
  stats: { sectionCount: number; blockCount: number; wordCount: number },
): StudioImportResult {
  return {
    success: true,
    mode,
    sectionCount: stats.sectionCount,
    blockCount: stats.blockCount,
    wordCount: stats.wordCount,
    issues,
  };
}
