# ADR-0029 Slice 5: Package Integrity Evidence — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-19); implementation in progress
- **Date:** 2026-09-19
- **Parent architecture:** ADR-0029 — Project Package & Filesystem Persistence Architecture
- **Depends on:** ADR-0029 Slices 1–4
- **Scope:** Fail-closed integrity digests for committed package JSON components
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Slice 4 Save/Open already verifies CAS asset bytes. Slice 5 adds package-level integrity evidence so silent edits/truncation of `manifest.json`, `book.json`, or `assets.json` fail closed on Open without inventing Book content or running migrations.

## 2. Slice 5 objective

1. closed `integrity.json` schema (`schemaVersion`, `algorithm`, digests of the three JSON components);
2. build digests from the **exact UTF-8 texts** written during Save;
3. verify digests on Open **before** semantic parse;
4. missing / malformed / mismatched evidence → typed errors;
5. no CAS re-listing in evidence; no migration runners; no autosave/UI/SQLite changes.

## 3. Layout addition

```text
<projectRoot>/
  manifest.json
  book.json
  assets.json
  integrity.json          # Slice 5
  assets/<sha256>
```

## 4. Explicit exclusions

- migration / rewrite of packages without integrity.json (Slice 6)
- recovery that invents Book content
- coordinator/UI wiring; SQLite schema changes; autosave; Gate 10
- hashing every CAS blob into `integrity.json`

## 5. Acceptance criteria

- Save writes `integrity.json` inside the atomic staging commit
- Open fails closed on missing/mismatched/malformed evidence
- existing Slice 4 CAS checks remain
- desktop tests and CI pass

## 6. Architectural references

- ADR-0029 §2.6 Integrity and corruption handling
- ADR-0029 sequencing item 5
- ADR-0029 Slices 1–4
