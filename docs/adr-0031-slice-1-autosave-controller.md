# ADR-0031 Slice 1: Autosave Controller — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-19); implementation in progress
- **Date:** 2026-09-19
- **Parent architecture:** ADR-0031 — Autosave & Crash Recovery Architecture
- **Scope:** Dirty/debounce/coalesce autosave scheduler with injectable Save port only
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Establish the autosave policy object before wiring filesystem package Save or Desktop Studio UI. Slice 1 proves dirty tracking, debounce, in-flight coalesce, fail-closed error retention, and flush — without React, Tauri, or coordinator changes.

## 2. Slice 1 objective

1. `AutosaveController` with `markDirty` / `markClean` / `flush` / `dispose`
2. configurable debounce
3. injectable `AutosaveSavePort` and clock (testable without real timers)
4. structured error status when save fails; dirty retained
5. follow-up save scheduled if dirty marks arrive during an in-flight save
6. no Tiptap JSON arguments on the save port

## 3. Explicit exclusions

- `saveProjectPackage` adapter (Slice 2)
- DesktopStudioCoordinator dirty hooks / project-root binding (Slice 3)
- crash-recovery UI (Slice 4)
- SQLite dual-write or Gate 10

## 4. Acceptance criteria

- unit tests cover debounce, coalesce, flush, failure retention, in-flight follow-up
- desktop `npm test` / CI pass
- diff stays within Slice 1
