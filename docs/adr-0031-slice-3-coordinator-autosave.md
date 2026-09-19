# ADR-0031 Slice 3: Coordinator Dirty Hooks & Bound Package Root — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-20); implementation in progress
- **Date:** 2026-09-20
- **Parent architecture:** ADR-0031 — Autosave & Crash Recovery Architecture
- **Depends on:** ADR-0031 Slices 1–2
- **Scope:** Wire `AutosaveController` + `PackageAutosavePort` into `DesktopStudioCoordinator` with bindable package root and Book-mutation dirty hooks
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Connect package autosave to the Desktop Studio session so bound projects debounce-save canonical Book state through ADR-0029 `saveProjectPackage`, without React UI, crash-recovery UX, or SQLite dual-write.

## 2. Slice 3 objective

1. `bindPackageRoot` / `unbindPackageRoot` / `getPackageRoot` on the coordinator
2. BookSession mutators mark autosave dirty **only when a package root is bound**
3. `flushAutosave` / `getAutosaveStatus`; expose `packageRoot` + `autosave` on `getState()`
4. Resolve Save input from live Book + asset registry + asset store (no Tiptap JSON)
5. `newProject` / `openProject` clear package binding (SQLite open ≠ package open)
6. SQLite `saveProject` remains unchanged (no dual-write)

## 3. Explicit exclusions

- Crash-recovery discovery UX / open-with-recover (Slice 4)
- SQLite session Save unification with package Save (Slice 5)
- React autosave indicators / Gate 10

## 4. Acceptance criteria

- coordinator autosave unit tests cover unbound idle, bound debounce Save, flush, unbind cancel, new/open clear, no dual-write
- desktop `npm test` / CI pass
- diff stays within Slice 3
