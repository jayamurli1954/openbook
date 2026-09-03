# OpenBook Studio — Project Context

- **Project:** OpenBook Studio
- **Maintainer:** SanMitra Tech Solutions
- **License:** Apache-2.0
- **Repository:** https://github.com/jayamurli1954/openbook
- **Purpose:** Open-source, one-stop platform to write, design, typeset, validate and publish books.
- **Core principle:** Tell us your story. We'll guide you to a finished book.

## Source of truth

The GitHub repository is the authoritative project memory. Important decisions made in conversations must be promoted into repository documentation according to `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`.

## Product philosophy

- One canonical Book Model is the single source of truth.
- EPUB is a publishing output, not the internal authoring format.
- AI assists authors and designers but does not become the authority for publishing correctness.
- Deterministic publishing engines and validators control output correctness.
- Local-first desktop operation is preferred for the core product.
- Beginner Mode and Expert Mode should coexist.
- The product should never leave an author wondering what to do next.
- Accessibility and multilingual publishing are first-class requirements.
- Integrate mature open-source components where appropriate; do not unnecessarily merge or fork them.

## Canonical Book Model

The Book Model represents:

- metadata
- front matter
- manuscript chapters/sections
- back matter
- assets
- design/theme
- publishing configuration

It must remain independent of EPUB OPF/manifest/spine structures and independent of any particular PDF renderer.

## Preferred technology direction

- Desktop shell: Tauri 2.x
- Primary product language: TypeScript
- UI: React
- Semantic editor: Tiptap/ProseMirror direction
- Local database: SQLite
- Native/system layer: Rust selectively
- Local AI: Ollama
- Cloud AI: optional
- EPUB generation: OpenBook TypeScript engine
- HTML generation: OpenBook semantic HTML/CSS engine
- PDF: renderer adapter; final renderer pending bake-off
- EPUB validation: official EPUBCheck; bundled/private Java runtime strategy preferred

## Publishing architecture

```text
Book Model
   |
   +--> EPUB Engine ------> EPUB 3.3
   +--> HTML Engine ------> Semantic HTML/CSS
   +--> PDF Renderer -----> Print/PDF output
   +--> Validator --------> Conformance/health reports
```

EPUBCheck is the authoritative EPUB conformance validator. OpenBook should not replace it with an unofficial JS/WASM port merely for convenience.

Preferred EPUBCheck desktop strategy (ADR-0005, Accepted; runtime versions not Frozen):

```text
Tauri/Rust ValidatorService
        |
        +--> isolated subprocess
                 |
                 +--> bundled Java runtime
                 +--> official EPUBCheck
```

No user-installed Java should be required. `jlink` should be evaluated to minimize the bundled runtime.

## Current architectural decisions

- Apache-2.0 adopted for OpenBook core.
- Contributor protection/attribution policy recorded.
- Book Model remains canonical.
- Publishing engine architecture is accepted direction; final PDF renderer remains pending bake-off.
- Official EPUBCheck remains authoritative.

See `docs/decisions/ARCHITECTURE-DECISION-INDEX.md` and `docs/adr/`.

## DTP direction

DTP is first-class, not an afterthought. Requirements include page geometry, margins, bleed, gutter, columns, master pages, facing pages, headers/footers, page numbering, typography, styles, image placement, tables, captions, front/main/back matter, TOC, cross references and professional preflight controls. Beginner and Expert modes should expose different levels of complexity.

## Governance

Significant architecture, technology, licensing, security, publishing, product and governance decisions must be recorded in GitHub. Chat is the workshop; GitHub is the project memory and source of truth.

AI coding agents should read this file and the relevant ADRs before making material changes. Frozen decisions must not be silently overridden.

## Current known pending decisions

- Final PDF renderer
- Exact Temurin/runtime version, platforms, and `jlink` adoption (bundling *strategy* is Accepted in ADR-0005)
- Bundled-font policy
- Contributor agreement mechanism
- Final dependency versions
- Foundation governance readiness gate (see `docs/FOUNDATION-READINESS-REPORT.md` — not passed)

## Important existing documents

- `docs/adr/0002-third-party-reference-and-licensing-boundary.md`
- `docs/adr/0003-apache-2-license-and-contributor-protection.md`
- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/adr/0005-epubcheck-bundling-java-runtime-isolation.md`
- `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`
- `docs/conversations/README.md`
- `docs/conversations/2026-09-03-epubcheck-java-tauri.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- `docs/FOUNDATION-READINESS-REPORT.md`
