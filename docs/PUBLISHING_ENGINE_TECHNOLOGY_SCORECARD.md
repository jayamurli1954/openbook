# OpenBook Publishing Engine Technology & License Scorecard

- **Status:** Evaluation baseline
- **Date:** 2026-09-03
- **Purpose:** Evaluate rendering, publishing, validation, typography and asset-processing technologies before implementation is frozen.

## Architecture principles

1. OpenBook owns the canonical Book Model and publishing specifications.
2. EPUB, HTML and PDF are generated from the Book Model; they are outputs, not authoring sources.
3. Standards and output correctness take precedence over convenience of a particular library.
4. Third-party components retain their own licenses; Apache-2.0 does not change those licenses.
5. Strong-copyleft components require explicit architectural and licensing review.
6. Official standards validators should not be replaced by unofficial ports merely for implementation convenience.
7. Rendering engines are accessed through adapters so that the Book Model is not coupled to a particular renderer.

## Initial candidate scorecard

| Area | Candidate | Initial role | License signal | Technical assessment | Decision |
|---|---|---|---|---|---|
| EPUB generation | OpenBook TypeScript implementation | Generate EPUB 3.3 package from Book Model | OpenBook Apache-2.0 | Best control over semantics and package structure | **Preferred** |
| EPUB validation | EPUBCheck 5.3.0 | Authoritative conformance validation | 3-Clause BSD; distribution also contains third-party notices | Official W3C/DAISY validator; Java runtime | **Required reference validator** |
| HTML generation | OpenBook TypeScript implementation | Semantic HTML/CSS output | OpenBook Apache-2.0 | Directly maps Book Model to web output | **Preferred** |
| PDF generation | Typst | Candidate professional typesetting renderer | Must verify exact version/component licenses before bundling | Strong candidate for book-quality layout; requires bake-off | **Evaluate** |
| PDF generation | pdf-lib | Programmatic PDF generation/manipulation | MIT | Lightweight and TypeScript-friendly; may be insufficient for advanced pagination/typesetting | **Evaluate / supporting tool** |
| PDF generation | Chromium via Puppeteer | HTML/CSS print-to-PDF candidate | Puppeteer Apache-2.0; Chromium distribution has additional third-party components | Mature layout engine; larger footprint and print-layout constraints | **Evaluate** |
| DTP reference | Scribus | Functional/quality reference; possible external-process integration later | GPL family; exact components require review | Excellent professional DTP reference; avoid casual embedding | **Reference / possible process boundary** |
| Editor | Tiptap + ProseMirror | Semantic authoring UI | ProseMirror core is MIT; exact Tiptap package/version licenses must be verified | Strong semantic editor architecture | **Preferred, license-scorecard required** |
| Desktop shell | Tauri 2.x | Desktop application shell/native bridge | License must be verified for exact release | Good fit for local-first desktop architecture | **Preferred, license-scorecard required** |
| Text shaping | HarfBuzz | Indic/Unicode glyph shaping where required | Permissive open-source licensing; exact bundled version to be recorded | Important for multilingual publishing | **Evaluate / likely foundational native dependency** |
| Text layout | Pango | Text layout candidate where required | LGPL family; integration boundary requires review | Mature multilingual text layout | **Evaluate carefully** |
| Image processing | ImageMagick / equivalent | Asset conversion/normalization | License varies by exact component/version; review required | Useful but should remain behind asset adapter | **Evaluate** |

## PDF bake-off requirements

No PDF renderer is frozen until it passes representative OpenBook fixtures for:

- English prose
- Kannada prose
- mixed English/Kannada
- Indic conjuncts and combining marks
- chapter headings
- page numbering
- headers and footers
- facing pages
- margins and gutter
- images and captions
- tables
- long chapters with pagination
- widow/orphan handling
- hyphenation
- embedded fonts
- hyperlinks/bookmarks where applicable
- deterministic/reproducible output where practical
- print-oriented output quality

The bake-off must compare both output quality and operational properties such as bundle size, startup/runtime requirements, licensing, platform support, security maintenance and implementation complexity.

## EPUB validation policy

EPUBCheck is the authoritative conformance reference for generated EPUB files. The official project states that EPUBCheck is the official EPUB conformance checker, supports EPUB 2 and EPUB 3, and its current production-ready release is 5.3.0. It is distributed as a command-line tool or Java library and is licensed under the 3-Clause BSD License.

OpenBook should hide the Java requirement from normal users where practical rather than replacing official validation with an unverified TypeScript/WASM port. A managed/bundled runtime or isolated process is preferred subject to redistribution and platform testing.

## Licensing gate

Before a candidate becomes a production dependency, record:

- exact package/project and version;
- SPDX license expression where available;
- copyright/notice requirements;
- direct and transitive dependencies;
- static/dynamic linking or process boundary;
- redistribution requirements;
- source-disclosure obligations;
- patent provisions;
- native binaries/runtime requirements;
- supported operating systems;
- security/maintenance status;
- bundle-size impact;
- commercial-distribution implications.

## Architectural conclusion

The current direction is:

```text
Book Model (Apache-2.0)
        |
        +--> EPUB Engine (OpenBook TypeScript)
        |        |
        |        +--> EPUBCheck adapter
        |
        +--> HTML Engine (OpenBook TypeScript)
        |
        +--> PDF/DTP Engine (renderer adapter)
                 |
                 +--> Candidate renderer selected by bake-off
```

The Book Model must not depend on EPUB, PDF or renderer-specific structures. Renderer adapters translate the canonical model into target-specific output.

## Not yet frozen

- PDF renderer
- exact EPUBCheck packaging/runtime strategy
- exact Tauri release
- exact Tiptap package set
- exact typography/native dependency set
- font distribution strategy
- PDF/X and professional print workflow scope

## Gate

`FOUNDATION-GOVERNANCE-READY` should not be declared complete until the above technology and license decisions have been reviewed and the PDF bake-off plan is approved.
