# ADR-0020: Desktop Import & Ingestion Surface Architecture — Gate 8 Slice 2

* **Status:** Accepted
* **Date:** 2026-09-11
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Desktop Import & Ingestion Surface Architecture — Gate 8 Slice 2
* **Depends on:** ADR-0006, ADR-0007, ADR-0014, ADR-0015, ADR-0016, ADR-0019
* **Implementation status:** Gated — Requires separate explicit authorization (implementation NOT authorized by this ADR alone)

---

## 1. Context

OpenBook completed Gate 8 Slice 1 on `main` (`02a71ab`, PR #42), establishing `DesktopStudioCoordinator` in `apps/desktop/src/domain`. The coordinator wires `@openbook/workflow` (`WorkflowCoordinator`) and `@openbook/authoring` (`BookSession`) to `EditorAdapter` and `ProjectPersistence`, replacing the legacy prototype `EditorBookSession` with 49 passing desktop tests.

Under ADR-0014 (§2.3) and ADR-0019 (§5), the first pipeline stage of book production is **`IMPORT`**:
```text
IMPORT ──► STRUCTURE ──► AUTHORING ──► ASSETS ──► VALIDATION ──► PREVIEW ──► PUBLISH
```

In Gate 7 Slice 2 (ADR-0015), OpenBook delivered `@openbook/importer`, a format-neutral ingestion engine supporting Markdown and plain text conversion into canonical `Book` structures with heading-based chapter splitting, YAML frontmatter extraction, and deterministic ID synthesis.

However, `apps/desktop` currently initializes only empty draft books (`createDesktopDraftBook`) or opens existing SQLite projects. It possesses no capability to ingest external Markdown or plain-text files into the active studio workspace.

This ADR defines **Gate 8 Slice 2: Desktop Import & Ingestion Surface Architecture**, specifying:
1. The ingestion contract connecting `@openbook/importer` to `DesktopStudioCoordinator`.
2. Mapping imported content into canonical `BookSession` instances (both new project creation and section ingestion).
3. Chapter and section splitting behavior based on heading strategies.
4. Frontmatter parsing and metadata override resolution without synthetic manufacture of `publishedAt`.
5. Strict interaction with `@openbook/workflow` stage transitions and asynchronous job statuses during the `IMPORT` stage.
6. Clear boundaries ensuring that import does not trigger silent persistence, leak parser ASTs, or bypass `BookSession` validation.

**Acceptance of this ADR does not authorize implementation.** Implementation remains strictly gated and requires separate explicit authorization.

---

## 2. Decision

OpenBook integrates `@openbook/importer` into `apps/desktop` via `DesktopStudioCoordinator`, providing headless, non-blocking ingestion of Markdown and plain-text content into canonical `BookSession` aggregates during the `IMPORT` pipeline stage.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Desktop UI / Host                               │
│  (File Open Dialog / Drag-and-Drop / Ingestion Panel in IMPORT stage)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ ImportSource { format, content, filename }
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  DesktopStudioCoordinator (Domain)                     │
│                                                                        │
│  1. Workflow Job: idle ──► running ("import-...")                      │
│  2. Delegate to @openbook/importer ImportService                       │
│  3. Validate ImportResult & Book Model invariants                      │
│  4. Initialize or update @openbook/authoring BookSession               │
│  5. Workflow Job: running ──► succeeded (or failed on error)           │
│  6. Workflow Transition: IMPORT ──► STRUCTURE                          │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ BookSession.getBook()          │ selectedSectionId
                    ▼                                ▼
         ┌─────────────────────┐          ┌───────────────────────┐
         │ ProjectPersistence  │          │     EditorAdapter     │
         │ (SQLite - on Save)  │          │ (Active Section Tiptap│
         └─────────────────────┘          └───────────────────────┘
```

---

## 3. Core Architectural Invariants

### 3.1 Ingestion Invariants
1. **INV-1 (Pre-Decoded Unicode Boundary):** The coordinator consumes `ImportSource` containing pre-decoded JavaScript Unicode strings (`content`). Character decoding, file system access, and BOM stripping are performed by the caller/host prior to passing content to the domain.
2. **INV-2 (Format Firewall):** Supported formats are strictly `"markdown"` and `"text"`. Any unsupported format (e.g. EPUB, HTML, PDF, DOCX) is rejected deterministically with a structured `UNSUPPORTED_FORMAT` error.
3. **INV-3 (Parser AST Isolation):** Markdown tokens, AST nodes, raw HTML, and Pandoc representations MUST NEVER cross the import service boundary into `DesktopStudioCoordinator` or `BookSession`. Only canonical `Book` structures are emitted.
4. **INV-4 (No Silent Manufactured Metadata):** In accordance with ADR-0015 §2.3, if frontmatter omits `publishedAt`, it remains empty/unspecified. The coordinator must never synthesize publication dates during ingestion.
5. **INV-5 (Deterministic ID Allocation & Conflict Guard):** When an imported `Book` is mapped into an existing `BookSession`, all section and block IDs are guaranteed non-colliding with existing project IDs by `BookSession`'s internal ID allocation rules.

### 3.2 Workflow & State Invariants
1. **INV-6 (IMPORT Stage Governance):** Ingestion is permitted only when the workflow stage allows it. Under ADR-0014, the initial stage is `IMPORT`. Once import succeeds, the coordinator transitions the workflow to `STRUCTURE`.
2. **INV-7 (Asynchronous Job State Management):** Ingestion is managed as a tracked workflow job:
   - `jobStatus: "idle"` → `jobStatus: "running"` with `jobId: "import-<uuid>"`
   - On success: `jobStatus: "succeeded"` → `jobStatus: "idle"`
   - On error: `jobStatus: "failed"`, and workflow stage remains `IMPORT`.
3. **INV-8 (Zero Canonical Content in Workflow State):** `WorkflowState` contains only `stage`, `jobStatus`, and `jobId`. `assertNoCanonicalBookContent(workflowState)` must pass at all times.

### 3.3 Persistence & Editor Invariants
1. **INV-9 (In-Memory Replacement & Persistence Isolation):** Ingestion NEVER writes directly to SQLite `ProjectPersistence` and NEVER deletes or mutates existing saved projects. In `new-project` mode, import replaces the active in-memory `BookSession` only; any previously persisted project in SQLite remains intact and unaltered. The imported session begins in-memory with `binding = null`, `isDirty = true`, and incremented `revision`. Persistence to SQLite occurs only upon explicit `saveProject()`.
2. **INV-10 (Batch Atomicity Guard for `append-sections`):** In `append-sections` mode, atomicity is batch-wide: the coordinator preserves a pre-import snapshot of the active `Book`. If any section in the imported document fails validation, structural checks, or role mapping, the entire operation is rolled back to the pre-import snapshot. All sections succeed or the existing `BookSession` remains 100% unchanged.
3. **INV-11 (Immediate Editor Projection):** Upon successful import, the coordinator sets `selectedSectionId` to the first imported main chapter. Tiptap JSON is projected on-demand via `activeSectionToTipTap()` through `EditorAdapter`.

---

## 4. Contract & Interface Specifications

### 4.1 Ingestion Request & Options
```typescript
import type { ImportOptions, ImportSource, ImportResult } from "@openbook/importer";

export interface StudioImportOptions extends ImportOptions {
  /**
   * Target mode for the imported content:
   * - "new-project": Discards active draft and initializes a fresh BookSession from import.
   * - "append-sections": Ingests imported sections into the active BookSession as new chapters.
   * Default: "new-project".
   */
  readonly mode?: "new-project" | "append-sections";

  /** Project name to assign when mode === "new-project". Defaults to title from frontmatter or filename. */
  readonly projectName?: string;
}

export interface StudioImportResult {
  readonly success: boolean;
  readonly mode: "new-project" | "append-sections";
  readonly sectionCount: number;
  readonly blockCount: number;
  readonly wordCount: number;
  readonly issues: readonly ImportIssue[];
}
```

### 4.2 Coordinator Interface Additions
`IDesktopStudioCoordinator` is extended with the Slice 2 ingestion contract:

```typescript
export interface IDesktopStudioCoordinator {
  // Existing Slice 1 methods retained:
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
  applyActiveSectionTipTap(tipTap: TipTapDocJSON, createId?: (prefix: string) => string): EditorConversionWarning[];
  activeSectionToTipTap(): TipTapDocConversion;
  listChapters(): ChapterSummary[];
  close(): Promise<void>;

  // --- SLICE 2 ADDITIONS ---

  /**
   * Ingest Markdown or plain text into the studio workspace.
   * Dispatches via @openbook/importer ImportService, coordinates workflow job
   * states, and updates BookSession.
   */
  importContent(source: ImportSource, options?: StudioImportOptions): Promise<StudioImportResult>;
}
```

---

## 5. Ingestion Execution Flow

### 5.1 Mode: `new-project` (Default)
1. Verify workflow permits `IMPORT` stage.
2. Request workflow job status: `running` (`jobId: "import-..."`).
3. Instantiate `ImportService` and execute `import(source, options)`.
4. If `result.success === false` or `result.book` is undefined:
   - Request workflow job status: `failed`.
   - Throw `DesktopStudioError("IMPORT_FAILED", combinedIssueMessages)`.
5. Construct a new `BookSession` wrapping `result.book`.
6. Reset project binding to `null` (unpersisted new project). **Crucial persistence guarantee:** If a previously saved project was open, its SQLite database records are neither modified nor deleted; only the active in-memory session is replaced.
7. Update pending project name to `options.projectName ?? result.book.metadata.title`.
8. Request workflow job status: `succeeded` followed by `idle`.
9. Automatically transition workflow stage from `IMPORT` to `STRUCTURE`.
10. Set `selectedSectionId` to `result.book.chapters[0]?.id ?? null`.
11. Return `StudioImportResult`.

### 5.2 Mode: `append-sections`
1. Ensure an active session exists with at least one chapter.
2. Capture a pre-import snapshot of the active canonical `Book` (`preImportSnapshot = session.getBook()`) and pre-import revision.
3. Request workflow job status: `running` (`jobId: "import-append-..."`).
4. Execute `ImportService.import(source, options)`.
5. If `result.success === false` or `result.book` is undefined:
   - Request workflow job status: `failed`.
   - Throw `DesktopStudioError("IMPORT_FAILED", combinedIssueMessages)`.
6. Apply sections across matter partitions (`frontMatter`, `chapters`, `backMatter`):
   - For each section, invoke `session.addSection({ matter, title, role, initialBlocks })`.
   - If ANY addition fails (e.g. `DomainValidationError`, `InvalidStructureOperationError`, or unexpected error):
     - Restore `BookSession` immediately from `preImportSnapshot`.
     - Request workflow job status: `failed`.
     - Throw `DesktopStudioError("IMPORT_FAILED", `Append failed on section "${section.title}": ${err.message}. All changes rolled back.`)`.
7. Verify post-import book satisfies `validateBook()` with zero errors.
8. Request workflow job status: `succeeded` followed by `idle`.
9. Mark session dirty. Do NOT advance workflow stage (user remains in current stage).
10. Return `StudioImportResult`.

---

## 6. Chapter Splitting & Frontmatter Semantics

1. **Chapter Splitting:**
   - When importing Markdown, `splitStrategy: "heading-1"` (default) splits content on top-level headings (`# Heading`). Each split creates an independent `BookSection` in `mainMatter`.
   - Intro text before the first `# Heading` is assigned to Chapter 1 or front matter if explicitly configured.
   - For plain text, `splitStrategy: "single-chapter"` wraps all paragraphs into a single main chapter.
2. **Frontmatter Processing:**
   - Frontmatter is extracted via `@openbook/importer` `extractFrontmatter`.
   - `title`: Extracted from frontmatter. If missing, falls back to `source.filename` (sans extension), or `"Untitled Import"`.
   - `language`: Extracted from frontmatter `lang` or `language`. Falls back to `options.defaultLanguage ?? "en"`.
   - `authors`: Extracted from frontmatter `author` or `authors`. Defaults to `["Unknown"]` if empty.
   - `publishedAt`: Preserved only if explicitly present in frontmatter in ISO format; otherwise left empty (INV-4).

---

## 7. Verification & Testing Strategy

Slice 2 implementation requires exhaustive unit testing within `apps/desktop`:

1. **Format Validation:**
   - Import valid Markdown with frontmatter and `#` headings ⇒ produces valid `BookSession` with correct chapter count and title.
   - Import plain text ⇒ produces single-chapter `BookSession` with paragraph blocks.
   - Import invalid/unsupported format (e.g. `"html"`) ⇒ rejects deterministically with `DesktopStudioError`.
2. **Workflow Coordination:**
   - Workflow job transitions from `idle` → `running` → `succeeded` → `idle`.
   - Workflow stage advances from `IMPORT` to `STRUCTURE` upon successful `new-project` import.
   - Failed import sets job status to `failed` and leaves stage at `IMPORT`.
3. **Unicode & Multilingual Integrity:**
   - Kannada and mixed-script Markdown imports preserve Unicode code points intact through `BookSession` and `EditorAdapter`.
4. **Persistence Isolation:**
   - Verify that `importContent()` does NOT write rows to `ProjectPersistence`.
   - Subsequent `saveProject()` persists the imported `Book` accurately into SQLite.
5. **Rollback Verification:**
   - In `append-sections` mode, simulated validation failure during section addition rolls back to original session state without orphaned sections.

---

## 8. Consequences

### Positive
* Enables OpenBook Desktop Studio to ingest real-world manuscripts in Markdown and plain text.
* Fully reuses the battle-tested `@openbook/importer` package without duplicating parsing logic.
* Connects the first pipeline stage (`IMPORT`) to actual user operations, advancing the workflow to `STRUCTURE`.
* Maintains strict domain invariants: no silent persistence, no synthetic metadata, no raw AST leakage.

### Governance Constraints
* **Acceptance of this ADR does not authorize implementation.**
* When authorized, implementation is strictly limited to Slice 2 (`apps/desktop` import coordination and ingestion tests).
* Slices 3 (Assets), 4 (Book Doctor), and 5 (Publishing) remain strictly gated.
