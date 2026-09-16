# OpenBook Foundation Readiness Closure & Next Architecture Selection

- **Status:** Evidence closure verification and architecture-selection record
- **Date:** 2026-09-16
- **Baseline:** `main` after PR #68 merge, commit `13b1567f5ed11768f27abe512cbd02d9c162de98`
- **Scope:** Foundation readiness evidence closure and selection of the next architecture domain
- **Implementation authorization:** **None**

## 1. Purpose

This record closes the evidence-reconciliation step initiated by `FOUNDATION-READINESS-EVIDENCE-RECONCILIATION.md` and records the controlled selection of the next architecture domain.

It is a governance and evidence document only. It does not authorize implementation, dependency installation, repository-control changes, release changes, font bundling, or a new engineering slice.

## 2. Verification performed

### 2.1 PR #68 merge

PR #68 was reviewed and merged by squash after explicit authorization.

- PR: #68
- Head reviewed: `4920a25c48c032c4a0082566e149c6278a469922`
- Merge commit: `13b1567f5ed11768f27abe512cbd02d9c162de98`
- Changed scope: one documentation file
- Merge result: successful

### 2.2 CI and DCO evidence

The PR head completed successfully through the available pull-request workflows:

- DCO: success
- CI: success
- required `test`: success
- Gate 5 validator runtime (linux-x64): success
- Gate 6 PDF Typst runtime (linux-x64): success

The `test` job completed `npm ci`, `npm test`, Book Model build, and Desktop build successfully.

The available workflow-run query for the squash merge commit returned no separate post-merge run. This is not treated as a failure; the successful PR-head checks remain the directly observed CI evidence for the merged change.

### 2.3 Repository controls

Current evidence confirms that `main` is protected and that `test` is a required status check. The available GitHub integration could not expose the full branch-protection configuration because the branch-protection endpoint returned HTTP 403.

Therefore the following controls are **not independently re-verified by this record**: complete review configuration, stale-review dismissal, force-push restriction, branch-deletion restriction, and administrator enforcement.

No inference is made about controls that could not be read.

### 2.4 Dependency and third-party provenance

The preceding repository search did not identify a committed complete `THIRD-PARTY-NOTICES` / dependency inventory artifact. Existing package manifests, lockfiles, runtime pins, and ADR provenance provide partial evidence, but completeness of a release-oriented inventory has not been established.

This remains an evidence/compliance gap and is carried forward into the selected architecture domain.

### 2.5 Bundled-font policy

The architecture index and readiness reconciliation continue to identify bundled-font redistribution/licensing policy as unresolved.

This is carried forward as an explicit release/compliance architecture concern rather than silently treated as closed.

### 2.6 Cross-document consistency

The architecture index records Gates 1–8 as implementation-complete and ADR-0024 through ADR-0027 as accepted. The historical foundation report remains an audit record and contains older pre-Gate-8 statements. The reconciliation document is the current bridge between that historical record and the present state.

A future documentation pass may update historical wording where appropriate, but no contradiction has been identified that requires reopening completed Gates 1–8.

## 3. Foundation gate determination

### `FOUNDATION-GOVERNANCE-READY`

**Not formally declared by this record.**

The contributor-governance policy set is substantially established, but complete repository-control verification and release/dependency/font evidence are not fully observable or closed.

### `FOUNDATION-READY`

**Not formally declared by this record.**

The roadmap gate requires current evidence for architecture, licensing, dependency decision process, CI testing, reproducible contributor build, and absence of major architectural contradiction. The current evidence strongly supports the engineering and governance portions, but the release/provenance and policy questions above remain open.

This distinction is intentional: Gates 1–8 being implementation-complete does not automatically equal a project-wide Foundation Ready declaration.

## 4. Closure outcome

The evidence-reconciliation work is **closed as an audit/reconciliation activity**, with the following open evidence items explicitly carried forward:

1. Full branch-protection control verification requires access to the complete protection configuration.
2. Release-oriented dependency/third-party provenance completeness remains to be established.
3. Bundled-font redistribution/licensing policy remains to be decided and documented.

These are not implementation failures. They are evidence/policy items that must be handled through the appropriate governance path.

## 5. Next architecture domain selection

The remaining candidate domains identified by the reconciliation record were:

- DTP / page-layout / typography;
- release / compliance;
- AI / Ollama; and
- product workflow / UX expansion.

### Selected domain: **Release / Compliance Architecture**

The selection is based on the current evidence state, not on product-feature preference. Release/compliance architecture directly addresses the outstanding foundation evidence questions: dependency and third-party provenance, bundled runtime provenance, bundled-font licensing/redistribution policy, release reproducibility evidence, and compliance artifacts.

Selecting this domain does **not** authorize implementation. It authorizes preparation and review of a dedicated architecture decision.

## 6. Proposed ADR scope

The next ADR will define a release/compliance architecture covering, at minimum:

- authoritative dependency and third-party provenance inventory;
- direct and transitive dependency recording strategy;
- bundled EPUBCheck/Temurin runtime provenance and checksums;
- Typst runtime and font provenance;
- third-party notices and license attribution strategy;
- bundled-font policy and redistribution boundaries;
- reproducible release evidence and provenance records;
- release artifact manifest expectations;
- separation between source/development dependencies and shipped runtime components;
- security/compliance evidence retention; and
- boundaries preventing the release/compliance layer from silently changing application architecture.

The ADR will explicitly distinguish **policy/architecture decisions** from **implementation work**.

## 7. Controlled sequence from here

1. Review this closure/selection record.
2. Draft ADR-0028 — Release & Compliance Architecture.
3. Review ADR-0028 and reconcile it with ADR-0002, ADR-0003, ADR-0012, ADR-0013, ADR-0027, `ROADMAP.md`, and the foundation evidence records.
4. Obtain explicit authorization to mark the ADR Ready, if appropriate.
5. Accept the ADR only after review.
6. Separately obtain explicit implementation authorization for any resulting engineering slice.
7. Implement only the authorized slice through the normal PR, CI, DCO, review, and explicit merge-authorization sequence.

## 8. Non-authorizations

This record does **not** authorize:

- dependency installation or upgrades;
- creation of a dependency inventory as a release implementation artifact;
- font selection, acquisition, bundling, or redistribution;
- release signing;
- CI/repository-control changes;
- DTP implementation;
- AI/Ollama integration;
- export UX implementation;
- filesystem project packages;
- autosave or cloud synchronization; or
- any implementation PR.

## 9. Conclusion

OpenBook is at a Gate 8 implementation-complete baseline with contributor governance substantially established. The foundation evidence reconciliation is now recorded as closed with three explicitly carried-forward evidence/policy items.

The next architectural decision is therefore **Release / Compliance Architecture**, to be governed by ADR-0028. No implementation follows from this selection until separately authorized.
