# OpenBook Implementation Backlog

- **Status:** Planning backlog only
- **Date:** 2026-09-07
- **Reconciled to:** `main` after PRs #6–#9 (`ffd0b1d`)
- **Rule:** Nothing here is authorized merely by appearing on this list. Each major area needs its architecture gate. Do not select a final PDF renderer. Do not replace official EPUBCheck. Do not expand the desktop shell beyond ADR-0007 hard stops without a new authorization.

Related: `docs/FOUNDATION-READINESS-REPORT.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`.

```text
FOUNDATION
├── Project scaffolding          [DONE on main: apps/desktop via PR #9 / ADR-0007 freeze-lift]
├── Tauri 2.11.5                 [FROZEN in ADR-0007; shell scaffolded in PR #9]
├── React 19.2.8 + TS 5.9.3      [FROZEN in ADR-0007; shell UI scaffolded in PR #9]
├── SQLite (tauri-plugin-sql 2.4.1) [FROZEN in ADR-0007; connectivity proof in PR #9; production schema/migrations/domain persistence NOT STARTED]
├── Book Model                   [DONE on main: executable `@openbook/book-model` (ADR-0006)]
├── CI (foundation tests)        [DONE on main: `.github/workflows/ci.yml` runs package tests + desktop frontend build]
│
PUBLISHING
├── EPUB engine                  [ACCEPTED: OpenBook TypeScript EPUB 3.3; NOT STARTED]
├── HTML engine                  [ACCEPTED direction; NOT STARTED — do not stub]
├── PDF renderer bake-off plan   [DONE: docs/PDF_RENDERER_BAKEOFF_PLAN.md + multilingual fixtures (PR #6)]
├── PDF renderer selection       [PENDING / UNDECIDED]
├── PDF renderer implementation  [NOT STARTED]
│
VALIDATION
├── ValidatorService             [SPIKE DONE: minimal adapter in `@openbook/validator` (PR #7); production packaging conditional/future]
├── EPUBCheck adapter            [SPIKE DONE: official 5.3.0 subprocess proof (PR #7); production ship conditional/future]
├── Java runtime packaging       [SPIKE evaluated (`jlink` evidence in docs/EPUBCHECK_PACKAGING_SPIKE.md); exact Temurin/`jlink` production freeze still PENDING]
├── Book Doctor                  [ACCEPTED product concept; NOT STARTED]
│
EDITOR
├── Tiptap                       [preferred; license-scorecard required; NOT FROZEN; NOT STARTED]
├── semantic document model      [must map to Book Model; NOT STARTED]
│
DTP
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

Remaining foundation / product work (not authorized by backlog presence alone): production SQLite persistence schema; EPUB/HTML/PDF engines; PDF renderer choice and implementation; editor/Tiptap; DTP; AI/Ollama.

## Explicitly out of order

- Installing Puppeteer “because HTML-to-PDF is easy”
- Vendoring an unofficial EPUBCheck WASM build
- Embedding Scribus, Sigil, Calibre, or Pandoc AST as the Book Model
- Making Ollama required for MVP
- Declaring `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` because documentation or early scaffolds exist
- Treating the PR #9 SQLite smoke DB as a production persistence schema
