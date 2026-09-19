# ADR-0029 Closure & Reconciliation

- **Status:** Implementation complete through Slices 1–5 on `main`; Slice 6 closes the sequencing list in this PR
- **Date:** 2026-09-19
- **Parent:** ADR-0029 — Project Package & Filesystem Persistence Architecture

## 1. Purpose

Record that ADR-0029’s accepted sequencing items are implemented as separately authorized slices, and that remaining product work (autosave, coordinator FS wiring, Gate 10) is **not** authorized by this ADR or this closure.

## 2. Slice completion

| Slice | Scope | Status |
|---|---|---|
| 1 | Package manifest contract | Done (#82) |
| 2 | Canonical Book package mapping | Done (#93) |
| 3 | Asset id↔SHA-256 package index | Done (#94) |
| 4 | Atomic Save/Open + CAS layout | Done (#95) |
| 5 | Package integrity evidence | Done (#96) |
| 6 | Migration (M1) + backup recovery | This slice |

## 3. What is complete

- Versioned project-package boundary with fail-closed Open
- Canonical Book persistence mapping (no Tiptap-as-truth)
- AssetRegistry binding persisted as `assets.json` + CAS under `assets/<sha256>`
- Atomic staging/rename Save semantics
- `integrity.json` digests verified before parse
- Explicit M1 migration and last-known-good backup recovery

## 4. Explicitly not authorized by ADR-0029 closure

- Autosave & crash-recovery product UX
- Wiring DesktopStudioCoordinator / React Save-Open to the filesystem package (still SQLite session path today)
- SQLite schema redesign or dual-write
- Book Model schema migrations beyond current schemaVersion 1
- Gate 10 packaging/release readiness
- Cloud sync

## 5. Next product capability

Autosave & crash recovery **after** the package boundary — separately gated — must use `ProjectPersistence` / the package Save path, not a parallel Tiptap save path.
