# Contributor Readiness & Foundation Readiness Final Assessment

- **Status:** Assessment / architecture-planning proposal
- **Date:** 2026-09-16
- **Basis:** `main` after PR #66 (ADR-0027 reconciliation)
- **Scope:** Contributor Readiness, Foundation Readiness, evidence reconciliation, and next-architecture planning
- **Implementation authorization:** **None**

## 1. Purpose

This document provides a final assessment of the current Contributor Readiness and Foundation Readiness state of OpenBook and identifies the evidence and architecture work that should precede the next implementation phase.

This is a documentation and planning artefact only. It does not authorize implementation, dependency installation, repository-control changes, release changes, or any new engineering slice.

## 2. Executive assessment

OpenBook has completed the major foundation and desktop-integration engineering gates through Gate 8. The Contributor Readiness governance set is now reconciled on `main` through ADR-0024, ADR-0025, ADR-0026, and ADR-0027. ADR-0027's operational security-policy implementation landed through PR #64, and its closure reconciliation landed through PR #66.

**Assessment:** Contributor governance is substantially established, but a final `FOUNDATION-GOVERNANCE-READY` or `FOUNDATION-READY` declaration should not be made by this document alone. The remaining readiness question is evidentiary: repository controls, release/dependency provenance, bundled runtime/font policy, and cross-document consistency should be freshly verified against current `main`.

The historical `docs/FOUNDATION-READINESS-REPORT.md` should be treated as an audit record requiring reconciliation, not as the current scorecard. It predates the later DCO, stewardship, Code of Conduct, security, publishing, runtime-packaging, Gate 7, and Gate 8 work.

## 3. Contributor Readiness assessment

| Area | Assessment | Evidence / required verification |
|---|---|---|
| DCO 1.1 | **SATISFIED** | ADR-0024; repository CI/branch-protection enforcement |
| Stewardship / maintainer governance | **SATISFIED at policy level** | ADR-0025 and repository governance documentation |
| Code of Conduct | **SATISFIED at policy level** | ADR-0026 and `CODE_OF_CONDUCT.md` |
| Security disclosure / response | **SATISFIED at policy level** | ADR-0027, `SECURITY.md`, PR #64 |
| Contributor protection / attribution | **PRESENT** | `CONTRIBUTOR_PROTECTION_AND_ATTRIBUTION.md` |
| Project license | **SATISFIED** | Apache-2.0, ADR-0003, `LICENSE` |
| Contribution guidance | **PRESENT** | `CONTRIBUTING.md` |
| Architecture decision records | **RECONCILED** | ADR index through ADR-0027 |
| GitHub repository protection | **VERIFY CURRENT STATE** | Confirm live branch protection/rules and required checks |
| Fresh CI/test evidence | **VERIFY CURRENT STATE** | Run/inspect current required checks before any readiness declaration |

### Contributor Readiness conclusion

The governance documents and contribution controls are sufficiently established to support an evidence-based contributor-readiness review. The final declaration should remain separate from this proposal until current repository controls and release/compliance evidence have been verified.

## 4. Foundation engineering assessment

The implementation backlog records Gates 1–8 as complete at the foundation/desktop-integration level, including EPUB, HTML, PDF/Typst, EPUBCheck runtime packaging, workflow, import, authoring, assets, Book Doctor, and Desktop Studio integration. The Gate 8 checkpoint recorded 231/231 automated tests passing across the monorepo packages.

Current architectural state:

- Canonical Book Model remains the source of truth.
- Semantic Document Model remains an editor-independent contract.
- Tiptap/ProseMirror remains the authoring surface under ADR-0008 pins.
- SQLite remains behind the persistence boundary.
- EPUB, HTML, and PDF remain downstream publishing projections.
- EPUBCheck remains behind `ValidatorService` with the production runtime packaging decision in ADR-0012.
- Book Doctor remains a distinct validation coordinator.
- Desktop Studio integration is implementation-complete under ADR-0019 through ADR-0023.

No new architecture should reopen these boundaries without a new ADR.

## 5. Remaining Foundation Readiness evidence questions

### 5.1 Repository governance controls

Freshly verify the live `main` protection/rules configuration, including:

- pull request requirement;
- required `test` status check;
- review configuration;
- stale-review behavior;
- force-push restriction;
- branch deletion restriction; and
- administrator enforcement.

This is verification only; this proposal authorizes no change to repository controls.

### 5.2 Dependency and release provenance

Reassess whether a complete release-oriented inventory exists for:

