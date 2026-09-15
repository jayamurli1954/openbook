# ADR-0022: Desktop Studio Book Doctor Validation Integration Architecture — Gate 8 Slice 4

* **Status:** Accepted
* **Date:** 2026-09-15
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Desktop Studio Book Doctor Validation Integration Architecture — Gate 8 Slice 4
* **Depends on:** ADR-0006, ADR-0007, ADR-0014, ADR-0016, ADR-0017, ADR-0018, ADR-0019, ADR-0020, ADR-0021
* **Implementation status:** Slice 4 implemented (`DesktopStudioCoordinator.runValidation` / `getValidationReport`). Slice 5 (publishing/export) remains gated.

---

## 1. Context

OpenBook has completed Gate 8 Slices 1–3 in `apps/desktop`:
- **Slice 1 (ADR-0019):** `DesktopStudioCoordinator` wiring `@openbook/workflow` and `@openbook/authoring` `BookSession` to `ProjectPersistence`.
- **Slice 2 (ADR-0020):** Import and ingestion surface via `@openbook/importer` for the `IMPORT` stage.
- **Slice 3 (ADR-0021):** Asset management and media boundary via `@openbook/assets` for the `ASSETS` stage.

Under ADR-0014 (§2.3) and ADR-0019 (§5), the fifth pipeline stage of book production is **`VALIDATION`**:
```text
IMPORT ──► STRUCTURE ──► AUTHORING ──► ASSETS ──► VALIDATION ──► PREVIEW ──► PUBLISH
```

**Terminology (must not be conflated):**
- **Gate 7 Slice 5** = Book Doctor foundation package (`@openbook/book-doctor`, ADR-0018).
- **Gate 8 Slice 4** = Desktop Studio Book Doctor integration (`DesktopStudioCoordinator`, this ADR).
- **Gate 8 Slice 5** = Desktop publishing and export integration (`@openbook/epub`, `@openbook/html`, `@openbook/pdf`).

In Gate 7 Slice 5 (ADR-0018), OpenBook established `@openbook/book-doctor` (`ValidationCoordinator`), a headless diagnostic coordinator that aggregates and normalizes multi-source findings into a deterministic `BookValidationReport`.

Currently, `DesktopStudioCoordinator` sets `validationReport: null` on `DesktopStudioState` and does not import or integrate `@openbook/book-doctor`. The desktop application lacks the capability to trigger domain validation, normalize diagnostic findings, report validation job progress, or guard the transition into `PREVIEW`.

This ADR defines **Gate 8 Slice 4: Desktop Studio Book Doctor Validation Integration Architecture**, specifying:
1. The coordination contract connecting `@openbook/book-doctor` to `DesktopStudioCoordinator`.
2. Workflow stage permissions and coordinated validation operations with workflow job-state reporting during `VALIDATION`.
3. Application policy ownership: `DesktopStudioCoordinator` applies `PREVIEW` transition gating, preserving the generic nature of `@openbook/workflow` and `@openbook/book-doctor`.
4. Invariant validation behavior: read-only access to the canonical `Book`, deterministic reporting, and hard cache invalidation upon any content or structural mutation.
5. Conformance vs. process error differentiation.
6. Narrow, typed input boundaries for external artifact diagnostics (`EpubCheckDiagnosticInput`, `TypstDiagnosticInput`) without coupling the domain layer to publishing engines.
7. Zero parallel document models: referencing chapters and blocks strictly via canonical IDs.
8. Absolute persistence firewall: diagnostic reports remain ephemeral and never write to SQLite.
9. Strict headless domain boundaries: no Tauri, React, or DOM dependencies.

**Acceptance of this ADR does not authorize implementation of later slices.** Slice 4 implementation is authorized separately and is now implemented. Gate 8 Slice 5 (desktop publishing/export) remains gated.

---

## 2. Decision

OpenBook integrates `@openbook/book-doctor` into `apps/desktop` via `DesktopStudioCoordinator`, providing headless, deterministic validation of canonical `Book` documents during the `VALIDATION` pipeline stage, reporting operation status through workflow job states, and exposing `BookValidationReport` aggregates to the desktop layer.

