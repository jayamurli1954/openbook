# ADR-0011: HTML Publishing Engine Architecture — Gate 4

* **Status:** Accepted
* **Date:** 2026-09-08
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** HTML Publishing Engine — Gate 4
* **Depends on:** ADR-0004, ADR-0006, ADR-0009, ADR-0010
* **Implementation status:** Requires separate explicit authorization (already granted for Gate 4)

## 1. Context

ADR-0004 established that OpenBook will implement its own TypeScript semantic HTML/CSS publishing layer. The generated HTML must remain standards-oriented and suitable for browser preview and future web publishing. OpenBook will not implement a browser layout engine.

ADR-0006 established the Book Model (`@openbook/book-model`) as the canonical, format-neutral source of truth. EPUB, PDF, and HTML engines are downstream projections. No output format becomes the authoring source.

ADR-0009 established the EPUB 3.3 engine (`@openbook/epub`) as one such projection, with its own package boundary, OCF packaging rules, and EPUBCheck validation.

ADR-0010 established an injected asynchronous `AssetResolver` for EPUB image packaging, without storing binary payloads or filesystem paths in the Book Model.

HTML publishing is a sibling projection, not a derivative of EPUB. Without this ADR:

* agents might generate HTML by mutating the canonical Book Model or leaking HTML/CSS packaging fields into domain types;
* HTML generation might be folded into `@openbook/epub` or the desktop shell;
* the engine might reach SQLite, Tauri, the filesystem, or browser APIs;
* scripts, unsafe URLs, or non-deterministic CSS could enter publications;
* PDF/DTP/page-layout work might be started under an HTML slice.

This ADR closes the architecture gate for the HTML publishing engine.

## 2. Decision

HTML is strictly a **downstream projection** of the canonical `Book`:

```text
@openbook/book-model (Book)
        ↓ read-only input
@openbook/html (HTML Publishing Engine)
   ├── 1. Read canonical Book (no mutation)
   ├── 2. Project metadata and structural sections to semantic HTML5
   ├── 3. Resolve referenced image assets via injected AssetResolver
   ├── 4. Escape user-controlled text and attributes
   ├── 5. Enforce URL security policy
   └── 6. Emit deterministic in-memory HTML5 publication + associated assets
        ↓
Deterministic semantic HTML5 publication
```

**Architectural rules:**

1. The HTML engine takes a canonical `Book` as read-only input.
2. The engine must **never** mutate the input `Book` or write HTML/CSS publication fields back into the Book Model or Semantic Document types.
3. HTML is generated from the Book Model directly. It must not require an EPUB export as an intermediate source.
4. No HTML publication concepts may be exposed in editor session models or SQLite persistence schemas.

## 3. Module Boundary — `@openbook/html`

Target package: **`packages/html`** (`@openbook/html`).

| Layer | Responsibility | Allowed dependencies |
| --- | --- | --- |
| `packages/html` | Headless semantic HTML5 generator | `@openbook/book-model` |
| `apps/desktop` | Future UI triggers / file dialogs only | `packages/html`, `@openbook/book-model` |

**Boundary constraints:**

* `packages/html` is a platform-agnostic TypeScript package. It must run in Node.js and in headless CI.
* It must **not** import React, Vite, Tiptap, ProseMirror, Tauri APIs, DOM/`window` objects, SQLite, or Node filesystem APIs.
* It must **not** import `@openbook/epub`. EPUB and HTML are sibling projections.
* File-system I/O (writing publication files to disk) belongs to application services / desktop adapters. The core engine accepts a `Book` and emits an in-memory publication.
* `AssetResolver` is defined independently inside `@openbook/html`. This ADR does **not** authorize extracting a shared resolver package.

## 4. Semantic HTML5 Mapping

The engine projects structures already represented by the canonical Book Model onto semantic HTML5. It must not invent new Book Model semantics to make HTML generation easier.

| Book Model concept | HTML5 target |
| --- | --- |
| `book.metadata.title` / authors / language / description | document `<title>`, language, and metadata |
| `book.frontMatter` / `book.chapters` / `book.backMatter` | semantic `<section>` elements in reading order |
| `ContentBlock` (`heading`) | `<h1>`–`<h6>` matching level |
| `ContentBlock` (`paragraph`) | `<p>` |
| `ContentBlock` (`quote`) | `<blockquote>` |
| `ContentBlock` (`list`) | `<ol>` / `<ul>` with `<li>` |
| `ContentBlock` (`image`) | `<figure>` / `<img>` / optional `<figcaption>` |
| `InlineSpan` (`emphasis`, `strong`, `link`) | `<em>`, `<strong>`, `<a href="...">` |
| Unicode / Kannada text | native UTF-8, no numeric-entity corruption of Indic code points |

