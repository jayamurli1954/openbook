# OpenBook Architecture & Decision Index

- **Status:** Active
- **Last updated:** 2026-09-24

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
| ADR-0018 | Book Doctor Validation Coordinator Architecture (Gate 7 Slice 5) | Accepted; implementation requires separate explicit authorization | Validation / Book Doctor | 2026-09-09 |
| ADR-0019 | Desktop Studio Integration Architecture (Gate 8) | Accepted; Slices 1–5 implemented | Desktop / Workflow / Architecture | 2026-09-11 |
| ADR-0020 | Desktop Import & Ingestion Surface Architecture (Gate 8 Slice 2) | Accepted; Slice 2 implemented | Desktop / Import / Architecture | 2026-09-11 |
| ADR-0021 | Desktop Asset Management & Media Boundary Architecture (Gate 8 Slice 3) | Accepted; Slice 3 implemented | Desktop / Assets / Architecture | 2026-09-15 |
| ADR-0022 | Desktop Studio Book Doctor Validation Integration Architecture (Gate 8 Slice 4) | Accepted; Slice 4 implemented | Desktop / Validation / Architecture | 2026-09-15 |
| ADR-0023 | Desktop Studio Publishing & Export Integration Architecture (Gate 8 Slice 5) | Accepted; Slice 5 implemented | Desktop / Publishing / Architecture | 2026-09-15 |
| ADR-0024 | Developer Certificate of Origin 1.1 contribution sign-off | Accepted | Governance / Licensing / Contributor Readiness | 2026-09-15 |
| ADR-0025 | Project Stewardship & Maintainer Governance | Accepted | Governance / Contributor Readiness | 2026-09-15 |
| ADR-0026 | Code of Conduct Governance | Accepted | Governance / Contributor Readiness | 2026-09-15 |
| ADR-0027 | Security Disclosure and Vulnerability Response Governance | Accepted; implementation completed on `main` via PR #64 | Governance / Security / Contributor Readiness | 2026-09-15 |
| ADR-0028 | Release & Compliance Architecture | Accepted; five implementation slices complete and reconciled | Release / Compliance | 2026-09-16 |
| ADR-0029 | Project Package & Filesystem Persistence Architecture | Accepted | Project Persistence / Filesystem / Desktop | 2026-09-16 |
| ADR-0030 | Gate 9 — Export UI & Native Save As Architecture | Accepted; Slices 1–5 implemented (Gate 9 closed) | Desktop / Export / Native Filesystem Boundary | 2026-09-18 |
| ADR-0031 | Autosave & Crash Recovery Architecture | Accepted; Slices 1–5 implemented (sequencing closed) | Desktop / Project persistence / Session durability | 2026-09-19 |
| ADR-0032 | Gate 10 — Desktop Packaging & Release Readiness Architecture | Accepted; Slices 1–5 done | Desktop / Packaging / Release Readiness | 2026-09-22 |
| ADR-0033 | Phase 1 — Book Wizard / Guided Start Architecture | Accepted; Slices 1–5 implemented | Desktop / Phase 1 MVP / Guided Start | 2026-09-24 |

