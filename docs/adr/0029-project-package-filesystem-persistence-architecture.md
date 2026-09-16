# ADR-0029: Project Package & Filesystem Persistence Architecture

- **Status:** Proposed
- **Date:** 2026-09-16
- **Decision owner:** SanMitra Tech Solutions
- **Area:** Project persistence / Filesystem / Desktop architecture
- **Depends on:** ADR-0006, ADR-0007, ADR-0014, ADR-0016, ADR-0017, ADR-0019, ADR-0028
- **Implementation authorization:** None

## 1. Context

OpenBook has completed Gates 1–8 and ADR-0028. The desktop architecture already establishes `@openbook/book-model` as the canonical document source, SQLite as persistence infrastructure rather than the Book Model, content-addressed asset storage, and Tiptap/ProseMirror JSON as an ephemeral editor representation.

The current Save/Open foundation predates a durable project-package contract. The next architectural boundary must therefore define what an OpenBook project is on disk, how canonical Book data and assets relate to project metadata and persistence infrastructure, and how future autosave, recovery, migration, export UX, and cloud synchronization can build on one stable project boundary without creating competing sources of truth.

This ADR is architecture-only. It does not implement a project package, change the Book Model, add dependencies, redesign SQLite, or authorize autosave/cloud sync.

## 2. Decision

OpenBook should use a **versioned project package** as the durable filesystem boundary for a user project. The package is an application-owned directory/container whose internal representation is implementation-defined by this ADR's contract and may use SQLite plus filesystem-backed assets.

The project package is not itself a second domain model. The canonical Book remains the authoritative document representation.

```text
OpenBook Project Package
├── project metadata / package manifest
├── canonical Book representation
├── persistence infrastructure state
├── content-addressed assets
└── future-compatible extension area
```

### 2.1 Canonical ownership

1. `@openbook/book-model` remains the canonical, format-neutral domain model.
2. `BookSession` remains the authoring aggregate for in-memory editing.
3. Tiptap/ProseMirror JSON remains an ephemeral editor transport and must not become a persisted canonical document representation.
4. Workflow state remains operational session state and is not persisted as canonical Book content.
5. Asset binaries remain governed by `@openbook/assets` and are referenced from the Book through lightweight `AssetRef` metadata.
6. SQLite remains persistence infrastructure under `ProjectPersistence`; SQLite tables do not become the public domain model.

### 2.2 Project package contract

A project package must have a stable top-level identity and explicit version metadata sufficient to determine whether the application can safely open it.

The architecture should distinguish at least:

- `packageVersion` — version of the on-disk project-package contract;
- `bookModelVersion` / schema version — version of the canonical Book representation;
- application provenance/version metadata;
- migration compatibility information where applicable.

The package must not encode publishing-specific structures such as EPUB OPF/spine/manifest or PDF layout structures as canonical project fields.

### 2.3 Proposed logical layout

The following is a logical architecture, not an implementation mandate for exact filenames:

```text
<project>/
├── manifest / project metadata
├── canonical Book persistence
├── assets/
│   └── content-addressed objects
└── future extension area
```

The implementation may use SQLite for structured project persistence, provided that the database remains an adapter/storage mechanism and the canonical Book contract remains independent of SQL table shape.

### 2.4 Save semantics

A successful Save must represent one coherent project state.

The architecture must provide:

1. serialization of the current canonical Book;
2. persistence of required project metadata;
3. persistence/availability of referenced assets;
4. atomic commit semantics so an interrupted Save does not silently replace a valid project with a partial state;
5. a deterministic indication of success/failure to the caller;
6. preservation of the previous known-good project state until the new state is committed.

Exact transaction/journal/rename mechanics remain an implementation detail to be selected in a follow-up implementation plan or ADR where necessary.

### 2.5 Open semantics

Opening a project must validate the package boundary before exposing it as an active editable project.

At minimum, the architecture must distinguish:

- valid and compatible project;
- valid but requiring migration;
- unsupported future package version;
- malformed/corrupt package;
- missing or invalid required assets;
- persistence/runtime failure.

Open must not silently reinterpret an incompatible package as a new or partially empty project.

### 2.6 Integrity and corruption handling

The project architecture should support integrity evidence sufficient to detect incomplete or inconsistent project state.

Where practical, integrity metadata should be associated with package components or committed project state. Integrity failure must be surfaced as an explicit project-open/save error rather than silently repaired without a defined recovery policy.