HTML documents must declare language (`lang`) from the Book and explicit `dir="ltr"` for supported scripts including Kannada.

Encoding is UTF-8 without BOM. Indic combining characters, virama/halant clusters, and conjuncts must be preserved.

## 5. Injected AssetResolver

Image and resource bytes are obtained through an injected asynchronous resolver. The HTML engine does not own asset persistence.

```ts
interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}
```

The resolver may eventually be backed by in-memory fixtures, SQLite-backed project storage, local project files, Tauri/Rust IPC, or another approved store. Those mechanisms are outside `@openbook/html`.

The HTML engine must not:

* read the filesystem;
* query SQLite;
* call Tauri APIs;
* download remote assets;
* transform, resize, optimize, or transcode images.

Unreferenced `Book.assets` entries are omitted from the publication.

Unsafe asset identifiers (path separators, `..`, control characters, absolute/drive paths) must be rejected deterministically.

Missing references, missing resolver when images are present, resolver failure, and empty/invalid resolved bytes must fail deterministically.

## 6. Image Alt, Figure, and Caption Semantics

`AssetRef.altText` is the authoritative source for image alternative text.

When a caption is present, the HTML representation uses:

```html
<figure id="...">
  <img src="..." alt="...">
  <figcaption>...</figcaption>
</figure>
```

When no caption is present, `<figcaption>` is omitted. Empty `altText` emits `alt=""` and a deterministic diagnostic. The engine must not invent alternative text via AI, filename inference, or image recognition.

The implementation must HTML-escape `src`, `alt`, and caption content.

## 7. HTML Escaping and URL Security Policy

User-controlled text and HTML attributes must be escaped. Unicode (including Kannada) must not be converted to numeric character references.

The engine must **not** generate or execute arbitrary scripts. Publications must not emit `<script>` elements.

Link `href` values are serialized only after a defined URL policy:

**Allowed**

* `http:` and `https:`
* `mailto:`
* same-document fragments (`#id`)
* scheme-less relative paths

**Rejected**

* `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `about:`
* protocol-relative URLs (`//…`)
* empty / whitespace-only values
* control characters or internal whitespace

The engine never fetches, downloads, or executes URLs. Unsafe hrefs fail the publication deterministically.

## 8. Publishing-Layer CSS

CSS is minimal, deterministic, and owned entirely by the HTML publishing layer.

* No remote `@import`.
* No runtime-generated values or system-clock timestamps.
* Sufficient `line-height` headroom for Indic/Kannada (approximately 1.5–1.6).
* No DTP, pagination, or page-geometry rules.

## 9. Determinism

> Same Book + same resolved asset bytes + same publishing options = identical HTML publication.

Determinism must not depend on:

* system clock;
* local timezone;
* filesystem enumeration order;
* random identifiers generated during compilation;
* host operating system;
* asset-resolver iteration order.

Publication file ordering, if any sidecar assets are emitted, must be deterministic.

## 10. Book Model Integrity

Gate 4 MUST NOT modify:

* `Book`;
* `AssetRef`;
* `ContentBlock`;
* `InlineSpan`;
* SemanticDocument;
* persistence schemas.

Binary asset data MUST NOT be added to `AssetRef`.

HTML-specific concepts such as stylesheets, publication file paths, and serialized markup MUST NOT enter the canonical Book Model.

If future requirements show that the Book Model lacks a necessary semantic concept, that change requires a separate Book Model architecture decision.

## 11. Gate 4 Non-Goals

This ADR does **not** authorize:

* PDF generation or PDF renderer selection;
* DTP / page-layout / pagination architecture;
* EPUB behavior or EPUB asset packaging changes;
* SQLite schema or persistence changes;
* Tauri integration;
* React / Tiptap / ProseMirror integration;
* filesystem project storage;
* remote asset downloading;
* image transformation / optimization;
* DRM;
* KDP-specific processing;
* AI / Ollama functionality;
* new Book Model semantics;
* extracting `AssetResolver` into a shared package;
* merging or un-drafting the Gate 4 implementation PR.

## 12. Relationship to Existing ADRs

### ADR-0006 — Canonical Book Model

