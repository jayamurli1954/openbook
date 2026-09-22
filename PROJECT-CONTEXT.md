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

- Desktop shell: Tauri **2.11.5** (Frozen baseline, ADR-0007); `@tauri-apps/api` **2.11.1**, CLI **2.11.4**
- Primary product language: TypeScript **5.9.3** (Frozen baseline, ADR-0007)
- UI: React **19.2.8** / `react-dom` **19.2.8** (Frozen baseline, ADR-0007)
- Semantic editor: Tiptap/ProseMirror **3.31.3** OSS pins Frozen (ADR-0008)
- Local database: SQLite via `tauri-plugin-sql` **2.4.1** (`sqlite`) — persistence infrastructure only; **not** the Book Model (ADR-0007)
- Native/system layer: Rust selectively (within Tauri)
- Local AI: Ollama (intent only; not an MVP dependency; not authorized)
- Cloud AI: optional
- EPUB generation: OpenBook TypeScript engine (`@openbook/epub`, ADR-0009/0010)
- HTML generation: OpenBook semantic HTML/CSS engine (`@openbook/html`, ADR-0011)
- PDF: Typst **v0.15.1** production renderer (`@openbook/pdf`, ADR-0013)
- EPUB validation: official EPUBCheck 5.3.0 with bundled Temurin 21 / `jlink` runtime (ADR-0005, ADR-0012)

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

- Apache-2.0 adopted for OpenBook core (ADR-0003).
- DCO 1.1 is the contribution sign-off mechanism (ADR-0024). Code of Conduct: ADR-0026. Security disclosure: ADR-0027 / `SECURITY.md`.
- Book Model remains canonical (ADR-0006). Tiptap JSON is never persisted.
- Publishing engines for EPUB, HTML, and Typst PDF are implemented (Gates 1–6). Gate 9 export UI and native Save As are implemented (ADR-0030).
- ADR-0028 established the release/compliance evidence layer; production inventory population and font-by-font clearance remain evidence-pending.
- ADR-0029 Slices 1–6 are implemented (filesystem project package). ADR-0031 Slices 1–5 are implemented (autosave / crash recovery over the package Save boundary).
- ADR-0032 accepts Gate 10 desktop packaging / release readiness (packaged-resource locator; Windows-first bundle of Gate 5/6 runtimes). Slices 1–5 are done on main (PRs #104–#108). `FOUNDATION-READY` is not declared (see post–Gate 10 closure record).

See `docs/decisions/ARCHITECTURE-DECISION-INDEX.md` and `docs/adr/`.

## DTP direction

DTP is first-class, not an afterthought. Requirements include page geometry, margins, bleed, gutter, columns, master pages, facing pages, headers/footers, page numbering, typography, styles, image placement, tables, captions, front/main/back matter, TOC, cross references and professional preflight controls. Beginner and Expert modes should expose different levels of complexity.

## Governance

Significant architecture, technology, licensing, security, publishing, product and governance decisions must be recorded in GitHub. Chat is the workshop; GitHub is the project memory and source of truth.

AI coding agents should read this file and the relevant ADRs before making material changes. Frozen decisions must not be silently overridden.

## Current known pending decisions

Required next product capabilities (must not be dropped — see `docs/IMPLEMENTATION-BACKLOG.md`):

- Export UI and native Save As — **done** (Gate 9 / ADR-0030)
- Filesystem project package — **done** (ADR-0029 Slices 1–6)
- Autosave and crash recovery — **done** sequencing (ADR-0031 Slices 1–5)
- Packaging / release readiness — **Done** (Gate 10 / ADR-0032 Slices 1–5)
- Whether `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` can be declared — **not declared** (post–Gate 10 closure record)

Other pending items:

- Exact Temurin patch/build, SHA-256, and per-platform smoke-tested images (Temurin 21 LTS family and `jlink` default Accepted in ADR-0012; inventory pins exist; Gate 10 Windows packaging done)
- Bundled-font redistribution evidence (architecture policy exists in ADR-0028 Slice 3; font-by-font clearance remains evidence-dependent)
- AI/Ollama and DTP/page layout (future; must not displace remaining evidence/ADR work)

## Important existing documents

- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- `docs/IMPLEMENTATION-BACKLOG.md`
- `docs/FOUNDATION-READINESS-REPORT.md` (historical audit; not the current snapshot)
- `docs/FOUNDATION-READINESS-CLOSURE-AND-NEXT-ARCHITECTURE.md` (2026-09-16 ADR-0028 selection)
- `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md` (current post–Gate 10 determination)
- `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
