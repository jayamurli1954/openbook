# OpenBook Implementation Backlog

- **Status:** Planning backlog only
- **Date:** 2026-09-03
- **Rule:** Nothing here is authorized merely by appearing on this list. Each major area needs its architecture gate. Do not select a final PDF renderer. Do not replace official EPUBCheck. Do not start Tauri/React/SQLite implementation except within the ADR-0007 next-PR freeze-lift hard stops.

Related: `docs/FOUNDATION-READINESS-REPORT.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`.

```text
FOUNDATION
├── Project scaffolding          [gate: ADR-0007 freeze-lift; next PR only — NOT STARTED on main]
├── Tauri 2.11.5                 [FROZEN baseline in ADR-0007; app scaffold NOT STARTED]
├── React 19.2.8 + TS 5.9.3      [FROZEN baseline in ADR-0007; UI NOT STARTED]
├── SQLite (tauri-plugin-sql 2.4.1) [FROZEN technology in ADR-0007; schema/impl NOT STARTED]
├── Book Model                   [ACCEPTED; executable `@openbook/book-model` on main (ADR-0006)]
│
PUBLISHING
├── EPUB engine                  [ACCEPTED: OpenBook TypeScript EPUB 3.3; NOT STARTED]
├── HTML engine                  [ACCEPTED direction; roadmap Phase 2 vs PRD MVP — do not stub]
├── PDF renderer bake-off        [PENDING DECISION; Typst/pdf-lib/Chromium candidates]
│
VALIDATION
├── ValidatorService             [ACCEPTED in ADR-0005; NOT STARTED]
├── EPUBCheck adapter            [ACCEPTED; official 5.3.0; NOT STARTED]
├── Java runtime packaging       [ACCEPTED strategy; exact Temurin/jlink PENDING]
├── Book Doctor                  [ACCEPTED product concept; NOT STARTED]
│
EDITOR
├── Tiptap                       [preferred; license-scorecard required; NOT FROZEN]
├── semantic document model      [must map to Book Model; NOT STARTED]
│
DTP
├── page model                   [requirements exist; NOT STARTED]
├── typography                   [HarfBuzz/Pango/fonts PENDING]
├── layout                       [NOT STARTED]
│
AI
├── Ollama integration           [intent; not a dependency yet]
├── AI orchestration             [ADR-level: AI is not the publishing engine]
└── guided workflows             [Phase 3 in ROADMAP.md]
```

## Ordered foundation engineering (when authorized)

Do not execute this list in the current audit.

1. **Book Model spec + tests** on `main` (schemaVersion, no EPUB package fields, English + Kannada fixtures).
2. **CI** that runs those tests.
3. **PDF bake-off plan + fixtures** (no production renderer).
4. **EPUBCheck packaging spike** (checksums, `jlink` measurement) behind `ValidatorService` — still not a desktop app.
5. **Desktop shell freeze-lift** — governance baseline recorded in **ADR-0007**. Next engineering PR may scaffold empty Tauri/React/SQLite shell only within ADR-0007 §6 hard stops (no PDF/engines/AI/EPUBCheck redesign).

## Explicitly out of order

- Installing Puppeteer “because HTML-to-PDF is easy”
- Vendoring an unofficial EPUBCheck WASM build
- Embedding Scribus, Sigil, Calibre, or Pandoc AST as the Book Model
- Making Ollama required for MVP
- Declaring `FOUNDATION-READY` because documentation exists
