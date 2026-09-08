# ADR-0014: End-to-End Book Production Workflow Architecture — Gate 7

* **Status:** Accepted
* **Date:** 2026-09-08
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** End-to-End Book Production Workflow Architecture — Gate 7
* **Depends on:** ADR-0004, ADR-0006, ADR-0007, ADR-0008, ADR-0009, ADR-0010, ADR-0011, ADR-0012, ADR-0013
* **Implementation status:** Requires separate explicit authorization (implementation NOT authorized by this ADR alone)

## 1. Context

OpenBook has established its core publishing primitives across Gates 1 through 6:
- **ADR-0004 & ADR-0006:** Canonical Book Model (`@openbook/book-model`) as the format-neutral source of truth.
- **ADR-0007 & ADR-0008:** Desktop foundation (`apps/desktop`) with Tauri/React/SQLite baseline and Tiptap/ProseMirror authoring evaluation (`@openbook/semantic-document`).
- **ADR-0009 & ADR-0010:** EPUB 3.3 generation engine (`@openbook/epub`) and asset packaging with injected `AssetResolver`.
- **ADR-0011:** HTML5 publishing engine (`@openbook/html`).
- **ADR-0012:** Production EPUBCheck validator runtime packaging (`@openbook/validator`) with pinned Eclipse Temurin 21 JRE and `jlink`.
- **ADR-0013:** PDF publishing engine (`@openbook/pdf`) using bundled Typst v0.15.1 with complex-script (Kannada) shaping.

With all individual export projections and runtime environments established, OpenBook requires an overarching **End-to-End Book Production Workflow Architecture** to unite these subsystems into a cohesive publishing lifecycle:
```text
Import ──► Book Structure ──► Authoring/Edit ──► Assets ──► Validation ──► Preview ──► Publish
```

Without an authoritative architectural specification:
- Workflow management could inadvertently store or duplicate book content, creating dual sources of truth.
- Downstream projection engines could leak format-specific assumptions or mutate canonical entities during compilation.
- In-memory domain structures could be conflated with durable persistence mechanisms (SQLite).
- Validation and preflight mechanisms could be blurred, creating false equivalences between compilation errors and formal archival conformance.
- Gate 1–6 invariants (subprocess isolation, zero network dependency, deterministic builds, and format neutrality) could be compromised during integration.

This ADR formalizes the Gate 7 architecture and establishes strict boundaries across domain modeling, persistence, workflow orchestration, validation coordination, and downstream publishing projections.

**Acceptance of this ADR does not authorize implementation.** Implementation remains strictly gated and requires separate explicit authorization.

---

## 2. Decision

OpenBook adopts a unified, unidirectional book production pipeline governed by four architectural tiers, strict mutation and read-only invariants, and an integrated validation coordinator ("Book Doctor").

### 2.1 Architectural Roles & State Separation

OpenBook enforces a strict four-tier separation of responsibilities:

| Subsystem | Architectural Role | Authority / Mutability | Medium / Storage |
| :--- | :--- | :--- | :--- |
| **`@openbook/book-model`** | **Canonical Domain Model** | **Single source of truth** for all book structure, metadata, frontmatter, body, backmatter, and section hierarchy. | In-memory TypeScript domain entities and structural invariants. |
| **SQLite (`ProjectPersistence`)** | **Persistence Mechanism** | Durable record of the project. Responsible for atomic commits, document envelopes, snapshots, and revision history. | Local `.openbook` SQLite database. |
| **`@openbook/workflow`** | **Workflow Coordinator** | Orchestrates stage gates, active section selection, export jobs, and pipeline transitions. **Never holds canonical book content.** | Ephemeral UI/process state; persisted workflow configuration. |
| **Publishing Engines (`@openbook/epub`, `@openbook/pdf`, `@openbook/html`)** | **Downstream Projections** | **Strictly Read-Only.** Transform canonical `Book` into distributable target artifacts. Never mutate or write back to `Book`. | Target distribution artifacts (`.epub`, `.pdf`, directory bundles). |

