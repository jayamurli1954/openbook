# OpenBook Implementation Backlog

- **Status:** Planning backlog only
- **Date:** 2026-09-11
- **Reconciled to:** `main` after PR #40 (`33c4b54`)
- **Rule:** Nothing here is authorized merely by appearing on this list. Each major area needs its architecture gate. Do not expand beyond authorized foundation slices without a new authorization.

Related: `docs/FOUNDATION-READINESS-REPORT.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `docs/adr/0014-end-to-end-book-production-workflow-architecture.md`, `docs/adr/0018-book-doctor-validation-coordinator-architecture.md`.

```text
FOUNDATION
├── Project scaffolding          [DONE on main: apps/desktop via PR #9 / ADR-0007 freeze-lift]
├── Tauri 2.11.5                 [FROZEN in ADR-0007; shell scaffolded in PR #9]
├── React 19.2.8 + TS 5.9.3      [FROZEN in ADR-0007; shell UI scaffolded in PR #9]
├── SQLite (tauri-plugin-sql 2.4.1) [FROZEN in ADR-0007; connectivity proof in PR #9; ProjectPersistence in PR #16; Save/Open workflow in PR #17]
├── Book Model                   [DONE on main: executable `@openbook/book-model` (ADR-0006)]
├── CI (foundation tests)        [DONE on main: `.github/workflows/ci.yml` runs package tests + desktop frontend build]
├── Semantic Document Model      [DONE on main: `@openbook/semantic-document` (PR #11)]
├── Desktop SDM boundary         [DONE on main: in-memory Desktop → SDM → Book (PR #12)]
│
EDITOR & PERSISTENCE
├── Editor technology decision   [DONE: ADR-0008 — Tiptap/ProseMirror selected; OSS versions Frozen]
├── Tiptap / ProseMirror         [DONE on main: ADR-0008 pins installed in PR #14]
├── EditorAdapter (PM ↔ SDM)     [DONE on main: PR #14 bidirectional TipTap JSON ↔ SDM]
├── First editor surface         [DONE on main: PR #14 minimal Tiptap UI + EN/KN round-trips]
├── Book/chapter operations      [DONE on main: in-memory multi-chapter session (PR #15)]
├── Project persistence arch.    [DONE on main: ProjectPersistence + SQLite DTOs (PR #16)]
├── Save/Open project workflow   [DONE on main: session ↔ ProjectPersistence UI (PR #17)]
├── semantic document model      [DONE (PR #11); maps to Book Model]
│
PUBLISHING ENGINES
├── EPUB 3.3 engine              [DONE on main: `@openbook/epub` (ADR-0009, ADR-0010; PRs #20, #21, #24; Gates 1–3)]
├── HTML engine                  [DONE on main: `@openbook/html` format-neutral HTML projection (ADR-0011; PR #25; Gate 4)]
├── PDF renderer selection       [DONE on main: Typst 0.15.1 selected (ADR-0013; PR #27)]
├── PDF publishing engine        [DONE on main: `@openbook/pdf` (ADR-0013; PR #28; Gate 6)]
│
VALIDATION & RUNTIME PACKAGING
├── EPUBCheck adapter & packaging[DONE on main: official 5.3.0 + Temurin 21 jlink runtime packaging in `@openbook/validator` (ADR-0012; PR #26; Gate 5)]
├── Book Doctor coordinator      [DONE on main: `@openbook/book-doctor` BookValidationReport aggregation (ADR-0018; PR #38; Gate 7 Slice 5)]
│
END-TO-END WORKFLOW & FOUNDATION SLICES (GATE 7)
├── Workflow coordinator         [DONE on main: `@openbook/workflow` 7-stage pipeline (ADR-0014; PR #30; Gate 7 Slice 1)]
├── Importer / ingestion         [DONE on main: `@openbook/importer` Markdown/text ingestion (ADR-0015; PR #32; Gate 7 Slice 2)]
├── Authoring / session          [DONE on main: `@openbook/authoring` BookSession structural ops (ADR-0016; PR #34; Gate 7 Slice 3)]
├── Asset management             [DONE on main: `@openbook/assets` content-addressed asset store (ADR-0017; PR #36; Gate 7 Slice 4)]
├── Book Doctor coordinator      [DONE on main: `@openbook/book-doctor` (ADR-0018; PR #38; Gate 7 Slice 5)]
│
DESKTOP INTEGRATION (NEXT ARCHITECTURAL DECISION POINT)
├── Desktop Studio integration   [GATE 8: Next architectural boundary (ADR-0019) — NOT STARTED]
│
DTP & TYPOGRAPHY (FUTURE)
├── page model                   [requirements exist; NOT STARTED]
├── typography                   [HarfBuzz/Pango/fonts PENDING; NOT STARTED]
├── layout                       [NOT STARTED]
│
AI (FUTURE)
├── Ollama integration           [intent only; not an MVP dependency; NOT STARTED]
├── AI orchestration             [ADR-level: AI is not the publishing engine; NOT STARTED]
└── guided workflows             [Phase 3 in ROADMAP.md; NOT STARTED]
```

## Ordered foundation engineering

Status against the ordered list:

1. **Book Model spec + tests** on `main` — **DONE** (ADR-0006 / `@openbook/book-model`).
2. **CI** that runs those tests — **DONE** (`.github/workflows/ci.yml`).
3. **PDF bake-off plan + fixtures** (no production renderer) — **DONE** (PR #6).
4. **EPUBCheck packaging spike** behind `ValidatorService` — **DONE as spike** (PR #7 / `docs/EPUBCHECK_PACKAGING_SPIKE.md`).
5. **Desktop shell freeze-lift + empty shell** — **DONE** (ADR-0007 baseline; PR #9 `apps/desktop` with SQLite connectivity proof only).
6. **Semantic Document Model contract** — **DONE** (PR #11 / `@openbook/semantic-document`).
7. **Desktop SDM integration boundary** — **DONE** (PR #12; in-memory Desktop → SDM → Book).
8. **Editor technology evaluation and decision** — **DONE** (ADR-0008).
9. **First Tiptap editor implementation** — **DONE** (PR #14; EditorAdapter + minimal UI).
10. **Editor book/chapter operations** — **DONE** (PR #15; in-memory select/create/rename/delete; no persistence).
11. **SQLite project persistence architecture** — **DONE** (PR #16: `ProjectPersistence` contract, minimal schema, DTOs, atomic save transactions, foreign keys, test driver).
12. **Save/Open project workflow** — **DONE** (PR #17: session ↔ `ProjectPersistence` UI, English & Kannada round-trip coverage, persistence error reporting).
13. **EPUB 3.3 in-memory package generator (Gate 1)** — **DONE** (ADR-0009; PR #20).
14. **EPUB 3.3 deterministic OCF ZIP packaging (Gate 2)** — **DONE** (ADR-0009; PR #21).
15. **EPUB 3.3 asset & resource packaging (Gate 3)** — **DONE** (ADR-0010; PR #24).
16. **HTML publishing engine (Gate 4)** — **DONE** (ADR-0011; PR #25).
17. **Production EPUBCheck runtime packaging (Gate 5)** — **DONE** (ADR-0012; PR #26).
18. **PDF publishing engine & Typst 0.15.1 renderer selection (Gate 6)** — **DONE** (ADR-0013; PR #28).
19. **Workflow coordinator foundation (Gate 7 Slice 1)** — **DONE** (ADR-0014; PR #30).
20. **Import, authoring, assets, and Book Doctor foundations (Gate 7 Slices 2–5)** — **DONE** (ADR-0015–ADR-0018; PRs #32, #34, #36, #38).

**Current Test Suite State:**
- **182 / 182 automated tests passing** (0 failures, 0 skipped, 0 cancelled) across all 12 monorepo packages:
  - `@openbook/book-model`: 11 tests passing
  - `@openbook/validator`: 9 tests passing (updated in Gate 5)
  - `@openbook/semantic-document`: 8 tests passing
  - `@openbook/epub`: 42 tests passing (Gates 1–3)
  - `@openbook/html`: 15 tests passing (Gate 4)
  - `@openbook/pdf`: 12 tests passing (Gate 6)
  - `@openbook/workflow`: 8 tests passing (Gate 7 Slice 1)
  - `@openbook/importer`: 10 tests passing (Gate 7 Slice 2)
  - `@openbook/authoring`: 13 tests passing (Gate 7 Slice 3)
  - `@openbook/assets`: 10 tests passing (Gate 7 Slice 4)
  - `@openbook/book-doctor`: 8 tests passing (Gate 7 Slice 5)
  - `@openbook/desktop`: 36 tests passing (19 domain + 11 persistence + 6 workflow)

## Next architectural decision points

Gates 1 through 7 are now complete on `main`:
- Publishing engines (EPUB 3.3, HTML, and Typst PDF) are complete and passing validation.
- Production EPUBCheck runtime packaging is isolated and operational.
- End-to-end workflow foundation slices (Workflow, Importer, Authoring, Assets, Book Doctor) are implemented as format-neutral, format-firewalled packages around the canonical Book Model.

The immediate next architectural decision point is:

1. **Gate 8: Desktop Studio Integration (ADR-0019)**
   - Integrating the Gate 7 foundation packages (`@openbook/workflow`, `@openbook/importer`, `@openbook/authoring`, `@openbook/assets`, `@openbook/book-doctor`) into the desktop studio (`apps/desktop`).
   - Architectural flow:
     `Desktop UI → Workflow Coordinator → Import / Authoring / Assets / Book Doctor → Canonical Book Model → Publishing Engines (EPUB, HTML, PDF)`
   - Requires formal architecture design and acceptance (ADR-0019) before any implementation slice is authorized.

**DO NOT implement Gate 8 yet.** It requires an authorized architecture decision and explicit slice authorization prior to any code changes.

Remaining out of scope: autosave; cloud sync; filesystem project packages; AI/Ollama.

## Explicitly out of order

- Installing Puppeteer “because HTML-to-PDF is easy”
- Vendoring an unofficial EPUBCheck WASM build
- Embedding Scribus, Sigil, Calibre, or Pandoc AST as the Book Model
- Making Ollama required for MVP
- Declaring `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` because documentation or early scaffolds exist
- Treating the PR #9 SQLite smoke DB as a production persistence schema
- Letting Tiptap/ProseMirror JSON become a parallel canonical document model
- Persisting Tiptap JSON into SQLite instead of the canonical Book Model
- Adding autosave, cloud sync, or publishing engines under a Save/Open UX PR
- Implementing Gate 8 desktop wiring before ADR-0019 architecture review and slice authorization
