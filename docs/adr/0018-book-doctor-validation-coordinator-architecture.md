# ADR-0018: Book Doctor Validation Coordinator Architecture — Gate 7 Slice 5

* **Status:** Accepted
* **Date:** 2026-09-09
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Book Doctor Validation Coordinator Architecture — Gate 7 Slice 5
* **Depends on:** ADR-0006, ADR-0012, ADR-0013, ADR-0014, ADR-0017
* **Implementation status:** Requires separate explicit authorization (implementation NOT authorized by this ADR alone)

## 1. Context

OpenBook's end-to-end publishing pipeline (ADR-0014 §2.3) includes a dedicated **Validation** stage:
```text
Import ──► Book Structure ──► Authoring/Edit ──► Assets ──► Validation ──► Preview ──► Publish
```

Gate 7 Slices 1–4 established workflow orchestration, import, authoring, and asset management. Publishing engines already emit EPUB artifacts validated by Gate 5 EPUBCheck (`@openbook/validator` → `ValidationReport`) and PDF compilation diagnostics from Typst (ADR-0013). ADR-0014 §2.4.C defined “Book Doctor” as an architectural diagnostic coordinator that normalizes multiple independent sources into a unified contract.

Without this ADR:
- Callers might overload Gate 5’s EPUB-specific `ValidationReport` as the aggregated Book Doctor result, conflating EPUBCheck outcomes with domain and Typst diagnostics.
- Severity and source normalization might be ad hoc, non-deterministic, or inconsistent across hosts.
- The coordinator package might take forbidden dependencies on `@openbook/pdf`, publishing engines, workflow, assets, storage, UI, or AI.
- Accessibility diagnostics might be falsely claimed as implemented in Slice 5.

This ADR formalizes Gate 7 Slice 5 — the Book Doctor validation coordinator — incorporating Antigravity architecture-review refinements.

**Acceptance of this ADR does not authorize implementation.** Implementation remains strictly gated and requires separate explicit authorization.

---

## 2. Decision

OpenBook establishes the Book Doctor Validation Coordinator in a dedicated package **`packages/book-doctor`** (`@openbook/book-doctor`), providing headless aggregation and normalization of diagnostics for the VALIDATION workflow stage.

Book Doctor **coordinates and normalizes**; it does not become a second content model, does not mutate the canonical `Book`, and does not claim automated repair engines or speculative linters beyond the sources listed below.

### 2.1 Core Architectural Invariants

1. **Sole Canonical Content Model:** `@openbook/book-model` remains the single source of truth. Book Doctor never caches an alternate document representation.
2. **Read-Only Book Access:** Domain validation may read a `Book` snapshot. Aggregation never mutates the canonical `Book`.
3. **Name Separation from Gate 5:** The aggregated Book Doctor result type is **`BookValidationReport`**. It MUST NOT reuse the Gate 5 EPUBCheck type name `ValidationReport` (ADR-0012 / `@openbook/validator`).
4. **Deterministic Normalization:** Identical diagnostic inputs ⇒ identical `BookValidationReport` JSON (stable ordering and severity/source mapping per §2.6).
5. **Injected Adapters for Artifact Validators:** EPUBCheck and Typst diagnostic acquisition are supplied through injected ports/adapters by the host. The coordinator package does **not** depend on `@openbook/epub` or `@openbook/pdf`.
6. **Workflow Remains Generic:** `@openbook/workflow` stores only stage/job state. Book Doctor does not depend on workflow; the host invokes Book Doctor during VALIDATION.
7. **Accessibility Reserved:** The diagnostic `source` union retains `"accessibility"` for future use; Slice 5 MUST NOT emit accessibility diagnostics (inactive / future).

```text
┌──────────────────────────┐
│   Host / Application     │  (VALIDATION stage orchestration)
└────────────┬─────────────┘
             │ Book snapshot + optional artifact inputs
             ▼
┌──────────────────────────┐
│  @openbook/book-doctor   │
│  ValidationCoordinator   │
│                          │
│  • domain-model          │◄── validateBook / domain rules (@openbook/book-model)
│  • epubcheck (adapter)   │◄── injected Gate 5 ValidatorService results
│  • typst-compiler (adapter)◄── injected Typst diagnostic payloads
│  • accessibility         │    (RESERVED — inactive in Slice 5)
└────────────┬─────────────┘
             │
             ▼
      BookValidationReport
   (aggregated, normalized)
```

---

### 2.2 Package & Module Boundaries

The implementation resides in `packages/book-doctor`:

* **Allowed workspace dependency:**
  * `@openbook/book-model` only

* **Forbidden dependencies:**
  * `@openbook/workflow`
  * `@openbook/authoring`
  * `@openbook/importer`
  * `@openbook/assets`
  * `@openbook/epub`
  * `@openbook/pdf` (**explicitly prohibited**)
  * `@openbook/html`
  * SQLite / project storage / persistence packages
  * Tauri / React / UI frameworks
  * AI / Ollama / LLM libraries
  * network services

