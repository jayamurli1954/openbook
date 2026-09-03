# OpenBook Implementation Backlog

- **Status:** Planning backlog only
- **Date:** 2026-09-03
- **Rule:** Nothing here is authorized merely by appearing on this list. Each major area needs its architecture gate. Do not select a final PDF renderer. Do not replace official EPUBCheck. Do not start Tauri/React until a freeze-lift ADR names that slice.

Related: `docs/FOUNDATION-READINESS-REPORT.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`.

```text
FOUNDATION
├── Project scaffolding          [gate: freeze-lift ADR; NOT STARTED on main]
├── Tauri 2.x                    [ACCEPTED direction; license-scorecard + exact version PENDING]
├── React + TypeScript           [ACCEPTED direction; exact versions PENDING]
├── SQLite                       [ACCEPTED direction; schema PENDING]
├── Book Model                   [ACCEPTED principle; executable spec NOT STARTED on main]
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
5. **Desktop shell freeze-lift** (Tauri/React/SQLite) only after Product Owner accepts the governance gate remaining items they consider mandatory.

## Explicitly out of order

- Installing Puppeteer “because HTML-to-PDF is easy”
- Vendoring an unofficial EPUBCheck WASM build
- Embedding Scribus, Sigil, Calibre, or Pandoc AST as the Book Model
- Making Ollama required for MVP
- Declaring `FOUNDATION-READY` because documentation exists
