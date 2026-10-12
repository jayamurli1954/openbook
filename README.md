# OpenBook Studio

Open-source desktop and digital publishing studio — write, design, typeset, validate and publish books.

**Maintainer:** SanMitra Tech Solutions  
**License:** Apache License 2.0 (`LICENSE`)

Read [`PROJECT-CONTEXT.md`](PROJECT-CONTEXT.md) first. Durable decisions live in [`docs/decisions/ARCHITECTURE-DECISION-INDEX.md`](docs/decisions/ARCHITECTURE-DECISION-INDEX.md). Planning status: [`docs/IMPLEMENTATION-BACKLOG.md`](docs/IMPLEMENTATION-BACKLOG.md). The historical foundation audit is [`docs/FOUNDATION-READINESS-REPORT.md`](docs/FOUNDATION-READINESS-REPORT.md) — it is not the current product snapshot.

## Current state (`main`)

Phase 0 is complete. **`FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` are declared** (2026-09-24; [`docs/FOUNDATION-READY-DETERMINATION.md`](docs/FOUNDATION-READY-DETERMINATION.md)).

- Canonical `@openbook/book-model` plus publishing engines for EPUB 3.3, HTML, and Typst PDF (Gates 1–6)
- Official EPUBCheck 5.3.0 + Temurin 21 packaging, Book Doctor, import, authoring session, and content-addressed assets (Gates 5–7)
- Desktop Studio (`apps/desktop`): Tauri 2.11.5 + React 19 editor (Gate 8)
- Export UI and native Save As (Gate 9 / ADR-0030)
- Filesystem project package (ADR-0029) with autosave and crash recovery (ADR-0031)
- Windows-first desktop packaging and release readiness (Gate 10 / ADR-0032)

Phase 1 (MVP: guided book creation) is in progress:

- Done: Guided Start (ADR-0033), Writing Studio (ADR-0034), Structure Studio (ADR-0035), Design Studio (ADR-0036)
- Next: Metadata Wizard (ADR-0037 Accepted; implementation not yet authorized)
- Not started: Book Idea & Outline, Cover Wizard, Preview, and the `MVP-READY` gate

Frozen desktop pins are in ADR-0007 (Tauri/React/TypeScript/SQLite) and ADR-0008 (Tiptap/ProseMirror). The PDF renderer is Typst **0.15.1** (ADR-0013). Do not silently upgrade Frozen pins.

Still gated for later phases: AI/Ollama, DTP/page layout, code signing, and multi-OS packaging.

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
