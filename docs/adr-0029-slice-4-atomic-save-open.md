# ADR-0029 Slice 4: Atomic Project Package Save/Open — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-19); implementation in progress
- **Date:** 2026-09-19
- **Parent architecture:** ADR-0029 — Project Package & Filesystem Persistence Architecture
- **Depends on:** ADR-0029 Slices 1–3
- **Scope:** Atomic filesystem Save/Open + CAS layout wiring under a project root
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Slices 1–3 defined the package contracts (manifest, Book document, asset id↔SHA-256 index). Slice 4 writes and reads those contracts on disk with atomic commit semantics and content-addressed asset bytes under `assets/<sha256>`.

## 2. Slice 4 objective

1. on-disk layout: `manifest.json`, `book.json`, `assets.json`, `assets/<sha256>`;
2. `saveProjectPackage` — stage beside target, commit via rename, preserve prior package until success;
3. `openProjectPackage` — fail-closed validation (manifest → book → assets index → CAS presence/hash);
4. reuse `DirectoryAssetStore` for CAS;
5. refuse `migration-required` and `unsupported-future-version` without migrating;
6. no SQLite schema changes, no coordinator UI wiring, no autosave.

## 3. Layout

```text
<projectRoot>/
  manifest.json
  book.json
  assets.json
  assets/
    <64-hex-sha256>
```

Staging: `<parent>/<basename>.openbook-staging-<stamp>/`  
Backup during replace: `<parent>/<basename>.openbook-backup-<stamp>/`

## 4. Explicit exclusions

- DesktopStudioCoordinator / React / Tauri wiring
- SQLite schema or `ProjectPersistence` replacement
- autosave / crash recovery UI
- migration runners / integrity evidence files (Slices 5–6)
- Gate 10 packaging
- new third-party dependencies

## 5. Acceptance criteria

- Save/Open round-trip for Book + CAS assets
- fail-closed Open for missing/future/legacy/corrupt packages
- failed Save does not replace a prior good package
- desktop tests pass in CI

## 6. Architectural references

- ADR-0029 §§2.3–2.5
- ADR-0017 DirectoryAssetStore / AssetRegistry
- ADR-0029 Slices 1–3
