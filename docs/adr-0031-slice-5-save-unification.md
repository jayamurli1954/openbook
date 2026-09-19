# ADR-0031 Slice 5: SQLite / Package Save Unification — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-20); implementation in progress
- **Date:** 2026-09-20
- **Parent architecture:** ADR-0031 — Autosave & Crash Recovery Architecture
- **Depends on:** ADR-0031 Slices 1–4
- **Scope:** Unify explicit `saveProject` so a bound package root is authoritative; SQLite remains a session index
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Prevent divergent Book copies between SQLite and the ADR-0029 package when a package root is bound. Explicit Save must not write SQLite alone and leave the package stale (or invent a second truth).

## 2. Slice 5 decision

1. **Unbound:** `saveProject` remains SQLite-only (no invented package path).
2. **Bound:** `saveProject` commits `saveProjectPackage` **first** (authoritative), then syncs SQLite as session/index aid.
3. Package Save failure → throw `PACKAGE_SAVE_FAILED`; **no** SQLite write.
4. Package success + SQLite failure → throw `PACKAGE_INDEX_SYNC_FAILED`; package bytes remain durable.
5. Explicit Save always commits the package when bound (even if autosave is clean).
6. Autosave path unchanged (package-only); does not dual-write SQLite on every debounce.

## 3. Explicit exclusions

- Gate 10 packaging/release
- React Save/Open dialogs beyond existing surfaces
- Removing SQLite entirely
- Dual-write schemes that allow lasting Book divergence by design

## 4. Acceptance criteria

- unbound Save does not create a package
- bound Save writes package + SQLite
- package failure blocks SQLite
- package success + SQLite failure surfaces `PACKAGE_INDEX_SYNC_FAILED` with package on disk
- clean bound Save still writes package
- desktop `npm test` / CI pass
