# ADR-0031 Slice 2: Package Save Port Adapter — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-19); implementation in progress
- **Date:** 2026-09-19
- **Parent architecture:** ADR-0031 — Autosave & Crash Recovery Architecture
- **Depends on:** ADR-0031 Slice 1 (`AutosaveController` / `AutosaveSavePort`)
- **Scope:** Bind `AutosaveSavePort` to ADR-0029 `saveProjectPackage` via injectable package binding
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Wire the Slice 1 autosave scheduler to the durable project-package Save boundary without introducing coordinator UI hooks, React, or a second persistence format.

## 2. Slice 2 objective

1. `PackageAutosavePort` implementing `AutosaveSavePort`
2. `PackageAutosaveBinding.resolveSaveInput()` supplies current `ProjectPackageSaveInput` (canonical Book + bindings + store + root)
3. fail closed with `AUTOSAVE_UNBOUND_PACKAGE` when no package root is bound
4. map `ProjectPackageFsError` codes/messages into `AutosaveSaveResult`
5. injectable `save` function for unit tests; default `saveProjectPackage`
6. prove controller `flush` can persist a real package through the adapter
7. no Tiptap/ProseMirror JSON on the save path

## 3. Explicit exclusions

- DesktopStudioCoordinator dirty hooks / project-root binding (Slice 3)
- crash-recovery discovery UX (Slice 4)
- SQLite dual-write / session Save unification (Slice 5)
- Gate 10 packaging

## 4. Acceptance criteria

- unit tests cover bound Save, unbound fail-closed, empty root, FS error mapping, live Book resolve, controller flush
- desktop `npm test` / CI pass
- diff stays within Slice 2
