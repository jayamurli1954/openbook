# ADR-0013: PDF Publishing Engine Architecture and Typst Renderer Selection — Gate 6

* **Status:** Accepted
* **Date:** 2026-09-08
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** PDF Publishing Engine Architecture and Typst Renderer Selection — Gate 6
* **Depends on:** ADR-0004, ADR-0006, ADR-0010, ADR-0011, ADR-0012
* **Implementation status:** Requires separate explicit authorization (implementation NOT authorized by this ADR alone)

## 1. Context

OpenBook requires a production-grade PDF publishing engine to produce book-quality print and digital PDF publications from the canonical Book Model (`@openbook/book-model`).

ADR-0004 (§5, §7) established that:
- The canonical Book Model is the format-neutral source of truth.
- EPUB, HTML, and PDF are downstream projections.
- Indic-language acceptance (specifically Kannada) is mandatory for publishing engine selection.
- PDF generation was left undecided pending an empirical bake-off between Typst (primary candidate), pdf-lib (secondary candidate), and Chromium print-to-PDF (evaluation candidate).

ADR-0006 established the executable specification and tests for `@openbook/book-model`.
ADR-0010 established the injected asynchronous `AssetResolver` boundary for EPUB image packaging.
ADR-0011 established the sibling HTML5 publishing engine architecture (`@openbook/html`).
ADR-0012 established the production EPUBCheck validator runtime packaging architecture (`@openbook/validator`).

Without this ADR:
- Agents might attempt to generate PDFs using tools without complex-script text shaping (e.g., `pdf-lib`), leading to corrupted Kannada glyph rendering (unshaped disjoint consonants, lost viramas/mātrās, and missing conjuncts).
- Heavy browser runtimes (Chromium > 200 MB) might be introduced with flawed paged-media support (lacking true running headers via CSS `string-set()`, fragile footnote handling, and excessive memory footprint).
- Layout properties (trim size, margins, running headers, font choices) might leak into the canonical Book Model.
- Advanced DTP/canvas requirements might unnecessarily complicate initial automated book publication.

This ADR records the accepted PDF publishing engine architecture and freezes the renderer selection. **Acceptance of this ADR does not authorize implementation.**

## 2. Decision

OpenBook will implement its PDF publishing projection in a dedicated package **`packages/pdf`** (`@openbook/pdf`), selecting **Typst v0.15.1** as the official rendering engine.

```text
Canonical Book Model (@openbook/book-model)
         │  (read-only input, format-neutral)
         ▼
PDF Publishing Adapter / Intermediate Representation (@openbook/pdf)
  ├── 1. Read canonical Book (no mutation)
  ├── 2. Map structural sections & blocks → declarative Typst document
  ├── 3. Resolve referenced image assets via injected AssetResolver
  ├── 4. Bind layout configuration (trim size, margins, headers, pagination)
  └── 5. Invoke isolated Typst subprocess with deterministic arguments
         │
         ▼
Typst Native Engine (v0.15.1)
  ├── HarfBuzz-grade OpenType Indic text shaping (rustybuzz)
  ├── Mathematical paragraph breaking & micro-typography
  ├── Multi-pass pagination, footnotes, running headers, and figures
  └── Direct PDF output with embedded, subsetted OpenType fonts
         │
         ▼
Deterministic PDF Publication (application/pdf)
```

**Core architectural rules:**
1. The PDF engine takes a canonical `Book` as read-only input.
2. The engine must **never** mutate the input `Book` or write PDF layout concepts back into the Book Model or Semantic Document types.
3. PDF is generated directly from the Book Model. It must not require an intermediate EPUB or HTML export.
4. Images are resolved strictly through an injected `AssetResolver` boundary (`resolve(asset: AssetRef): Promise<Uint8Array>`), matching Gate 3 (EPUB) and Gate 4 (HTML).
5. Typst execution is strictly isolated as a child process via discrete argv without shell interpolation.
6. Byte-for-byte determinism is enforced by passing `--creation-timestamp` anchored to `Book.metadata.publishedAt` (or build epoch) and `--ignore-system-fonts` with explicit `--font-path`.

## 3. Module Boundary — `@openbook/pdf`