```text
                       ┌──────────────────────────────┐
                       │      Importers (Pandoc,      │
                       │     Markdown, HTML, etc.)    │
                       └──────────────┬───────────────┘
                                      │ (Creates new Book)
                                      ▼
                       ┌──────────────────────────────┐
                       │     Canonical Book Model     │ ◄────── Authoring via
                       │    (@openbook/book-model)    │         @openbook/semantic-document
                       └───────▲──────────────┬───────┘         (Controlled updates)
                               │              │
           Persists / Hydrates │              │ Strictly Read-Only Projections
                               │              │
       ┌───────────────────────┴──┐           ├───────────────────┬───────────────────┐
       │   SQLite Persistence     │           ▼                   ▼                   ▼
       │  (Atomic Project DB)     │    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
       └──────────────────────────┘    │ @openbook/   │    │  @openbook/  │    │  @openbook/  │
                                       │    epub      │    │     pdf      │    │     html     │
                                       └──────┬───────┘    └──────┬───────┘    └──────────────┘
                                              │                   │
                                              ▼                   ▼
                                       ┌──────────────┐    ┌──────────────┐
                                       │ .epub output │    │ .pdf output  │
                                       └──────┬───────┘    └──────┬───────┘
                                              │                   │
                                              │ (Artifact path)   │ (Stdout/stderr JSON)
                                              ▼                   ▼
                                       ┌──────────────┐    ┌──────────────┐
                                       │  EPUBCheck   │    │ Typst Syntax/│
                                       │  Subprocess  │    │ Glyph Diags  │
                                       └──────┬───────┘    └──────┬───────┘
                                              │                   │
                                              └─────────┬─────────┘
                                                        ▼
                                       ┌──────────────────────────────────┐
                                       │      Book Doctor Coordinator     │
                                       │     (Diagnostic Aggregation)     │
                                       └──────────────────────────────────┘
```

### 2.2 Dependency Direction & Mutation Rules

The pipeline enforces monotonic data flow and immutable boundaries:

1. **Importers**:
   - Ingest external formats (Markdown, Pandoc AST, Docx, HTML) and construct a compliant canonical `Book` root.
   - Importers may create new `Book` instances; they do not alter running editor sessions directly.
2. **Authoring Surface**:
   - The desktop authoring UI interacts with book content solely via `@openbook/semantic-document`.
   - Content modifications are converted into structural mutations on the canonical `Book` within transactional boundaries and committed to SQLite persistence.
3. **Asset Management**:
   - Manages raw binary assets (illustrations, cover images, embedded vector graphics) and associated metadata.
   - The canonical `Book` references assets strictly via abstract IDs or relative keys.
   - Assets are resolved at projection time via the injected `AssetResolver`.
4. **Publishing Projections**:
   - Projection engines (`buildEpub`, `buildPdf`, `buildHtml`) receive an immutable, read-only snapshot of the canonical `Book` and an `AssetResolver`.
   - **Invariant:** Downstream engines have **zero write access** to `Book`. They cannot mutate content, inject layout identifiers into domain objects, or modify frontmatter/backmatter hierarchy.
   - Any layout-specific adaptation is applied strictly during projection serialization.

---

### 2.3 End-to-End Pipeline Stages

The workflow transitions through seven discrete stages orchestrated by `WorkflowCoordinator`:

1. **Import (`ImportService`)**:
   - Ingests foreign documents, normalizes metadata, maps external structures into standard frontmatter, body, and backmatter sections, and emits a validated `Book`.
2. **Book Structure (`StructureEditor`)**:
   - Reorders, nests, splits, or merges chapters and sections within the `Book` domain model.
   - Enforces domain invariants (e.g., at least one body section, unique section IDs).
3. **Authoring/Edit (`EditorSession`)**:
   - Provides bi-directional mapping: `BookSection.content` <---> `SemanticDocument` <---> Tiptap ProseMirror nodes.
   - Tracks dirty state and coordinates atomic saves to SQLite.
4. **Assets (`AssetPipeline`)**:
   - Validates MIME types, verifies checksums, detects missing assets, and exposes assets through the `AssetResolver` boundary.
   - Prevents path-traversal and unresolvable relative links.
5. **Validation (`ValidationCoordinator` / "Book Doctor")**:
   - Runs structural, semantic, and projection diagnostics across the project.
   - Aggregates issues into a standardized diagnostic report.
6. **Preview (`PreviewService`)**:
   - Reader/HTML preview: fast semantic render via `@openbook/html`.
   - PDF preview: fast Typst compile via `@openbook/pdf` emitting page SVG or image buffers.
7. **Publish (`PublishingPipeline`)**:
   - Executes pre-publish validation gates.
   - Produces deterministic distribution packages (`.epub`, `.pdf`, static HTML) with reproducible metadata, creation timestamps, and manifest checksums.

---

### 2.4 Verification and Diagnostic Separation

#### A. EPUB Validation Pipeline
EPUB validation is decoupled from the compilation phase and operates on the finalized file artifact:
```text
Book ──► @openbook/epub ──► EPUB artifact (.epub) ──► EPUBCheck (@openbook/validator) ──► ValidationReport
```
- The EPUB packaging pipeline completes full ZIP serialization on disk.
- The isolated, bundled EPUBCheck runtime (ADR-0012) validates the container, package document, and XHTML entries.
- EPUBCheck diagnostics (FATAL, ERROR, WARN, INFO) are normalized into standard validation issues.