**Accepted is not Frozen.** Frozen means implementation must follow that decision unless a new ADR replaces it. ADR-0007 freezes exact Tauri **2.11.5**, React **19.2.8**, TypeScript **5.9.3**, and `tauri-plugin-sql` **2.4.1** (`sqlite`) for the desktop baseline. ADR-0008 freezes the open-source Tiptap/ProseMirror package pins for the authoring surface. ADR-0009 accepts the EPUB 3.3 engine architecture and Book Model mapping boundary, gating implementation for a follow-up freeze-lift. ADR-0010 accepts the EPUB 3.3 asset & resource packaging architecture (Gate 3), with implementation requiring a separate explicit authorization. ADR-0011 accepts the HTML publishing engine architecture (Gate 4), with implementation requiring a separate explicit authorization (already granted for Gate 4). ADR-0012 accepts the production EPUBCheck 5.3.0 / Temurin 21 LTS family / `jlink` packaging architecture (Gate 5); exact Temurin patch/build and SHA-256 are recorded when implementation is authorized. ADR-0013 accepts the PDF publishing engine architecture and selects **Typst v0.15.1** as the production PDF publishing renderer (Gate 6), with implementation requiring separate explicit authorization. ADR-0014 accepts the end-to-end book production workflow architecture (Gate 7) establishing the canonical domain model vs. persistence vs. workflow state boundaries, strict downstream read-only projections, and the Book Doctor validation coordinator, with implementation requiring a separate explicit authorization. ADR-0015 accepts the import and ingestion foundation architecture (Gate 7 Slice 2) establishing the Markdown and plain text conversion boundary into canonical Book Model, deterministic ID invariants, publishedAt rules, and workflow integration, with implementation requiring a separate explicit authorization. ADR-0016 accepts the book structure and authoring foundation architecture (Gate 7 Slice 3) establishing in-memory session coordination, discrete structural operations, block-level authoring boundaries, deterministic ID invariants, and reference isolation, with implementation requiring a separate explicit authorization. ADR-0017 accepts the asset management foundation architecture (Gate 7 Slice 4) establishing SHA-256 content-addressed storage, deterministic `AssetRef.id` synthesis, SVG reject-only security, configurable per-class size limits, audit severities, and `AssetResolver` compatibility without mutating the canonical Book, with implementation requiring a separate explicit authorization. ADR-0018 accepts the Book Doctor validation coordinator architecture (Gate 7 Slice 5) establishing `BookValidationReport` aggregation (distinct from Gate 5 `ValidationReport`), deterministic severity/source mapping, accessibility-as-future, and a book-model-only dependency boundary that explicitly prohibits `@openbook/pdf`, with implementation requiring a separate explicit authorization. ADR-0019 accepts the Desktop Studio Integration Architecture (Gate 8) establishing the `DesktopStudioCoordinator` pattern, retiring the prototype `EditorBookSession`, enforcing section-level Tiptap synchronization with atomic rollback, separating content-addressed asset storage from SQLite, and isolating heavy subprocess execution behind async workflow job states; Slices 1–5 are authorized and implemented. ADR-0020 accepts the Desktop Import & Ingestion Surface Architecture (Gate 8 Slice 2) establishing the `@openbook/importer` integration into `DesktopStudioCoordinator`, pre-decoded Unicode input boundaries, heading-based chapter splitting, frontmatter parsing without synthetic metadata, IMPORT workflow stage job tracking, and atomic rollback without silent persistence; Slice 2 is implemented. ADR-0021 accepts the Desktop Asset Management & Media Boundary Architecture (Gate 8 Slice 3) establishing injectable content-addressed asset storage, granular authoring/assets permissions, explicit persistence, reject-only SVG handling, atomic image-block insertion, and the no-binary-in-SQLite boundary; Slice 3 is implemented. ADR-0022 accepts the Desktop Studio Book Doctor Validation Integration Architecture (Gate 8 Slice 4) establishing `ValidationCoordinator` injection, `VALIDATION` stage execution, ephemeral `BookValidationReport` caching, hard cache invalidation on mutation, and `PREVIEW` transition gating enforced via `DesktopStudioCoordinator` policy (not by `@openbook/workflow` or `@openbook/book-doctor`); Slice 4 is implemented. ADR-0023 accepts the Desktop Studio Publishing & Export Integration Architecture (Gate 8 Slice 5) establishing EPUB 3.3, HTML, and Typst PDF export orchestration, two-phase validation gating (Phase 1 domain pre-check, Phase 2 post-generation verification), mandatory EPUBCheck in PUBLISH, fast preview in PREVIEW, tripartite determinism, sealed runtime boundaries, and in-memory export results; Slice 5 is implemented. ADR-0024 accepts DCO 1.1 contribution sign-off as the project contribution mechanism, with enforcement implemented through repository CI/branch-protection controls. ADR-0025 accepts project stewardship and maintainer governance as documented repository governance policy. ADR-0026 accepts Code of Conduct governance as documented repository governance policy. ADR-0027 accepts private security disclosure and vulnerability response governance; its operational implementation is now complete on `main` through PR #64, including root `SECURITY.md` and documented private reporting, triage, remediation, validation, and coordinated disclosure guidance. ADR-0028 establishes a release/compliance evidence layer separate from the Book Model, application domain logic, and publishing engines; its five implementation slices are complete on `main`, while production evidence population and certain repository-control evidence remain explicitly unresolved where authoritative evidence is unavailable. ADR-0029 establishes a versioned project-package boundary that keeps the canonical Book authoritative, SQLite as persistence infrastructure, assets content-addressed, and Save/Open integrity and migration semantics explicit; implementation remains separately gated. ADR-0030 accepts the Gate 9 export UI and native Save As architecture, preserving DesktopStudioCoordinator as the in-memory export/verification authority and placing native dialogs and filesystem writes at the desktop host boundary; Gate 9 implementation Slices 1–5 are complete on `main`. ADR-0031 accepts autosave and crash recovery as a policy layer over the ADR-0029 package Save boundary (no Tiptap persistence); Slices 1–5 are implemented on `main` and close the ADR-0031 sequencing list. ADR-0032 accepts Gate 10 desktop packaging and release-readiness architecture (packaged-resource locator, Windows-first bundle of Gate 5/6 runtimes, no system Java/Typst fallback). Slices 1–5 are done on `main` (PRs #104–#108). Passing Gate 10 does not declare FOUNDATION-READY. ADR-0033 accepts Phase 1 Book Wizard / Guided Start architecture; implementation requires separate explicit authorization.

