# ADR-0029 Slice 3: Asset / Package Relationship — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-19); implementation in progress
- **Date:** 2026-09-19
- **Parent architecture:** ADR-0029 — Project Package & Filesystem Persistence Architecture
- **Depends on:** ADR-0029 Slice 1 (manifest), Slice 2 (canonical Book mapping)
- **Scope:** Logical AssetRef.id ↔ SHA-256 CAS binding for the project package
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Slice 1 defined package identity. Slice 2 defined how the canonical `Book` is represented in the package. Slice 3 defines how Book asset *references* relate to content-addressed package asset *keys* — without writing bytes, calling `IAssetStore`, or performing atomic Save/Open.

`AssetRef` intentionally carries no SHA-256. Runtime binding lives in `AssetRegistry`. The package must persist that binding as a closed, fail-closed index so later Save/Open can place/read CAS objects under `assets/<sha256>`.

## 2. Slice 3 objective

1. typed `PackageAssetManifest` / `PackageAssetEntry` (`assetId` + `sha256` only);
2. map Book AssetRefs + bindings → package asset index;
3. validate package asset index shape (closed schema, CAS keys via `assertSha256Key`);
4. cross-check Book.assets and image-block refs against the index;
5. rebuild id→sha256 bindings for later registry restore;
6. deterministic serialize/parse;
7. no filesystem I/O, no store put/get, no SQLite changes.

## 3. Package boundary

```text
apps/desktop/src/persistence/
  manifest.ts              # Slice 1
  bookPackageMapping.ts    # Slice 2
  packageAssetMapping.ts   # Slice 3
```

Logical package layout (contract only; FS deferred to Slice 4+):

```text
<project>/
  manifest                 # Slice 1
  canonical Book           # Slice 2
  assets-index             # Slice 3 PackageAssetManifest
  assets/<sha256>          # bytes via DirectoryAssetStore — later slices
```

## 4. Validation rules

- closed top-level schema: only `assets`;
- each entry: only `assetId` + `sha256`;
- `sha256` must be 64 lowercase hex (normalized via `@openbook/assets` `assertSha256Key`);
- duplicate ids / conflicting digests fail closed;
- every `Book.assets[]` id must have an entry (`MISSING_PACKAGE_ASSET`);
- every entry must belong to `Book.assets` (`ORPHAN_PACKAGE_ASSET`);
- image blocks whose `assetId` is absent from `Book.assets` fail (`DANGLING_IMAGE_REFERENCE`);
- byte presence / hash integrity against `IAssetStore` is **not** this slice (Slices 4–5).

## 5. Explicit exclusions

- filesystem project-package read/write;
- `IAssetStore` / `DirectoryAssetStore` / `MemoryAssetStore` put/get wiring;
- `DesktopStudioCoordinator` changes;
- atomic Save/Open;
- SQLite schema or migration changes;
- autosave / crash recovery / cloud sync;
- Book Model / `AssetRef` shape changes;
- Gate 10 packaging;
- new third-party dependencies.

## 6. Acceptance criteria

- mapping and validation APIs are typed and tested;
- fail-closed classifications are deterministic;
- Unicode remains on Book `AssetRef` metadata (manifest stays id+hash);
- desktop `npm test` and CI pass;
- diff stays within this slice.

## 7. Architectural references

- ADR-0006 — Book Model / AssetRef authority
- ADR-0017 — content-addressed assets / AssetRegistry identity separation
- ADR-0029 — Project Package & Filesystem Persistence Architecture
- ADR-0029 Slices 1–2 — manifest and Book mapping
