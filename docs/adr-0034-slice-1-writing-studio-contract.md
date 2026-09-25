# ADR-0034 Slice 1: Writing Studio Contract — Implementation Proposal

- **Status:** Implemented on this branch (Draft PR)
- **Date:** 2026-09-25
- **Parent architecture:** ADR-0034 — Phase 1 Writing Studio Architecture
- **Scope:** Capability matrix + ports/helpers for toolbar commands, word count, and document search; unit tests; no UI/host wiring
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Establish the Writing Studio domain contract before formatting chrome or host adapters. Slice 1 proves ROADMAP §3.3 capability status (including deferred tables), Book Model–derived word count and search, and toolbar command enumeration — without TipTap persistence, React chrome, or coordinator mutation.

## 2. Slice 1 objective

1. `writingStudioContract` under `apps/desktop/src/workflow/domain/`
2. `WRITING_STUDIO_CAPABILITIES` matrix (`in-scope` / `reuse-existing` / `deferred`)
3. `WRITING_STUDIO_TOOLBAR_COMMANDS` for Book Model–supported formatting (no tables)
4. pure helpers: word count + `normalizeSearchQuery` / `searchBookText` (fail-closed empty query)
5. ports for toolbar / word-count / search (shape only)
6. register `writingStudioContract.test.js` in desktop `npm test`

## 3. Explicit exclusions

- Formatting toolbar chrome (Slice 2)
- Word-count / search UI wiring (Slice 3)
- Image insertion UI (Slice 4)
- Hardening / EN+KN chrome round-trips (Slice 5)
- Book Model / SDM schema changes (including tables)
- AI outline generation
- Changes to Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- unit tests cover capability matrix, toolbar commands, word count (EN + KN), search fail-closed + hits, port shape boundaries
- desktop `npm test` / CI pass
- diff stays within Slice 1 (contract + tests + docs)
