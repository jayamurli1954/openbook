# ADR-0034 Slice 3: Word Count + Document Search — Implementation Proposal

- **Status:** Implemented on main (PR #126)
- **Date:** 2026-09-26
- **Parent architecture:** ADR-0034 — Phase 1 Writing Studio Architecture
- **Scope:** Book-derived word counts + find-in-book UI/ports; fail-closed empty query; no image insertion
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Expose Writing Studio word count and document search as product chrome over the Slice 1 Book Model helpers, so authors can see counts and find text without treating TipTap JSON as a second document model.

## 2. Slice 3 objective

1. `writingStudioQueryAdapter` — implements word-count + search ports over an injectable Book source
2. `searchDocument` structured outcome with fail-closed `EMPTY_QUERY` (no Book scan)
3. `WritingStudioFindPanel` React chrome — live word counts + find input/results
4. Wire panel into `EditorSurface`; hit click selects the matching section
5. Unit + UI source-shape tests registered in desktop `npm test`

## 3. Explicit exclusions

- Image insertion UI (Slice 4)
- Hardening / empty-state polish beyond search empty-query / no-match copy (Slice 5)
- Tables / Book Model schema changes
- AI outline generation
- Changing Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- word counts derive from Book Model (EN + KN covered)
- empty / whitespace search fails closed without scanning
- find panel stays free of TipTap JSON / Tauri / coordinator imports
- desktop `npm test` / CI pass
- diff stays within Slice 3 (query adapter + find panel + wire-up + tests + docs)