Target package: **`packages/pdf`** (`@openbook/pdf`).

| Layer | Responsibility | Allowed dependencies |
| :--- | :--- | :--- |
| `packages/pdf` | Headless PDF publication generator & Typst adapter | `@openbook/book-model` |
| `apps/desktop` | UI triggers, file export dialogs, background job orchestration | `packages/pdf`, `@openbook/book-model` |

**Boundary constraints:**
- `packages/pdf` is a platform-agnostic TypeScript package that runs in Node.js and headless CI.
- It must **not** import React, Vite, Tiptap, ProseMirror, Tauri APIs, DOM/`window` objects, SQLite, or `@openbook/epub` / `@openbook/html`.
- It must **not** query SQLite or download remote assets at runtime.
- `AssetResolver` is defined independently within `@openbook/pdf` (matching the pattern established in `@openbook/epub` and `@openbook/html`).

## 4. Renderer Selection & Version Pin — Typst v0.15.1

**Official production renderer:** **Typst v0.15.1** (Git commit `9dfd3a08`).

- **License:** Apache-2.0.
- **Distribution:** Standalone, self-contained native binary with zero dynamic library dependencies.
- **Supported Platform Matrix:**

| Platform | Architecture | Pinned Artifact | Execution Model |
| :--- | :--- | :--- | :--- |
| **Windows** | `x64` | `typst-x86_64-pc-windows-msvc.zip` (SHA-256: `19ce3551153c2fe7ee9fa2f95208310c8f4d3209fedb699e0333faf8913f6736`) | Static `typst.exe` (~22 MB) |
| **Windows** | `aarch64` | `typst-aarch64-pc-windows-msvc.zip` | Static `typst.exe` (~21 MB) |
| **Linux** | `x64` | `typst-x86_64-unknown-linux-musl.tar.xz` | Statically linked `musl` binary (~17 MB, zero glibc host dependency) |
| **Linux** | `aarch64` | `typst-aarch64-unknown-linux-musl.tar.xz` | Statically linked `musl` binary (~16 MB) |
| **macOS** | `x64` | `typst-x86_64-apple-darwin.tar.xz` | Native Mach-O binary (~16 MB) |
| **macOS** | `aarch64` | `typst-aarch64-apple-darwin.tar.xz` | Native Apple Silicon Mach-O binary (~14 MB) |

Version updates to Typst are release-governance events requiring checksum verification, notice regeneration, and regression fixture re-validation.

## 5. Multilingual & Kannada Text Shaping Correctness

Kannada (ಕನ್ನಡ) typographic correctness was empirically verified against OpenBook's canonical bake-off fixtures (`tests/fixtures/pdf-bakeoff/`):

1. **Complex Glyph Shaping (GSUB / GPOS):**
   - Typst uses `rustybuzz` (a pure-Rust port of HarfBuzz) and ICU data, providing complete OpenType Indic layout table support (`nukt`, `akhn`, `rphf`, `rkrf`, `blwf`, `half`, `vatu`, `cjct`, `abvs`, `blws`).
   - Empirically verified: Vowel signs (ಕಿ, ಕೀ, ಕು, ಕೂ), subjoined consonants / vattu (`ಕ್ಷಮೆ`, `ಜ್ಞಾನ`, `ಸ್ತ್ರೀ`, `ಶ್ರೀರಾಮ`, `ಸ್ವಾತಂತ್ರ್ಯ`, `ಬ್ರಹ್ಮ`, `ಉತ್ಕೃಷ್ಟ`), and repha (`ರ್ಗ`, `ವರ್ಷ`) shape into flawless standard ligatures.
2. **Combining Marks & Normalization:**
   - Both NFC and decomposed NFD samples shape into visually identical glyph outlines with zero character corruption.
3. **Mixed Script & Numerals:**
   - Mixed Kannada/Latin prose seamlessly switches fonts along the fallback chain while preserving optical heights and baselines.
   - Kannada digits (೦–೯) and Arabic digits (0–9) typeset clearly side-by-side.
4. **Pagination & Micro-typography:**
   - Long prose paragraphs flow across page boundaries without splitting orthographic syllable clusters (aksharas).
   - Multi-pass footnote stacking (`#footnote`) and tabular data (`#table`) typeset with correct dividers and numbering.

