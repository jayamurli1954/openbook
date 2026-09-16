# OpenBook Studio

Open-source desktop and digital publishing studio — write, design, typeset, validate and publish books.

**Maintainer:** SanMitra Tech Solutions  
**License:** Apache License 2.0 (`LICENSE`)

Read [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md) first. Durable decisions live in [`docs/decisions/ARCHITECTURE-DECISION-INDEX.md`](docs/decisions/ARCHITECTURE-DECISION-INDEX.md). Planning status: [`docs/IMPLEMENTATION-BACKLOG.md`](docs/IMPLEMENTATION-BACKLOG.md). The historical foundation audit is [`docs/FOUNDATION-READINESS-REPORT.md`](docs/FOUNDATION-READINESS-REPORT.md) — it is not the current product snapshot.

## Current state (`main`)

Gates 1–8 are implemented in this repository:

- Canonical `@openbook/book-model` plus publishing engines for EPUB 3.3, HTML, and Typst PDF
- Official EPUBCheck 5.3.0 + Temurin 21 packaging, Book Doctor, import, authoring session, and content-addressed assets
- Desktop Studio (`apps/desktop`): Tauri 2.11.5 + React 19 editor, Save/Open via SQLite `ProjectPersistence`, and in-memory export APIs on `DesktopStudioCoordinator`

Frozen desktop pins are in ADR-0007 (Tauri/React/TypeScript/SQLite) and ADR-0008 (Tiptap/ProseMirror). The PDF renderer is Typst **0.15.1** (ADR-0013). Do not silently upgrade Frozen pins.

Not on `main` yet (still gated): export UI and native Save As dialogs, autosave, on-disk project-package implementation (ADR-0029 architecture is Accepted; Slice 1 is separately gated), AI/Ollama, and DTP/page layout.

`FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` are **not** declared.

## Build and test

```bash
npm ci
npm test
```

Native Tauri packaging (`npm run tauri:build`) needs a local Rust toolchain. See [`apps/desktop/README.md`](apps/desktop/README.md).

## Contribute

- Apache-2.0 + DCO 1.1 sign-off (`docs/contributing/DCO.md`, ADR-0024)
- [Code of Conduct](CODE_OF_CONDUCT.md) (ADR-0026)
- Vulnerability reports: [SECURITY.md](SECURITY.md) (ADR-0027)
