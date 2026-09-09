# ADR-0017: Asset Management Foundation Architecture — Gate 7 Slice 4

* **Status:** Accepted
* **Date:** 2026-09-09
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Asset Management Foundation Architecture — Gate 7 Slice 4
* **Depends on:** ADR-0004, ADR-0006, ADR-0010, ADR-0011, ADR-0013, ADR-0014, ADR-0016
* **Implementation status:** Requires separate explicit authorization (implementation NOT authorized by this ADR alone)

## 1. Context

OpenBook's end-to-end publishing pipeline (ADR-0014 §2.3) progresses through seven discrete lifecycle stages:
```text
Import ──► Book Structure ──► Authoring/Edit ──► Assets ──► Validation ──► Preview ──► Publish
```

Gate 7 Slices 1–3 established workflow orchestration (`@openbook/workflow`), Markdown/text ingestion (`@openbook/importer`), and transactional structure/authoring (`@openbook/authoring`). Publishing engines already resolve binaries through an injected `AssetResolver` (ADR-0010 / ADR-0011 / ADR-0013), but OpenBook still lacks a dedicated asset-management foundation for ingestion, content-addressed storage, and auditing of project binaries.

Without this ADR:
- Binary payloads might be stored inside the canonical `Book` or treated as a second content model.
- Filename extensions or `originalFilename` might drive storage paths, enabling path traversal and non-deterministic locations.
- SVG handling might attempt rewrite/sanitize paths instead of a precise reject-only security model.
- Workflow or publishers might absorb asset-specific domain logic (archive ordering, MIME policy, audit severities).
- SQLite, UI, or AI layers might be coupled into the asset package prematurely.

This ADR formalizes the architecture, boundaries, contracts, and invariants for **Gate 7 Slice 4 — Asset Management Foundation**.

**Acceptance of this ADR does not authorize implementation.** Implementation remains strictly gated and requires separate explicit authorization. Cursor must not infer implementation authorization from ADR acceptance.

---

## 2. Decision

OpenBook establishes the Asset Management Foundation in a dedicated package **`packages/assets`** (`@openbook/assets`), managing binary publication assets while keeping the canonical `Book` model format-neutral and free of binary storage concerns.

### 2.1 Purpose

`@openbook/assets` manages binary publication assets. The canonical `Book` contains `AssetRef` metadata/references only. Binary payloads are owned by the asset subsystem.

### 2.2 Scope — Supported Asset Classes

Supported asset classes for Slice 4:

* raster images
* vector images / SVG
* embedded publication fonts

Media/audio/video and remote URL assets are out of scope (see §3).

### 2.3 Core Architectural Invariants

1. **Sole Canonical Content Model:** `@openbook/book-model` remains the single source of truth for book content and structure. `@openbook/assets` must not become a second source of truth for Book content.
2. **Reference vs Payload Separation:** The canonical `Book` holds `AssetRef` metadata only. Binary payloads live in the asset store.
3. **Zero Canonical Mutation on Ingestion:** Asset ingestion, storage, resolution, and auditing operate on asset data and references. **Asset ingestion must never mutate the canonical `Book`.** The host/application decides when and how an `AssetRef` is incorporated into a `Book`.
4. **Existing `AssetResolver` Compatibility:** `@openbook/assets` is the canonical provider/implementation of the established `AssetResolver` contract. **ADR-0017 does not redefine that contract.**
5. **Identity Separation:** `AssetRef.id` is a semantic deterministic asset identifier. SHA-256 is the content-integrity and content-addressable storage key. The exact textual format of `AssetRef.id` is **not frozen** by this ADR.
6. **Content-Addressed Repeatability:** Re-ingesting identical content must produce repeatable content-addressed storage identity (identical SHA-256).
7. **Filename Isolation:** `originalFilename` is metadata only and must never be used to construct a filesystem path or storage key. Path traversal sequences and path separators must not influence storage location.
8. **SVG Reject-Only Security:** Unsafe SVG is rejected; the asset package does not rewrite or sanitize unsafe SVG into a safe one.
9. **Workflow Remains Generic:** The existing `ASSETS` workflow stage stays generic. `@openbook/workflow` stores only stage/job state and does not acquire asset-specific domain knowledge.
10. **Publisher Owns Archive Ordering:** Asset management does not define publication archive ordering. EPUB/PDF/HTML publishers remain responsible for their own output representation and ordering.

