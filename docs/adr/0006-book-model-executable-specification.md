# ADR 0006: Book Model executable specification and tests (no UI)

- **Status:** Accepted
- **Date:** 2026-09-03
- **Decision owner:** SanMitra Tech Solutions
- **Area:** Book Model / Foundation
- **Decision:** Land an executable, format-neutral Book Model specification as the `@openbook/book-model` TypeScript package, with deterministic validation and automated tests, as the first authorized foundation implementation slice. No UI, desktop shell, persistence engine, or publishing engine is authorized by this ADR.

## Context

The canonical Book Model is an Accepted architectural principle (`PROJECT-CONTEXT.md`, ADR-0004) but had **no executable specification on `main`** (Foundation Readiness Report gap G-07; CI gap G-08). The `IMPLEMENTATION-BACKLOG.md` ordered-engineering list names "Book Model spec + tests on `main`" as step 1, and the readiness report's recommended next step is to "land a Book Model specification + tests only (rebase PR #1, renumber its ADR, no UI)".

A candidate implementation already existed on the unmerged branch `cursor/openbook-constitution-ae36` (PR #1) as `@openbook/book-model`. That branch also carried non-canonical material: a parallel `docs/00–12` constitution tree, empty forward-looking package/app scaffolds, and a `docs/adr/0001-…` file that both **collides with the reserved-but-unissued ADR-0001** on `main` and contained **stale licensing text** ("project licence still unfrozen; adding LICENSE not authorized") that contradicts the adopted Apache-2.0 decision (ADR-0003).

The Product Owner authorized reusing PR #1's implementation as a *candidate only*, reconciled against current canonical governance, and landing it as ADR-0006.

## Decision

1. **Scope authorized (this slice only):**
   - the `@openbook/book-model` package: TypeScript types, constructors, deterministic domain validation, serialize/parse, and tests;
   - English and Kannada/Indic JSON fixtures under `tests/fixtures/`;
   - a root npm workspace that builds and tests only `@openbook/book-model`;
   - a CI workflow that runs those tests.

2. **The Book Model is the canonical, format-neutral source of truth.** It must be consumable independently by future EPUB, PDF, and HTML engines, which are projections (ADR-0004). No output format becomes the authoring source.

3. **Format neutrality is enforced in code.** The authoring `Book` must not contain EPUB packaging, container, or navigation structures. `validateBook` deterministically rejects the keys `opf`, `manifest`, `spine`, `ncx`, `nav`, `navDoc`, `container`, and `packageDocument` as `epub-authoring-leak` errors. No external application's internal document model (Sigil, Scribus, Calibre, Pandoc, etc.) becomes the Book Model.

4. **`schemaVersion` is explicit** (`BOOK_MODEL_SCHEMA_VERSION = 1`) and enforced by validation and by `parseBook`, supporting future migrations (Roadmap §7.7).

5. **Licensing.** All new original source files are OpenBook works under **Apache-2.0** (ADR-0003) and carry `SPDX-License-Identifier: Apache-2.0`. No contradictory headers are introduced.

## Dependencies (development only)

Classified per `LICENSING_POLICY.md` and ADR-0002. No runtime dependencies are added.

| Package | Version | SPDX | Classification | Why required |
| --- | --- | --- | --- | --- |
| `typescript` | ^5.8.2 | Apache-2.0 | EMBED (dev) | Compile and type-check the package |
| `@types/node` | ^22.13.10 | MIT | EMBED (dev) | Types for `node:crypto` / `node:test` / `node:fs` |

Both are permissive and among the preferred embedded licenses (`LICENSING_POLICY.md` §5). Tests use Node's built-in `node:test` runner; no test-framework dependency is added.

## Not authorized by this ADR

- Tauri, React, or any UI/desktop shell (still gated; requires a separate freeze-lift ADR per the backlog);
- SQLite or any persistence engine;
- EPUB / HTML / PDF publishing engines;
- EPUBCheck integration or a bundled Java runtime (ADR-0005 remains direction only);
- PDF renderer selection (bake-off pending, ADR-0004);
- Tiptap/ProseMirror, Puppeteer/Chromium, Ollama, or any AI framework;
- adding or changing `LICENSE` (Apache-2.0 already adopted in ADR-0003);
- the non-canonical `docs/00–12` constitution tree or empty package scaffolds from PR #1.

## Relationship to PR #1 and ADR numbering

This ADR supersedes and replaces the unmerged `docs/adr/0001-phase-0-skeleton-and-book-model.md` from PR #1, which is **not** canonical on `main`. Consistent with the Architecture Decision Index, **ADR-0001 remains unissued and reserved**; this decision uses the next free number, **0006**. The reused code was reviewed against current governance before acceptance; obsolete governance material from PR #1 was not preserved.

## Consequences

### Positive

- The Book Model becomes executable and testable, closing readiness gaps G-07 and (via CI) part of G-08.
- Format neutrality is guaranteed by tests, not just prose.
- Multilingual integrity (Kannada/Indic) is covered by fixtures and a round-trip test.
- The foundation slice adds no runtime dependencies and no product surface.

### Negative / responsibilities

- Schema evolution now requires explicit `schemaVersion` bumps and migrations.
- Future engines must treat this package as read-only input and must not push package-format fields back into it.
- This ADR does not advance the `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` gates on its own; remaining items in the readiness report still apply.
