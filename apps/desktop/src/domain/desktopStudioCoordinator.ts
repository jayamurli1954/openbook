// SPDX-License-Identifier: Apache-2.0
/**
 * Headless Desktop Studio coordinator (ADR-0019 Gate 8 Slice 1–5).
 *
 * Pure TypeScript aggregate: no @tauri-apps/*, React, or DOM globals.
 * Slice 1 wires @openbook/workflow + @openbook/authoring BookSession to the
 * existing EditorAdapter and ProjectPersistence.
 * Slice 2 (ADR-0020) adds @openbook/importer ingestion.
 * Slice 3 (ADR-0021) adds @openbook/assets MemoryAssetStore / IAssetStore.
 * Slice 4 (ADR-0022) adds @openbook/book-doctor ValidationCoordinator.
 * Slice 5 (ADR-0023) adds EPUB/HTML/PDF export orchestration.
 */
import {
  BOOK_MODEL_SCHEMA_VERSION,
  validateBook,
  type AssetRef,
  type Book,
  type ContentBlock,
  type StructuralSection,
} from "@openbook/book-model";
import {
  BookSession,
  BlockNotFoundError,
  DomainValidationError,
  InvalidStructureOperationError,
  SectionNotFoundError,
} from "@openbook/authoring";
import {
  AssetIngestionPipeline,
  AssetRegistry,
  MemoryAssetStore,
  StoreBackedAssetResolver,
  type AssetIngestInput,
  type AssetIngestResult,
  type AssetIssue,
  type AssetResolver,
  type IAssetStore,
} from "@openbook/assets";
import {
  ValidationCoordinator,
  type BookDiagnostic,
  type BookValidationReport,
  type IValidationCoordinator,
  type TypstDiagnosticInput,
} from "@openbook/book-doctor";
import {
  buildEpubArchive,
  buildEpubPackage,
  type PublishingDiagnostic as EpubPublishingDiagnostic,
} from "@openbook/epub";
import {
  buildHtml,
  type HtmlPublicationFile,
  type PublishingDiagnostic as HtmlPublishingDiagnostic,
} from "@openbook/html";
import type { PdfPublication, PublishingDiagnostic as PdfPublishingDiagnostic } from "@openbook/pdf";
import type { ValidationReport, ValidatorService } from "@openbook/validator";
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
  defaultPdfPublisher,
  productionValidatorService,
  writeTempEpubAndValidate,
} from "./publishingNodeHost.js";
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
 * Narrow structural contract for host-supplied Gate 5 EPUBCheck diagnostics.
 * Compatible with Gate 5 ValidationReport without importing @openbook/validator.
 */
export interface EpubCheckDiagnosticInput {
  readonly validatorName?: string;
  readonly targetPath?: string;
  readonly isValid?: boolean;
  readonly failureKind?:
    | "none"
    | "conformance"
    | "missing_runtime"
    | "missing_epubcheck"
    | "invalid_path"
    | "timeout"
    | "process_error"
    | string;
  readonly messages?: readonly {
    readonly id?: string;
    readonly severity?: "FATAL" | "ERROR" | "WARNING" | "INFO" | "USAGE" | string;
    readonly message?: string;
    readonly suggestion?: string | null;
    readonly locations?: readonly {
      readonly path?: string;
      readonly line?: number;
      readonly column?: number;
    }[];
  }[];
}

export interface ValidationRunOptions {
  /** Optional pre-computed Gate 5 EPUBCheck diagnostics. */
  readonly epubCheckReport?: EpubCheckDiagnosticInput;
  /** Optional pre-computed Typst compiler diagnostics. */
  readonly typstDiagnostics?: TypstDiagnosticInput;
}

export interface BaseExportOptions {
  /** Optional cancellation signal for long-running compilation. */
  readonly signal?: AbortSignal;
}

export interface EpubExportOptions extends BaseExportOptions {
  /**
   * EPUB artifact verification mode.
   * PREVIEW defaults to "fast"; PUBLISH defaults to "verified" and rejects "fast".
   */
  readonly verificationMode?: "fast" | "verified";
}

export interface HtmlExportOptions extends BaseExportOptions {}