---

## 3. Core Architectural Invariants

### 3.1 Validation & Domain Invariants
1. **INV-1 (Sole Domain Authority & Zero Parallel Model):** The canonical `Book` from `BookSession` remains the sole document truth. Book Doctor diagnostics reference entities solely by `targetSectionId` and `targetAssetId`. No parallel AST, ProseMirror node graph, or document clone is created.
2. **INV-2 (Strict Read-Only Access):** `runValidation()` consumes a read-only snapshot of the canonical `Book`. Neither the coordinator nor `@openbook/book-doctor` mutates the book during validation.
3. **INV-3 (Report Naming Separation):** The aggregated report is strictly named **`BookValidationReport`** (ADR-0018 INV-1). The Gate 5 name `ValidationReport` is prohibited.
4. **INV-4 (Deterministic Aggregation):** Given identical `Book` content and injected diagnostic inputs, `runValidation()` produces byte-for-byte identical `BookValidationReport` output with stable sorting (severity rank descending → source → code → message → location).
5. **INV-5 (Hard Report Invalidation Contract):** Any structural, metadata, or content mutation on `BookSession` (`updateActiveSectionBlocks`, `applyActiveSectionTipTap`, `addSection`, `removeSection`, `reorderSections`, `updateMetadata`, `ingestAsset`, `insertImageBlock`, `importContent`, `newProject`, `openProject`) **must immediately and synchronously reset** `this.#validationReport = null`. Stale reports must never persist across edits.

### 3.2 Workflow & Job Invariants
1. **INV-6 (Stage Permission):** `runValidation()` is permitted only during the `VALIDATION` workflow stage. Invocations in any other stage throw `DesktopStudioError("VALIDATION_NOT_PERMITTED")`.
2. **INV-7 (Coordinated Operation with Job-State Reporting):** Validation is an in-process operation executed by the coordinator, with progress and concurrency tracked via `@openbook/workflow` job status:
   - `idle` → `running` with `jobId: "validation-<uuid>"`.
   - On completion: `running` → `succeeded` → `idle`.
   - On unexpected process exception: `running` → `failed` (coordinator rethrows `DesktopStudioError`).
   Slice 4 does not implement an asynchronous background worker queue or job scheduler.
3. **INV-8 (Conformance vs. Process Failure Distinction):**
   - Document-level validation issues (schema errors, broken links, invalid metadata, EPUBCheck conformance errors) are findings inside `BookValidationReport` with `isClean: false`. The validation operation itself **succeeds**.
   - Process failures (already running operation, unexpected runtime exception) cause the job state to become `failed` and throw `DesktopStudioError`.
4. **INV-9 (Desktop Policy Ownership for PREVIEW Gating):**
   - `@openbook/workflow` remains generic and uncoupled from Book Doctor.
   - `@openbook/book-doctor` remains a diagnostic coordinator and does not gate transitions.
   - **`DesktopStudioCoordinator` owns and enforces the product transition policy:** Advancing from `VALIDATION` to `PREVIEW` requires an active, clean report (`validationReport !== null && validationReport.summary.isClean === true`). Transition attempts while unvalidated or invalid throw `DesktopStudioError("VALIDATION_FAILED")`.
5. **INV-10 (Zero Content in Workflow State):** `WorkflowState` contains only `stage`, `jobStatus`, and `jobId`. `assertNoCanonicalBookContent(workflowState)` must pass at all times.

### 3.3 Persistence & Isolation Invariants
1. **INV-11 (Persistence Firewall):** `runValidation()` never interacts with `ProjectPersistence` and never writes to SQLite.
2. **INV-12 (Ephemeral Diagnostic State):** `BookValidationReport` is held only in memory on `DesktopStudioCoordinator`. SQLite stores only canonical `Book` data upon explicit `saveProject()`.
3. **INV-13 (Headless Domain Decoupling):** `DesktopStudioCoordinator` and its validation integration remain pure TypeScript without dependencies on `@tauri-apps/*`, React, or browser DOM globals.
4. **INV-14 (Publishing Engine Firewall):** Slice 4 does not import `@openbook/epub`, `@openbook/pdf`, or `@openbook/html`, and does not spawn compiler or validator subprocesses (which remain reserved for Gate 8 Slice 5).

