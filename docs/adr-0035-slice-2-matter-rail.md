# ADR-0035 Slice 2: Matter Rail — Implementation Proposal

- **Status:** Implemented on this branch (Draft PR)
- **Date:** 2026-09-27
- **Parent architecture:** ADR-0035 — Phase 1 Structure Studio Architecture
- **Scope:** Front/main/back rail chrome for add, rename, and reorder within one matter; uses the Slice 1 command port
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Show Structure Studio matter groups in the desktop shell so authors can add, rename, and reorder sections without a second outline model.

## 2. Slice 2 objective

1. `createStructureStudioMatterRail` — list/add/rename/reorder only
2. `StructureStudioRail` React chrome for front, main, and back
3. Wire the rail into `EditorSurface`; selecting a section uses the existing chapter select path
4. Unit + source-shape tests registered in desktop `npm test`

## 3. Explicit exclusions

- Move between matters and role changes (Slice 3)
- Navigation preview (Slice 4)
- Empty-matter copy polish and package round-trips (Slice 5)
- Nested section trees
- Removing the existing Writing Studio chapter list

## 4. Acceptance criteria

- rail stays free of move, remove, and role commands
- add/rename/reorder go through `executeStructureCommand`
- empty title and bad reorder indices fail closed
- desktop `npm test` / CI pass
- diff stays within Slice 2 (rail port + chrome + wire-up + tests + docs)