export interface PdfExportOptions extends BaseExportOptions {}

export interface EpubExportResult {
  readonly format: "epub";
  readonly bytes: Uint8Array;
  readonly diagnostics: readonly EpubPublishingDiagnostic[];
  readonly epubCheckReport?: ValidationReport;
}

export interface HtmlExportResult {
  readonly format: "html";
  readonly html: string;
  readonly files: readonly HtmlPublicationFile[];
  readonly diagnostics: readonly HtmlPublishingDiagnostic[];
}

export interface PdfExportResult {
  readonly format: "pdf";
  readonly bytes: Uint8Array;
  readonly typstSource: string;
  readonly diagnostics: readonly PdfPublishingDiagnostic[];
}

/**
 * Injected PDF publishing port.
 * Defaults to the production @openbook/pdf compile pipeline.
 */
export interface IPdfPublisher {
  publishPdf(
    book: Readonly<Book>,
    options: {
      assetResolver: AssetResolver;
      signal?: AbortSignal;
    },
  ): Promise<PdfPublication>;
}

/**
 * Slice 1–4 studio snapshot (ADR-0019 §4.1, ADR-0022 §4.3).
 * `validationReport` is populated after runValidation() and reset on mutation.
 */
export interface DesktopStudioState {
  stage: WorkflowStage;
  jobStatus: JobStatus;
  activeJobId?: string;
  binding: ActiveProjectBinding | null;
  isDirty: boolean;
  revision: number;
  selectedSectionId: string | null;
  validationReport: BookValidationReport | null;
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

/** Slice 1–5 coordinator contract (ADR-0019–ADR-0023). */
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

  ingestAsset(input: AssetIngestInput): Promise<AssetIngestResult>;
  insertImageBlock(input: {
    sectionId: string;
    atIndex: number;
    ingest: AssetIngestInput;
  }): Promise<{ assetRef: AssetRef; block: ContentBlock }>;
  insertExistingImageBlock(sectionId: string, atIndex: number, assetId: string): ContentBlock;
  removeImageBlock(sectionId: string, blockId: string): void;
  getAssetResolver(): AssetResolver;

  runValidation(options?: ValidationRunOptions): Promise<BookValidationReport>;
  getValidationReport(): BookValidationReport | null;

  exportEpub(options?: EpubExportOptions): Promise<EpubExportResult>;
  exportHtml(options?: HtmlExportOptions): Promise<HtmlExportResult>;
  exportPdf(options?: PdfExportOptions): Promise<PdfExportResult>;
}

export class DesktopStudioError extends Error {
  readonly code:
    | WorkflowErrorCode
    | "SECTION_NOT_FOUND"
    | "DOMAIN_VALIDATION"
    | "INVALID_STRUCTURE"
    | "IMPORT_FAILED"
    | "UNSUPPORTED_FORMAT"
    | "IMPORT_NOT_PERMITTED"
    | "ASSET_NOT_PERMITTED"
    | "ASSET_INGEST_FAILED"
    | "ASSET_NOT_FOUND"
    | "BLOCK_NOT_FOUND"
    | "VALIDATION_NOT_PERMITTED"
    | "VALIDATION_FAILED"
    | "PUBLISH_NOT_PERMITTED"
    | "PREPUBLISH_VALIDATION_FAILED"
    | "CONFORMANCE_CHECK_FAILED"
    | "RENDERER_COMPILER_FAILED"
    | "PUBLISH_FAILED"
    | "OPERATION_ABORTED";

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
  /** Defaults to MemoryAssetStore when omitted (ADR-0021 INV-1). */
  assetStore?: IAssetStore;
  /**
   * Validation coordinator instance.
   * Defaults to new ValidationCoordinator() when omitted (ADR-0022).
   */
  validationCoordinator?: IValidationCoordinator;
  /** Injected EPUBCheck validator service (ADR-0012). Defaults to production bundle. */
  validatorService?: ValidatorService;
  /** Injected PDF publisher. Defaults to production Typst v0.15.1 runner. */
  pdfPublisher?: IPdfPublisher;
};

