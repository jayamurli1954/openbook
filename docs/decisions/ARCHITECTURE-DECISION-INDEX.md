# OpenBook Architecture & Decision Index

- **Status:** Active
- **Last updated:** 2026-09-08

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

**Accepted is not Frozen.** Frozen means implementation must follow that decision unless a new ADR replaces it. ADR-0007 freezes exact Tauri **2.11.5**, React **19.2.8**, TypeScript **5.9.3**, and `tauri-plugin-sql` **2.4.1** (`sqlite`) for the desktop baseline. ADR-0008 freezes the open-source Tiptap/ProseMirror package pins for the authoring surface. ADR-0009 accepts the EPUB 3.3 engine architecture and Book Model mapping boundary, gating implementation for a follow-up freeze-lift. ADR-0010 accepts the EPUB 3.3 asset & resource packaging architecture (Gate 3), with implementation requiring a separate explicit authorization. ADR-0011 accepts the HTML publishing engine architecture (Gate 4), with implementation requiring a separate explicit authorization (already granted for Gate 4). ADR-0012 accepts the production EPUBCheck 5.3.0 / Temurin 21 LTS family / `jlink` packaging architecture (Gate 5); exact Temurin patch/build and SHA-256 are recorded when implementation is authorized. PDF renderer selection remains UNDECIDED (ADR-0004). Typst remains an evaluation candidate only.

## Governance

The project follows `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`.

Important conversations are captured under `docs/conversations/` and durable decisions are promoted into ADRs or other authoritative project documents.

See also `docs/FOUNDATION-READINESS-REPORT.md` and `docs/IMPLEMENTATION-BACKLOG.md`.

## Pending decisions

- Final PDF renderer after Typst/pdf-lib/Chromium bake-off (plan + multilingual fixtures: `docs/PDF_RENDERER_BAKEOFF_PLAN.md`; **selection still PENDING / UNDECIDED**)
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
