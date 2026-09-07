# OpenBook Implementation Backlog

- **Status:** Planning backlog only
- **Date:** 2026-09-07
- **Reconciled to:** `main` after PR #17 (`452fda0`)
- **Rule:** Nothing here is authorized merely by appearing on this list. Each major area needs its architecture gate. Do not select a final PDF renderer. Do not replace official EPUBCheck. Do not expand beyond authorized foundation slices without a new authorization.

Related: `docs/FOUNDATION-READINESS-REPORT.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `docs/adr/0008-editor-technology-tiptap-prosemirror.md`.

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
PUBLISHING (NEXT ARCHITECTURAL DECISION POINTS)
├── EPUB engine                  [ACCEPTED direction: OpenBook TypeScript EPUB 3.3; NOT STARTED]
├── HTML engine                  [ACCEPTED direction; NOT STARTED — do not stub]
├── PDF renderer bake-off plan   [DONE: docs/PDF_RENDERER_BAKEOFF_PLAN.md + multilingual fixtures (PR #6)]
├── PDF renderer selection       [PENDING / UNDECIDED — requires bake-off execution & selection ADR]
├── PDF renderer implementation  [NOT STARTED]
│
VALIDATION
├── ValidatorService             [SPIKE DONE: minimal adapter in `@openbook/validator` (PR #7); production packaging conditional/future]
├── EPUBCheck adapter            [SPIKE DONE: official 5.3.0 subprocess proof (PR #7); production ship conditional/future]
├── Java runtime packaging       [SPIKE evaluated (`jlink` evidence in docs/EPUBCHECK_PACKAGING_SPIKE.md); exact Temurin/`jlink` production freeze still PENDING]
├── Book Doctor                  [ACCEPTED product concept; NOT STARTED]
│
DTP & TYPOGRAPHY
├── page model                   [requirements exist; NOT STARTED]
├── typography                   [HarfBuzz/Pango/fonts PENDING; NOT STARTED]
├── layout                       [NOT STARTED]
│
AI
├── Ollama integration           [intent only; not an MVP dependency; NOT STARTED]
├── AI orchestration             [ADR-level: AI is not the publishing engine; NOT STARTED]
└── guided workflows             [Phase 3 in ROADMAP.md; NOT STARTED]
```

## Ordered foundation engineering

Status against the original ordered list:

1. **Book Model spec + tests** on `main` — **DONE** (ADR-0006 / `@openbook/book-model`).
2. **CI** that runs those tests — **DONE** (`.github/workflows/ci.yml`).
3. **PDF bake-off plan + fixtures** (no production renderer) — **DONE** (PR #6); **renderer selection still PENDING / UNDECIDED**.
4. **EPUBCheck packaging spike** behind `ValidatorService` — **DONE as spike** (PR #7 / `docs/EPUBCHECK_PACKAGING_SPIKE.md`); production packaging remains conditional/future work.
5. **Desktop shell freeze-lift + empty shell** — **DONE** (ADR-0007 baseline; PR #9 `apps/desktop` with SQLite connectivity proof only).
6. **Semantic Document Model contract** — **DONE** (PR #11 / `@openbook/semantic-document`).
7. **Desktop SDM integration boundary** — **DONE** (PR #12; in-memory Desktop → SDM → Book).
8. **Editor technology evaluation and decision** — **DONE** (ADR-0008).
9. **First Tiptap editor implementation** — **DONE** (PR #14; EditorAdapter + minimal UI).
10. **Editor book/chapter operations** — **DONE** (PR #15; in-memory select/create/rename/delete; no persistence).
11. **SQLite project persistence architecture** — **DONE** (PR #16: `ProjectPersistence` contract, minimal schema, DTOs, atomic save transactions, foreign keys, test driver).
12. **Save/Open project workflow** — **DONE** (PR #17: session ↔ `ProjectPersistence` UI, English & Kannada round-trip coverage, persistence error reporting).

**Current Test Suite State:**
- **58 / 58 automated tests passing** across all 4 monorepo packages:
  - `@openbook/book-model`: 11 tests passing
  - `@openbook/validator`: 3 tests passing
  - `@openbook/semantic-document`: 8 tests passing
  - `@openbook/desktop`: 36 tests passing (19 domain + 11 persistence + 6 workflow)

## Next architectural decision points

The editor-to-persistence foundation is now established:
`Tiptap → EditorAdapter → SemanticDocument → Desktop Domain → Book Model → ProjectPersistence → SQLite`

The next engineering slices must address one of the following distinct architectural decision points (none of which are authorized yet):

1. **EPUB 3.3 engine architecture & implementation:**
   - Defining the OpenBook TypeScript EPUB 3.3 engine package (`@openbook/epub` or similar).
   - Reading canonical `Book` and generating compliant EPUB 3.3 packages validated by `ValidatorService`.
   - Must NOT write EPUB fields back into the Book Model.
2. **HTML engine architecture & implementation:**
   - Format-neutral projection from canonical `Book` to clean semantic HTML.
3. **PDF renderer bake-off execution & selection decision:**
   - Evaluating candidates (Typst, Chromium/Paged.js, pdf-lib) against the existing multilingual fixtures (`docs/PDF_RENDERER_BAKEOFF_PLAN.md`).
   - Issuing a formal selection ADR. Renderer remains **UNDECIDED**.
4. **Production EPUBCheck packaging & Java runtime freeze:**
   - Transitioning from the PR #7 spike to a production release strategy for bundled Temurin JRE / `jlink` isolation.
5. **DTP / Page model / Typography:**
   - Defining pagination, layout primitives, and complex Indic/Kannada text shaping (HarfBuzz/Pango).

**DO NOT implement any of the above yet.** Each requires an authorized slice and relevant architectural decision before code changes.

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