ADR-0011 reinforces ADR-0006. The Book Model remains canonical, format-neutral, and semantic. HTML packaging information is not introduced into it.

### ADR-0009 — EPUB 3.3 Engine Architecture

ADR-0009 is the sibling EPUB projection. HTML does not reuse EPUB OCF, OPF, spine, NCX, or EPUBCheck as its publication format. `@openbook/html` and `@openbook/epub` remain independent packages.

### ADR-0010 — EPUB AssetResolver (Gate 3)

ADR-0010 defined the injected asynchronous asset-resolution boundary for EPUB. Gate 4 adopts the **same architectural idea** for HTML — an injected `AssetResolver` returning `Uint8Array` — without coupling the HTML engine to `@openbook/epub` and without creating a shared resolver package.

### ADR-0004 — Publishing Engine Technology Architecture

ADR-0011 is the HTML-engine architecture gate implied by ADR-0004 §4. It does not select a PDF renderer and does not implement a browser layout engine.

## 13. Implementation Authorization

This ADR is an architecture decision.

Acceptance of ADR-0011 does **not** by itself authorize implementation.

Implementation requires a **separate explicit authorization**. That authorization has **already been granted** for:

> **Gate 4 — HTML Publishing Engine**

The implementation PR must remain limited to the approved Gate 4 scope and must not be merged or marked ready for review by this documentation change.

Any requirement to modify Book Model, SemanticDocument, SQLite, Tauri, EPUB, PDF, or DTP/page-model architecture must stop implementation and trigger a separate architecture review.

## 14. Consequences

### Positive

* HTML is a first-class downstream projection with a dedicated package boundary.
* The canonical Book Model remains format-neutral.
* Asset persistence can evolve independently of HTML generation.
* Escaping, URL policy, and determinism are explicit and testable.
* EPUB and HTML can evolve without sharing packaging internals.

### Negative / trade-offs

* Callers must supply an `AssetResolver` when image blocks are present.
* Duplicated resolver contracts exist in `@openbook/epub` and `@openbook/html` until a future architecture decision (not this ADR) considers sharing.
* HTML is not a paginated/print layout engine.

## 15. Alternatives Rejected

### Generate HTML from EPUB XHTML

Rejected because HTML must not require EPUB as an intermediate source (ADR-0004; `ARCHITECTURE.md` §20).

### Fold HTML generation into `@openbook/epub` or `apps/desktop`

Rejected because it would mix format-specific packaging with a sibling projection or leak publishing into the desktop shell.

### Store binary data or filesystem paths in `AssetRef`

Rejected because it would mix semantic metadata with storage payloads and violate format neutrality (ADR-0006 / ADR-0010).

### Let the HTML engine read files, SQLite, Tauri, or the browser

Rejected because the publishing engine must remain platform-agnostic and deterministically testable.

### Shared `AssetResolver` package in this gate

Rejected. Extracting a shared package is a separate architecture decision and is explicitly out of scope.

### Emit scripts or pass through arbitrary URLs

Rejected because publications must not execute author-controlled script or unsafe URL schemes.

## 16. Acceptance Criteria for ADR-0011

ADR-0011 may be marked **Accepted** when the Product Owner approves the following architectural invariants:

* [x] HTML is a downstream projection of canonical `Book`.
* [x] Dedicated `@openbook/html` package boundary is explicit.
* [x] Output is semantic HTML5.
* [x] AssetResolver is an injected boundary.
* [x] Identical Book + assets + options produce identical HTML.
* [x] HTML escaping and URL security policy are defined.
* [x] No scripts are generated or executed.
* [x] Image alt / figure / caption semantics are defined.
* [x] CSS is minimal, deterministic, and publishing-layer-owned.
* [x] No SQLite / Tauri / filesystem / browser dependency in the engine.
* [x] No PDF / DTP / page-layout decisions are made.
* [x] Canonical Book Model is unchanged.
* [x] Gate 4 non-goals are recorded.
* [x] Implementation requires separate authorization (already granted for Gate 4).
* [x] Relationship to ADR-0006, ADR-0009, and ADR-0010 is recorded.

**Decision:** Accepted. Implementation requires separate explicit authorization, which has already been granted for Gate 4.

## Related Documents

- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/adr/0006-book-model-executable-specification.md`
- `docs/adr/0009-epub-3-3-engine-architecture-and-publishing-boundary.md`
- `docs/adr/0010-epub-3-3-asset-and-resource-packaging-architecture-gate-3.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- `ARCHITECTURE.md` §20 HTML Architecture
