# ADR 0009: EPUB 3.3 Engine Architecture and Publishing Boundary

- **Status:** Accepted; implementation gated for follow-up slice
- **Date:** 2026-09-07
- **Decision owner:** SanMitra Tech Solutions
- **Area:** Publishing Engine / EPUB 3.3 / Architecture Boundary
- **Decision:** Establish the architecture, module boundaries, Book Model mapping, packaging rules, multilingual/Indic standards, determinism, and validation boundary for the OpenBook EPUB 3.3 publishing engine (`@openbook/epub`). This ADR is documentation-only; it does not implement the engine or export UI, and does not add dependencies.

---

## Context

ADR-0004 established that OpenBook will implement its own TypeScript EPUB generation layer, translating canonical Book Model structures into EPUB 3.3 package documents, XHTML, CSS, navigation, and metadata, with official EPUBCheck 5.3.0 as the authoritative conformance validator.

Since ADR-0004, the repository has completed the core authoring and persistence loop on `main`:
```text
Tiptap → EditorAdapter → SemanticDocument → Desktop Domain → Book Model → ProjectPersistence → SQLite
```

With PR #18 reconciled, the next architectural gate is the **Publishing Engine Track**, beginning with **EPUB 3.3**.

Without this ADR:
- Agents might implement EPUB generation by mutating the canonical Book Model or leaking OPF/spine packaging fields into domain types.
- Third-party packaging libraries might be introduced with unvetted licenses or native dependencies.
- Non-deterministic ZIP creation could prevent reproducible publishing outputs.
- Indic scripts (such as Kannada) could suffer font/shaping/clipping defects or XML encoding corruption.
- EPUBCheck validation could be bypassed or replaced with an unofficial validator.

This ADR closes the architecture gate for the EPUB 3.3 publishing boundary.

---

## Decision

### 1. Canonical Publishing Source & Data Flow

The Book Model (`@openbook/book-model`) remains the **canonical format-neutral source of truth**. EPUB 3.3 is strictly a **downstream projection**:

```text
@openbook/book-model (Book)
        ↓ read-only input
@openbook/epub (EPUB 3.3 Engine)
   ├── 1. Validate input Book (format-neutral domain checks)
   ├── 2. Project Metadata (Dublin Core + EPUB 3.3 package metadata)
   ├── 3. Project Content (StructuralSection → Semantic XHTML 5 documents)
   ├── 4. Project Navigation (nav.xhtml mandatory; no NCX by default)
   ├── 5. Build Manifest & Spine (OPF package document generation)
   ├── 6. Layout OCF Container (mimetype + META-INF/container.xml)
   ├── 7. Pack Deterministic OCF ZIP (.epub)
   └── 8. Handoff to @openbook/validator (EPUBCheck 5.3.0 verification)
        ↓
Valid EPUB 3.3 Publication (.epub file / Uint8Array)
```

**Architectural Rules:**
1. The EPUB engine takes a canonical `Book` as read-only input.
2. The engine must **never** mutate the input `Book` or write EPUB packaging fields (`opf`, `manifest`, `spine`, `nav`, `container`, `ncx`) back into the Book Model or Semantic Document types.
3. No EPUB packaging concepts may be exposed in editor session models or SQLite persistence schemas.

---

## 2. Module Boundaries & Monorepo Package

Target package: **`packages/epub`** (`@openbook/epub`).

| Layer | Responsibility | Allowed Dependencies |
| --- | --- | --- |
| `packages/epub` | Headless, standards-compliant EPUB 3.3 generator | `@openbook/book-model`, `@openbook/validator` (dev/test), frozen ZIP/templating library (future freeze-lift) |
| `apps/desktop` | Desktop UI shell (Save/Export action triggers, file dialogs) | `packages/epub`, `@openbook/book-model` |
| `packages/validator` | Subprocess validation against official EPUBCheck 5.3.0 | Isolated Java subprocess adapter (ADR-0005) |

**Boundary Constraints:**
- `packages/epub` is a platform-agnostic TypeScript package. It must run in Node.js, in headless CI, and in the desktop WebView / Tauri environment.
- It must not import React, Vite, Tauri APIs, or DOM window objects directly.
- File system I/O (writing to disk) belongs to application services / desktop adapters; the core engine accepts a `Book` and emits an in-memory package representation (`Uint8Array` / stream).

---

## 3. Book Model → EPUB 3.3 Structural Mapping