- direct and transitive npm dependencies;
- EPUBCheck 5.3.0;
- bundled Eclipse Temurin 21 LTS runtime;
- Typst 0.15.1;
- fonts;
- third-party assets;
- build tooling; and
- applicable license/provenance information.

Determine whether `THIRD-PARTY-NOTICES.txt` and/or a machine-readable inventory are required by the project's release policy. No inventory implementation is authorized by this assessment.

### 5.3 Bundled font policy

The architecture index continues to identify bundled-font policy as a pending decision. The readiness review should distinguish between fonts already present in development fixtures/tooling and a formally approved production redistribution policy.

No font selection or bundling is authorized here.

### 5.4 Cross-document consistency

Reconcile the historical Foundation Readiness Report against current:

- `PROJECT-CONTEXT.md`;
- `PRODUCT_REQUIREMENTS.md`;
- `ROADMAP.md`;
- `ARCHITECTURE.md`;
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`;
- accepted ADRs; and
- `docs/IMPLEMENTATION-BACKLOG.md`.

Particular attention should be given to the distinction between `FOUNDATION-READY` and `FOUNDATION-GOVERNANCE-READY`, and to any statements that still describe completed work as pending.

## 6. Readiness decision matrix

| Domain | Current assessment | Final evidence needed |
|---|---|---|
| Contributor governance | Substantially established | Current repository-control verification |
| Licensing | Established | Release/dependency provenance reconciliation |
| Architecture governance | Established through ADR-0027 | Consistency audit |
| Foundation engineering | Gates 1–8 complete | Fresh current CI/test evidence |
| Security governance | Operational policy established | Verify policy discoverability and escalation evidence |
| Dependency inventory | **Needs reassessment** | Complete release-oriented inventory determination |
| Third-party notices | **Needs reassessment** | Determine completeness/requirement |
| Bundled fonts | **Pending decision/evidence** | Formal policy decision if required |
| Foundation gate declaration | **Not yet declared** | Complete evidence review |

## 7. Architecture planning — next phase

Once the readiness evidence review is complete, the next engineering area must be selected through a separate architecture proposal/ADR. No implementation should begin merely because an area is listed below.

### Candidate architecture domains

1. **DTP / page-layout / typography architecture**
   - page model;
   - pagination and layout constraints;
   - typography and style systems;
   - Indic shaping;
   - font policy integration; and
   - print-oriented layout boundaries.

2. **Contributor/release compliance architecture**
   - dependency inventory;
   - third-party notices;
   - bundled-runtime provenance;
   - release reproducibility evidence; and
   - compliance artefact boundaries.

3. **AI/Ollama architecture**
   - local-model boundary;
   - Ollama integration;
   - prompt/context handling;
   - document transformation boundaries;
   - privacy/local-only operation; and
   - AI orchestration.

AI/Ollama remains future scope and is not an MVP dependency unless a later architecture decision changes that position.

4. **Product workflow / UX expansion**
   - export UX;
   - filesystem project packages;
   - autosave; and
   - cloud synchronization.

These remain outside the currently reconciled foundation scope and require their own architecture decisions.

## 8. Proposed controlled sequence

1. Complete current-state evidence verification.
2. Reconcile the historical Foundation Readiness Report.
3. Resolve or explicitly record remaining compliance/documentation gaps.
4. Determine whether the evidence supports a `FOUNDATION-GOVERNANCE-READY` declaration.
5. Separately assess the stricter `FOUNDATION-READY` product gate.
6. Select one next architecture domain.
7. Draft and review a dedicated ADR for that domain.
8. Obtain explicit implementation authorization separately from ADR acceptance.
9. Implement only the authorized slice through the normal Draft → Ready → CI/DCO/review → explicit merge authorization sequence.

## 9. Explicit non-authorizations

This assessment does **not** authorize:

- implementation of DTP/page layout;
- typography or font bundling;
- AI/Ollama integration;
- autosave;
- cloud sync;
- filesystem project packages;
- export UI expansion;
- dependency or runtime installation;
- repository permission or branch-protection changes;
- release-signing changes; or
- any new implementation PR.

## 10. Final assessment position

OpenBook has reached a significant architectural milestone: the foundation and Gate 8 desktop integration are implemented, and the principal Contributor Readiness governance documents are accepted and reconciled.

The correct next state is **readiness evidence review followed by architecture selection**, not immediate implementation and not an automatic project-wide readiness declaration.

A later decision may formally declare a readiness gate only after the evidence in this document's verification areas has been reviewed and reconciled. Any subsequent engineering work must remain governed by a new architecture decision and explicit implementation authorization.
