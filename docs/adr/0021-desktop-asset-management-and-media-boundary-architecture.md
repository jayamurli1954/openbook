# ADR-0021: Desktop Asset Management & Media Boundary Architecture — Gate 8 Slice 3

* **Status:** Accepted
* **Date:** 2026-09-15
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Desktop Asset Management & Media Boundary Architecture — Gate 8 Slice 3
* **Depends on:** ADR-0006, ADR-0007, ADR-0010, ADR-0014, ADR-0016, ADR-0017, ADR-0019, ADR-0020
* **Implementation status:** Slice 3 implemented (`DesktopStudioCoordinator.ingestAsset` / `insertImageBlock`). This file was missing from `main` after Slice 3 landed; the architecture record is restored here.

---

## 1. Context

OpenBook completed Gate 8 Slice 2 on `main` (`62fab68`, PR #44), establishing `DesktopStudioCoordinator.importContent()` so Markdown and plain text enter a canonical `BookSession` during the `IMPORT` stage. Slice 1 already wires `@openbook/workflow` and `@openbook/authoring` to `EditorAdapter` and `ProjectPersistence`. Save remains explicit `saveProject()` only.

Under ADR-0014 (§2.3) and ADR-0019 (§5), pipeline stages include **`AUTHORING`** and **`ASSETS`**:
```text
IMPORT ──► STRUCTURE ──► AUTHORING ──► ASSETS ──► VALIDATION ──► PREVIEW ──► PUBLISH
```

Gate 7 Slice 4 (ADR-0017) delivered `@openbook/assets`: SHA-256 content-addressed `IAssetStore`, `MemoryAssetStore`, reject-only SVG security, `AssetIngestionPipeline`, and `StoreBackedAssetResolver` compatible with the established `AssetResolver` contract. The canonical `Book` holds `AssetRef` metadata only; binaries never belong in Book JSON.

`apps/desktop` currently has no coordinator integration with `@openbook/assets`. Image blocks cannot be ingested into the studio store, attached via `BookSession`, or persisted as `AssetRef` metadata without also leaking bytes into SQLite.

This ADR defines **Gate 8 Slice 3: Desktop Asset Management & Media Boundary Architecture**, specifying:
1. The default in-memory `MemoryAssetStore` and injectable `IAssetStore` boundary on `DesktopStudioCoordinator`.
2. `BookSession.addAsset()` / `removeAsset()` as the only path that attaches or detaches `AssetRef` metadata on the canonical `Book`.
3. Granular stage permissions distinguishing `AUTHORING` image-block editing from `ASSETS` binary ingestion.
4. Explicit `saveProject()` only: asset operations never auto-save and never write binary blobs to SQLite.
5. Atomic image-block insertion (store ingest + `AssetRef` attach + `image` `ContentBlock`) with BookSession rollback on failure.

**Acceptance of this ADR did not authorize implementation.** Slice 3 was later authorized and implemented separately (PR #46). Slices 4–5 were implemented under ADR-0022 / ADR-0023.

---

## 2. Decision

OpenBook integrates `@openbook/assets` into `apps/desktop` via `DesktopStudioCoordinator`, providing headless image ingestion and image-block authoring against a content-addressed `IAssetStore`. The default store is `MemoryAssetStore`. Callers may inject any `IAssetStore`. SHA-256 remains the storage key. Unsafe SVG is rejected, never rewritten. SQLite persists the canonical `Book` (including `AssetRef` rows in `book.assets`) and never stores asset bytes.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        Desktop UI / Host                               │
│     (bytes + originalFilename; decoding/FS access stay in the host)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ AssetIngestInput { content, kind, ... }
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  DesktopStudioCoordinator (Domain)                     │
│                                                                        │
│  AUTHORING: insert/remove image ContentBlock for existing AssetRef     │
│  ASSETS:    ingest → IAssetStore.put(sha256) → BookSession.addAsset()  │
│             optional atomic image-block insertion                      │
│                                                                        │
│  Persistence: none until explicit saveProject()                        │
└──────────────┬─────────────────────────────┬───────────────────────────┘
               │ Book.assets AssetRef[]      │ SHA-256 bytes
               ▼                             ▼
    ┌─────────────────────┐       ┌───────────────────────┐
    │ ProjectPersistence  │       │      IAssetStore      │
    │ (SQLite Book JSON)  │       │ MemoryAssetStore dflt │
    └─────────────────────┘       └───────────────────────┘
```

---

## 3. Core Architectural Invariants

### 3.1 Store & Security Invariants
1. **INV-1 (Default Memory Store, Injectable Port):** `DesktopStudioCoordinator` constructs a `MemoryAssetStore` unless an `IAssetStore` is injected. Slice 3 does not require `DirectoryAssetStore` or any SQLite-backed store.
2. **INV-2 (SHA-256 Content Addressing):** Storage identity is the SHA-256 digest of the binary (ADR-0017 INV-4). Identical bytes produce the same store key. `originalFilename` is metadata only and never a path or key.
3. **INV-3 (Reject-Only SVG Safety):** Unsafe SVG is rejected by `@openbook/assets` and never rewritten or sanitized into a “safe” SVG (ADR-0017 INV-2 / §2.8).
4. **INV-4 (Zero Binary Blobs in SQLite):** `ProjectPersistence` / `project_documents.book_payload` stores canonical `Book` JSON only. Asset bytes MUST NOT appear in SQLite. `Book.assets` contains `AssetRef` metadata only.

### 3.2 Session & Authoring Invariants
1. **INV-5 (BookSession Asset Registry):** Attaching or detaching publication assets on the canonical `Book` uses `BookSession.addAsset()` and `BookSession.removeAsset()` only. Direct mutation of `book.assets` by the coordinator or UI is forbidden. These methods update `AssetRef` metadata; they do not store bytes.
2. **INV-6 (Atomic Image-Block Insertion):** Inserting an `image` `ContentBlock` together with a newly ingested asset is one coordinator transaction. The coordinator snapshots `BookSession` first. If ingestion, `addAsset()`, or block insertion fails validation, the session is restored to the snapshot (ADR-0016 INV-8). No orphaned image block remains on the Book.
3. **INV-7 (Ingestion Does Not Mutate Book Until addAsset):** `@openbook/assets` `AssetIngestionPipeline` never mutates the canonical `Book` (ADR-0017 INV-7). Only `BookSession.addAsset()` incorporates the resulting `AssetRef`.

### 3.3 Workflow & Persistence Invariants
1. **INV-8 (Granular AUTHORING / ASSETS Permissions):**
   - **`AUTHORING`:** insert or remove `image` `ContentBlock`s that reference `AssetRef`s already on the Book. Binary ingestion (`ingestAsset`) and `addAsset()` / `removeAsset()` of new registry entries are not permitted.
   - **`ASSETS`:** ingest bytes through `AssetIngestionPipeline` into `IAssetStore`; `BookSession.addAsset()` / `removeAsset()`; optional atomic ingest + image-block insertion.
   - Other stages reject asset ingestion and image-block authoring.
2. **INV-9 (Explicit saveProject() Only):** Asset ingest, `addAsset` / `removeAsset`, and image-block edits NEVER call `ProjectPersistence` and NEVER auto-save. SQLite changes occur only on explicit `saveProject()`.
3. **INV-10 (Workflow State Isolation):** `WorkflowState` remains stage / jobStatus / jobId only. `assertNoCanonicalBookContent` must pass. Asset bytes and `AssetRef` lists are not stored on workflow state.
4. **INV-11 (Headless Domain):** `DesktopStudioCoordinator` stays a pure TypeScript aggregate: no `@tauri-apps/*`, React, or DOM imports. Host code supplies `Uint8Array` content.

---

## 4. Contract & Interface Specifications

### 4.1 Coordinator Construction
```typescript
import type { IAssetStore } from "@openbook/assets";

export type DesktopStudioCoordinatorOptions = {
  persistence: ProjectPersistence;
  book?: Book;
  idSeed?: string;
  initialSelectedSectionId?: string;
  now?: () => string;
  /** Defaults to MemoryAssetStore when omitted. */
  assetStore?: IAssetStore;
};
```

### 4.2 BookSession Asset Registry
Slice 3 requires `@openbook/authoring` `BookSession` to expose:

```typescript
addAsset(asset: AssetRef): AssetRef;
removeAsset(assetId: string): void;
```

Both operations run inside existing `BookSession` transactional mutation (`validateBook()`, atomic rollback). They do not accept or return binary payloads.

### 4.3 Coordinator Interface Additions
`IDesktopStudioCoordinator` retains Slice 1–2 methods and adds:

```typescript
import type { AssetIngestInput, AssetIngestResult, AssetResolver } from "@openbook/assets";
import type { AssetRef, ContentBlock } from "@openbook/book-model";

export interface IDesktopStudioCoordinator {
  // Slice 1–2 methods retained (getState, getBook, getSession, newProject,
  // openProject, saveProject, listProjects, transitionStage, importContent, ...)

  /**
   * ASSETS stage only. Run AssetIngestionPipeline against the injected IAssetStore,
   * then BookSession.addAsset() for a successful AssetRef. Does not persist SQLite.
   */
  ingestAsset(input: AssetIngestInput): Promise<AssetIngestResult>;

  /**
   * ASSETS stage. Ingest (if needed) and insert an image ContentBlock in one
   * BookSession transaction. Rolls back the session on any failure.
   */
  insertImageBlock(input: {
    sectionId: string;
    atIndex: number;
    ingest: AssetIngestInput;
  }): Promise<{ assetRef: AssetRef; block: ContentBlock }>;

  /**
   * AUTHORING or ASSETS. Insert or remove an image block that references an
   * AssetRef already present on the Book. No binary ingest.
   */
  insertExistingImageBlock(sectionId: string, atIndex: number, assetId: string): ContentBlock;
  removeImageBlock(sectionId: string, blockId: string): void;

  getAssetResolver(): AssetResolver;
}
```

---

## 5. Execution Flow

### 5.1 `ingestAsset` (ASSETS only)
1. Verify workflow stage is `ASSETS`. Otherwise throw a deterministic coordinator error.
2. Optionally mark workflow job `running` (`jobId: "asset-..."`).
3. Delegate to `AssetIngestionPipeline` with the coordinator's `IAssetStore`.
4. On pipeline failure: job `failed`; do not call `addAsset()`; throw.
5. On success: `BookSession.addAsset(result.assetRef)`; job `succeeded` then `idle`.
6. Do not call `saveProject()` or any `ProjectPersistence` write.

### 5.2 Atomic image-block insertion (ASSETS)
1. Snapshot `BookSession.getBook()` and selected section.
2. `ingestAsset` path as above (or reuse an in-flight successful `AssetRef` from this transaction only).
3. `insertBlock` an `image` `ContentBlock` `{ type: "image", id, assetId, caption }` on the target section.
4. If any step fails: restore the session from the snapshot; job `failed`; no image block remains.
5. Do not persist SQLite.

### 5.3 Image-block authoring (AUTHORING or ASSETS)
1. Verify the `assetId` exists on `Book.assets`.
2. Insert or remove the `image` block via `BookSession` block operations.
3. Reject binary ingest and `addAsset()` / `removeAsset()` while stage is `AUTHORING`.

---

## 6. Persistence Mapping

| Data | Location |
| :--- | :--- |
| Canonical `Book` including `book.assets: AssetRef[]` | SQLite via explicit `saveProject()` |
| SHA-256 asset bytes | `IAssetStore` (`MemoryAssetStore` default) |
| Tiptap JSON | Never persisted (ADR-0019 / ADR-0020) |
| Workflow stage / job | In-memory `@openbook/workflow` only |

Opening a project restores `Book` JSON (AssetRef metadata). Re-hydrating bytes is an `IAssetStore` concern for the injected store; Slice 3 does not add SQLite blob columns.

---

## 7. Verification & Testing Strategy

Slice 3 implementation (when separately authorized) requires desktop unit tests for:

1. **Store default & injection:** Coordinator uses `MemoryAssetStore` unless `assetStore` is provided.
2. **SHA-256:** Re-ingesting identical bytes yields the same store key; filename does not affect the key.
3. **SVG reject-only:** Unsafe SVG fails ingest; the Book is unchanged.
4. **SQLite isolation:** `ingestAsset` / `insertImageBlock` do not insert or update `project_documents` rows; subsequent `saveProject()` persists `AssetRef` metadata without binary payloads in `book_payload`.
5. **Stage permissions:** `ingestAsset` rejected outside `ASSETS`; image-block insert for existing refs allowed at `AUTHORING` and `ASSETS`.
6. **Atomic insertion:** Simulated `addAsset` or `insertBlock` failure restores the pre-image Book with no orphaned image block.
7. **Unicode:** Kannada `altText` / caption survives `AssetRef` and `image` block round-trip through `BookSession`.

---

## 8. Consequences

### Positive
* Connects the `ASSETS` stage to `@openbook/assets` without a second document model.
* Keeps binaries out of SQLite and out of the canonical Book JSON.
* Reuses ADR-0017 SHA-256 addressing, SVG reject-only policy, and `AssetResolver` compatibility.
* Makes image-block authoring transactional through `BookSession`.

### Governance Constraints
* **Acceptance of this ADR did not authorize implementation.** Slice 3 implementation was authorized separately and is now complete on `main` (PR #46).
* Later/unrelated work remains gated: export UI and host file dialogs, autosave, cloud sync, DTP, and AI/Ollama.
* **Out of scope for Slice 3:** audio/video authoring UI; remote URL assets; image transcoding; Book Doctor UI (Slice 4); EPUB/HTML/PDF publishing or export UI (Slice 5); SQLite or Tauri architecture redesign; auto-save.

### Out of Scope (Slice 3)
1. Audio / video authoring UI and media timeline surfaces
2. Publishing / export (`@openbook/epub`, `@openbook/html`, `@openbook/pdf`)
3. Book Doctor diagnostic UI
4. Auto-save or SQLite blob columns
5. Making `DirectoryAssetStore` the desktop default
6. Cloud or network asset backends
