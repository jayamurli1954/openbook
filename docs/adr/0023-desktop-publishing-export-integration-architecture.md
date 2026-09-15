# ADR-0023: Desktop Studio Publishing & Export Integration Architecture — Gate 8 Slice 5

* **Status:** Accepted
* **Date:** 2026-09-15
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Desktop Studio Publishing & Export Integration Architecture — Gate 8 Slice 5
* **Depends on:** ADR-0006, ADR-0007, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013, ADR-0014, ADR-0017, ADR-0018, ADR-0019, ADR-0020, ADR-0021, ADR-0022
* **Implementation status:** Slice 5 implemented (`DesktopStudioCoordinator.exportEpub` / `exportHtml` / `exportPdf`). Acceptance does not authorize later/unrelated work (Tauri/React export UI, SQLite schema changes, AI/Ollama, cloud/network export, a new HTML validator, or DTP redesign).

---

## 1. Context

OpenBook has completed Gate 8 Slices 1 through 4 on `main` (`fc4e3f5`):
- **Slice 1 (ADR-0019):** `DesktopStudioCoordinator` wiring `@openbook/workflow` and `@openbook/authoring` `BookSession` to `ProjectPersistence`.
- **Slice 2 (ADR-0020):** Import and ingestion surface via `@openbook/importer` for the `IMPORT` stage.
- **Slice 3 (ADR-0021):** Asset management and media boundary via `@openbook/assets` for the `ASSETS` stage.
- **Slice 4 (ADR-0022):** Book Doctor diagnostic integration via `@openbook/book-doctor` for the `VALIDATION` stage.

Under ADR-0014 (§2.3) and ADR-0019 (§5), the final two stages of the book production pipeline are **`PREVIEW`** and **`PUBLISH`**:
```text
IMPORT ──► STRUCTURE ──► AUTHORING ──► ASSETS ──► VALIDATION ──► PREVIEW ──► PUBLISH
```

OpenBook possesses production-tested publishing engines across Gates 1–6:
- `@openbook/epub` (ADR-0009, ADR-0010): Deterministic EPUB 3.3 packaging with OCF ZIP serialization.
- `@openbook/html` (ADR-0011): Semantic, sanitized HTML5 publication bundle.
- `@openbook/pdf` (ADR-0013): Production PDF generation via bundled Typst v0.15.1 with complex-script (Kannada) shaping.
- `@openbook/validator` (ADR-0005, ADR-0012): Production EPUBCheck 5.3.0 runtime isolation with Eclipse Temurin 21 JRE.

Currently, `DesktopStudioCoordinator` lacks the orchestration to trigger EPUB, HTML, or PDF generation, resolve assets at projection time, enforce post-build EPUB conformance via EPUBCheck, or report workflow job states during export.

This ADR defines **Gate 8 Slice 5: Desktop Publishing & Export Integration Architecture**, establishing:
1. Publishing orchestration connecting `@openbook/epub`, `@openbook/html`, `@openbook/pdf`, and `@openbook/validator` to `DesktopStudioCoordinator`.
2. Distinct workflow semantics and verification requirements for `PREVIEW` versus `PUBLISH`.
3. Strict read-only publishing semantics: the canonical `Book` is never mutated during export.
4. Two-phase validation gating: mandatory pre-generation domain cleanliness (Phase 1) followed by post-generation artifact verification (Phase 2).
5. Mandatory EPUBCheck verification for all `PUBLISH` operations, with an explicit fast-preview bypass permitted only in `PREVIEW`.
6. Explicit definition of Phase 2 verification per format (EPUBCheck for EPUB, Typst compilation for PDF, structural completion/diagnostics for HTML).
7. Zero production escape hatches: sealed runtime paths for Typst and EPUBCheck with injectable runner ports for testing.
8. Tripartite determinism: identical canonical Book content + identical resolved asset bytes + identical approved runtime inputs.
9. Asset resolution mapping via the coordinator's existing `StoreBackedAssetResolver`.
10. Subprocess isolation, non-reentrant job reporting, and cancellation via `AbortSignal`.
11. Persistence firewall: generated binaries are never written to SQLite.
12. Headless domain isolation: zero Tauri, React, or browser DOM dependencies in the coordinator; host layer handles native file dialogs and disk writing.