| Book Model Concept (`@openbook/book-model`) | EPUB 3.3 Target Document / Element | Semantic Role / Properties |
| --- | --- | --- |
| `book.metadata` | `package.opf` `<metadata>` | Dublin Core elements (`dc:title`, `dc:creator`, `dc:language`, `dc:identifier`, etc.) + `<meta property="dcterms:modified">` |
| `book.frontMatter` | `EPUB/text/fm_*.xhtml` | `epub:type` / `role`: `titlepage`, `copyright-page`, `dedication`, `preface`, `foreword`, `introduction` |
| `book.chapters` | `EPUB/text/ch_*.xhtml` | `epub:type="chapter"` / `role="doc-chapter"` |
| `book.backMatter` | `EPUB/text/bm_*.xhtml` | `epub:type` / `role`: `appendix`, `bibliography`, `afterword`, `about-author` |
| `ContentBlock` (`paragraph`) | `<p id="...">` | Standard paragraph text |
| `ContentBlock` (`heading`) | `<h1 id="...">` … `<h6 id="...">` | Chapter or sub-section headings matching level |
| `ContentBlock` (`quote`) | `<blockquote id="...">` | Semantic block quote |
| `ContentBlock` (`list`) | `<ol id="...">` / `<ul id="...">` | Ordered / unordered list with `<li>` items |
| `ContentBlock` (`image`) | `<figure id="..."><img src="..." alt="..."/><figcaption>...</figcaption></figure>` | Semantic figure container |
| `InlineSpan` (`emphasis`, `strong`, `link`) | `<em>`, `<strong>`, `<a href="...">` | Inline formatting elements |
| `book.assets` | `EPUB/assets/...` | Included in manifest with standard MIME types (image/jpeg, image/png, etc.) |

---

## 4. OCF Container & Package Layout

The generated publication must strictly comply with the Open Container Format (OCF) 3.3 specification:

```text
[EPUB ZIP Root]
├── mimetype                             ← Must be first entry, uncompressed (STORE), exactly 20 bytes
├── META-INF/
│   └── container.xml                    ← Points to full-path of package document
└── EPUB/
    ├── package.opf                      ← Package metadata, manifest, spine
    ├── nav.xhtml                        ← EPUB 3 Navigation Document (mandatory and authoritative)
    ├── toc.ncx                          ← Optional legacy fallback (NOT generated by default; opt-in only)
    ├── styles/
    │   └── openbook.css                 ← Format-neutral, accessible styling
    ├── text/
    │   ├── cover.xhtml                  ← Optional cover page (if cover image present)
    │   ├── front_01.xhtml               ← Front-matter sections
    │   ├── chapter_01.xhtml             ← Main-matter chapter sections
    │   └── back_01.xhtml                ← Back-matter sections
    └── assets/
        └── images/                      ← Book asset references
```

### OCF Construction Rules:
1. **`mimetype` entry:**
   - Must be the first file in the ZIP archive.
   - Must not be compressed (`compressionMethod === 0` / Store).
   - Must contain exactly the ASCII string `application/epub+zip`.
   - Must not have extra field attributes in its local file header.
2. **`META-INF/container.xml`:**
   - Must be valid XML declaring `<rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml"/>`.
3. **`EPUB/package.opf`:**
   - Declares `version="3.0"` (per EPUB 3.3 specification).
   - Contains complete `<manifest>` itemizing all content documents, stylesheets, navigation documents, and media assets.
   - Contains ordered `<spine>` defining reading flow.
   - Marks the navigation document in manifest with `properties="nav"`.

---

## 5. Metadata & Navigation Specifications

### 5.1 Package Metadata
- **`dc:identifier`**: Unique identifier (UUID or ISBN from `book.metadata.identifier`).
- **`dc:title`**: Book title (`book.metadata.title`).
- **`dc:language`**: BCP-47 language tag (e.g. `en`, `kn` from `book.metadata.language`).
- **`dc:creator`**: Authors listed with `id` and optional file-as refinements.
- **`dc:date` / `dcterms:modified`**: ISO-8601 UTC timestamp format (`YYYY-MM-DDThh:mm:ssZ`).

### 5.2 Navigation Document (`nav.xhtml`)
- `nav.xhtml` is **mandatory and authoritative** for OpenBook EPUB 3.3 output.
- Must be a valid XHTML 5 document with `<nav epub:type="toc" id="toc" role="doc-toc">`.
- Generates a nested or flat `<ol>` list representing all structural sections in the publication.
- Includes `<nav epub:type="landmarks" hidden="">` defining primary reading entry points (bodymatter, toc, titlepage).

### 5.3 Legacy Reader Compatibility (NCX)
- **Do not generate NCX by default.** EPUB 3.3 does not require NCX for conformance.
- If NCX (`toc.ncx`) support is ever implemented or enabled, it is strictly an **explicitly requested legacy-compatibility option** for older or constrained reading systems and is not required for EPUB 3.3 conformance.
- When absent (default), no `toc` attribute referencing NCX will be placed on `<spine>`.
- When explicitly enabled by user/caller configuration, `toc.ncx` is generated purely as a derivative legacy fallback, and `nav.xhtml` remains the sole authoritative navigation document.

---

## 6. Multilingual & Indic Requirements (Kannada)

1. **Explicit Language Tagging:**
   - Root `<html>` element in every content document must declare `lang` and `xml:lang` matching the section or book language (e.g., `lang="kn" xml:lang="kn"`).
   - Sections or inline spans in differing languages must declare local `lang` overrides.
