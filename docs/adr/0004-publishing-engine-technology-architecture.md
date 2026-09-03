# ADR 0004: Publishing Engine Technology Architecture

- **Status:** Accepted direction; renderer bake-off pending
- **Date:** 2026-09-03
- **Decision:** OpenBook will own the canonical Book Model and semantic publishing pipeline. EPUB and HTML generation will be implemented as OpenBook TypeScript engines. PDF generation will use a renderer adapter, with Typst as the primary candidate and Chromium/pdf-lib retained as evaluated alternatives. EPUBCheck will remain the authoritative EPUB conformance validator.

## Context

OpenBook must produce professional EPUB, HTML and PDF outputs from one canonical Book Model. The architecture must support multilingual publishing, including Kannada and other Indic scripts, while preserving a clean Apache-2.0 project boundary and avoiding unnecessary reinvention of mature rendering technology.

Publishing engines are a significant architectural and licensing boundary because they may introduce native libraries, bundled binaries, browser engines, fonts, runtime dependencies and transitive licenses.

## Decision

### 1. Canonical publishing source

The OpenBook Book Model remains the single source of truth.

```text
Book Model
   |
   +--> EPUB Engine ------> EPUB 3.3
   |
   +--> HTML Engine ------> Semantic HTML/CSS
   |
   +--> PDF Renderer -----> Print/PDF output
   |
   +--> Validator --------> Conformance/health reports
```

No output format becomes the internal authoring source.

### 2. EPUB engine

OpenBook will implement its own TypeScript EPUB generation layer. The engine will translate semantic Book Model structures into EPUB 3.3 package documents, XHTML, CSS, navigation and metadata.

The engine must not expose EPUB package structures such as OPF, manifest or spine inside the authoring Book Model.

### 3. EPUB validation

EPUBCheck is the authoritative conformance validator. The current production-ready EPUBCheck release is 5.3.0 and checks EPUB 2 and EPUB 3, including EPUB 3.3. The official project describes EPUBCheck as a standalone command-line tool or Java library and identifies the project as maintained by the DAISY Consortium on behalf of W3C.

OpenBook will use an adapter around EPUBCheck. The user should not be required to install Java manually if a reliable managed/bundled runtime strategy is feasible and redistribution obligations are satisfied.

An unofficial TypeScript/WASM port must not replace EPUBCheck as the authoritative validator merely to reduce runtime weight.

### 4. HTML engine

OpenBook will implement its own semantic HTML/CSS publishing layer in TypeScript. The generated HTML should remain standards-oriented and suitable for browser preview and future web publishing.

OpenBook will not attempt to implement a browser layout engine.

### 5. PDF engine

PDF generation will be renderer-adapter based.

**Primary candidate: Typst.** Typst is an open-source markup-based typesetting system, its compiler repository is Apache-2.0, and it is designed for high-quality typesetting and fast compilation. Its repository also contains third-party component notices, so OpenBook must preserve and review those notices if Typst is redistributed.

**Secondary candidate: pdf-lib.** pdf-lib is MIT-licensed and TypeScript/JavaScript friendly. It is suitable for programmatic PDF creation and manipulation, but its suitability for sophisticated book pagination and professional DTP must be proven rather than assumed.

**Evaluation candidate: Chromium via Puppeteer.** Puppeteer is Apache-2.0 and can automate browser-based printing to PDF. Chromium brings a substantially larger runtime and its distribution contains additional third-party components, so the complete bundle must be license- and size-reviewed.

The final PDF renderer will not be frozen until the representative publishing bake-off passes.

### 6. DTP reference boundary

Scribus remains a professional DTP reference and possible future process-boundary integration candidate. OpenBook will not embed or fork Scribus without a separate licensing and architecture decision.

### 7. Typography and multilingual rendering

The publishing architecture must explicitly account for Unicode text shaping and layout. HarfBuzz is a likely foundational shaping component and uses the Old MIT license, with some files/components subject to separate licenses. Any direct native integration must record the exact version and applicable notices.