**Acceptance of this ADR does not authorize later or unrelated work.** Slice 5 implementation is authorized separately and is now implemented. Host-layer file dialogs, export UI, SQLite schema changes, AI/Ollama, cloud/network export, a dedicated HTML validator, and DTP redesign remain out of scope.

---

## 2. Decision

OpenBook establishes desktop publishing and export orchestration in `apps/desktop` via `DesktopStudioCoordinator`, providing headless, non-mutating, deterministic generation of EPUB 3.3, HTML5, and PDF artifacts during the `PREVIEW` and `PUBLISH` stages.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Desktop UI / Host                               │
│              (Tauri Save Dialog / Reader Preview / Action Bar)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ exportEpub / exportHtml / exportPdf
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  DesktopStudioCoordinator (Domain)                     │
│                                                                        │
│  1. Assert stage === "PREVIEW" || stage === "PUBLISH"                  │
│  2. Phase 1 (Pre-Generation Domain Gate):                              │
│     • Assert validationReport.summary.isClean === true                 │
│  3. Workflow Job: idle ──► running ("export-...")                      │
│  4. Read-only snapshot: session.getBook()                              │
│  5. Injected AssetResolver: this.getAssetResolver()                    │
│  6. Generate Artifact:                                                 │
│     • EPUB: @openbook/epub (buildEpubPackage -> buildEpubArchive)      │
│     • HTML: @openbook/html (buildHtml)                                 │
│     • PDF:  @openbook/pdf  (buildPdf via IPdfPublisher)                │
│  7. Phase 2 (Post-Generation Artifact Verification Gate):              │
│     • EPUB: In PUBLISH, EPUBCheck is MANDATORY; in PREVIEW, runs       │
│             unless verificationMode === "fast".                        │
│     • PDF:  Typst compile completion without fatal compiler error.     │
│     • HTML: buildHtml generation completion and diagnostic check.      │
│  8. Workflow Job: running ──► succeeded ──► idle                       │
│  9. Return in-memory ExportResult (bytes, markup, diagnostics)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ In-memory Result Payload
                                    ▼
                         ┌────────────────────┐
                         │   Host / Caller    │
                         │ (Disk write / UI)  │
                         └────────────────────┘