#### B. Typst Diagnostics vs. Future PDF Preflight
PDF verification in Gate 7 distinguishes between compilation diagnostics and post-compilation preflight:
1. **Typst Compilation Diagnostics (In Scope)**:
   - Captured from Typst CLI stderr during compilation (`typst compile`).
   - Reports syntax errors, missing glyphs/fonts, unresolved labels, and layout overset warnings.
   - These are **renderer-level compilation errors**, not formal PDF conformance verifications.
2. **Future PDF Conformance & Preflight Subsystem (Deferred / Post-Gate 7)**:
   - Dedicated preflight checks (e.g., PDF/X-1a, PDF/X-4, PDF/A archival conformance, veraPDF validation, CMYK/spot color separation, ink coverage analysis).
   - These capabilities require specialized inspection tools and will be governed by a separate future ADR. Gate 7 explicitly does not claim PDF/X preflight validation.

#### C. "Book Doctor" as Architectural Validation Coordinator
In Gate 7, "Book Doctor" is scoped strictly as an **architectural diagnostic coordinator**:
- It provides a unified contract to collect, normalize, and present diagnostics from multiple independent sources:
```typescript
export interface BookDiagnostic {
  source: 'domain-model' | 'accessibility' | 'epubcheck' | 'typst-compiler';
  severity: 'fatal' | 'error' | 'warning' | 'info';
  message: string;
  targetSectionId?: string;
  location?: { file?: string; line?: number; column?: number };
  fixSuggestion?: string;
}

export interface IValidationCoordinator {
  runDomainValidation(book: Book): Promise<BookDiagnostic[]>;
  runEpubValidation(epubPath: string): Promise<BookDiagnostic[]>;
  runPdfDiagnostics(compilerOutput: TypstProcessResult): Promise<BookDiagnostic[]>;
  aggregate(diagnostics: BookDiagnostic[][]): DiagnosticSummary;
}
```
- **Scope Limit:** Gate 7 coordinates and normalizes existing diagnostic sources. It does not commit OpenBook to implementing speculative automated repair engines or unverified linters.

---

### 2.5 Invariants Preserved from Prior Gates

| Gate / Principle | Invariant Preserved in Gate 7 |
| :--- | :--- |
| **Gate 1 / ADR-0004 / ADR-0006** | **Format-Neutral Book Model:** Domain entities contain no EPUB, HTML, or Typst markup. Layout concerns remain in projection engines. |
| **Gate 2 / ADR-0007 / ADR-0008** | **Authoring Boundary:** Desktop UI interacts with book content via the `@openbook/semantic-document` contract. |
| **Gate 3 / ADR-0010** | **Asset Boundary:** Projections access assets exclusively through injected `AssetResolver` implementations; direct arbitrary file system reads are forbidden. |
| **Gate 4 / ADR-0011** | **Deterministic HTML:** Semantic HTML5 generation remains deterministic and sanitization-compliant. |
| **Gate 5 / ADR-0012** | **EPUBCheck Runtime Isolation:** Subprocess invocation uses discrete `argv` (`execFile`), zero shell interpolation, isolated temporary directories, and pinned JRE. |
| **Gate 6 / ADR-0013** | **PDF Typst Engine Isolation:** Bundled Typst v0.15.1 runs without shell interpolation, `--ignore-system-fonts`, explicit font paths, and zero network access. |
| **Cross-Cutting** | **Zero Runtime Network Dependency:** No compilation, validation, or publishing step makes outbound network calls. |

---

## 3. Consequences

### Positive
- **Single Source of Truth:** `@openbook/book-model` remains the unambiguous domain authority, backed by SQLite persistence.
- **Workflow Clarity:** `packages/workflow` coordinates execution state without accumulating redundant book data.
- **Projection Safety:** Downstream export engines cannot mutate the source document or introduce circular dependencies.
- **Accurate Diagnostic Reporting:** EPUB validation and Typst compiler diagnostics are clearly differentiated, preventing false claims about PDF/X preflight.

### Negative / Trade-offs
- Downstream projection pipelines must be treated as batch transformations; layout feedback must be routed through explicit preview adapters rather than bidirectional layout binding.
- PDF preflight capabilities remain limited to Typst compiler diagnostics until a dedicated PDF preflight ADR is accepted.

---

## 4. Implementation Boundary

**Acceptance of ADR-0014 does NOT authorize implementation.**

Implementation of the workflow package and coordinator interfaces will be authorized under a dedicated implementation handoff following project review.