## 6. Font Architecture & Bundled Fonts

- **Font Technologies:** TrueType (`.ttf`), OpenType (`.otf`), and TrueType Collections (`.ttc`).
- **Embedding & Subsetting:** Typst embeds subsetted OpenType CIDFontType0/2 fonts with standard 6-character subset prefixes and full `/ToUnicode` CMaps directly into the PDF byte stream. Output text is fully searchable and selectable in compliant PDF viewers.
- **Font Isolation:** Typst CLI must be invoked with `--ignore-system-fonts` and `--font-path <DIR>`. System fonts are completely ignored, guaranteeing cross-platform layout identity.
- **Preferred Initial Kannada Font:** **Noto Serif Kannada** (for body text) and **Noto Sans Kannada** (for headings and tables), distributed under the **SIL Open Font License 1.1 (OFL-1.1)**.

## 7. Injected AssetResolver Boundary

Image bytes are supplied strictly via an injected asynchronous resolver:

```ts
interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}
```

- Unreferenced `Book.assets` entries are omitted from the publication.
- Unsafe asset paths (traversal sequences, control characters, absolute paths) must be rejected deterministically.
- Missing references, resolver failures, and empty/corrupt asset payloads must fail deterministically with structured diagnostics.

## 8. Determinism Architecture

> Same Book + same resolved asset bytes + same publishing profile + same fonts = byte-identical PDF.

Empirically verified on Typst v0.15.1:
- Passing `--creation-timestamp <UNIX_TIMESTAMP>` (anchored to `Book.metadata.publishedAt` or fixed build epoch) ensures that the PDF `/CreationDate`, `/ModDate`, and trailer `/ID` array remain deterministic.
- Two consecutive compilations with identical inputs produce **byte-for-byte identical files (100% SHA-256 match)**.

## 9. Canonical Book Model Protection

The following table governs data placement:

| Concept / Data Field | Belongs in Book Model? | Belongs in PDF Layer? | Belongs in Renderer? |
| :--- | :---: | :---: | :---: |
| Text content & Unicode characters | **YES** | Read-only | Read-only |
| Semantic role (heading, quote, list) | **YES** | Read-only | Transformed to style |
| Asset identifier & alt text | **YES** | Read-only | Source reference |
| Trim size (e.g., A5, 6"×9", Royal 8vo) | ❌ **NO** | **YES** (Publishing Profile) | Executed as page dimensions |
| Margins, gutter, bleed, slug | ❌ **NO** | **YES** (Publishing Profile) | Executed as page margins |
| Running headers & page counters | ❌ **NO** | **YES** (Template rules) | Calculated across layout |
| Font families, weights, fallbacks | ❌ **NO** | **YES** (Typography Profile)| Embedded into output PDF |
| Line height & baseline grid | ❌ **NO** | **YES** (Theme definition) | Typeset into paragraph layout |
| Page breaks (`pagebreak()`) | ❌ **NO** | **YES** (Chapter boundaries) | Executed during pagination |
| Absolute x/y element placement | ❌ **NO** | ❌ **NO** (Deferred to DTP)| Executed if present |

**Absolute Invariant:** Nothing related to pages, physical dimensions, paper sizes, typography rules, font files, margins, columns, or layout coordinates may be added to `@openbook/book-model`.

## 10. Future DTP Boundary & Gate 6 Non-Goals

Gate 6 is strictly bounded to **automated, flow-based book publication**.

### What Gate 6 Covers:
- Continuous text flow across pages.
- Symmetric / asymmetric book margins and gutters.
- Running headers from chapter titles.
- Automated page numbering (Arabic and Roman numerals).
- Automatic footnote splitting and stacking.
- Front matter, main matter, back matter, and colophon sequencing.
- Inline and block figures with captions.
- Tables with automatic cell wrapping.

### What is Deferred to Future DTP / Page-Layout Subsystems:
- Absolute canvas positioning of frames (`x`, `y`, `width`, `height`).
- Irregular polygon text wrapping around freeform artwork.
- Multi-column unlinked frame chains.
- Magazine-style callout boxes and arbitrary floating layers.
- Pre-press color separations (CMYK / spot colors) and printer registration marks.
- Interactive drag-and-drop page editor.