```

---

## 3. Core Architectural Invariants

### 3.1 Domain, Mutation & Determinism Invariants
1. **INV-1 (Sole Canonical Input & Absolute Immutability):** The canonical `Book` snapshot from `BookSession.getBook()` is the sole document truth. Publishing engines receive a read-only projection. Publishing operations **MUST NEVER mutate, modify, reorder, or annotate the canonical `Book`** (ADR-0014 §2.2).
2. **INV-2 (Zero Parallel Document Model):** Engines project directly from canonical `Book` entities (frontMatter, chapters, backMatter, ContentBlock). No intermediate parallel AST or ProseMirror document graph is created or persisted.
3. **INV-3 (Asset Resolution Boundary):** Binary assets referenced by `AssetRef.id` in `image` blocks are resolved strictly through the coordinator's existing `StoreBackedAssetResolver` (`getAssetResolver()`). Engines never access SQLite or unmanaged disk storage directly (ADR-0010, ADR-0017, ADR-0021).
4. **INV-4 (Tripartite Determinism Guarantee):** Artifact determinism is guaranteed for an identical canonical `Book` snapshot together with identical resolved asset bytes and identical approved publishing runtime/toolchain inputs:
   - Timestamps are derived solely from `book.metadata.publishedAt` or the established fallback (`2026-01-01T00:00:00Z`).
   - Callers cannot pass arbitrary export dates.
   - EPUB OCF ZIP entries follow fixed specification ordering (`mimetype` first uncompressed, then OPF, NCX, XHTML, assets) per ADR-0010.
   - Typst PDF compilation uses `--creation-timestamp` matching the canonical date per ADR-0013.
   - Identical canonical `Book` content, identical resolved asset bytes, and identical approved publishing runtime inputs produce byte-for-byte identical artifacts.

### 3.2 Workflow, Stage Semantics & Gating Invariants
1. **INV-5 (Stage Permissions):** Export operations are permitted only during the **`PREVIEW`** and **`PUBLISH`** workflow stages:
   - In `PREVIEW`: Intended for visual inspection, reading preview, or draft verification.
   - In `PUBLISH`: Intended for finalized distribution artifacts.
   - Invocations in earlier stages (`IMPORT`, `STRUCTURE`, `AUTHORING`, `ASSETS`, `VALIDATION`) throw `DesktopStudioError("PUBLISH_NOT_PERMITTED")`.
2. **INV-6 (Phase 1 Pre-Generation Gate — Domain Validation):** Before artifact generation begins, the coordinator verifies that Book Doctor validation has run and produced a clean report (`validationReport !== null && validationReport.summary.isClean === true`). Attempting export while unvalidated or invalid throws `DesktopStudioError("PREPUBLISH_VALIDATION_FAILED")`. Book Doctor cleanliness is a **prerequisite, not a substitute** for artifact verification.
3. **INV-7 (Phase 2 Post-Generation Gate — Artifact Verification):** After generation completes, but before a publication result is returned as successfully publishable, format-specific artifact verification is enforced:
   - **EPUB:** In `PUBLISH`, EPUBCheck validation is **non-negotiably mandatory**. In `PREVIEW`, EPUBCheck is executed unless `verificationMode === "fast"`. If EPUBCheck reports fatal/error diagnostics or runtime failure (`failureKind !== "none"`), the export fails and throws `DesktopStudioError("CONFORMANCE_CHECK_FAILED")`.
   - **PDF:** Typst compiler diagnostics and process exit status must be clean. If Typst throws a syntax, layout, or font error, the export fails and throws `DesktopStudioError("RENDERER_COMPILER_FAILED")`.
   - **HTML:** Verified by successful deterministic completion of `buildHtml()` and its existing publication diagnostics. Slice 5 does **not** introduce a separate external HTML conformance validator; dedicated HTML conformance validation remains outside Slice 5 unless authorized by a future ADR.
4. **INV-8 (Coordinated Job-State Reporting):** Export operations report progress through `@openbook/workflow` job status:
   - `idle` → `running` with `jobId: "export-<format>-<uuid>"`.
   - On success: `running` → `succeeded` → `idle`.
   - On error or cancellation: `running` → `failed` (coordinator rethrows `DesktopStudioError`).
   Slice 5 does not implement a persistent job scheduler or background worker queue.
5. **INV-9 (Zero Content in Workflow State):** `WorkflowState` contains only `stage`, `jobStatus`, and `jobId`. Binary payloads and file paths are never stored in workflow state (`assertNoCanonicalBookContent`).

### 3.3 Subprocess, Security & Isolation Invariants
1. **INV-10 (Sealed Runtime Paths — No Raw Path Injection):** The coordinator consumes the approved production Typst runtime (Gate 6) and bundled EPUBCheck (Gate 5). The public coordinator export methods do not accept arbitrary binary or font paths. Controlled host injection and unit testing are supported via `IPdfPublisher` and `ValidatorService` ports in coordinator constructor options.
2. **INV-11 (Subprocess Isolation):** Native Typst (`typst compile`) and EPUBCheck (`java -jar epubcheck.jar`) execute via discrete argument arrays (`execFile`), zero shell interpolation, isolated temporary directories, and zero network access (ADR-0012, ADR-0013).
3. **INV-12 (Concurrency Guard):** Only one export, validation, import, or asset operation can run at a time. Invocations while `jobStatus === "running"` throw `DesktopStudioError("PUBLISH_FAILED", "A workflow operation is already running.")`.
4. **INV-13 (Cancellation via AbortSignal):** All export methods accept an optional `AbortSignal`. When triggered:
   - Active child processes (Typst CLI, Java) are terminated immediately.
   - Intermediate temporary files are deleted.
   - Job state transitions to `failed`.
   - The coordinator throws `DesktopStudioError("OPERATION_ABORTED")`.
5. **INV-14 (Persistence Firewall & In-Memory Output):** Export operations never call `ProjectPersistence.saveProject()` and never write binary blobs into SQLite. The coordinator returns in-memory buffers/structures; native file save dialogs and disk writing are owned exclusively by the host layer.
6. **INV-15 (Headless Domain Decoupling):** `DesktopStudioCoordinator` remains pure TypeScript without dependencies on `@tauri-apps/*`, React hooks, or browser DOM globals. All tests run in Node.js.

---

## 4. Contract & Interface Specifications

### 4.1 Export Options & `verificationMode` Behavior
```typescript
import type { PublishingDiagnostic } from "@openbook/epub";
import type { HtmlPublicationFile } from "@openbook/html";
import type { ValidationReport } from "@openbook/validator";

export interface BaseExportOptions {
  /** Optional cancellation signal for long-running compilation. */
  readonly signal?: AbortSignal;
}