---

## 4. Contract & Interface Specifications

### 4.1 Narrow Artifact Diagnostic Contracts
To prevent loose `unknown` typing while maintaining strict decoupling from `@openbook/validator` and publishing engines, the domain integration defines:

```typescript
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
```

### 4.2 Coordinator Construction Options
```typescript
import type { IValidationCoordinator } from "@openbook/book-doctor";

export type DesktopStudioCoordinatorOptions = {
  persistence: ProjectPersistence;
  book?: Book;
  idSeed?: string;
  initialSelectedSectionId?: string;
  now?: () => string;
  assetStore?: IAssetStore;
  /**
   * Validation coordinator instance.
   * Defaults to new ValidationCoordinator() when omitted (ADR-0022).
   */
  validationCoordinator?: IValidationCoordinator;
};
```

### 4.3 State & Coordinator Interface Additions
In `DesktopStudioState`:
```typescript
import type { BookValidationReport } from "@openbook/book-doctor";

export interface DesktopStudioState {
  stage: WorkflowStage;
  jobStatus: JobStatus;
  activeJobId?: string;
  binding: ActiveProjectBinding | null;
  isDirty: boolean;
  revision: number;
  selectedSectionId: string | null;
  /** Populated after runValidation(); reset to null upon any edit or new project. */
  validationReport: BookValidationReport | null;
}
```

In `IDesktopStudioCoordinator`:
```typescript
import type {
  BookValidationReport,
  TypstDiagnosticInput,
} from "@openbook/book-doctor";

export interface ValidationRunOptions {
  /** Optional pre-computed Gate 5 EPUBCheck diagnostics. */
  readonly epubCheckReport?: EpubCheckDiagnosticInput;
  /** Optional pre-computed Typst compiler diagnostics. */
  readonly typstDiagnostics?: TypstDiagnosticInput;
}

export interface IDesktopStudioCoordinator {
  // Retains all Slice 1–3 methods...

  /**
   * VALIDATION stage only. Runs domain model validation and aggregates
   * diagnostics into a BookValidationReport.
   * Updates coordinator state and reports workflow job status.
   */
  runValidation(options?: ValidationRunOptions): Promise<BookValidationReport>;

  /** Convenience getter for current validation report snapshot. */
  getValidationReport(): BookValidationReport | null;
}
```

In `DesktopStudioError`:
```typescript
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
    | "VALIDATION_FAILED";
}
```

---

## 5. Execution Flow

### 5.1 `runValidation(options?: ValidationRunOptions)`
1. **Assert Stage:** If `workflow.getStage() !== "VALIDATION"`, throw `DesktopStudioError("VALIDATION_NOT_PERMITTED", "Validation is permitted only during the VALIDATION stage.")`.
2. **Begin Operation:** Check `jobStatus !== "running"`, then transition `jobStatus` to `"running"` with `jobId: createProjectId("validation")`.
3. **Capture Snapshot:** Obtain `book = this.#session.getBook()`.
4. **Execute Domain Validation:** Call `await this.#validationCoordinator.runDomainValidation(book)`.
5. **Normalize Injected Reports:**
   - If `options?.epubCheckReport` is defined: normalize via `this.#validationCoordinator.normalizeEpubCheckReport(options.epubCheckReport)`.
   - If `options?.typstDiagnostics` is defined: normalize via `this.#validationCoordinator.normalizeTypstDiagnostics(options.typstDiagnostics)`.
