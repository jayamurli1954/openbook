# OpenBook Architecture & Decision Index

- **Status:** Active
- **Last updated:** 2026-09-11

This index is the navigation point for durable OpenBook decisions. Individual ADRs remain authoritative for their specific subjects.

Numbering: files are `docs/adr/NNNN-slug.md`. **ADR-0001 was never issued on `main`.** Do not reuse 0001. A parallel branch/PR used `docs/adr/0001` for a Book Model skeleton; that file is not canonical here.

| ID | Decision | Status | Area | Date |
|---|---|---|---|---|
| ADR-0001 | *(not issued on `main`)* | — | Process | — |
| ADR-0002 | Third-party reference and licensing boundary | Accepted | Licensing / Documentation | 2026-09-03 |
| ADR-0003 | Apache-2.0 license and contributor protection | Accepted | Licensing / Governance | 2026-09-03 |
| ADR-0004 | Publishing engine technology architecture | Accepted direction; renderer bake-off pending | Publishing / Architecture | 2026-09-03 |
| ADR-0005 | EPUBCheck bundling, Java runtime isolation and compliance | Accepted; runtime version/`jlink` not Frozen | EPUB / Runtime / Compliance | 2026-09-03 |
| ADR-0006 | Book Model executable specification and tests (no UI) | Accepted | Book Model / Foundation | 2026-09-03 |
| ADR-0007 | Desktop foundation technology baseline and freeze-lift | Accepted; Tauri/React/TypeScript/SQLite versions Frozen; next-PR shell scaffold authorized | Desktop / Foundation | 2026-09-07 |
| ADR-0008 | Editor technology evaluation and decision (Tiptap/ProseMirror) | Accepted; OSS Tiptap package versions Frozen; editor implementation not authorized by this ADR alone | Editor / Authoring | 2026-09-07 |
| ADR-0009 | EPUB 3.3 engine architecture and publishing boundary | Accepted; implementation gated for follow-up slice | Publishing / EPUB | 2026-09-07 |
| ADR-0010 | EPUB 3.3 asset & resource packaging architecture (Gate 3) | Accepted; implementation requires separate explicit authorization | Publishing / EPUB | 2026-09-07 |
| ADR-0011 | HTML publishing engine architecture (Gate 4) | Accepted; implementation requires separate explicit authorization (already granted) | Publishing / HTML | 2026-09-08 |
| ADR-0012 | Production EPUBCheck runtime & packaging architecture (Gate 5) | Accepted; implementation requires separate explicit authorization | EPUB / Runtime / Compliance | 2026-09-08 |
| ADR-0013 | PDF publishing engine architecture and Typst renderer selection (Gate 6) | Accepted; implementation requires separate explicit authorization | Publishing / PDF | 2026-09-08 |
| ADR-0014 | End-to-End Book Production Workflow Architecture (Gate 7) | Accepted; implementation requires separate explicit authorization | Workflow / Architecture | 2026-09-08 |
| ADR-0015 | Import and Ingestion Foundation Architecture (Gate 7 Slice 2) | Accepted; implementation requires separate explicit authorization | Import / Ingestion / Architecture | 2026-09-08 |
| ADR-0016 | Book Structure and Authoring Foundation Architecture (Gate 7 Slice 3) | Accepted; implementation requires separate explicit authorization | Structure / Authoring / Architecture | 2026-09-08 |
| ADR-0017 | Asset Management Foundation Architecture (Gate 7 Slice 4) | Accepted; implementation requires separate explicit authorization | Assets / Architecture | 2026-09-09 |
| ADR-0018 | Book Doctor Validation Coordinator Architecture (Gate 7 Slice 5) | Accepted; implementation requires separate explicit authorization | Validation / Book Doctor / Architecture | 2026-09-09 |
| ADR-0019 | Desktop Studio Integration Architecture (Gate 8) | Accepted; Slice 1 implemented; Slices 2–5 remain gated | Desktop / Workflow / Architecture | 2026-09-11 |