Recovery mechanisms may preserve or restore the last known-good state, but recovery must not invent or mutate canonical Book content without an explicit user-visible policy.

### 2.7 Migration boundary

Project-package migrations must be explicit and version-aware.

Rules:

- migrations operate at the project persistence boundary;
- migration must preserve canonical Book semantics;
- migrations must not turn Tiptap JSON or SQL schema into a new canonical domain model;
- unsupported future versions must fail closed rather than being guessed into compatibility;
- migration outcomes should be observable and testable.

### 2.8 Relationship to existing Desktop Studio architecture

ADR-0019 remains authoritative for the Desktop Studio coordinator and its persistence boundary.

```text
React / Tauri Desktop
        ↓
DesktopStudioCoordinator
        ↓
ProjectPersistence
        ↓
Project Package Boundary
   ┌────┴───────────┐
   ▼                ▼
Book persistence   Asset storage
   │                │
   ▼                ▼
Book Model        AssetStore
```

The project package therefore complements, rather than replaces, `ProjectPersistence`, `BookSession`, `AssetStore`, or `@openbook/book-model`.

### 2.9 Future extension points

This architecture intentionally provides stable boundaries for later decisions:

- **Autosave & recovery:** may use the same project package and atomic-save semantics; it must not create a second persistence model.
- **Cloud sync:** may synchronize project-package state or an explicitly defined higher-level representation; it requires a separate ADR and conflict-resolution model.
- **Export UX:** reads the canonical Book and existing publishing engines; it does not redefine project persistence.
- **AI/Ollama:** may consume/edit canonical Book-derived representations through authorized application services; it does not become a persistence authority.
- **DTP/layout:** may introduce presentation/layout state only through a future architecture decision and must not pollute the format-neutral Book Model with renderer-specific structures.

## 3. Explicit non-authorizations

This ADR, while Proposed, does **not** authorize:

- implementing the project-package format;
- changing `ProjectPersistence` implementation;
- changing SQLite schema or migrations;
- adding filesystem project-package code;
- autosave;
- crash-recovery implementation;
- cloud synchronization;
- new dependencies;
- DTP/page-layout implementation;
- AI/Ollama integration;
- publishing-engine changes;
- export UI implementation;
- release packaging or signing;
- changes to ADR-0028 compliance mechanisms;
- changes to the canonical Book Model;
- persisting Tiptap/ProseMirror JSON as project truth.

## 4. Alternatives considered

| Alternative | Result |
|---|---|
| SQLite database alone as the user-facing project format | Rejected as the architectural boundary; it couples the durable project contract directly to a storage implementation. |
| Tiptap/ProseMirror JSON as project source | Rejected; violates the established canonical Book Model boundary. |
| One opaque proprietary binary with no versioned contract | Rejected; weakens migration, integrity, recovery, and future interoperability. |
| Filesystem folder with arbitrary files and no manifest/version contract | Rejected; insufficient for deterministic compatibility and migration handling. |
| Cloud-first project storage | Rejected for the local-first foundation; cloud sync requires a later dedicated architecture decision. |

## 5. Acceptance criteria for a future Accepted version

Before this ADR can become Accepted, review must confirm that it:

1. preserves ADR-0006 canonical Book Model authority;
2. preserves ADR-0007 SQLite-as-persistence-infrastructure boundary;
3. preserves ADR-0019 Desktop Studio persistence and asset boundaries;
4. defines a durable project-package identity and versioning model;
5. defines Save/Open atomicity and failure semantics;
6. defines integrity/corruption handling boundaries;
7. defines migration compatibility rules;
8. leaves autosave, cloud sync, DTP, AI, and export UI separately gated;
9. introduces no competing document source of truth;
10. requires a separate implementation authorization after acceptance.

## 6. Implementation sequencing after acceptance

If accepted, implementation should be separately authorized and sliced rather than introduced as a monolithic persistence rewrite:

1. project-package contract and manifest;
2. canonical Book persistence mapping;
3. asset/package relationship;
4. atomic Save/Open integration;
5. integrity and compatibility verification;
6. migration/recovery tests.

No item above is authorized by this Proposed ADR.

## 7. Governance statement

This ADR is a proposed architecture document only. Its presence does not authorize implementation. Any implementation must follow the repository's normal branch → PR → DCO/CI → review → explicit authorization sequence.
