# ADR-0019: Desktop Studio Integration Architecture — Gate 8

* **Status:** Accepted
* **Date:** 2026-09-11
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Desktop Studio Integration Architecture — Gate 8
* **Depends on:** ADR-0006, ADR-0007, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0015, ADR-0016, ADR-0017, ADR-0018
* **Implementation status:** Slice 1 authorized and implemented (Coordinator & Authoring Integration). Slice 2 authorized and implemented (Import & Ingestion Surface). Slices 3–5 remain gated and require separate explicit authorization.

---

## 1. Context

OpenBook completed Gates 1 through 7 on `main` (`33c4b54`, post PR #41), establishing 11 format-neutral domain and publishing packages with 182/182 passing automated tests:
- **Publishing Engines:** `@openbook/epub` (EPUB 3.3 Gates 1–3), `@openbook/html` (Gate 4), `@openbook/pdf` (Typst 0.15.1 Gate 6), and `@openbook/validator` (Gate 5 production EPUBCheck 5.3.0 + Temurin 21 JRE packaging).
- **Workflow & Content Foundations (Gate 7):** `@openbook/workflow` (ADR-0014 7-stage pipeline coordinator), `@openbook/importer` (ADR-0015 Markdown/text ingestion), `@openbook/authoring` (ADR-0016 `BookSession` structural operations), `@openbook/assets` (ADR-0017 content-addressed store), and `@openbook/book-doctor` (ADR-0018 `BookValidationReport` coordinator).

However, `apps/desktop` remains at its PR #17 baseline:
1. It relies on an early, local prototype `EditorBookSession` shim rather than the canonical `@openbook/authoring` `BookSession`.
2. It does not integrate `@openbook/workflow`; the 7 pipeline stages (`IMPORT`, `STRUCTURE`, `AUTHORING`, `ASSETS`, `VALIDATION`, `PREVIEW`, `PUBLISH`) are absent from the desktop application.
3. It has no integration with file ingestion (`@openbook/importer`), content-addressed asset management (`@openbook/assets`), Book Doctor diagnostics (`@openbook/book-doctor`), or publishing exports (`@openbook/epub`, `@openbook/html`, `@openbook/pdf`).
4. Heavy engine subprocesses (Java runtime for EPUBCheck, native Typst binary for PDF) have no formalized asynchronous execution and host isolation contract within the desktop application.

This ADR defines the overarching architecture for **Gate 8: Desktop Studio Integration**, establishing the domain coordination, persistence boundaries, editor synchronization invariants, and host subprocess isolation required to integrate the Gate 7 packages into `apps/desktop`.

**Acceptance of this ADR does not authorize implementation of all Gate 8 capabilities at once.** Implementation proceeds strictly slice-by-slice, starting with Slice 1 only.

---

## 2. Decision

OpenBook establishes the **Desktop Studio Integration Architecture** in `apps/desktop`, orchestrated by a headless domain coordinator `DesktopStudioCoordinator` connecting the React/Tauri UI to the underlying domain packages.

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          Desktop Studio UI                              │
│         (React 19 + Tiptap Surface + Stage Navigation Panels)           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ dispatches UI intents
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Desktop Studio Coordinator                           │
│  ├── WorkflowCoordinator (@openbook/workflow)                           │
│  ├── BookSession (@openbook/authoring)                                  │
│  ├── AssetStore & Resolver (@openbook/assets)                           │
│  └── ValidationCoordinator (@openbook/book-doctor)                      │
└───────┬────────────────────────────┬────────────────────────────┬───────┘
        │ persistence                │ canonical Book             │ read-only export
        ▼                            ▼                            ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌───────────────────┐
│  ProjectPersistence  │   │      Book Model      │   │Publishing Engines │
│       (SQLite)       │   │(canonical / firewall)│   │ (EPUB/HTML/PDF)   │
└──────────────────────┘   └──────────────────────┘   └───────────────────┘
```

---

## 3. Core Architectural Invariants & Clarifications

### 3.1 Clarification 1: Desktop Runtime Isolation & Async Subprocess Boundaries
1. **Headless Domain Decoupling:** `DesktopStudioCoordinator` resides in `apps/desktop/src/domain` and operates as a pure TypeScript aggregate. It MUST NOT import `@tauri-apps/*`, React hooks, or browser DOM globals directly, ensuring full unit-testability via Node.js test runners.
2. **Subprocess Host Isolation:** Execution of external binaries (`java -jar epubcheck.jar` via `@openbook/validator`, `typst compile` via `@openbook/pdf`) MUST NOT run inline on the browser UI rendering thread. Subprocess calls are isolated behind host adapter interfaces (`PublishingHostPort` / `ValidationHostPort`).
3. **Async Job Coordination:** All long-running validation and publishing operations MUST be dispatched through `@openbook/workflow` job state transitions (`idle` → `running` → `succeeded` | `failed`) with a unique `jobId`. UI consumers observe job state reactively without blocking.

### 3.2 Clarification 2: Persistence & Storage Boundaries (Book vs Assets vs Workflow)
1. **Book Model Sovereignty:** The canonical `Book` object emitted by `@openbook/authoring` `BookSession.getBook()` is the sole persistent document truth.
2. **Tiptap JSON Never Persisted:** Tiptap / ProseMirror JSON is strictly an ephemeral UI transport representation and MUST NEVER be written to SQLite or stored in project envelopes.
3. **Content-Addressed Asset Storage:** In accordance with ADR-0017, binary asset blobs are stored via `@openbook/assets` (`AssetStore`) addressed by SHA-256 hashes. Large binary payloads MUST NOT be serialized directly into SQLite `project_documents` JSON. The canonical `Book` stores only lightweight `AssetRef` metadata.
4. **Transient Workflow State:** Per ADR-0014 §2.1, `WorkflowState` contains only pipeline stage and job status (`assertNoCanonicalBookContent`). It is operational session state and MUST NOT be conflated with the canonical `Book` data.

### 3.3 Clarification 3: Editor Granularity & Synchronization Boundary
1. **Section-Level Active Surface:** The Tiptap editor operates on a **single active section** at a time (`selectedSectionId`). It does not hold or edit the entire book simultaneously.
2. **EditorAdapter Translation:** Bidirectional conversion between the active section's `ContentBlock[]` and Tiptap's ProseMirror document is handled exclusively by `EditorAdapter` (`apps/desktop/src/domain/editorAdapter.ts`).
3. **Session as Aggregate Root:** `BookSession` (@openbook/authoring) is the aggregate root governing structure (chapters, matter, ordering, block allocation, metadata, deletion guardrails).
4. **Atomic Rollback on Invalid Edits:** When active section edits or structural operations are applied to `BookSession`, validation is enforced via `validateBook()`. If validation fails, `BookSession` rolls back atomically (ADR-0016 INV-8), preserving session integrity and emitting a structured diagnostic.
5. **Retirement of Legacy Shim:** The early prototype `apps/desktop/src/domain/editorBookSession.ts` is formally retired and replaced by an adapter delegating directly to `@openbook/authoring` `BookSession`.

---

## 4. Interface Definitions

### 4.1 Desktop Studio State Aggregate
```typescript
export interface DesktopStudioState {
  // Pipeline Stage & Async Job Coordination (ADR-0014)
  stage: WorkflowStage;
  jobStatus: JobStatus;
  activeJobId?: string;

  // Project Persistence Binding (ADR-0007 / PR #16)
  binding: ActiveProjectBinding | null;
  isDirty: boolean;
  revision: number;

  // Authoring Navigation (ADR-0016)
  selectedSectionId: string | null;

  // Book Doctor Aggregated Diagnostics (ADR-0018)
  validationReport: BookValidationReport | null;
}
```

### 4.2 Desktop Studio Coordinator Contract
```typescript
export interface IDesktopStudioCoordinator {
  // State Inspection
  getState(): DesktopStudioState;
  getBook(): Book;
  getSession(): BookSession;

  // Persistence Operations
  newProject(name: string, language?: string): Promise<void>;
  openProject(projectId: string): Promise<void>;
  saveProject(): Promise<SaveSummary>;

  // Workflow Pipeline Transitions (ADR-0014)
  transitionStage(to: WorkflowStage): void;

  // Stage 1: Ingestion (ADR-0015)
  importSource(source: string, format: "markdown" | "text"): Promise<void>;

  // Stage 2 & 3: Structure & Authoring (ADR-0016)
  selectSection(sectionId: string): void;
  updateActiveSectionBlocks(blocks: ContentBlock[]): void;

  // Stage 4: Asset Management (ADR-0017)
  ingestAsset(file: { originalFilename: string; bytes: Uint8Array; mimeType: string }): Promise<AssetRef>;
  getAssetResolver(): AssetResolver;

  // Stage 5: Validation / Book Doctor (ADR-0018)
  runValidation(): Promise<BookValidationReport>;

  // Stage 6 & 7: Preview & Publishing (ADR-0009, ADR-0011, ADR-0013)
  publishEpub(options?: EpubBuildOptions): Promise<Uint8Array>;
  publishHtml(options?: HtmlBuildOptions): Promise<{ html: string; files: Map<string, Uint8Array> }>;
  publishPdf(options?: PdfBuildOptions): Promise<Uint8Array>;
}
```

---

## 5. Ordered Slicing Strategy for Gate 8

To preserve rigorous verification and avoid monolithic changes, Gate 8 is broken into five discrete engineering slices:

| Slice | Scope | Focus & Boundaries |
| :--- | :--- | :--- |
| **Slice 1** | **Coordinator & Authoring Integration** | **Only slice to be initially authorized.** Retire local `EditorBookSession` prototype. Implement `DesktopStudioCoordinator` wiring `@openbook/workflow` and `@openbook/authoring` to existing `EditorAdapter` and `ProjectPersistence`. Save/Open persists canonical `Book` from `BookSession`. Full unit test coverage. |
| **Slice 2** | **Import & Ingestion Surface** | Wire `@openbook/importer` to the `IMPORT` stage. Support Markdown and plaintext ingestion into `BookSession` with chapter splitting and frontmatter mapping. |
| **Slice 3** | **Asset Management & Media Boundary** | Wire `@openbook/assets` (`MemoryAssetStore` / desktop asset store). Enable image ingestion, SHA-256 deduplication, SVG safety verification, and `StoreBackedAssetResolver` resolution. |
| **Slice 4** | **Book Doctor Diagnostic Surface** | Wire `@openbook/book-doctor` `ValidationCoordinator` into the `VALIDATION` stage. Surface aggregated `BookValidationReport` diagnostics in the desktop UI. |
| **Slice 5** | **Publishing Pipeline Integration** | Wire `@openbook/epub`, `@openbook/html`, and `@openbook/pdf` to `PREVIEW` and `PUBLISH` stages. Host-isolated binary generation with zero reverse mutation. |

---

## 6. Consequences

### Positive
* Replaces all prototype desktop session shims with production Gate 7 packages.
* Establishes a clean, unidirectional reactive architecture centered around the canonical `BookModel`.
* Guarantees that heavy publishing and validation subprocesses never freeze the desktop UI.
* Keeps Tiptap JSON strictly ephemeral and prevents persistence leaks.

### Governance Constraints
* **Slice 1 is authorized and implemented. Slice 2 is authorized and implemented.** Slices 3 through 5 remain gated and require subsequent explicit authorizations.
* Code changes for Slice 1 must not introduce publishing engines or import UI prematurely.