No network access and no subprocess execution are performed **inside** `@openbook/book-doctor`. EPUBCheck and Typst subprocesses remain owned by their existing Gate 5 / Gate 6 runtimes and are consumed only via host-injected results or ports.

> **Note:** Gate 5 `@openbook/validator` remains the EPUBCheck adapter package and continues to expose `ValidationReport` for EPUB-only outcomes. Book Doctor may accept **already-produced** EPUBCheck results (or an injected port) without taking a compile-time dependency on `@openbook/pdf`. Whether `@openbook/validator` is linked by the host versus mapped through a narrow injected interface is an implementation detail; the **hard package rule** for `@openbook/book-doctor` is: **only `@openbook/book-model` is an allowed workspace dependency.**

---

### 2.3 Diagnostic Contract

```typescript
export type BookDiagnosticSource =
  | "domain-model"
  | "accessibility" // reserved — future / inactive in Slice 5
  | "epubcheck"
  | "typst-compiler";

export type BookDiagnosticSeverity = "fatal" | "error" | "warning" | "info";

export interface BookDiagnostic {
  readonly source: BookDiagnosticSource;
  readonly severity: BookDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  readonly targetSectionId?: string;
  readonly targetAssetId?: string;
  readonly location?: {
    readonly file?: string;
    readonly line?: number;
    readonly column?: number;
  };
  readonly fixSuggestion?: string;
}

/**
 * Aggregated Book Doctor result.
 * MUST NOT be named ValidationReport — that name is reserved for Gate 5 EPUBCheck
 * (ADR-0012 / @openbook/validator).
 */
export interface BookValidationReport {
  readonly diagnostics: readonly BookDiagnostic[];
  readonly summary: {
    readonly totalFatal: number;
    readonly totalErrors: number;
    readonly totalWarnings: number;
    readonly totalInfos: number;
    /** true iff totalFatal === 0 && totalErrors === 0 */
    readonly isClean: boolean;
  };
}

export interface TypstDiagnosticInput {
  readonly messages: readonly {
    readonly severity: "error" | "warning" | "info";
    readonly message: string;
    readonly file?: string;
    readonly line?: number;
    readonly column?: number;
    readonly code?: string;
  }[];
}

export interface IValidationCoordinator {
  runDomainValidation(book: Book): Promise<readonly BookDiagnostic[]>;
  /**
   * Normalizes an already-produced Gate 5 ValidationReport (or equivalent port result).
   * Does not invoke EPUBCheck subprocesses inside this package.
   */
  normalizeEpubCheckReport(report: unknown): Promise<readonly BookDiagnostic[]>;
  /**
   * Normalizes injected Typst compiler diagnostics.
   * Does not depend on or invoke @openbook/pdf.
   */
  normalizeTypstDiagnostics(
    input: TypstDiagnosticInput,
  ): Promise<readonly BookDiagnostic[]>;
  aggregate(
    diagnosticSets: readonly (readonly BookDiagnostic[])[],
  ): BookValidationReport;
}
```

**Slice 5 activity:**

| Source | Slice 5 status |
| :--- | :--- |
| `domain-model` | **Active** — map `validateBook` / domain findings |
| `epubcheck` | **Active** — normalize injected Gate 5 results |
| `typst-compiler` | **Active** — normalize injected Typst diagnostics |
| `accessibility` | **Future / inactive** — retained in the union; MUST NOT be emitted by Slice 5 |

---

### 2.4 Aggregated Report Naming (Refinement #1)

| Type | Package / ADR | Meaning |
| :--- | :--- | :--- |
| `ValidationReport` | `@openbook/validator` / ADR-0012 | EPUBCheck (or runtime-failure) outcome for a single EPUB path |
| `BookValidationReport` | `@openbook/book-doctor` / ADR-0018 | Aggregated, normalized multi-source Book Doctor result |

Reusing `ValidationReport` for aggregation is **rejected**.

---

### 2.5 Coordinator Responsibilities

1. **Domain validation:** Invoke `@openbook/book-model` validation (`validateBook` and related domain rules) and map findings to `BookDiagnostic` with `source: "domain-model"`.
2. **EPUBCheck normalization:** Accept host-supplied Gate 5 results; map into `source: "epubcheck"` diagnostics using §2.6.
3. **Typst normalization:** Accept host-supplied Typst diagnostic payloads; map into `source: "typst-compiler"` using §2.6. **Never** import or call `@openbook/pdf`.
4. **Aggregation:** Merge diagnostic arrays into a deterministic `BookValidationReport` (stable sort: severity rank → source → code → message → location).
5. **No repair engine:** Slice 5 does not auto-fix content, rewrite EPUB/PDF, or drive UI.

---

### 2.6 Deterministic Severity & Source Mapping Table (Refinement #2)

Severity rank for sorting and summary (ascending criticality for sort key use: fatal first when listing by severity descending):

