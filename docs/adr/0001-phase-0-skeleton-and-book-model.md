# ADR 0001 — Phase 0: monorepo skeleton and Book Model (no UI)

- **Status:** DECIDED (Product Owner: implement skeleton + Book Model with tests before any UI)
- **Date:** 2026-09-03
- **Does not collide with** `docs/05-decision-log.md` ADR-001 (source of truth). This file is `docs/adr/0001-…`. The matching decision-log entry is **ADR-024**.

## Decision

Lift the implementation freeze **only** for:

1. Repository / monorepo skeleton matching the Product Owner layout.
2. The `@openbook/book-model` package: types, constructors, domain validation, serialize/parse, tests.
3. CI that builds and tests that package.
4. Placeholder READMEs for later packages (editor, engines, AI, desktop). **No implementation** of those packages.

## Not authorized

- React / Tauri / any UI shell
- SQLite persistence (roadmap Step 3)
- Writing Studio, EPUB engine, EPUBCheck, Book Doctor UI, Preview
- Adding `LICENSE` (project licence still unfrozen)
- chrome-devtools-mcp
- Embedding Sigil, Scribus, Calibre, Pandoc, Tiptap, Ollama

## Dependencies (dev)

| Package | SPDX (research 2026-09-03) | Class | Why |
| --- | --- | --- | --- |
| `typescript` | Apache-2.0 | EMBED (dev) | Compile the domain package |
| `@types/node` | MIT | EMBED (dev) | `node:crypto` / `node:test` types |

No runtime dependencies in `@openbook/book-model`.

## Consequences

Book Model must not contain EPUB package structure (OPF, manifest, spine, NCX). Publishing outputs remain later projections.