2. **UTF-8 Encoding:**
   - All XHTML documents, navigation files, and package documents must be encoded in UTF-8 without byte order marks (BOM).
   - Character code points must be preserved faithfully (zero XML entity corruption or character code mutation for Indic combining characters, virama/halant clusters, and conjuncts).
3. **Typography & CSS Headroom:**
   - Default CSS for Indic scripts must provide sufficient `line-height` (recommended `1.5` to `1.6`) to prevent ascender/descender clipping on complex ligatures and matras.
   - Directionality (`dir="ltr"`) explicitly specified.

---

## 7. Determinism & Reproducible Packaging

To ensure that compiling the same `Book` yields **byte-for-byte identical `.epub` binary files**:

1. **Fixed Timestamps:** ZIP file entry headers must use a deterministic timestamp (e.g., derived from `book.metadata.publishedAt` or a fixed reference timestamp) rather than `Date.now()`.
2. **Stable File Ordering:** File entries in the central directory and local headers must be written in a fixed, deterministic sequence (`mimetype` first, followed by lexicographically sorted paths).
3. **Deterministic ID Generation:** Manifest item IDs, section identifiers, and element anchors must derive deterministically from the canonical Book Model structure rather than random UUIDs generated during compilation.

---

## 8. Validation Boundary

1. **Normative Standard:** The **EPUB 3.3 specification** is the normative standard governing publication format, structure, and semantics.
2. **Authoritative Validator:** **EPUBCheck** (official 5.3.0 via `@openbook/validator`) is the authoritative automated conformance validator used by OpenBook to verify outputs against the EPUB standard.
3. **Release & Fixture Acceptance Policy:** OpenBook enforces an internal zero-tolerance release and test fixture acceptance policy requiring **0 errors and 0 warnings** from EPUBCheck on standard publication fixtures. This is our project release/acceptance gate, not the normative definition of EPUB conformance itself.
4. **Integration Boundary:** Validation tests for `@openbook/epub` will invoke the existing `@openbook/validator` `ValidatorService` / `EpubCheckSubprocessAdapter` against compiled EPUB buffers.

---

## 9. Candidate Technology Evaluation

For the subsequent implementation slice, two minimal technology selections are required:

| Component | Role | Evaluated Candidates | Preliminary Recommendation |
| --- | --- | --- | --- |
| **OCF ZIP Packaging** | Writing uncompressed `mimetype` first + compressed entries | **`fflate`** (MIT, pure-TS, zero-dep, 8KB, supports store & custom dates)<br>**`jszip`** (MIT, widely used, heavier)<br>**Custom pure-TS OCF writer** (zero third-party dependency) | **`fflate`** or **Custom minimal OCF writer** |
| **XHTML Serialization** | Rendering semantic XHTML 5 documents | **Pure-TS template functions** (zero-dep, fast, deterministic)<br>**DOM/JSDOM** (heavy, unnecessary for generation) | **Pure-TS deterministic semantic serializers** |

*Note: The exact technology choice and npm pins will be frozen in a follow-up freeze-lift PR before installation.*

---

## 10. Explicit Non-Goals

This ADR does **NOT** authorize:
- Installing any npm packages or third-party dependencies in this PR.
- Implementing the EPUB engine code or creating `packages/epub` in this PR.
- Adding an Export to EPUB UI in `apps/desktop`.
- Modifying `@openbook/book-model` schema or `@openbook/semantic-document` contract.
- Modifying SQLite persistence schema or desktop workflow code.
- Selecting or implementing PDF renderers or HTML publishing engines.
- Modifying production EPUBCheck bundling or Java runtime packaging.
- Implementing DTP or AI features.

---

## Acceptance Criteria

This decision is Accepted when:
1. Architectural flow from canonical `Book` to EPUB 3.3 is recorded.
2. Monorepo package boundary (`packages/epub`) and responsibilities are explicit.
3. Book Model mapping, OCF container rules, and navigation specifications are defined.
4. Multilingual (Kannada/Indic) integrity and CSS line-height headroom are mandated.
5. Deterministic, bit-reproducible packaging principles are recorded.
6. EPUB 3.3 normative standard and EPUBCheck 5.3.0 zero-warning fixture acceptance policy are affirmed.
7. Next-PR implementation boundaries and hard stops are documented.

---

## Related Documents

- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/adr/0005-epubcheck-bundling-java-runtime-isolation.md`
- `docs/adr/0006-book-model-executable-specification.md`
- `docs/adr/0007-desktop-foundation-technology-baseline-and-freeze-lift.md`
- `docs/adr/0008-editor-technology-tiptap-prosemirror.md`
- `docs/PROJECT_PERSISTENCE_ARCHITECTURE.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- `docs/IMPLEMENTATION-BACKLOG.md`
- `docs/FOUNDATION-READINESS-REPORT.md`
