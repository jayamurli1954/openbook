# OpenBook Foundation Readiness Evidence Reconciliation

- **Status:** Evidence reconciliation / gate-determination proposal
- **Date:** 2026-09-16
- **Basis:** `main` at `8602bc89f8352c2f8e27480f734d317e621f4bba` (PR #67 merge)
- **Scope:** Current-state reconciliation of Contributor Readiness and Foundation Readiness evidence
- **Implementation authorization:** **None**

## 1. Purpose

This document reconciles the historical `docs/FOUNDATION-READINESS-REPORT.md` with the current repository state after Gates 1–8 and the Contributor Readiness governance work through ADR-0027.

It is a documentation and evidence artefact only. It does not authorize implementation, dependency installation, repository-control changes, release changes, font selection/bundling, or a new engineering slice.

The historical Foundation Readiness Report remains a useful audit record, but its conclusions must not be copied forward without accounting for subsequent work.

## 2. Current baseline

The current `main` contains the completed foundation/desktop engineering sequence recorded in `docs/IMPLEMENTATION-BACKLOG.md`, including:

- canonical Book Model;
- Semantic Document Model and desktop boundary;
- Tiptap/ProseMirror authoring surface;
- SQLite persistence boundary and Save/Open workflow;
- EPUB 3.3 generation and deterministic packaging;
- HTML publishing projection;
- Typst 0.15.1 PDF renderer selection and PDF publishing engine;
- production EPUBCheck 5.3.0 with bundled Eclipse Temurin 21 LTS `jlink` runtime packaging;
- seven-stage publishing workflow;
- import, authoring, asset-management, and Book Doctor foundations; and
- Gate 8 Desktop Studio integration across Slices 1–5.

The Gate 8 Slice 5 checkpoint recorded **231/231 automated tests passing** across the 12 monorepo packages. The implementation backlog records Gates 1–8 as complete and explicitly states that backlog entries do not themselves authorize new implementation.

Contributor governance is also materially advanced on current `main`:

- ADR-0024 — DCO 1.1 contribution sign-off — Accepted;
- ADR-0025 — Project Stewardship & Maintainer Governance — Accepted;
- ADR-0026 — Code of Conduct Governance — Accepted; and
- ADR-0027 — Security Disclosure and Vulnerability Response Governance — Accepted, with operational `SECURITY.md` implementation landed through PR #64 and closure reconciliation through PR #66.

## 3. Historical report reconciliation

### 3.1 Items superseded by later work

The historical report described several areas as pending that are now implemented and recorded in the implementation backlog and ADR index:

| Historical area | Current reconciled state |
| --- | --- |
| EPUB 3.3 engine | Implemented through Gates 1–3 |
| HTML engine | Implemented through Gate 4 |
| Production EPUBCheck packaging | Implemented through Gate 5 / ADR-0012 |
| PDF renderer selection and publishing engine | Typst 0.15.1 selected and PDF engine implemented through Gate 6 |
| Workflow foundation | Implemented through Gate 7 Slice 1 |
| Importer, authoring, assets, Book Doctor | Implemented through Gate 7 Slices 2–5 |
| Desktop Studio integration | Implemented through Gate 8 Slices 1–5 |
| Security disclosure process | Implemented through ADR-0027 / PR #64 |
| DCO, stewardship, Code of Conduct | Accepted through ADR-0024–0026 |

These historical entries must therefore not be treated as current blockers merely because the older report still contains them.

### 3.2 Items that remain relevant

The following questions remain appropriate for a final readiness determination:

1. **Current repository controls:** verify the live protection/rules configuration, especially pull-request requirement, required `test` check, review configuration, stale-review behavior, force-push restriction, branch-deletion restriction, and administrator enforcement.
2. **Fresh CI/test evidence:** establish current evidence on the present `main`, rather than relying only on the Gate 8 historical checkpoint.
3. **Dependency/release provenance:** determine whether the repository has a complete release-oriented inventory covering direct/transitive dependencies, bundled EPUBCheck/Temurin runtime components, Typst, fonts, assets, build tooling, and applicable license/provenance data.
4. **Third-party notices:** determine whether a complete `THIRD-PARTY-NOTICES.txt` and/or machine-readable inventory is required and whether the existing repository evidence is sufficient.
5. **Bundled-font policy:** determine and document the production redistribution/licensing policy before treating font bundling as closed.
6. **Cross-document consistency:** reconcile historical statements in `FOUNDATION-READINESS-REPORT.md`, `ROADMAP.md`, `PROJECT-CONTEXT.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, the ADR index, and the implementation backlog.

## 4. Evidence status matrix

| Evidence domain | Current state | Determination |
| --- | --- | --- |
| Contributor governance | ADR-0024–0027 accepted and reconciled | **Established at policy level** |
| Security disclosure | `SECURITY.md` present and operational policy implemented | **Established** |
| Project license | Apache-2.0 / ADR-0003 | **Established** |
| Architecture governance | ADR index reconciled through ADR-0027 | **Established** |
| Foundation engineering | Gates 1–8 recorded complete | **Implementation-complete at this scope** |
| Test evidence | 231/231 at Gate 8 checkpoint | **Strong historical evidence; fresh current evidence still desirable** |
| Main protection | Current `main` protection and required `test` were freshly observed | **Partially freshly verified; full control set requires confirmation** |
| Dependency inventory | No matching committed `THIRD-PARTY-NOTICES` / full inventory artefact was found in the preceding repository search | **Outstanding evidence question** |
| Bundled-font policy | Still identified as pending in the architecture decision index/readiness material | **Pending decision/evidence** |
| Cross-document reconciliation | Historical report still contains superseded pre-Gate-8 statements | **Reconciliation required** |
| `FOUNDATION-GOVERNANCE-READY` | No formal current declaration | **Not declared** |
| `FOUNDATION-READY` | No formal current declaration | **Not declared** |

## 5. Important distinction between the two foundation gates

The two readiness labels must not be collapsed into one:

### `FOUNDATION-GOVERNANCE-READY`

This is the governance/technology scorecard state. The current evidence substantially supports the contributor-governance portion, while release/dependency provenance, font policy, current-control verification, and final consistency evidence remain to be reconciled.

### `FOUNDATION-READY`

This is the stricter product/foundation gate defined by `ROADMAP.md`. Its determination must be based on the current roadmap criteria and the reconciled architecture, implementation, build, testing, licensing, and release evidence. It must not be declared merely because Gates 1–8 are complete.

## 6. Cross-document reconciliation findings

### Finding R-01 — Historical report age

`docs/FOUNDATION-READINESS-REPORT.md` is an audit record originating on 2026-09-03 and later reconciled to an earlier main state. It predates the final contributor governance sequence and later Gates 7–8 work. It should remain historically useful but should not be used as the sole current readiness scorecard.

**Disposition:** Record as historical evidence; use this reconciliation as the current evidence bridge.

### Finding R-02 — Gate 8 completion

The implementation backlog and current architecture record Gates 1–8 as complete, including publishing, validation/runtime packaging, workflow, and Desktop Studio integration.

**Disposition:** Treat these engineering slices as completed unless a later ADR explicitly reopens a boundary.

### Finding R-03 — Contributor governance closure

ADR-0024, ADR-0025, ADR-0026, and ADR-0027 establish the principal contributor-governance policy set. ADR-0027 operational security policy is on `main`.

**Disposition:** Contributor governance is substantially established; final readiness remains an evidence determination rather than an automatic consequence of ADR acceptance.

### Finding R-04 — Dependency/provenance evidence

A repository search did not identify a committed full third-party notices/dependency inventory artefact matching the readiness requirement. Existing package manifests, lockfiles, runtime pins, and ADR provenance records may provide part of the evidence, but completeness has not been established by this reconciliation.

**Disposition:** Outstanding. Determine the required release artefact and completeness before closing the evidence item. No implementation is authorized by this finding.

### Finding R-05 — Bundled fonts

Bundled-font policy remains a documented pending architecture/evidence question.

**Disposition:** Outstanding. A later policy/architecture decision is required if the final readiness gate depends on bundled production fonts.

### Finding R-06 — Repository controls

Current evidence confirms that `main` is protected and that `test` is a required status check. The available integration did not expose the complete historical protection configuration in the same verification result.

**Disposition:** Do not infer unverified settings. Perform a final control-by-control verification before declaring a readiness gate.

### Finding R-07 — Fresh CI evidence

The Gate 8 checkpoint provides 231/231 passing tests, while the current post-PR #67 merge verification did not expose a new workflow-run result through the available commit-run query.

**Disposition:** Do not interpret an absent workflow-run result as failure. Obtain a fresh current CI/test result before final gate declaration.

## 7. Readiness gate determination

### Current determination

**`FOUNDATION-GOVERNANCE-READY`: NOT YET FORMALLY DECLARED.**

**`FOUNDATION-READY`: NOT YET FORMALLY DECLARED.**

The evidence supports substantial progress and implementation completeness through Gate 8, but the remaining evidence questions are sufficient to keep both formal declarations open pending final verification.

This is not a finding that Gates 1–8 failed. It is a distinction between implementation completion and a formally evidenced project-wide readiness declaration.

### Closure criteria

A subsequent final gate record should contain explicit evidence for:

- current repository-control verification;
- fresh required CI/test result;
- dependency and third-party provenance determination;
- bundled-font policy disposition;
- cross-document reconciliation completion; and
- a clear statement of which readiness gate(s), if any, the evidence supports.

## 8. Next architecture selection

Once the readiness evidence is closed, the next engineering domain should be selected by a **separate architecture proposal and ADR**. The readiness document must not silently authorize that work.

The remaining candidate domains are:

1. **DTP / page-layout / typography** — page model, pagination, typography/style system, Indic shaping, font policy integration, print-oriented layout.
2. **Release / compliance architecture** — dependency inventory, third-party notices, bundled-runtime provenance, release reproducibility evidence, compliance artefacts.
3. **AI / Ollama architecture** — local-model boundary, Ollama integration, prompt/context handling, document transformations, privacy/local-only operation, AI orchestration.
4. **Product workflow / UX expansion** — export UX, filesystem project packages, autosave, and cloud synchronization.

The candidate list is descriptive, not a ranking. No domain is selected by this document.

## 9. Controlled next sequence

1. Complete final evidence verification against current `main`.
2. Close or explicitly record the dependency/provenance and font-policy questions.
3. Complete cross-document reconciliation.
4. Record the evidence-based readiness determination separately.
5. Select one remaining architecture domain.
6. Draft and review a dedicated ADR for that domain.
7. Obtain explicit implementation authorization separately from ADR acceptance.
8. Implement only the authorized slice through the normal Draft → Ready → CI/DCO/review → explicit merge authorization sequence.

## 10. Explicit non-authorizations

This document does **not** authorize:

- DTP/page-layout implementation;
- typography implementation or font bundling;
- AI/Ollama integration;
- release/compliance implementation;
- export UI expansion;
- filesystem project packages;
- autosave;
- cloud synchronization;
- dependency/runtime installation;
- repository permission or branch-protection changes;
- release-signing changes; or
- any new implementation PR.

## 11. Conclusion

OpenBook's foundation has progressed from the historical audit baseline to a Gate 8 implementation-complete state with a substantially established contributor-governance framework. The remaining readiness work is primarily evidence, provenance, policy, and reconciliation work.

The appropriate next architectural step is therefore **not automatic implementation**. After the readiness evidence is closed, OpenBook should choose one remaining domain and govern it through a dedicated ADR followed by separate explicit implementation authorization.