## 11. Licensing & Redistribution

- **Typst Compiler:** Apache-2.0. Compatible with OpenBook Apache-2.0.
- **Transitive Rust Crates:** All statically linked dependencies (`rustybuzz`, `ttf-parser`, `fontdb`, `image`) use permissive licenses (MIT, Apache-2.0, BSD-3-Clause). **Zero copyleft (GPL/LGPL) components.**
- **Bundled Fonts:** SIL Open Font License 1.1 (OFL-1.1). Permits software bundling and document embedding without royalties or copyleft viral effect.
- **Redistribution Requirement:** Shipped application packages must preserve upstream `LICENSE` and `NOTICE` files for Typst and `OFL.txt` for bundled fonts in `packaging/THIRD-PARTY-NOTICES.md`.

## 12. Alternatives Rejected

| Candidate | Reason for Rejection |
| :--- | :--- |
| **pdf-lib** | Rejected for book publishing. Lacks complex-script text shaping (cannot render Kannada conjuncts), word-wrapping, paragraph breaking, and multi-page layout algorithms. |
| **Chromium (Puppeteer)** | Rejected. Massive runtime overhead (>200 MB), high memory consumption, fragile paged-media support, and lack of true running headers (`string-set`). |
| **WeasyPrint** | Rejected. Heavy Python runtime requirement and LGPL dependencies (Pango/Cairo). |
| **Intermediate EPUB Conversion** | Rejected. Violates format neutrality (`ARCHITECTURE.md` §20). PDF must be a direct downstream projection of the canonical Book Model. |
| **Commercial closed-source engines** | Rejected. Proprietary licenses (PrinceXML, Antenna House) violate open-source and self-contained desktop principles. |

## 13. Implementation Authorization

This ADR is an **architecture decision only**.

Acceptance of ADR-0013 does **not** authorize implementation.

Implementation requires a **separate explicit authorization**.

When authorized, implementation must:
- Create the `@openbook/pdf` package adhering to the boundaries defined herein.
- Provide unit tests and empirical validation against OpenBook bake-off fixtures.
- Remain strictly within the flow-based book publishing scope.
- Introduce zero changes to Book Model, SemanticDocument, SQLite, Tauri, EPUB, or HTML code.

## 14. Consequences

### Positive:
- High typographic quality with mathematical line-breaking, hyphenation, running headers, and multi-pass footnote layout.
- Flawless native Kannada text and conjunct shaping via HarfBuzz (`rustybuzz`).
- Direct Apache-2.0 licensing alignment with zero copyleft risk.
- Compact, self-contained native binary (~17–22 MB) with zero external runtime dependencies.
- Byte-for-byte reproducible PDF emission.

### Negative / Trade-offs:
- Desktop distribution packages must bundle platform-specific native Typst binaries and font assets.
- Requires maintaining a TypeScript adapter translating Book Model AST to declarative Typst markup.

## 15. Acceptance Criteria for ADR-0013

* [x] Typst v0.15.1 selected as official PDF publishing renderer.
* [x] Complex Kannada text shaping verified empirically against bake-off fixtures.
* [x] Font embedding and subsetting verified via PDF byte stream inspection.
* [x] Byte-for-byte determinism verified via `--creation-timestamp`.
* [x] Injected `AssetResolver` boundary specified.
* [x] Canonical Book Model protection invariants established.
* [x] Clear boundary between flow-based book PDF and future DTP defined.
* [x] Permissive Apache-2.0 and OFL-1.1 licensing confirmed.
* [x] Implementation gated for separate explicit authorization.

**Decision:** Accepted. Implementation remains gated and requires separate explicit authorization.

## Related Documents

- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/adr/0006-book-model-executable-specification.md`
- `docs/adr/0010-epub-3-3-asset-and-resource-packaging-architecture-gate-3.md`
- `docs/adr/0011-html-publishing-engine-architecture.md`
- `docs/adr/0012-production-epubcheck-runtime-packaging.md`
- `docs/PDF_RENDERER_BAKEOFF_PLAN.md`
- `docs/PUBLISHING_ENGINE_TECHNOLOGY_SCORECARD.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
