# ADR-0029 Slice 6: Package Migration & Recovery — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-19); implementation in progress
- **Date:** 2026-09-19
- **Parent architecture:** ADR-0029 — Project Package & Filesystem Persistence Architecture
- **Depends on:** ADR-0029 Slices 1–5
- **Scope:** Explicit M1 migration (add integrity.json) + last-known-good backup recovery
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Slices 1–5 define the package contract, Book/asset mapping, atomic Save/Open, and integrity evidence. Slice 6 closes ADR-0029 sequencing with **explicit, observable** migration and recovery that preserve canonical Book bytes and fail closed on unsupported futures.

## 2. Migration matrix (shipped)

| Id | From | To | Action |
|---|---|---|---|
| `add-integrity-v1` | Valid Slice 4 layout (`manifest`/`book`/`assets` + CAS), missing `integrity.json` | Slice 5 layout | Write `integrity.json` from exact existing UTF-8 component bytes |

Not shipped: Book Model v0 rewrite, fictional `packageVersion` 0→1 Book transforms, digest “healing” of tampered JSON, future-version guessing.

## 3. Recovery policy

- `recoverProjectPackage` may rename an existing `.openbook-backup-*` tree onto the project root.
- Never invent empty/`{}` Book content.
- Never rewrite digests to match corrupted files.
- If no backup exists → `RECOVERY_BACKUP_MISSING`.

## 4. APIs

- `migrateProjectPackage(projectRoot)`
- `recoverProjectPackage({ projectRoot, backupRoot?, discoverSiblingBackup?, forceReplaceCorruptLive? })`
- `openProjectPackage(projectRoot, { allowMigration?: true })` — opt-in M1 only; default Open stays fail-closed

## 5. Explicit exclusions

- autosave / crash-recovery UI
- DesktopStudioCoordinator / React / Tauri wiring
- SQLite schema changes
- Gate 10 packaging
- cloud sync
- Book Model schema migrations

## 6. Acceptance criteria

- M1 migrate then Open succeeds without changing Book title/bytes
- migrate is idempotent when integrity already present
- allowMigration opens Slice 4 packages
- future versions and missing Book refuse migration
- recover restores from backup; missing backup fails closed
- desktop tests and CI pass

## 7. Architectural references

- ADR-0029 §2.6 Integrity and corruption handling
- ADR-0029 §2.7 Migration boundary
- ADR-0029 sequencing item 6
