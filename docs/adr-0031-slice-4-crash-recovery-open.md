# ADR-0031 Slice 4: Crash-Recovery Discovery & Open-With-Recover — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-20); implementation in progress
- **Date:** 2026-09-20
- **Parent architecture:** ADR-0031 — Autosave & Crash Recovery Architecture
- **Depends on:** ADR-0031 Slices 1–3; ADR-0029 `recoverProjectPackage` / `openProjectPackage`
- **Scope:** Read-only recovery discovery + coordinator open-from-package with **explicit** recover policy
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Authors need a fail-closed path to discover orphaned `.openbook-backup-*` siblings and restore them before opening a filesystem project package. Recovery must never run silently.

## 2. Slice 4 objective

1. `discoverProjectPackageRecovery` / `listProjectPackageBackups` (persistence, read-only)
2. `DesktopStudioCoordinator.discoverPackageRecovery`
3. `DesktopStudioCoordinator.openFromProjectPackage` with recover policy:
   - `none` (default) — refuse if live missing but backup exists (`PACKAGE_RECOVERY_REQUIRED`)
   - `restore-if-live-missing` — recover then open
   - `force-replace` — explicit replace of live from backup (requires unambiguous `backupRoot` when multiple)
4. On successful open: load canonical Book, restore asset registry + DirectoryAssetStore, bind package root for autosave
5. No React/Tauri dialog UI in this slice (policy surface only)

## 3. Explicit exclusions

- React “Recover / Discard” dialog chrome
- SQLite dual-write / Save unification (Slice 5)
- Gate 10 packaging
- Silent recovery without caller intent
- Inventing Book content or rewriting integrity digests

## 4. Acceptance criteria

- discovery unit tests: live-ready / recoverable / ambiguous / unavailable
- coordinator tests: open without recover, refuse silent recover, restore-if-missing, ambiguous force-replace
- desktop `npm test` / CI pass
- diff stays within Slice 4
