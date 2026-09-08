# ADR-0015: Import and Ingestion Foundation Architecture — Gate 7 Slice 2

* **Status:** Accepted
* **Date:** 2026-09-08
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Import and Ingestion Foundation Architecture — Gate 7 Slice 2
* **Depends on:** ADR-0004, ADR-0006, ADR-0007, ADR-0008, ADR-0014
* **Implementation status:** Requires separate explicit authorization (implementation NOT authorized by this ADR alone)

## 1. Context

OpenBook's end-to-end publishing lifecycle (ADR-0014 §2.3) begins with the **Import** stage:
```text
Import ──► Book Structure ──► Authoring/Edit ──► Assets ──► Validation ──► Preview ──► Publish
```

In Gate 7 Slice 1 (PR #30), the `WorkflowCoordinator` was established with the `IMPORT` stage and ephemeral job tracking (`idle` → `running` → `succeeded` | `failed`), strictly enforcing the invariant that workflow state must never hold canonical Book content (`assertNoCanonicalBookContent`).

To operationalize the import pipeline, OpenBook requires an architectural specification for the **Import and Ingestion Foundation (Gate 7 Slice 2)**.

Without this ADR:
- Importers might define ad-hoc, divergent intermediate content representations, violating the principle that `@openbook/book-model` is the sole canonical content model.
- File-byte decoding and text parsing might be conflated, leading to fragile error boundaries and encoding corruption.
- Silent fabrication of metadata (such as artificial publication dates) could corrupt author provenance under the guise of determinism.
- Heavy binary formats (Docx, ODT, PDF) or external CLI converters (Pandoc, LibreOffice, Calibre) might be introduced prematurely, expanding attack surface and build complexity.
- Importers might directly access SQLite databases or UI state, breaching component boundaries.

This ADR formalizes the architecture, boundaries, contracts, and error model for Gate 7 Slice 2.

**Acceptance of this ADR does not authorize implementation.** Implementation remains strictly gated and requires separate explicit authorization.

---

## 2. Decision

OpenBook establishes the Import and Ingestion Foundation in a dedicated package **`packages/importer`** (`@openbook/importer`), mapping external Markdown and plain text documents directly into the canonical in-memory `Book` model (`@openbook/book-model`).

### 2.1 Core Architectural Invariants

1. **Sole Canonical Content Model:** `@openbook/book-model` is the single source of truth for all book content and structure. The importer never introduces, caches, or persists an alternative intermediate content model.
2. **Caller Decoding Boundary:** File reading, binary I/O, and UTF-8 byte decoding belong strictly to the caller boundary (e.g. `apps/desktop` or CLI). The importer accepts `ImportSource` where `content` is already a pre-decoded JavaScript Unicode string.
3. **Deterministic ID Invariant (Format Unfrozen):** All generated section and block IDs must be deterministic and unique across the `Book` (satisfying `validateBook`). The ADR enforces repeatability and uniqueness across identical runs, but intentionally does not freeze a specific textual prefix or numbering format.
4. **Precise `publishedAt` Rule (No Silent Metadata Manufacture):** If the input document or caller options explicitly specify `publishedAt`, it is parsed and preserved. If unstated, `publishedAt` is set to `""` (empty string), matching `@openbook/book-model`'s `createBook()` standard baseline. OpenBook will never invent artificial publication dates merely for determinism.
5. **Orchestration Decoupling:** `@openbook/workflow` manages stage progression and job status correlation. The importer does not mutate workflow state; the caller registers job transitions. Workflow state never stores imported book content.
6. **Persistence Decoupling:** The importer is a pure transformation engine with no database handles. The caller takes the validated `Book` from `ImportResult` and persists it via SQLite `ProjectPersistence`.
7. **Downstream Publishing Untouched:** Publishing engines (`@openbook/epub`, `@openbook/pdf`, `@openbook/html`) remain downstream read-only consumers.

```text
  File / OS Boundary                   Input / Caller Boundary                  @openbook/importer               @openbook/book-model
 (Disk / Buffer)                       (apps/desktop or CLI)
          │                                      │                                       │                                 │
          │ raw bytes                            │                                       │                                 │
          ▼                                      │                                       │                                 │
  [TextDecoder(utf-8)] ─────────────────────────►│                                       │                                 │
  (Validates UTF-8, rejects malformed bytes)     │                                       │                                 │
                                                 │ ImportSource { format, content }      │                                 │
                                                 └──────────────────────────────────────►│                                 │
                                                                                         ├── 1. CommonMark tokenization    │
                                                                                         ├── 2. Frontmatter extraction     │
                                                                                         ├── 3. Structural partitioning    │
                                                                                         ├── 4. Deterministic ID mapping   │
                                                                                         └── 5. Build candidate Book       │
                                                                                                        │                  │
                                                                                                        │ candidate Book   │
                                                                                                        ▼                  │
                                                                                               [validateBook(book)] ──────►│
                                                                                                        │                  │
                                                                                                        ▼                  │
                                                 ◄─────────────────────────────────────── [ImportResult { book }]          │
                                                 │                                                                         │
                                                 ▼                                                                         │
                                       [ProjectPersistence]                                                                │
                                       (Saves Book to SQLite)                                                              │
```

---

### 2.2 Package & Module Boundaries

The implementation resides in `packages/importer`:
- **Workspace Dependencies:**
  - `@openbook/book-model`: Source of canonical types and `validateBook()`.
- **External Dependencies:**
  - `markdown-it` (v14.x, MIT license): Standards-compliant CommonMark token stream parser, executed in pure JavaScript without subprocesses or native bindings, configured with `html: false`.
- **Prohibited Dependencies:**
  - No dependency on `@openbook/workflow`.
  - No dependency on `@openbook/epub`, `@openbook/pdf`, `@openbook/html`, or `@openbook/validator`.
  - No dependency on SQLite, Tauri APIs, or React UI components.
  - No AI, LLM, or Ollama libraries.

---

### 2.3 Supported Initial Input Formats

Gate 7 Slice 2 is strictly bounded to two text-based formats:

1. **Markdown (`text/markdown`, `.md`) — Primary**:
   - **Frontmatter:** Optional YAML metadata header delimited by `---` (extracts `title`, `subtitle`, `authors`, `language`, `publisher`, `identifier`, `publishedAt`, `rights`).
   - **Structure Splitting:** Document headings (`#` or `##`) delineate structural sections (chapters).
   - **Blocks:** Paragraphs, headings (levels 1–6), blockquotes, bullet lists, ordered lists.
   - **Inlines:** Plain text, emphasis (`*text*`), strong (`**text**`), links (`[text](url)`).
   - **Indic / Kannada Script:** Lossless UTF-8 Unicode preservation across all headings, body text, and metadata.
2. **Plain Text (`text/plain`, `.txt`) — Baseline**:
   - Double-newline paragraph segmentation into a single canonical chapter section, populated with default or overridden metadata.

*All binary document formats (Docx, ODT, RTF, PDF), external converter subprocesses (Pandoc, LibreOffice, Calibre), and HTML archive bundles are explicitly deferred.*

---

### 2.4 Interfaces & Contracts

```typescript
export type SupportedImportFormat = "markdown" | "text";

export interface ImportSource {
  /** Target format parser to invoke */
  readonly format: SupportedImportFormat;
  /**
   * Pre-decoded JavaScript Unicode string.
   * Byte decoding and UTF-8 validation are performed by the caller before import.
   */
  readonly content: string;
  /** Optional source document filename (used as fallback for title if metadata is absent) */
  readonly filename?: string;
}

export interface ImportOptions {
  /** Strategy for partitioning document into chapters: 'heading-1' | 'heading-2' | 'single-chapter' (default: 'heading-1') */
  readonly splitStrategy?: "heading-1" | "heading-2" | "single-chapter";
  /** Fallback language code if unstated in source (default: 'en') */
  readonly defaultLanguage?: string;
  /** Caller-provided metadata overrides */
  readonly metadataOverrides?: Partial<BookMetadata>;
  /** Optional deterministic seed for reproducible ID generation */
  readonly idSeed?: string;
}

export type ImportIssueSeverity = "fatal" | "error" | "warning" | "info";

export interface ImportIssue {
  readonly code: string;
  readonly severity: ImportIssueSeverity;
  readonly message: string;
  readonly line?: number;
  readonly column?: number;
  readonly snippet?: string;
}

export interface ImportResult {
  readonly success: boolean;
  /** Populated only if success === true and validateBook() passed with zero errors */
  readonly book?: Book;
  /** Diagnostic warnings or failure errors */
  readonly issues: readonly ImportIssue[];
  /** Summary metrics of imported content */
  readonly stats: {
    readonly sectionCount: number;
    readonly blockCount: number;
    readonly wordCount: number;
  };
}

export interface IImportService {
  canImport(format: string): boolean;
  import(source: ImportSource, options?: ImportOptions): Promise<ImportResult>;
}
```

---

### 2.5 End-to-End Ingestion Flow

1. **Caller Decoding:** Caller reads file bytes from disk, validates UTF-8 decoding, and packages string into `ImportSource`.
2. **Workflow Correlation:** Caller signals `WorkflowCoordinator.requestJobStatus({ to: "running", jobId })`.
3. **Tokenization:** `markdown-it` tokenizes Markdown content with `html: false`.
4. **Metadata Extraction & PublishedAt Rule:**
   - Frontmatter YAML parsed into candidate metadata.
   - `title` defaults to filename basename or "Untitled Document".
   - `language` defaults to `defaultLanguage` ('en') if omitted.
   - `publishedAt` is preserved if provided; set to `""` if absent.
5. **Structural Splitting:** Heading tokens partition the token stream into `StructuralSection` objects.
6. **Block & Inline Mapping:** Tokens map monotonically to `ContentBlock[]` and `InlineSpan[]`. Dangerous URL schemes (`javascript:`, `data:`) are stripped to text with warnings.
7. **Deterministic ID Assignment:** Monotonic, reproducible IDs are assigned to sections and blocks.
8. **Domain Invariant Validation:** Candidate `Book` evaluated via `validateBook(book)`. If errors occur, `success = false`, errors returned, and workflow job transitions to `failed`. If valid, `success = true`, and workflow job transitions to `succeeded`.
9. **Persistence & Transition:** Caller commits `Book` to SQLite via `ProjectPersistence.saveProject(book)` and advances workflow stage: `requestTransition({ to: "STRUCTURE" })`.

---

### 2.6 Security, Determinism & Validation Model

* **HTML Disabled:** `markdown-it` runs with `html: false`. Raw HTML blocks and tags in the source are escaped as plain text or omitted.
* **Link Scheme Sanitization:** Links with dangerous schemes (`javascript:`, `vbscript:`, `data:`) have their targets removed or downgraded to plain text.
* **Subprocess & Network Isolation:** Pure in-process TypeScript; zero network calls; zero child-process execution.
* **Validation Categories:**
  - **FATAL:** Unknown format, empty source, or `validateBook` domain error (`success: false`).
  - **WARNING:** Malformed frontmatter YAML, stripped unsafe link scheme, unmapped token (`success: true`, `book` returned).
  - **INFO:** Default fallback applied (`success: true`, `book` returned).

---

## 3. Explicit Out-of-Scope Items for Slice 2

The following items are strictly out-of-scope for Gate 7 Slice 2:
- Binary format parsers (Docx, ODT, RTF, PDF).
- CLI conversion subprocesses (Pandoc, LibreOffice, Calibre).
- Asset binary ingestion or unpacking (Slice 4 — Assets).
- Direct SQLite persistence in `@openbook/importer`.
- Book Doctor validation coordinator (Slice 5 — Validation).
- AI or Ollama summarization / auto-metadata features.

---

## 4. Implementation Boundary

**Acceptance of ADR-0015 does NOT authorize implementation.**

Implementation of `packages/importer` will be authorized under a dedicated implementation handoff following project review.