## Gate 8 closure

Gate 8 Desktop Studio Integration is **implementation-complete** on `main`. Slices 1–5 are implemented under ADR-0019 through ADR-0023. No Gate 8 implementation slice remains authorized-but-unimplemented. This closure is a documentation reconciliation only; it does not authorize new implementation scope.

## Contributor Readiness closure

The Contributor Readiness governance set is reconciled as follows:

- **ADR-0024 — DCO 1.1 contribution sign-off:** **Accepted**; contribution sign-off enforcement is implemented through the existing repository CI/branch-protection controls.
- **ADR-0025 — Project Stewardship & Maintainer Governance:** **Accepted**; the documented stewardship and maintainer governance policy is recorded in the repository.
- **ADR-0026 — Code of Conduct Governance:** **Accepted**; the documented Code of Conduct governance policy is recorded in the repository.
- **ADR-0027 — Security Disclosure and Vulnerability Response Governance:** **Accepted**; operational security policy is implemented on `main` through **PR #64**, including root `SECURITY.md` and documented private reporting, triage, remediation, validation, and coordinated disclosure guidance. Merge commit: `2ac1bf5c87e44007de1c10c3e0ef0fa731e0dcae`.

This reconciliation records the current governance state only. It does **not** declare broader `FOUNDATION-GOVERNANCE-READY` or final project-wide Contributor Readiness status, and it authorizes no new implementation scope.

## ADR-0028 closure

ADR-0028 Release & Compliance Architecture is **implementation-complete and reconciled** on `main` through PRs #73–#77. The five slices establish the evidence inventory contract, third-party notice maintenance mechanism, font provenance policy, release artifact manifest/evidence mechanism, and reproducibility/compliance verification mechanism.

Production evidence population for Gate 5/6 runtimes, Gate 6 fonts, desktop-path npm closure, and Tauri/Cargo crate closure is recorded under evidence ops Slices 1–5. **`FOUNDATION-READY` is declared** in `docs/FOUNDATION-READY-DETERMINATION.md` (2026-09-24); signing/multi-OS packaging is waived as a Phase 0 requirement. Full branch-protection configuration remains not independently re-verified beyond the post–Gate 10 closure API check. These notes do not reopen ADR-0028.

See `docs/release-compliance/ADR-0028-CLOSURE-RECONCILIATION.md` for the detailed closure record.

## Governance

The project follows `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`.

Important conversations are captured under `docs/conversations/` and durable decisions are promoted into ADRs or other authoritative project documents.

See also `docs/FOUNDATION-READINESS-REPORT.md`, `docs/FOUNDATION-READINESS-CLOSURE-AND-NEXT-ARCHITECTURE.md`, and `docs/IMPLEMENTATION-BACKLOG.md`.

