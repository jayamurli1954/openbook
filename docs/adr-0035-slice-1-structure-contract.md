# ADR-0035 Slice 1: Structure Studio Contract — Implementation Proposal

- **Status:** Implemented on main (PR #132)
- **Date:** 2026-09-27
- **Parent architecture:** ADR-0035 — Phase 1 Structure Studio Architecture
- **Scope:** Capability matrix + command port for list/add/rename/reorder/move/remove/role; fail-closed last chapter and invalid role; tests; no chrome
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Establish the Structure Studio domain contract before matter-rail chrome. Slice 1 proves ROADMAP §3.4 capability status (including deferred nested hierarchy) and routes structure edits through `BookSession` with structured fail-closed results.

## 2. Slice 1 objective

1. `structureStudioContract` under `apps/desktop/src/workflow/domain/`
2. `STRUCTURE_STUDIO_CAPABILITIES` matrix (`in-scope` / `reuse-existing` / `deferred`)
3. `listBookStructure` projection of front, main, and back matter
4. `executeStructureCommand` over a `BookSession`-shaped port
5. Fail closed on empty title, missing section, last main chapter, invalid role, and reorder bounds — Book unchanged
6. Register `structureStudioContract.test.js` in desktop `npm test`

## 3. Explicit exclusions

- Matter-rail React chrome (Slice 2)
- Move/role chrome beyond the command port (Slice 3)
- Read-only navigation preview chrome (Slice 4)
- Empty-matter copy and package round-trip hardening (Slice 5)
- Nested section trees / Book Model schema changes
- AI outline generation
- Changes to Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- unit tests cover the capability matrix, EN/KN titles, and fail-closed commands
- desktop `npm test` / CI pass
- diff stays within Slice 1 (contract + tests + docs)
