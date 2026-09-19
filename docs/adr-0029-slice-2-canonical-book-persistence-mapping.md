# ADR-0029 Slice 2: Canonical Book Persistence Mapping — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-19); implementation in progress
- **Date:** 2026-09-19
- **Parent architecture:** ADR-0029 — Project Package & Filesystem Persistence Architecture
- **Depends on:** ADR-0029 Slice 1 (project-package manifest contract)
- **Scope:** Canonical Book ↔ package Book document mapping only
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

This proposal defines the second implementation slice following ADR-0029. Slice 1 established package identity and compatibility classification. Slice 2 defines how the canonical `@openbook/book-model` `Book` is represented inside the project package — without filesystem Save/Open, AssetStore wiring, or SQLite schema changes.

## 2. Slice 2 objective

Provide a typed, fail-closed mapping between:

1. a canonical in-memory `Book`; and
2. a package-facing Book document payload that later Save/Open slices can persist beside the Slice 1 manifest.

The slice must:

1. define a closed `PackageBookDocument` shape (`bookModelVersion` + `book`);
2. map Book → package payload and parse package payload → Book;
3. reject Tiptap/ProseMirror JSON as package truth;
4. reject EPUB packaging leaks via Book domain validation;
5. classify older / future Book Model versions consistently with Slice 1 compatibility vocabulary;
6. serialize/parse deterministically for unit tests;
7. preserve Unicode content through round-trip;
8. remain free of filesystem I/O, asset packaging, and atomic commit mechanics.

## 3. Package boundary

Implementation lives with Slice 1 under the desktop persistence boundary:

```text
apps/desktop/src/persistence/
  manifest.ts              # Slice 1
  bookPackageMapping.ts    # Slice 2
```

```text
Project Package Contract
        |
        +-- manifest validation          (Slice 1)
        +-- canonical Book mapping       (Slice 2 ← this slice)
        |
        v
ProjectPersistence / package FS          (later slices)
        |
        +-- AssetStore relationship
        +-- atomic Save/Open
```

This does not introduce a second domain model. The nested `book` remains a canonical `Book`.

## 4. Proposed document contract

```text
bookModelVersion
book
  (canonical @openbook/book-model Book)
```

Rules:

- closed top-level schema — no extra fields;
- `book.schemaVersion` must equal `bookModelVersion`;
- current `bookModelVersion` must equal `BOOK_MODEL_SCHEMA_VERSION`;
- older recognized versions → `migration-required`;
- newer versions → `unsupported-future-version`;
- Tiptap (`type: "doc"` + `content`) is rejected;
- publishing-specific fields (EPUB OPF/spine/etc.) are rejected via `validateBook`.

## 5. Explicit exclusions

Slice 2 does **not** authorize:

- filesystem project-package read/write;
- AssetStore / package asset layout;
- atomic Save/Open;
- SQLite schema or migration changes;
- autosave or crash recovery;
- cloud sync;
- Tiptap/ProseMirror persistence;
- export UI or publishing-engine changes;
- Gate 10 packaging;
- new third-party dependencies.

## 6. Acceptance criteria

The implementation PR is complete when:

- `PackageBookDocument` and mapping APIs are typed and tested;
- compatible / migration-required / unsupported-future / malformed classifications are deterministic;
- Tiptap and EPUB leak payloads fail closed;
- Unicode round-trip is covered;
- no filesystem Save/Open or asset wiring is introduced;
- desktop `npm test` and CI pass;
- the diff stays within this slice.

## 7. Architectural references

- ADR-0006 — Book Model authority
- ADR-0029 — Project Package & Filesystem Persistence Architecture
- ADR-0029 Slice 1 — Project Package Contract & Manifest