| `BookDiagnosticSeverity` | Rank (higher = more severe) |
| :--- | ---: |
| `fatal` | 4 |
| `error` | 3 |
| `warning` | 2 |
| `info` | 1 |

#### A. Domain-model (`validateBook` / domain)

| Upstream finding | `source` | `severity` |
| :--- | :--- | :--- |
| Domain **error** (blocks validity) | `domain-model` | `error` |
| Domain finding explicitly marked fatal by API (if any) | `domain-model` | `fatal` |
| Domain **warning** | `domain-model` | `warning` |
| Domain **info** / advisory | `domain-model` | `info` |

#### B. EPUBCheck / Gate 5 `ValidationReport`

| Upstream `ValidationSeverity` / condition | `source` | `severity` |
| :--- | :--- | :--- |
| `FATAL` | `epubcheck` | `fatal` |
| `ERROR` | `epubcheck` | `error` |
| `WARNING` | `epubcheck` | `warning` |
| `INFO` | `epubcheck` | `info` |
| `USAGE` | `epubcheck` | `info` |
| Runtime failure (`failureKind` other than `none` / `conformance`, e.g. missing runtime) | `epubcheck` | `fatal` |

#### C. Typst compiler diagnostics

| Upstream Typst severity | `source` | `severity` |
| :--- | :--- | :--- |
| `error` | `typst-compiler` | `error` |
| `warning` | `typst-compiler` | `warning` |
| `info` (if present) | `typst-compiler` | `info` |

Typst findings are **renderer compilation diagnostics**, not PDF/X preflight (ADR-0014 §2.4.B).

#### D. Accessibility

| Upstream | Slice 5 behavior |
| :--- | :--- |
| Any accessibility engine output | **Not produced** — source value reserved only |

---

### 2.7 PDF Dependency Prohibition (Refinement #3)

`@openbook/book-doctor` MUST NOT depend on `@openbook/pdf`.

Typst diagnostics enter the coordinator only as **injected data** (or a host-owned adapter outside this package). This preserves Gate 6 isolation and prevents the validation coordinator from pulling the Typst runtime graph.

---

### 2.8 Accessibility Reservation (Refinement #4)

* The `BookDiagnosticSource` union **includes** `"accessibility"`.
* Slice 5 implementation **MUST NOT** emit diagnostics with `source: "accessibility"`.
* Enabling accessibility diagnostics requires a future ADR or an explicit Slice authorization.

---

### 2.9 Workflow & Publishing Boundaries

* Workflow stage `VALIDATION` remains a generic stage name; workflow acquires no Book Doctor domain types.
* Publishers (`@openbook/epub`, `@openbook/pdf`, `@openbook/html`) remain downstream projections. Book Doctor does not package EPUB/PDF/HTML and does not define archive ordering.
* Asset auditing (`@openbook/assets` `AssetAuditor`) remains outside this package’s dependency graph; the host may run asset audits separately and is not required to funnel them through Book Doctor in Slice 5.

---

## 3. Explicit Out-of-Scope Items for Slice 5

1. Automated repair / “fix-it” mutation engines
2. Accessibility checker implementation (source reserved only)
3. PDF/X / veraPDF / ink-coverage preflight
4. Direct EPUB packaging or Typst compilation inside `@openbook/book-doctor`
5. Dependencies on `@openbook/pdf`, `@openbook/epub`, workflow, authoring, importer, assets, SQLite, UI, AI
6. Network access or subprocess execution inside the coordinator package
7. Preview UI / Book Doctor desktop panels
8. Reusing Gate 5 type name `ValidationReport` for aggregated results

---

## 4. Testable Architectural Invariants

| ID | Invariant | Verification Test Method |
| :--- | :--- | :--- |
| **INV-1** | **Report name separation** | Aggregated type is `BookValidationReport`; package public API does not export an aggregated type named `ValidationReport`. |
| **INV-2** | **Severity mapping** | Fixture EPUBCheck / Typst / domain inputs map to severities exactly per §2.6. |
| **INV-3** | **Deterministic aggregate** | Identical diagnostic inputs yield identical `BookValidationReport` serialization. |
| **INV-4** | **No Book mutation** | Domain validation leaves the input `Book` structurally unchanged. |
| **INV-5** | **Accessibility inactive** | Slice 5 paths never emit `source: "accessibility"`. |
| **INV-6** | **Dependency boundary** | `packages/book-doctor` depends only on `@openbook/book-model`; assert absence of pdf/epub/workflow/authoring/importer/assets/sqlite/ui/ai deps. |
| **INV-7** | **No PDF package coupling** | Static/package test fails if `@openbook/pdf` appears in `dependencies` / `devDependencies`. |

---

## 5. Implementation Boundary

**Acceptance of ADR-0018 does NOT authorize implementation.**

This ADR defines architecture only. Implementation of `@openbook/book-doctor` requires a separate explicit implementation handoff after this ADR is reviewed, accepted, and merged.

Cursor must not infer implementation authorization from ADR acceptance.