Other layout components such as Pango may be evaluated where they materially improve multilingual text layout. Their LGPL-family licensing means integration must be reviewed before bundling.

Indic-language acceptance tests are mandatory for publishing-engine selection.

### 8. Editor

Tiptap and ProseMirror remain the preferred semantic editor architecture. The Tiptap editor repository is MIT-licensed, while some Tiptap commercial/cloud extensions are separately licensed. OpenBook will use the open-source editor surface required for the local-first core and will not make paid Tiptap services a hidden dependency.

### 9. Desktop architecture

Tauri 2.x remains the preferred desktop shell. The Tauri repository is dual-licensed under Apache-2.0 and MIT. OpenBook will use Tauri as the native application boundary and keep most product/domain logic in TypeScript.

Rust will be used selectively for native/system functionality and performance-sensitive integrations rather than as the primary product-development language.

## PDF bake-off

The renderer evaluation must test at minimum:

- English prose
- Kannada prose
- mixed English/Kannada
- Indic conjuncts and combining marks
- long chapters
- chapter-opening styles
- facing pages
- page geometry and gutter
- headers and footers
- page numbering
- images and captions
- tables
- footnotes where supported
- hyperlinks/bookmarks where applicable
- hyphenation
- widow/orphan behavior
- embedded fonts
- deterministic output where practical
- print-oriented quality
- performance
- binary/runtime footprint
- Windows/macOS/Linux packaging feasibility

The winner must satisfy both technical and licensing criteria.

## Licensing and distribution rules

1. OpenBook Apache-2.0 applies to OpenBook's own code, not third-party dependencies.
2. Every bundled dependency must have an exact-version license record.
3. Transitive dependencies must be included in the license inventory.
4. Native binaries require redistribution and notice review.
5. Fonts and templates are separate asset-licensing concerns and require provenance records.
6. Third-party NOTICE files must be preserved where required.
7. Strong-copyleft components require explicit architecture/legal review before adoption.
8. Dependency licenses must not be inferred solely from package names or marketing claims.

## Consequences

### Positive

- One canonical publishing model remains independent of target renderers.
- EPUB correctness is anchored to the official validator.
- Professional PDF rendering can evolve without changing the Book Model.
- The local-first application remains lightweight at the application-code level.
- Multilingual publishing becomes an explicit acceptance criterion rather than an afterthought.
- Renderer replacement remains possible through adapters.

### Negative / responsibilities

- Maintaining renderer adapters adds engineering work.
- Bundling professional rendering engines increases packaging and licensing complexity.
- Typography and font handling require dedicated test fixtures.
- A final PDF renderer cannot be selected solely from license compatibility; output quality must be demonstrated.

## Follow-up actions

1. Build a PDF renderer proof-of-concept for Typst.
2. Build a comparable pdf-lib proof-of-concept.
3. Evaluate Chromium/Puppeteer print-to-PDF for the same fixtures.
4. Create multilingual typography fixtures, including Kannada.
5. Establish the exact EPUBCheck 5.3.0 packaging/runtime strategy.
6. Record exact versions and licenses in the dependency inventory.
7. Evaluate font licensing and bundled-font policy.
8. After the bake-off, update this ADR with the final PDF renderer decision.
9. Do not declare `FOUNDATION-GOVERNANCE-READY` until the remaining gates are closed.

## References

- EPUBCheck: https://github.com/w3c/epubcheck
- Typst: https://github.com/typst/typst
- pdf-lib: https://github.com/Hopding/pdf-lib
- Puppeteer: https://github.com/puppeteer/puppeteer
- Tauri: https://github.com/tauri-apps/tauri
- Tiptap: https://github.com/ueberdosis/tiptap
- ProseMirror: https://github.com/ProseMirror
- HarfBuzz: https://github.com/harfbuzz/harfbuzz