```text
┌──────────────────────────┐
│   Host / Application     │  (decides when AssetRef enters Book)
└────────────┬─────────────┘
             │ AssetIngestInput (bytes + metadata)
             ▼
┌──────────────────────────┐
│  AssetIngestionPipeline  │  size limits → magic/type → SVG reject
│                          │  → SHA-256 → store → AssetRef + receipt
└────────────┬─────────────┘
             │ put(sha256, content)
             ▼
┌──────────────────────────┐         ┌────────────────────────────┐
│       AssetStore         │◄────────│  AssetResolver (compat)    │
│  (Memory / Directory)    │  get()  │  resolve(AssetRef)→bytes   │
└──────────────────────────┘         └─────────────▲──────────────┘
                                                   │
             ┌──────────────────────────┐          │
             │      AssetAuditor        │──────────┘
             │ dangling / missing /     │  (also used by host during
             │ corrupt / unsafe SVG /   │   ASSETS / Validation)
             │ orphaned / missing alt   │
             └──────────────────────────┘

Publishers (@openbook/epub|pdf|html) inject AssetResolver; they own archive ordering.
Workflow (@openbook/workflow) remains stage/job only — no asset domain knowledge.
```

Pipeline summary:
```text
Asset ingestion → validation/security checks → SHA-256 content-addressed storage
  → AssetRef + storage receipt → AssetResolver retrieval → AssetAuditor
```

---

### 2.4 Package & Module Boundaries

The implementation resides in `packages/assets`:

* **Allowed workspace dependency:**
  * `@openbook/book-model`
* **Prohibited dependencies:**
  * `@openbook/workflow`
  * `@openbook/authoring`
  * `@openbook/importer`
  * `@openbook/epub`, `@openbook/pdf`, `@openbook/html`
  * validator / Book Doctor implementation
  * SQLite
  * Tauri
  * React / UI
  * AI / Ollama
  * network services

No network access or subprocess execution is part of asset ingestion, storage, resolution, or auditing. SQLite is outside this package.

---

### 2.5 Established AssetResolver Contract (Unchanged)

```typescript
export interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}
```

`@openbook/assets` implements this contract for project assets. Publishing engines continue to receive an injected resolver; ADR-0017 does not alter Gate 3/4/6 resolver semantics.

---

### 2.6 Components

#### A. AssetStore

Provides binary content-addressed storage:

```typescript
export interface IAssetStore {
  put(sha256: string, content: Uint8Array): Promise<void>;
  get(sha256: string): Promise<Uint8Array | undefined>;
  has(sha256: string): Promise<boolean>;
  delete(sha256: string): Promise<boolean>;
  listHashes(): Promise<string[]>;
}
```

Initial implementations:

* `MemoryAssetStore`
* `DirectoryAssetStore`

SQLite-backed storage is explicitly outside `@openbook/assets`.

#### B. AssetIngestionPipeline

Performs:

1. configurable per-class size-limit check
2. magic-byte / type validation
3. SVG security rejection where applicable
4. SHA-256 calculation
5. deterministic `AssetRef` synthesis
6. content-addressed storage
7. ingestion result / receipt

**Size limits:** Initial default size limit is **50 MB**, but limits are **configurable per asset class**.

#### C. AssetResolver

Resolves an `AssetRef` to binary content and remains compatible with the established interface (§2.5).

#### D. AssetAuditor

Audits project assets and references for:

* dangling references
* missing payloads
* corrupt payloads
* unsafe SVG
* orphaned stored assets
* missing alt text

**Severity (INV-5):**

| Finding | Severity |
| :--- | :--- |
| dangling reference | error |
| missing payload | error |
| corrupt payload | error |
| unsafe SVG | error |
| orphaned stored asset | warning |
| missing alt text | warning |

---

### 2.7 Identity and Storage

* **`AssetRef.id`:** Semantic deterministic asset identifier (format unfrozen).
* **SHA-256:** Content-integrity digest and content-addressable storage key.