/**
 * Desktop Studio coordinator: BookSession + WorkflowCoordinator + persistence.
 */
export class DesktopStudioCoordinator implements IDesktopStudioCoordinator {
  readonly #persistence: ProjectPersistence;
  readonly #now: () => string;
  readonly #assetStoreInjected: boolean;
  #idSeed: string;
  #session: BookSession;
  #workflow: WorkflowCoordinator;
  #binding: ActiveProjectBinding | null;
  #pendingName: string;
  readonly #importer: ImportService;
  readonly #validationCoordinator: IValidationCoordinator;
  readonly #validatorService: ValidatorService | undefined;
  readonly #pdfPublisher: IPdfPublisher;
  #assetStore: IAssetStore;
  #assetRegistry!: AssetRegistry;
  #pipeline!: AssetIngestionPipeline;
  #resolver!: StoreBackedAssetResolver;
  #validationReport: BookValidationReport | null;
  #validatedRevision: number | null;

  constructor(options: DesktopStudioCoordinatorOptions) {
    this.#persistence = options.persistence;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#assetStoreInjected = options.assetStore !== undefined;
    this.#assetStore = options.assetStore ?? new MemoryAssetStore();
    this.#bindAssetPipeline();
    this.#validationCoordinator =
      options.validationCoordinator ?? new ValidationCoordinator();
    this.#validatorService = options.validatorService;
    this.#pdfPublisher = options.pdfPublisher ?? defaultPdfPublisher;
    this.#validationReport = null;
    this.#validatedRevision = null;
    const book = options.book ?? createDesktopDraftBook({ title: "Untitled Project" });
    this.#idSeed = options.idSeed ?? (book.metadata.title || "desktop-studio");
    this.#session = wrapSessionForInvalidation(
      new BookSession({
        book,
        idSeed: this.#idSeed,
        initialSelectedSectionId: options.initialSelectedSectionId,
      }),
      () => this.#clearValidationReport(),
    );
    this.#workflow = new WorkflowCoordinator();
    this.#binding = null;
    this.#pendingName = book.metadata.title.trim();
    this.#importer = new ImportService();
  }

  getState(): DesktopStudioState {
    this.#syncValidationInvalidation();
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
      validationReport: cloneValidationReport(this.#validationReport),
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

  getValidationReport(): BookValidationReport | null {
    this.#syncValidationInvalidation();
    return cloneValidationReport(this.#validationReport);
  }

  async runValidation(options?: ValidationRunOptions): Promise<BookValidationReport> {
    if (this.#workflow.getStage() !== "VALIDATION") {
      throw new DesktopStudioError(
        "VALIDATION_NOT_PERMITTED",
        "Validation is permitted only during the VALIDATION stage.",
      );
    }

    const jobId = createProjectId("validation");
    this.#beginStudioJob(
      jobId,
      "VALIDATION_FAILED",
      "A validation job is already running.",
    );

    try {
      const book = this.#session.getBook();
      const domainDiags = await this.#validationCoordinator.runDomainValidation(book);
      const diagnosticSets: (readonly BookDiagnostic[])[] = [
        domainDiags,
      ];
      if (options?.epubCheckReport !== undefined) {
        diagnosticSets.push(
          await this.#validationCoordinator.normalizeEpubCheckReport(options.epubCheckReport),
        );
      }
      if (options?.typstDiagnostics !== undefined) {
        diagnosticSets.push(
          await this.#validationCoordinator.normalizeTypstDiagnostics(options.typstDiagnostics),
        );
      }
      const report = this.#validationCoordinator.aggregate(diagnosticSets);
      this.#validationReport = report;
      this.#validatedRevision = this.#session.getState().revision;
      this.#succeedStudioJob();
      return cloneValidationReport(report)!;
    } catch (err) {
      this.#failStudioJob();
      throw new DesktopStudioError(
        "VALIDATION_FAILED",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async exportEpub(options?: EpubExportOptions): Promise<EpubExportResult> {
    return this.#runExportJob("epub", options?.signal, async () => {
      const stage = this.#workflow.getStage();
      if (stage === "PUBLISH") {
        if (options?.verificationMode === "fast") {
          throw new DesktopStudioError(
            "PUBLISH_FAILED",
            "verificationMode cannot be 'fast' during PUBLISH stage.",
          );
        }
      }
      const mode: "fast" | "verified" =
        stage === "PUBLISH" ? "verified" : (options?.verificationMode ?? "fast");

      const book = this.#session.getBook();
      const pkg = await buildEpubPackage(book, {
        assetResolver: this.getAssetResolver(),
      });
      const bytes = buildEpubArchive(pkg);
      const result: EpubExportResult = {
        format: "epub",
        bytes,
        diagnostics: pkg.diagnostics ?? [],
      };

      if (mode === "verified") {
        const report = await this.#validateEpubBytes(bytes);
        if (
          report.failureKind &&
          report.failureKind !== "none" &&
          report.failureKind !== "conformance"
        ) {
          throw new DesktopStudioError(
            "PUBLISH_FAILED",
            `EPUBCheck runtime error: ${report.failureKind}`,
          );
        }
        if (
          !report.isValid ||
          report.summary.totalFatal > 0 ||
          report.summary.totalErrors > 0
        ) {
          throw new DesktopStudioError(
            "CONFORMANCE_CHECK_FAILED",
            `EPUBCheck failed with ${report.summary.totalErrors} errors.`,
          );
        }
        return { ...result, epubCheckReport: report };
      }

      return result;
    });
  }

  async exportHtml(options?: HtmlExportOptions): Promise<HtmlExportResult> {
    return this.#runExportJob("html", options?.signal, async () => {
      const book = this.#session.getBook();
      const publication = await buildHtml(book, {
        assetResolver: this.getAssetResolver(),
      });
      if (!publication.html || publication.files.length < 1) {
        throw new DesktopStudioError(
          "PUBLISH_FAILED",
          "HTML generation did not produce a publication.",
        );
      }
      return {
        format: "html",
        html: publication.html,
        files: publication.files,
        diagnostics: publication.diagnostics,
      };
    });
  }

  async exportPdf(options?: PdfExportOptions): Promise<PdfExportResult> {
    return this.#runExportJob("pdf", options?.signal, async () => {
      const book = this.#session.getBook();
      const publication = await this.#pdfPublisher.publishPdf(book, {
        assetResolver: this.getAssetResolver(),
        signal: options?.signal,
      });
      return {
        format: "pdf",
        bytes: publication.pdf,
        typstSource: publication.typstSource,
        diagnostics: publication.diagnostics,
      };
    });
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
    this.#resetAssetRuntime();
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
    this.#resetAssetRuntime();

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
    this.#syncValidationInvalidation();
    if (this.#workflow.getStage() === "VALIDATION" && to === "PREVIEW") {
      if (this.#validationReport === null) {
        throw new DesktopStudioError(
          "VALIDATION_FAILED",
          "Cannot transition to PREVIEW: Book Doctor validation has not been run.",
        );
      }
      if (!this.#validationReport.summary.isClean) {
        throw new DesktopStudioError(
          "VALIDATION_FAILED",
          `Cannot transition to PREVIEW: Book has ${this.#validationReport.summary.totalFatal} fatal and ${this.#validationReport.summary.totalErrors} error diagnostics.`,
        );
      }
    }
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

  async ingestAsset(input: AssetIngestInput): Promise<AssetIngestResult> {
    this.#assertAssetsStage();
    const jobId = createProjectId("asset");
    this.#beginStudioJob(jobId, "ASSET_INGEST_FAILED", "An asset job is already running.");
    try {
      const result = await this.#ingestAndAttach(input);
      this.#succeedStudioJob();
      return result;
    } catch (err) {
      this.#failStudioJob();
      if (err instanceof DesktopStudioError) {
        throw err;
      }
      this.#rethrowAuthoring(err);
    }
  }

  async insertImageBlock(input: {
    sectionId: string;
    atIndex: number;
    ingest: AssetIngestInput;
  }): Promise<{ assetRef: AssetRef; block: ContentBlock }> {
    this.#assertAssetsStage();
    if (input.ingest.kind !== "image") {
      throw new DesktopStudioError(
        "ASSET_INGEST_FAILED",
        `insertImageBlock requires ingest kind "image" (received "${input.ingest.kind}").`,
      );
    }

    const snapshotBook = this.#session.getBook();
    const snapshotSelected = this.#session.getState().selectedSectionId;
    const snapshotSeed = this.#idSeed;
    const jobId = createProjectId("asset");
    this.#beginStudioJob(jobId, "ASSET_INGEST_FAILED", "An asset job is already running.");

    try {
      const result = await this.#ingestAndAttach(input.ingest);
      const assetRef = result.assetRef!;
      const alt = input.ingest.altText?.trim() ?? "";
      const block = this.#session.insertBlock(input.sectionId, input.atIndex, {
        type: "image",
        id: "pending-image",
        assetId: assetRef.id,
        caption: alt.length > 0 ? [{ type: "text", text: alt }] : [],
      });
      this.#succeedStudioJob();
      return { assetRef, block };
    } catch (err) {
      this.#replaceSession(snapshotBook, snapshotSeed, snapshotSelected);
      this.#failStudioJob();
      if (err instanceof DesktopStudioError) {
        throw err;
      }
      this.#rethrowAuthoring(err);
    }
  }

  insertExistingImageBlock(sectionId: string, atIndex: number, assetId: string): ContentBlock {
    this.#assertImageAuthoringStage();
    if (!this.#session.getBook().assets.some((asset) => asset.id === assetId)) {
      throw new DesktopStudioError(
        "ASSET_NOT_FOUND",
        `Asset "${assetId}" is not registered on this Book.`,
      );
    }
    try {
      return this.#session.insertBlock(sectionId, atIndex, {
        type: "image",
        id: "pending-image",
        assetId,
        caption: [],
      });
    } catch (err) {
      this.#rethrowAuthoring(err);
    }
  }

  removeImageBlock(sectionId: string, blockId: string): void {
    this.#assertImageAuthoringStage();
    const section = [...this.#session.getBook().frontMatter, ...this.#session.getBook().chapters, ...this.#session.getBook().backMatter]
      .find((item) => item.id === sectionId);
    if (!section) {
      throw new DesktopStudioError("SECTION_NOT_FOUND", `Section "${sectionId}" was not found in the active Book.`);
    }
    const block = section.blocks.find((item) => item.id === blockId);
    if (!block) {
      throw new DesktopStudioError(
        "BLOCK_NOT_FOUND",
        `Block "${blockId}" was not found in section "${sectionId}".`,
      );
    }
    if (block.type !== "image") {
      throw new DesktopStudioError(
        "INVALID_STRUCTURE",
        `Block "${blockId}" is not an image block.`,
      );
    }
    try {
      this.#session.removeBlock(sectionId, blockId);
    } catch (err) {
      this.#rethrowAuthoring(err);
    }
  }

  getAssetResolver(): AssetResolver {
    return this.#resolver;
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
    this.#beginStudioJob(jobId, "IMPORT_FAILED", "An import job is already running.");

    try {
      this.#assertSupportedFormat(source.format);
      const result = await this.#runImport(source, options);
      if (!result.success || result.book === undefined) {
        this.#failStudioJob();
        throw new DesktopStudioError("IMPORT_FAILED", combinedIssueMessages(result.issues));
      }

      const imported = result.book;
      const seed = options?.idSeed ?? (imported.metadata.title || this.#idSeed);
      this.#replaceSession(imported, seed);
      this.#resetAssetRuntime();
      this.#binding = null;
      this.#pendingName = (options?.projectName ?? imported.metadata.title).trim();
      this.#session.updateMetadata({ title: imported.metadata.title });

      const firstChapterId = this.#session.getBook().chapters[0]?.id ?? null;
      if (firstChapterId) {
        this.#session.selectSection(firstChapterId);
      }

      this.#succeedStudioJob();
      this.#workflow.requestTransition({ to: "STRUCTURE" });

      return toStudioImportResult("new-project", result.issues, result.stats);
    } catch (err) {
      this.#failStudioJob();
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
    this.#beginStudioJob(jobId, "IMPORT_FAILED", "An import job is already running.");

    const restore = (): void => {
      this.#replaceSession(preImportSnapshot, restoreSeed, preSelected);
    };

    try {
      this.#assertSupportedFormat(source.format);
      const result = await this.#runImport(source, options);
      if (!result.success || result.book === undefined) {
        this.#failStudioJob();
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
            this.#failStudioJob();
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
        this.#failStudioJob();
        throw new DesktopStudioError(
          "IMPORT_FAILED",
          `Append failed on section "${importedBook.chapters[0]?.title ?? "unknown"}": ${errors.map((e) => e.message).join("; ")}. All changes rolled back.`,
        );
      }

      if (firstImportedMainId) {
        this.#session.selectSection(firstImportedMainId);
      }

      this.#succeedStudioJob();
      return toStudioImportResult("append-sections", result.issues, result.stats);
    } catch (err) {
      this.#failStudioJob();
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

  #beginStudioJob(
    jobId: string,
    busyCode: DesktopStudioError["code"],
    busyMessage: string,
  ): void {
    const status = this.#workflow.getJobStatus();
    if (status === "running") {
      throw new DesktopStudioError(busyCode, busyMessage);
    }
    this.#workflow.requestJobStatus({ to: "running", jobId });
  }

  #failStudioJob(): void {
    if (this.#workflow.getJobStatus() === "running") {
      this.#workflow.requestJobStatus({ to: "failed" });
    }
  }

  #succeedStudioJob(): void {
    this.#workflow.requestJobStatus({ to: "succeeded" });
    this.#workflow.requestJobStatus({ to: "idle" });
  }

  #bindAssetPipeline(): void {
    this.#assetRegistry = new AssetRegistry();
    this.#pipeline = new AssetIngestionPipeline(this.#assetStore, this.#assetRegistry);
    this.#resolver = new StoreBackedAssetResolver(this.#assetStore, this.#assetRegistry);
  }

  #resetAssetRuntime(): void {
    if (!this.#assetStoreInjected) {
      this.#assetStore = new MemoryAssetStore();
    }
    this.#bindAssetPipeline();
  }

  #assertAssetsStage(): void {
    const stage = this.#workflow.getStage();
    if (stage !== "ASSETS") {
      throw new DesktopStudioError(
        "ASSET_NOT_PERMITTED",
        `Asset ingestion is permitted only during the ASSETS stage (current stage: ${stage}).`,
      );
    }
  }

  #assertImageAuthoringStage(): void {
    const stage = this.#workflow.getStage();
    if (stage !== "AUTHORING" && stage !== "ASSETS") {
      throw new DesktopStudioError(
        "ASSET_NOT_PERMITTED",
        `Image-block authoring is permitted only during AUTHORING or ASSETS (current stage: ${stage}).`,
      );
    }
  }

  async #ingestAndAttach(input: AssetIngestInput): Promise<AssetIngestResult> {
    const result = await this.#pipeline.ingest({
      ...input,
      idSeed: input.idSeed ?? this.#idSeed,
    });
    if (!result.success || result.assetRef === undefined) {
      throw new DesktopStudioError(
        "ASSET_INGEST_FAILED",
        combinedAssetIssueMessages(result.issues),
      );
    }
    this.#session.addAsset(result.assetRef);
    return result;
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
    this.#session = wrapSessionForInvalidation(
      new BookSession({
        book,
        idSeed,
        initialSelectedSectionId: preferredOk ? preferredSectionId : undefined,
      }),
      () => this.#clearValidationReport(),
    );
    this.#clearValidationReport();
  }

  #clearValidationReport(): void {
    this.#validationReport = null;
    this.#validatedRevision = null;
  }

  #syncValidationInvalidation(): void {
    if (this.#validationReport === null) {
      return;
    }
    if (this.#session.getState().revision !== this.#validatedRevision) {
      this.#clearValidationReport();
    }
  }

  #assertExportStage(): void {
    const stage = this.#workflow.getStage();
    if (stage !== "PREVIEW" && stage !== "PUBLISH") {
      throw new DesktopStudioError(
        "PUBLISH_NOT_PERMITTED",
        `Export is permitted only during PREVIEW or PUBLISH (current stage: ${stage}).`,
      );
    }
  }

  #assertPhase1Clean(): void {
    this.#syncValidationInvalidation();
    if (this.#validationReport === null) {
      throw new DesktopStudioError(
        "PREPUBLISH_VALIDATION_FAILED",
        "Cannot export: Book Doctor validation has not been run.",
      );
    }
    if (!this.#validationReport.summary.isClean) {
      throw new DesktopStudioError(
        "PREPUBLISH_VALIDATION_FAILED",
        `Cannot export: Book has ${this.#validationReport.summary.totalFatal} fatal and ${this.#validationReport.summary.totalErrors} errors.`,
      );
    }
  }

  #throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new DesktopStudioError(
        "OPERATION_ABORTED",
        "Export operation was aborted.",
      );
    }
  }

  async #runExportJob<T>(
    format: string,
    signal: AbortSignal | undefined,
    work: () => Promise<T>,
  ): Promise<T> {
    this.#assertExportStage();
    this.#assertPhase1Clean();
    const jobId = createProjectId(`export-${format}`);
    this.#beginStudioJob(
      jobId,
      "PUBLISH_FAILED",
      "A workflow operation is already running.",
    );
    try {
      this.#throwIfAborted(signal);
      const result = signal
        ? await Promise.race([work(), abortError(signal)])
        : await work();
      this.#throwIfAborted(signal);
      this.#succeedStudioJob();
      return result;
    } catch (err) {
      this.#failStudioJob();
      if (err instanceof DesktopStudioError) {
        throw err;
      }
      if (isAbortError(err) || signal?.aborted) {
        throw new DesktopStudioError(
          "OPERATION_ABORTED",
          err instanceof Error ? err.message : "Export operation was aborted.",
        );
      }
      if (isTypstRuntimeError(err)) {
        throw new DesktopStudioError("RENDERER_COMPILER_FAILED", err.message);
      }
      throw new DesktopStudioError(
        "PUBLISH_FAILED",
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  async #validateEpubBytes(bytes: Uint8Array): Promise<ValidationReport> {
    const validator = this.#validatorService ?? productionValidatorService;
    return writeTempEpubAndValidate(bytes, validator);
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
    if (err instanceof BlockNotFoundError) {
      throw new DesktopStudioError("BLOCK_NOT_FOUND", err.message);
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

function combinedAssetIssueMessages(issues: readonly AssetIssue[]): string {
  if (issues.length === 0) {
    return "Asset ingestion failed.";
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

const SESSION_MUTATORS = new Set([
  "addSection",
  "removeSection",
  "reorderSection",
  "moveSection",
  "updateSectionTitle",
  "updateSectionRole",
  "updateMetadata",
  "setSectionBlocks",
  "insertBlock",
  "updateBlock",
  "removeBlock",
  "addAsset",
  "removeAsset",
  "undo",
  "redo",
]);

function wrapSessionForInvalidation(
  session: BookSession,
  onMutate: () => void,
): BookSession {
  return new Proxy(session, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target) as unknown;
      if (typeof value !== "function" || typeof prop !== "string") {
        return value;
      }
      if (!SESSION_MUTATORS.has(prop)) {
        return value.bind(target);
      }
      return (...args: unknown[]) => {
        const result = (value as (...inner: unknown[]) => unknown).apply(target, args);
        if ((prop === "undo" || prop === "redo") && result === false) {
          return result;
        }
        onMutate();
        return result;
      };
    },
  });
}

function cloneValidationReport(
  report: BookValidationReport | null,
): BookValidationReport | null {
  if (report === null) {
    return null;
  }
  return structuredClone(report);
}

function abortError(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    const rejectAbort = () => {
      const err = new Error("The operation was aborted.");
      err.name = "AbortError";
      reject(err);
    };
    if (signal.aborted) {
      rejectAbort();
      return;
    }
    signal.addEventListener("abort", rejectAbort, { once: true });
  });
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function isTypstRuntimeError(err: unknown): err is Error {
  return err instanceof Error && err.name === "TypstRuntimeError";
}
