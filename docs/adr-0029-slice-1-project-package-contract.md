# ADR-0029 Slice 1: Project Package Contract & Manifest — Implementation Proposal

- **Status:** Draft implementation proposal
- **Date:** 2026-09-16
- **Parent architecture:** ADR-0029 — Project Package & Filesystem Persistence Architecture
- **Scope:** Project-package identity, manifest contract, and compatibility classification only
- **Implementation authorization:** Not granted by this proposal

## 1. Purpose

This proposal defines the first implementation slice following acceptance of ADR-0029. It deliberately stops at the project-package contract and manifest boundary so that later persistence work can build on a stable, versioned contract without introducing a production Save/Open implementation prematurely.

ADR-0029 remains the governing architecture. Its acceptance does not authorize implementation by itself.

## 2. Slice 1 objective

Establish a small, format-neutral contract that allows OpenBook to identify and classify a project package before any project is exposed as an active editable session.

The slice should provide:

1. a typed project-package manifest contract;
2. explicit package-version and Book Model/schema-version metadata;
3. application provenance metadata sufficient for diagnostics;
4. compatibility classification;
5. deterministic validation errors;
6. unit tests for valid, malformed, incompatible, and future-version manifests.

## 3. Proposed package boundary

The implementation should live behind a persistence-oriented package boundary and must not become a second domain model.

Conceptually:

```text
Project Package Contract
        |
        +-- manifest validation
        +-- compatibility classification
        +-- package metadata types
        |
        v
ProjectPersistence (later slices)
        |
        +-- canonical Book persistence
        +-- AssetStore relationship
        +-- atomic Save/Open
```

The exact package/path should be selected during implementation only if it preserves the existing monorepo dependency direction.

## 4. Proposed manifest contract

The minimum logical contract is:

```text
packageVersion
bookModelVersion / schemaVersion
application
  name
  version
project
  id
  name (optional/display metadata)
compatibility
  minimumReaderVersion (where required)
```

The exact field names and serialization representation are implementation details and must be finalized with tests before acceptance of the implementation PR.

The manifest must not contain EPUB OPF/spine/manifest data, PDF layout state, Tiptap/ProseMirror document JSON, workflow state, or renderer-specific authoring semantics.

## 5. Compatibility classification

Slice 1 should expose a deterministic classification equivalent to:

- `compatible` — package can be opened by the current implementation;
- `migration-required` — package is recognized but requires an explicitly supported migration path;
- `unsupported-future-version` — package declares a version newer than the supported reader contract;
- `malformed` — required manifest structure or values are invalid.

Missing/invalid required metadata must fail closed rather than being guessed into compatibility.

This classification is metadata/contract validation only. It does not perform migrations or recovery.

## 6. Error boundary

Validation failures should be structured and machine-testable. At minimum, callers must be able to distinguish:

- invalid/missing package version;
- invalid/missing Book Model version;
- invalid application provenance;
- invalid project identity;
- unsupported future package version;
- migration-required package.

The implementation should avoid leaking storage-specific errors into the public package-contract API.

## 7. Tests required for Slice 1

The implementation PR should include tests covering:

1. valid current manifest;
2. deterministic serialization/parsing if serialization is introduced in this slice;
3. missing required version metadata;
4. malformed manifest structure;
5. unsupported future package version;
6. recognized migration-required version;
7. invalid project identity;
8. rejection of publishing-specific fields if the contract validator enforces a closed schema;
9. preservation of Book Model authority — no Tiptap/ProseMirror persistence type is introduced;
10. stable error classification suitable for later Save/Open integration.

## 8. Explicit exclusions

This Slice 1 proposal does **not** authorize:

- production project-package filesystem implementation;
- SQLite schema or migration changes;
- canonical Book persistence mapping;
- AssetStore/package integration;
- atomic Save/Open;
- autosave or crash recovery;
- cloud synchronization;
- Tiptap/ProseMirror persistence;
- export UI;
- publishing-engine changes;
- AI/Ollama;
- DTP/page-layout;
- release packaging/signing;
- new third-party dependencies.

## 9. Acceptance criteria for the implementation PR

The eventual implementation PR for Slice 1 should be considered complete only when:

- the package boundary is documented;
- the manifest contract is typed and validated;
- compatibility classification is deterministic;
- malformed and future-version inputs fail closed;
- tests cover the required cases;
- no SQLite production schema is introduced;
- no competing canonical document representation is introduced;
- `npm test` passes for the complete repository;
- the diff contains no out-of-scope work.

## 10. Authorization gate

This document is a planning/implementation proposal only.

A separate explicit authorization is required before creating the actual Slice 1 implementation code and tests.

After implementation authorization, the normal repository sequence remains:

```text
explicit authorization
    -> implementation branch
    -> implementation PR (Draft)
    -> tests / CI
    -> architecture/code review
    -> explicit Ready authorization
    -> Ready for review
    -> explicit merge authorization
    -> merge
    -> main reconciliation
```

## 11. Architectural references

- ADR-0006 — Book Model authority and format neutrality
- ADR-0007 — Desktop foundation and SQLite-as-persistence-infrastructure boundary
- ADR-0019 — Desktop Studio persistence and authoring boundaries
- ADR-0029 — Project Package & Filesystem Persistence Architecture
