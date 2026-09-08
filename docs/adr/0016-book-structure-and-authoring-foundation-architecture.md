# ADR-0016: Book Structure and Authoring Foundation Architecture — Gate 7 Slice 3

* **Status:** Accepted
* **Date:** 2026-09-08
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Book Structure and Authoring Foundation Architecture — Gate 7 Slice 3
* **Depends on:** ADR-0004, ADR-0006, ADR-0007, ADR-0008, ADR-0014, ADR-0015
* **Implementation status:** Requires separate explicit authorization (implementation NOT authorized by this ADR alone)

## 1. Context

OpenBook's end-to-end publishing pipeline (ADR-0014 §2.3) progresses through seven discrete lifecycle stages:
```text
Import ──► Book Structure ──► Authoring/Edit ──► Assets ──► Validation ──► Preview ──► Publish
```

In Gate 7 Slice 1 (PR #30), `WorkflowCoordinator` established stage gates and job tracking (`@openbook/workflow`), enforcing the invariant that workflow state must never hold canonical Book content (`assertNoCanonicalBookContent`).

In Gate 7 Slice 2 (PR #32), `ImportService` (`@openbook/importer`) established the ingestion boundary, taking external Markdown and plain text and mapping them into a canonical `Book` model (`@openbook/book-model`).

To operationalize the next stages of the pipeline (`STRUCTURE` and `AUTHORING`), OpenBook requires a dedicated architectural specification for **Gate 7 Slice 3 — Book Structure and Authoring Foundation**.

Without this ADR:
- UI components might directly mutate `Book` object properties in place, bypassing invariant validation and leading to unvalidated drift or inconsistent state.
- Authoring and structuring layers might introduce secondary or shadow document representations, violating the core principle that `@openbook/book-model` is the single source of truth.
- Inline editing mechanisms might become prematurely coupled to complex character-range/inline-offset engines before block-level stability is established.
- Non-deterministic or runtime-random IDs could be introduced during section/block creation, compromising build determinism.
- Persistence mechanisms (SQLite) might be bundled directly into domain authoring packages, creating unnecessary native dependencies and tight coupling.

This ADR formalizes the architecture, boundaries, transactional mutation model, and invariants for Gate 7 Slice 3.

**Acceptance of this ADR does not authorize implementation.** Implementation remains strictly gated and requires separate explicit authorization.

---

## 2. Decision

OpenBook establishes the Book Structure and Authoring Foundation in a dedicated package **`packages/authoring`** (`@openbook/authoring`), providing headless, transactional in-memory operations and session coordination on canonical `Book` instances.

### 2.1 Core Architectural Invariants

1. **Sole Canonical Content Model:** `@openbook/book-model` remains the single, authoritative source of truth for all book content, sections, and metadata. The authoring layer never creates, caches, or persists an alternative document model.
2. **Snapshot Ownership & Reference Isolation:** `BookSession` owns the active canonical `Book` state. Calling `session.getBook()` or `session.getState()` returns an immutable or deep-cloned snapshot; external callers cannot mutate internal session state via returned references.
3. **Command-Driven Mutation Boundary:** All modifications occur through explicit methods on `BookSession`. Every mutation produces a candidate `Book` snapshot that is validated via `validateBook(candidate)` before replacing the session's active state.
4. **Deterministic ID Invariant:** Determinism is strictly defined:
   $$\text{Identical Initial Book} + \text{Identical Mutation Sequence} + \text{Identical } \mathit{idSeed} \Longrightarrow \text{Identical Resulting IDs and Book}$$
   The invariant guarantees collision-free uniqueness within the resulting canonical `Book`. The exact textual format of generated IDs remains unfrozen.
5. **Authoring ID Ownership:** The authoring layer strictly controls and assigns IDs for all newly added sections and blocks. Caller-supplied IDs on newly added entities are deterministically replaced. Existing canonical IDs are preserved when reordering, moving, or updating existing entities.
6. **Block-Level Authoring Boundary:** Block-level replacement/update is the canonical authoring boundary for Slice 3. An updated `ContentBlock` encapsulates its modified `InlineSpan[]` tree. Character-range and inline-offset command engines are explicitly excluded from Slice 3.
7. **Persistence Decoupling:** SQLite persistence (`ProjectPersistence`) remains strictly outside `@openbook/authoring`. The authoring session is purely in-memory.
8. **Workflow Decoupling:** `@openbook/workflow` manages stage transitions (`STRUCTURE` and `AUTHORING`) and job status; it never holds or observes canonical book content.
9. **Downstream Publishing Untouched:** Publishing projections (`@openbook/epub`, `@openbook/pdf`, `@openbook/html`) remain downstream read-only consumers.

```text
┌───────────────────────────┐
│    @openbook/importer     │ (Slice 2: Emits canonical Book from Markdown/Text)
└─────────────┬─────────────┘
              │ (Passes canonical Book)
              ▼
┌───────────────────────────┐         ┌────────────────────────────┐
│   @openbook/book-model    │◄────────│    @openbook/authoring     │ (Slice 3: Proposed)
│  (Sole Source of Truth)   │         │ (Structure & Content API)  │
└─────────────▲─────────────┘         └─────────────▲──────────────┘
              │                                     │
              │ Reads/Saves snapshot                │ Commands / Mutations
              │                                     │
┌─────────────┴─────────────┐         ┌─────────────┴──────────────┐
│  ProjectPersistence (DB)  │         │   Host Application / UI    │
│    (apps/desktop/SQLite)  │         │    (apps/desktop / CLI)    │
└───────────────────────────┘         └─────────────┬──────────────┘
                                                    │ Stage Gates
                                                    ▼
                                      ┌────────────────────────────┐
                                      │    @openbook/workflow      │
                                      │  (Orchestration Only)      │
                                      └────────────────────────────┘
```

---

### 2.2 Package & Module Boundaries

The implementation resides in `packages/authoring`:
- **Workspace Dependencies:**
  - `@openbook/book-model`: Sole content authority and source of `validateBook()`.
  - `@openbook/semantic-document` (optional peer / utility): For converting between block structures and editor adapters if needed.
- **Prohibited Dependencies:**
  - No dependency on `@openbook/workflow`.
  - No dependency on `@openbook/importer`.
  - No dependency on `@openbook/epub`, `@openbook/pdf`, `@openbook/html`, or `@openbook/validator`.
  - No dependency on SQLite, Tauri APIs, or React UI frameworks.
  - No AI, LLM, or Ollama libraries.

---

### 2.3 Book Structure Operations

The authoring layer exposes explicit structural mutation operations:

| Operation | Parameters | Behavior & Invariants |
| :--- | :--- | :--- |
| `addSection` | `matter: MatterKind`, `title: string`, `role?: SectionRole`, `atIndex?: number`, `initialBlocks?: ContentBlock[]` | Appends or inserts a new `StructuralSection`. The authoring layer assigns a deterministic section ID and replaces any input block IDs with deterministic block IDs. If `initialBlocks` is omitted, populates with an empty paragraph. |
| `removeSection` | `sectionId: string` | Deletes the specified section. **Guardrail:** Throws `InvalidStructureOperationError` if attempting to delete the last remaining chapter in `chapters` (main matter). A book must always retain at least one body chapter. |
| `reorderSection` | `matter: MatterKind`, `fromIndex: number`, `toIndex: number` | Reorders sections within the specified matter partition. Preserves existing section IDs. Indices must be within bounds. |
| `moveSection` | `sectionId: string`, `targetMatter: MatterKind`, `targetIndex?: number` | Moves a section across partitions (e.g. promoting a chapter to frontmatter preface). Preserves the section ID, updates its `kind`, and validates `role`. |
| `updateSectionTitle`| `sectionId: string`, `title: string` | Updates section title. Trims whitespace. |
| `updateSectionRole` | `sectionId: string`, `role: SectionRole \| string` | Updates publishing role (e.g. `"chapter"`, `"preface"`, `"appendix"`). |
| `updateMetadata` | `updates: Partial<BookMetadata>` | Merges validated metadata fields (`title`, `authors`, `language`, `description`, etc.). |

---

### 2.4 Content Operations (Block-Level Boundary)

Within an individual section, content authoring operates on `ContentBlock`:
- `setSectionBlocks(sectionId: string, blocks: readonly ContentBlock[])`: Atomically replaces all blocks of a section. Validates block union types (`paragraph`, `heading`, `quote`, `list`, `image`).
- `insertBlock(sectionId: string, atIndex: number, block: ContentBlock)`: Inserts a block at a specific index, generating a deterministic block ID.
- `updateBlock(sectionId: string, blockId: string, block: ContentBlock)`: Replaces an existing block in-place, preserving its canonical `blockId`. The block's inner `InlineSpan[]` tree is updated as part of the block.
- `removeBlock(sectionId: string, blockId: string)`: Removes a block. **Guardrail:** If the last block in a section is removed, an empty paragraph block is automatically inserted to maintain Book Model integrity.
- **Inline Spans:** Modified `InlineSpan[]` trees (text, emphasis, strong, links) are submitted encapsulated within their parent `ContentBlock`.
- **Unicode & Complex Script Invariant:** All text mutations preserve Indic Unicode code-points (Kannada conjuncts, viramas, and zero-width joiners) losslessly without normalization damage.
- **Format-Neutral Semantics:** No HTML markup, CSS styles, or EPUB landmarks are permitted in blocks or inlines.

---

### 2.5 Editor & Session Model

```typescript
export interface SessionState {
  readonly book: Book;
  readonly selectedSectionId: string;
  readonly isDirty: boolean;
  readonly revision: number;
}

export interface AddSectionParams {
  readonly matter: MatterKind;
  readonly title: string;
  readonly role?: SectionRole | string;
  readonly atIndex?: number;
  readonly initialBlocks?: readonly ContentBlock[];
}

export interface BookSessionOptions {
  readonly book: Book;
  readonly idSeed?: string;
  readonly initialSelectedSectionId?: string;
}

export interface IBookSession {
  getState(): SessionState;
  getBook(): Book; // Returns immutable / cloned snapshot
  getSelectedSection(): StructuralSection | undefined;
  selectSection(sectionId: string): void;
  
  // Structure mutations
  addSection(params: AddSectionParams): StructuralSection;
  removeSection(sectionId: string): void;
  reorderSection(matter: MatterKind, fromIndex: number, toIndex: number): void;
  moveSection(sectionId: string, targetMatter: MatterKind, targetIndex?: number): void;
  updateSectionTitle(sectionId: string, title: string): void;
  updateSectionRole(sectionId: string, role: string): void;
  updateMetadata(metadata: Partial<BookMetadata>): void;

  // Block-level content mutations
  setSectionBlocks(sectionId: string, blocks: readonly ContentBlock[]): void;
  insertBlock(sectionId: string, atIndex: number, block: ContentBlock): ContentBlock;
  updateBlock(sectionId: string, blockId: string, block: ContentBlock): void;
  removeBlock(sectionId: string, blockId: string): void;
  
  // History & dirty-tracking
  markSaved(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): boolean;
  redo(): boolean;
}
```

---

### 2.6 Post-Mutation Validation & Error Handling

Every mutation verifies domain validity via `validateBook(candidate)`:
1. **Validation Checks:**
   - Schema version equals 1.
   - At least one main-matter chapter exists.
   - Section IDs and block IDs are globally unique across the `Book`.
   - BCP-47 language tag is non-empty.
   - Zero EPUB packaging leak keys.
2. **Atomic Rollback:** If any domain errors occur, the candidate snapshot is rejected, session state remains unchanged, and a `DomainValidationError` is thrown.
3. **Error Hierarchy:**
   - `AuthoringError` (base class)
   - `SectionNotFoundError`
   - `BlockNotFoundError`
   - `InvalidStructureOperationError`
   - `DomainValidationError`

---

## 3. Explicit Out-of-Scope Items for Slice 3

The following areas are strictly excluded from Gate 7 Slice 3:
1. **No WYSIWYG / ProseMirror UI rendering:** UI components belong to `apps/desktop`.
2. **No character-range or inline-offset command systems:** Authoring boundary is block-level.
3. **No direct EPUB packaging or unpacking:** Sigil-style file manipulation is prohibited.
4. **No format imports:** Parsing Markdown, Docx, or text belongs to `@openbook/importer`.
5. **No asset binary caching:** Adding images to the binary cache belongs to Slice 4 (Assets).
6. **No Book Doctor aggregation:** Diagnostic aggregation belongs to Slice 5 (Validation).
7. **No AI/LLM summarization, rewriting, or generation.**
8. **No cloud synchronization or real-time collaborative protocols.**

---

## 4. Testable Architectural Invariants

| ID | Invariant | Verification Test Method |
| :--- | :--- | :--- |
| **INV-1** | **Single Source of Truth** | Confirm every session method outputs a valid `Book` and no second persistent model exists. |
| **INV-2** | **Reference Immutability** | Confirm mutating a returned `session.getBook()` object externally does not modify `session.getState().book`. |
| **INV-3** | **Last Chapter Guardrail** | Attempting `removeSection` on the only remaining main chapter must throw `InvalidStructureOperationError` and leave the `Book` unchanged. |
| **INV-4** | **Authoring ID Ownership** | Caller-supplied IDs in `addSection` are replaced with authoring-generated deterministic IDs. |
| **INV-5** | **Deterministic Repeatability** | Identical initial `Book` + identical mutation sequence + identical `idSeed` yields identical `Book` JSON serialization. |
| **INV-6** | **Continuous Validity** | Every successful mutation must satisfy `validateBook(session.getBook())` with zero domain errors. |
| **INV-7** | **Unicode Preservation** | Sections and blocks containing Kannada complex script survive insertion, updating, and reordering with exact code-point fidelity. |
| **INV-8** | **Atomic Rollback** | Mutations causing domain validation errors do not mutate session state. |
| **INV-9** | **Zero Dependency Leakage** | Assert that `packages/authoring` has no dependencies on SQLite, workflow, importer, or publishing engines. |

---

## 5. Implementation Boundary

**Acceptance of ADR-0016 does NOT authorize implementation.**

Implementation of `packages/authoring` will be authorized under a dedicated implementation handoff following project review.