export interface EpubExportOptions extends BaseExportOptions {
  /**
   * EPUB artifact verification mode.
   * See verificationMode behavior matrix below.
   */
  readonly verificationMode?: "fast" | "verified";
}

export interface HtmlExportOptions extends BaseExportOptions {}

export interface PdfExportOptions extends BaseExportOptions {}

/** Result of EPUB 3.3 generation. */
export interface EpubExportResult {
  readonly format: "epub";
  readonly bytes: Uint8Array;
  readonly diagnostics: readonly PublishingDiagnostic[];
  readonly epubCheckReport?: ValidationReport;
}

/** Result of HTML5 publication generation. */
export interface HtmlExportResult {
  readonly format: "html";
  readonly html: string;
  readonly files: readonly HtmlPublicationFile[];
  readonly diagnostics: readonly PublishingDiagnostic[];
}

/** Result of Typst PDF generation. */
export interface PdfExportResult {
  readonly format: "pdf";
  readonly bytes: Uint8Array;
  readonly typstSource: string;
  readonly diagnostics: readonly PublishingDiagnostic[];
}
```

#### `verificationMode` Stage Contract Matrix

| Workflow Stage | Caller Value | Effective Mode | Execution Behavior |
| :--- | :--- | :--- | :--- |
| **`PREVIEW`** | *(omitted)* | `"fast"` | Allowed (fast preview; bypasses EPUBCheck) |
| **`PREVIEW`** | `"fast"` | `"fast"` | Allowed (fast preview; bypasses EPUBCheck) |
| **`PREVIEW`** | `"verified"` | `"verified"` | Allowed (runs post-build EPUBCheck) |
| **`PUBLISH`** | *(omitted)* | `"verified"` | Allowed (mandatory post-build EPUBCheck) |
| **`PUBLISH`** | `"verified"` | `"verified"` | Allowed (mandatory post-build EPUBCheck) |
| **`PUBLISH`** | `"fast"` | — | **Rejected** (throws `DesktopStudioError("PUBLISH_FAILED")`) |

---

### 4.2 Injected Publisher Ports
To avoid exposing raw binary paths while allowing complete test isolation:

```typescript
import type { Book } from "@openbook/book-model";
import type { AssetResolver, PdfPublication } from "@openbook/pdf";
import type { ValidatorService } from "@openbook/validator";

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

export type DesktopStudioCoordinatorOptions = {
  persistence: ProjectPersistence;
  book?: Book;
  idSeed?: string;
  initialSelectedSectionId?: string;
  now?: () => string;
  assetStore?: IAssetStore;
  validationCoordinator?: IValidationCoordinator;
  /** Injected EPUBCheck validator service (ADR-0012). Defaults to production bundle. */
  validatorService?: ValidatorService;
  /** Injected PDF publisher. Defaults to production Typst v0.15.1 runner. */
  pdfPublisher?: IPdfPublisher;
};
```

### 4.3 Coordinator Interface Additions
In `IDesktopStudioCoordinator`:
```typescript
export interface IDesktopStudioCoordinator {
  // Retains all Slice 1–4 methods...

  /**
   * PREVIEW or PUBLISH stage.
   * Compiles canonical Book into an EPUB 3.3 binary with asset resolution.
   * Runs mandatory EPUBCheck in PUBLISH; supports fast preview in PREVIEW.
   */
  exportEpub(options?: EpubExportOptions): Promise<EpubExportResult>;