6. **Aggregate:** Call `this.#validationCoordinator.aggregate([domainDiags, epubDiags, typstDiags])`.
7. **Cache Report:** Set `this.#validationReport = report`.
8. **Succeed Operation:** Transition `jobStatus` to `"succeeded"` then `"idle"`.
9. **Return:** Return `report`.
10. **Error Guard:** On unexpected runtime exception:
    - Transition `jobStatus` to `"failed"`.
    - Rethrow `DesktopStudioError("VALIDATION_FAILED", error.message)`.

### 5.2 Content Mutation Hook (Hard Invalidation Contract — INV-5)
Any operation that mutates `BookSession` (`updateActiveSectionBlocks`, `applyActiveSectionTipTap`, `addSection`, `removeSection`, `reorderSections`, `updateMetadata`, `ingestAsset`, `insertImageBlock`, `importContent`, `newProject`, `openProject`):
- Executes its existing transaction.
- Synchronously sets `this.#validationReport = null`.

### 5.3 Stage Transition Gate (`VALIDATION` → `PREVIEW` Policy — INV-9)
In `transitionStage(to: WorkflowStage)`:
1. If `this.#workflow.getStage() === "VALIDATION"` and `to === "PREVIEW"`:
   - If `this.#validationReport === null`:
     throw `DesktopStudioError("VALIDATION_FAILED", "Cannot transition to PREVIEW: Book Doctor validation has not been run.")`.
   - If `!this.#validationReport.summary.isClean`:
     throw `DesktopStudioError("VALIDATION_FAILED", `Cannot transition to PREVIEW: Book has ${this.#validationReport.summary.totalFatal} fatal and ${this.#validationReport.summary.totalErrors} error diagnostics.`)`.
2. Proceed with `this.#workflow.requestTransition({ to })`.

---

## 6. Verification & Testing Strategy

Implementation of Slice 4 (when separately authorized) requires automated domain unit tests in `apps/desktop/src/domain/desktopStudioCoordinator.validation.test.ts`:
1. **Default State:** `validationReport` is `null` on new and opened projects.
2. **Stage Enforcement:** `runValidation()` rejects outside `VALIDATION`.
3. **Clean Validation:** Clean draft produces `isClean === true` and updates state.
4. **Domain Errors:** Invalid metadata/empty chapters produce `isClean === false` with `domain-model` diagnostics without throwing.
5. **Injected Reports:** Strongly typed mock EPUBCheck and Typst diagnostics aggregate with deterministic sorting.
6. **Job-State Reporting:** Tracks `idle` → `running` → `succeeded` → `idle`.
7. **Concurrency Conflict:** Rejects concurrent operations with `VALIDATION_FAILED`.
8. **Cache Invalidation (INV-5):** Any edit resets `validationReport` to `null`.
9. **Stage Policy Gate (INV-9):** Blocks `PREVIEW` transition when unvalidated or invalid.
10. **Persistence Firewall:** Zero writes to SQLite; Book remains immutable.

This ADR does not authorize Gate 8 Slice 5 (publishing/export) or UI work.

---

## 7. Consequences

### Positive
* Delivers format-neutral, aggregated diagnostic reporting directly to the desktop layer.
* Strictly respects the workflow stage pipeline and guards downstream `PREVIEW` against defective books via coordinator policy.
* Maintains 100% read-only isolation of the canonical `Book` during validation.
* Prevents stale clean validation reports through synchronous cache invalidation.
* Keeps SQLite schema completely free of transient diagnostic data.
* Preserves pure headless domain testability.

### Governance Constraints
* Slice 4 architecture is accepted and merged; Slice 4 **implementation is complete** on the authorized implementation PR. Slice 5 remains gated.
* **Out of scope for Slice 4:** UI components; publishing/export (Gate 8 Slice 5); native/Java subprocess execution; automated repair engines; AI/Ollama; changing `@openbook/book-doctor` (Gate 7 Slice 5 / ADR-0018) into a workflow or publishing package.

---

## 8. Implementation Boundary

**Acceptance of this ADR does NOT authorize later slices.**

This ADR is the accepted architecture decision for Gate 8 Slice 4. Slice 4 implementation is complete. Gate 8 Slice 5 (desktop publishing/export) remains out of scope.