## Pending decisions

- ~~Final PDF renderer after Typst/pdf-lib/Chromium bake-off~~ — resolved by ADR-0013: Typst **v0.15.1** selected as production PDF publishing renderer; implementation requires separate explicit authorization
- Exact Temurin patch/build, SHA-256, and per-platform smoke-tested images (Temurin 21 LTS family and `jlink` default **Accepted** in ADR-0012; Gate 5 inventory pins exist; packaged desktop discovery is Gate 10 / ADR-0032)
- Bundled-font policy — **architecture policy established by ADR-0028 Slice 3; Gate 6 four Noto fonts cleared (confirmed/conditional OFL) under evidence ops Slice 2; additional fonts remain evidence-dependent**
- ~~Contributor agreement mechanism (CLA/DCO)~~ — resolved by ADR-0024: DCO 1.1 **Accepted** and enforcement implemented
- ~~Stewardship and maintainer governance~~ — resolved by ADR-0025: **Accepted**; documented governance policy recorded
- ~~Code of Conduct governance~~ — resolved by ADR-0026: **Accepted**; documented governance policy recorded
- ~~Security disclosure and vulnerability response governance~~ — resolved by ADR-0027: **Accepted** and operational security policy implemented on `main` through PR #64
- Whether `FOUNDATION-GOVERNANCE-READY` / `ROADMAP.md` `FOUNDATION-READY` can be declared — **declared** (2026-09-24; `docs/FOUNDATION-READY-DETERMINATION.md`)
- **Selected next product path:** Phase 1 Book Wizard / Guided Start — ADR-0033 **Accepted**; Slices 1–5 **done** (PRs #117–#121) — see `docs/adr-0033-closure-reconciliation.md`
- AI/Ollama and DTP/page layout remain future work and must not displace the next Phase 1 domain selection
- ~~Exact Tiptap/ProseMirror (editor) package versions~~ — resolved by ADR-0008 (OSS pins Frozen; implementation still gated)
- ~~Frontend bundler (e.g. Vite) exact version~~ — Vite **8.2.2** recorded with the desktop shell (`apps/desktop`)
- ~~Final Tauri / React / TypeScript / SQLite desktop baseline versions~~ — resolved by ADR-0007
- ~~How to merge or renumber the unmerged Book Model work on PR #1~~ — resolved by ADR-0006: reused, reconciled, and landed as `@openbook/book-model` (PR #1's `docs/adr/0001` not used; 0001 stays reserved)

## Gate 9 status

ADR-0030 is **Accepted**. Gate 9 implementation is **complete** on `main` through Slices 1–5:

1. export host contract/adapter;
2. native Save-As host contract/adapter;
3. export → Save-As wiring;
4. React export UI + Tauri dialog / atomic-write host;
5. end-to-end export verification and hardening.

This closure is a documentation reconciliation of the implemented boundary. It does not authorize Gate 10 packaging or unrelated product work.

## ADR-0031 status

ADR-0031 (Autosave & Crash Recovery) is **Accepted**. Slices 1–5 are **done** on `main` (#98–#102; Slice 5 merge `d51121d`). Sequencing is closed. React recover/discard chrome remains a later, separately gated follow-up.

## Gate 10 status

ADR-0032 is **Accepted**. Slices 1–5 are **done** (PR #104–#108). `FOUNDATION-READY` is declared separately — see `docs/FOUNDATION-READY-DETERMINATION.md`.

## Phase 1 status

ADR-0033 (Book Wizard / Guided Start) is **Accepted**. Slices 1–5 are **done** on `main` (PRs #117–#121). Sequencing is closed — see `docs/adr-0033-closure-reconciliation.md`. The next Phase 1 product domain (e.g. Writing Studio) requires a separate selection/ADR authorization.

## Decision status meanings

- **PROPOSED:** suggested but not approved
- **UNDER REVIEW:** actively being evaluated
- **ACCEPTED:** approved direction
- **FROZEN:** implementation must follow unless formally changed
- **SUPERSEDED:** replaced by a later decision
- **REJECTED:** explicitly not adopted
- **DEPRECATED:** no longer recommended