**Accepted is not Frozen.** Frozen means implementation must follow that decision unless a new ADR replaces it. ADR-0007 freezes exact Tauri **2.11.5**, React **19.2.8**, TypeScript **5.9.3**, and `tauri-plugin-sql` **2.4.1** (`sqlite`) for the desktop baseline. ADR-0008 freezes the open-source Tiptap/ProseMirror package pins for the authoring surface. ADR-0009 accepts the EPUB 3.3 engine architecture and Book Model mapping boundary, gating implementation for a follow-up freeze-lift. ADR-0010 accepts the EPUB 3.3 asset & resource packaging architecture (Gate 3), with implementation requiring a separate explicit authorization. ADR-0011 accepts the HTML publishing engine architecture (Gate 4), with implementation requiring a separate explicit authorization (already granted for Gate 4). ADR-0012 accepts the production EPUBCheck 5.3.0 / Temurin 21 LTS family / `jlink` packaging architecture (Gate 5); exact Temurin patch/build and SHA-256 are recorded when implementation is authorized. ADR-0013 accepts the PDF publishing engine architecture and selects **Typst v0.15.1** as the production PDF renderer (Gate 6), with implementation requiring a separate explicit authorization. ADR-0014 accepts the end-to-end book production workflow architecture (Gate 7) establishing the canonical domain model vs. persistence vs. workflow state boundaries, strict downstream read-only projections, and the Book Doctor validation coordinator, with implementation requiring a separate explicit authorization. ADR-0015 accepts the import and ingestion foundation architecture (Gate 7 Slice 2) establishing the Markdown and plain text conversion boundary into canonical Book Model, deterministic ID invariants, publishedAt rules, and workflow integration, with implementation requiring a separate explicit authorization. ADR-0016 accepts the book structure and authoring foundation architecture (Gate 7 Slice 3) establishing in-memory session coordination, discrete structural operations, block-level authoring boundaries, deterministic ID invariants, and reference isolation, with implementation requiring a separate explicit authorization. ADR-0017 accepts the asset management foundation architecture (Gate 7 Slice 4) establishing SHA-256 content-addressed storage, deterministic `AssetRef.id` synthesis, SVG reject-only security, configurable per-class size limits, audit severities, and `AssetResolver` compatibility without mutating the canonical Book, with implementation requiring a separate explicit authorization. ADR-0018 accepts the Book Doctor validation coordinator architecture (Gate 7 Slice 5) establishing `BookValidationReport` aggregation (distinct from Gate 5 `ValidationReport`), deterministic severity/source mapping, accessibility-as-future, and a book-model-only dependency boundary that explicitly prohibits `@openbook/pdf`, with implementation requiring a separate explicit authorization. ADR-0019 accepts the Desktop Studio Integration Architecture (Gate 8) establishing the `DesktopStudioCoordinator` pattern, retiring the prototype `EditorBookSession`, enforcing section-level Tiptap synchronization with atomic rollback, separating content-addressed asset storage from SQLite, and isolating heavy subprocess execution behind async workflow job states; Slice 1 (Coordinator & Authoring Integration) is authorized and implemented; Slices 2–5 remain gated.

## Governance

The project follows `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`.

Important conversations are captured under `docs/conversations/` and durable decisions are promoted into ADRs or other authoritative project documents.

See also `docs/FOUNDATION-READINESS-REPORT.md` and `docs/IMPLEMENTATION-BACKLOG.md`.

## Pending decisions

- ~~Final PDF renderer after Typst/pdf-lib/Chromium bake-off~~ — resolved by ADR-0013: Typst **v0.15.1** selected as production PDF publishing renderer; implementation requires separate explicit authorization
- Exact Temurin patch/build, SHA-256, and per-platform smoke-tested images (Temurin 21 LTS family and `jlink` default **Accepted** in ADR-0012; implementation not authorized)
- Bundled-font policy
- Contributor agreement mechanism (CLA/DCO)
- Whether `FOUNDATION-GOVERNANCE-READY` / `ROADMAP.md` `FOUNDATION-READY` can be declared (audit: **not passed**)
- ~~Exact Tiptap/ProseMirror (editor) package versions~~ — resolved by ADR-0008 (OSS pins Frozen; implementation still gated)
- ~~Frontend bundler (e.g. Vite) exact version~~ — Vite **8.2.2** recorded with the desktop shell (`apps/desktop`)
- ~~Final Tauri / React / TypeScript / SQLite desktop baseline versions~~ — resolved by ADR-0007
- ~~How to merge or renumber the unmerged Book Model work on PR #1~~ — resolved by ADR-0006: reused, reconciled, and landed as `@openbook/book-model` (PR #1's `docs/adr/0001` not used; 0001 stays reserved)

## Decision status meanings

- **PROPOSED:** suggested but not approved
- **UNDER REVIEW:** actively being evaluated
- **ACCEPTED:** approved direction
- **FROZEN:** implementation must follow unless formally changed
- **SUPERSEDED:** replaced by a later decision
- **REJECTED:** explicitly not adopted
- **DEPRECATED:** no longer recommended