Re-ingesting identical binary content must produce the same SHA-256 storage identity. Deterministic `AssetRef.id` synthesis may use an optional caller `idSeed` together with stable ingestion inputs; the ADR requires repeatability and uniqueness within the resulting project asset set without freezing textual ID shape.

---

### 2.8 SVG Security (Reject-Only)

SVG is **reject-only** at this layer. The asset package does not attempt to rewrite or sanitize an unsafe SVG into a safe one.

Reject SVG containing or referencing:

* `<script>`
* `<foreignObject>`
* event-handler attributes
* external resource references
* XML DTDs
* external entities

The security boundary is deliberately precise. **This ADR does not make a broad generic “XXE protection” claim.**

---

### 2.9 Filename Security

`originalFilename` is **metadata only**.

It **must never** be used to construct a filesystem path or storage key.

Path traversal sequences and path separators must not influence storage location.

---

### 2.10 Ingestion Contract

```typescript
export interface AssetIngestInput {
  readonly content: Uint8Array;
  readonly originalFilename: string;
  readonly kind: "image" | "font";
  readonly altText?: string;
  readonly licence?: string;
  readonly idSeed?: string;
}

export interface AssetIngestResult {
  readonly success: boolean;
  readonly assetRef?: AssetRef;
  readonly sha256?: string;
  readonly byteLength?: number;
  readonly issues: readonly AssetIssue[];
}
```

Ingestion returns the generated `AssetRef` and storage/integrity receipt (`sha256`, `byteLength`, `issues`). **It does not update the canonical `Book`.**

The host/application decides when and how an `AssetRef` is incorporated into a `Book`.

---

### 2.11 Workflow Boundary

The existing `ASSETS` workflow stage remains generic.

`@openbook/workflow` stores only workflow stage/job state and does not acquire asset-specific domain knowledge.

The host/workflow layer may invoke `AssetAuditor` during the ASSETS / Validation workflow, but asset-specific logic remains inside `@openbook/assets`.

---

### 2.12 Publishing Boundary

Asset management does **not** define publication archive ordering.

EPUB / PDF / HTML publishers remain responsible for their own output representation and ordering requirements.

---

### 2.13 Font Boundary

Runtime/renderer fonts established by Gate 6, including bundled Noto Kannada fonts used by Typst, are **separate** from user publication font assets.

User-provided embedded fonts are publication assets managed by `@openbook/assets`.

---

### 2.14 Canonical Model Boundary

`@openbook/assets` must not become a second source of truth for Book content.

Asset ingestion, storage, resolution, and auditing operate on asset data and references.

Asset ingestion must never mutate the canonical `Book`.

---

## 3. Explicit Out-of-Scope Items for Slice 4

The following are strictly out of scope for Gate 7 Slice 4:

1. image manipulation
2. image transcoding
3. media / audio / video management
4. remote asset URLs
5. UI asset browsers
6. direct EPUB packaging
7. SQLite persistence
8. Book Doctor implementation
9. AI / Ollama asset generation or autonomous editing
10. cloud asset storage
11. publication archive ordering

---

## 4. Testable Architectural Invariants

| ID | Invariant | Verification Test Method |
| :--- | :--- | :--- |
| **INV-1** | **Magic-byte validation** | Accepted binary types must be consistent with their declared asset kind and validated using file-content/type evidence rather than filename extension alone. |
| **INV-2** | **SVG rejection** | Unsafe SVG constructs and external references are rejected rather than rewritten. |
| **INV-3** | **Filename isolation** | `originalFilename` is metadata only and is never used to construct a filesystem path or storage key. |
| **INV-4** | **Content-addressed repeatability** | Identical binary content produces the same SHA-256 storage identity. |
| **INV-5** | **Audit severity** | Referential / integrity / security failures are errors; orphaned assets and missing alt text are warnings. |
| **INV-6** | **Resolver compatibility** | The asset implementation remains compatible with the established `AssetResolver` interface. |
| **INV-7** | **Zero canonical-model mutation** | Asset ingestion and storage never mutate the canonical `Book`. |

---

## 5. Implementation Boundary

**Acceptance of ADR-0017 does NOT authorize implementation.**

This ADR defines architecture only. Implementation of `@openbook/assets` requires a separate explicit implementation handoff after this ADR is reviewed, accepted, and merged.

Cursor must not infer implementation authorization from ADR acceptance.