  /**
   * PREVIEW or PUBLISH stage.
   * Compiles canonical Book into an HTML5 publication bundle.
   */
  exportHtml(options?: HtmlExportOptions): Promise<HtmlExportResult>;

  /**
   * PREVIEW or PUBLISH stage.
   * Compiles canonical Book into a PDF binary using bundled Typst v0.15.1.
   */
  exportPdf(options?: PdfExportOptions): Promise<PdfExportResult>;
}
```

### 4.4 Error Classification
In `DesktopStudioError`:
```typescript
export type DesktopStudioErrorCode =
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
  | "PUBLISH_NOT_PERMITTED"           // Stage is not PREVIEW or PUBLISH
  | "PREPUBLISH_VALIDATION_FAILED"    // Phase 1: Book Doctor unrun or unclean
  | "CONFORMANCE_CHECK_FAILED"        // Phase 2: EPUBCheck conformance failure
  | "RENDERER_COMPILER_FAILED"        // Phase 2: Typst compilation syntax/rendering error
  | "PUBLISH_FAILED"                  // General execution / busy / runtime failure / illegal mode
  | "OPERATION_ABORTED";              // AbortSignal triggered
```

---

## 5. Execution Flow

### 5.1 Common Pre-Generation Verification (Phase 1)
1. **Stage Check:** Assert `stage === "PREVIEW" || stage === "PUBLISH"`. Otherwise throw `DesktopStudioError("PUBLISH_NOT_PERMITTED")`.
2. **Phase 1 Validation Gate:**
   - Assert `this.#validationReport !== null`. Otherwise throw `DesktopStudioError("PREPUBLISH_VALIDATION_FAILED", "Cannot export: Book Doctor validation has not been run.")`.
   - Assert `this.#validationReport.summary.isClean === true`. Otherwise throw `DesktopStudioError("PREPUBLISH_VALIDATION_FAILED", `Cannot export: Book has ${this.#validationReport.summary.totalFatal} fatal and ${this.#validationReport.summary.totalErrors} errors.`)`.
3. **Acquire Job:** Assert `jobStatus !== "running"`. Transition `jobStatus` to `"running"` with `jobId: createProjectId(`export-${format}`)`.
4. **Signal Check:** If `options?.signal?.aborted`, immediately fail job and throw `DesktopStudioError("OPERATION_ABORTED")`.

### 5.2 EPUB Export Execution (`exportEpub`)
1. Phase 1 pre-generation verification passes.
2. Resolve verification mode:
   - If `stage === "PUBLISH"`:
     - If `options?.verificationMode === "fast"`: fail job and throw `DesktopStudioError("PUBLISH_FAILED", "verificationMode cannot be 'fast' during PUBLISH stage.")`.
     - Otherwise `mode = "verified"`.
   - If `stage === "PREVIEW"`:
     - `mode = options?.verificationMode ?? "fast"`.
3. Build EPUB package and archive via `@openbook/epub` using `this.getAssetResolver()`.
4. **Phase 2 Artifact Verification (EPUBCheck):**
   - If `mode === "verified"`:
     - Write archive to isolated temporary path.
     - Run `await this.#validatorService.validateEpub(tempPath)`.
     - Delete temporary file.
     - If `report.failureKind && report.failureKind !== "none" && report.failureKind !== "conformance"`:
       Fail job and throw `DesktopStudioError("PUBLISH_FAILED", `EPUBCheck runtime error: ${report.failureKind}`)`.
     - If `!report.isValid || report.summary.totalFatal > 0 || report.summary.totalErrors > 0`:
       Fail job and throw `DesktopStudioError("CONFORMANCE_CHECK_FAILED", `EPUBCheck failed with ${report.summary.totalErrors} errors.`)`.
5. Transition `jobStatus` to `"succeeded"` then `"idle"`.
6. Return `EpubExportResult`.

### 5.3 HTML Export Execution (`exportHtml`)
1. Phase 1 pre-generation verification passes.
2. Delegate to `@openbook/html` `buildHtml(book, { assetResolver: this.getAssetResolver() })`.
3. **Phase 2 Artifact Verification (HTML):**
   - Verified by successful completion of `buildHtml()` and presence of valid publication files.
   - Any fatal generation issue throws `DesktopStudioError("PUBLISH_FAILED")`.
4. Transition `jobStatus` to `"succeeded"` then `"idle"`.
5. Return `HtmlExportResult`.

### 5.4 PDF Export Execution (`exportPdf`)
1. Phase 1 pre-generation verification passes.
2. Delegate to `this.#pdfPublisher.publishPdf(book, { assetResolver: this.getAssetResolver(), signal: options?.signal })`.
3. **Phase 2 Artifact Verification (Typst):**
   - Verified by clean process exit code from Typst CLI.
   - On Typst compilation failure (`TypstRuntimeError`):
     - Transition `jobStatus` to `"failed"`.
     - Throw `DesktopStudioError("RENDERER_COMPILER_FAILED", err.message)`.
4. Transition `jobStatus` to `"succeeded"` then `"idle"`.
5. Return `PdfExportResult`.

---

## 6. Verification & Testing Strategy

Implementation of Slice 5 requires automated domain unit tests in `apps/desktop/src/domain/desktopStudioCoordinator.publish.test.ts`:

1. **Permission Firewall:** Export calls throw `PUBLISH_NOT_PERMITTED` in `IMPORT`, `STRUCTURE`, `AUTHORING`, `ASSETS`, and `VALIDATION`.
2. **Phase 1 Validation Gate:** Export calls throw `PREPUBLISH_VALIDATION_FAILED` if Book Doctor was not run or has errors.
3. **EPUB Fast Preview in PREVIEW:** `exportEpub({ verificationMode: "fast" })` in `PREVIEW` produces valid `Uint8Array` without invoking `ValidatorService`.
4. **EPUB Mandatory Verification in PUBLISH:** `exportEpub()` in `PUBLISH` invokes `ValidatorService`; passing `verificationMode: "fast"` in `PUBLISH` is rejected.
5. **EPUB Conformance Failure:** Injected validator reporting errors triggers `CONFORMANCE_CHECK_FAILED` and sets job state to `failed`.
6. **HTML Export:** Compiles semantic HTML with asset files and diagnostics matching `HtmlExportResult`.
7. **PDF Export (Typst):** Compiles valid PDF with complex script shaping; Typst compile syntax errors throw `RENDERER_COMPILER_FAILED`.
8. **Tripartite Determinism:** Two exports of identical `Book` snapshots with identical resolved assets produce identical byte arrays.
9. **Asset Resolution:** Images ingested in Slice 3 are correctly resolved and embedded across EPUB, HTML, and PDF.
10. **Concurrency Guard:** Invoking export while another operation is active throws `PUBLISH_FAILED`.
11. **Cancellation:** Triggering `signal.abort()` terminates the operation, sets job status to `failed`, and throws `OPERATION_ABORTED`.
12. **Persistence Firewall & Immutability:** 0 SQL database writes occur during export; `preBook` deeply equals `postBook`.

---

## 7. Consequences

### Positive
* Delivers complete end-to-end publishing across EPUB 3.3, HTML, and Typst PDF.
* Enforces two-phase validation gating: clean domain model *before* compile, clean artifact verification *after* compile before publication.
* Guarantees compliance: EPUBCheck cannot be bypassed in `PUBLISH`.
* Preserves 100% read-only domain boundaries: zero mutation of the canonical `Book`.
* Keeps the desktop coordinator headless, pure, and testable without UI or filesystem write dependencies.
* Integrates existing production runtimes (Typst 0.15.1, EPUBCheck 5.3.0 + Temurin 21) safely behind discrete subprocess boundaries.

### Governance Constraints
* Slice 5 architecture is accepted and merged; Slice 5 **implementation is complete** on the authorized implementation PR. Later/unrelated work remains gated.
* **Out of scope for Slice 5:** DTP/page layout redesign, custom CSS authoring UI, AI/Ollama generation, cloud sync/export, dedicated external HTML validator, SQLite schema modifications, and Tauri/React export UI.

---

## 8. Implementation Boundary

**Acceptance of ADR-0023 does NOT authorize later or unrelated work.**

This ADR is the accepted architecture decision for Gate 8 Slice 5. Slice 5 implementation is complete. Host-layer disk writing, export UI, and later publishing work remain out of scope unless separately authorized.
