# ADR-0028 Release & Compliance Architecture — Closure & Reconciliation

- **Status:** Implementation-complete; closure/reconciliation record
- **Date:** 2026-09-16
- **Baseline:** `main` after ADR-0028 Slice 5 merge `8de6969068768cdb55029e720aebad53a50a04a1`
- **Authority:** ADR-0028 — Release & Compliance Architecture
- **Implementation authorization:** Completed for the five approved ADR-0028 slices; no further implementation is authorized by this record

## 1. Purpose

This record reconciles the implementation of ADR-0028 against the accepted architecture and records the remaining release/compliance evidence limitations.

It is a governance and evidence record. It does not declare a production release compliant, does not populate a production dependency inventory, and does not declare `FOUNDATION-READY` or `FOUNDATION-GOVERNANCE-READY`.

## 2. Architecture reconciliation

ADR-0028 establishes a release/compliance evidence layer separate from the canonical Book Model, application domain logic, and publishing engines. The accepted decision requires five reviewable implementation areas: inventory/evidence model, third-party notice maintenance, font provenance policy, release artifact manifest/evidence capture, and reproducibility/compliance verification.

All five areas are now represented on `main`:

| Slice | Implementation | Result |
|---|---|---|
| 1 | Release Evidence Inventory Model | Complete — PR #73, merge `9d219d1fe2c51543c147ba0d1cd9add99c1f2a42` |
| 2 | Third-Party Notice & Provenance Maintenance | Complete — PR #74, merge `f5249dadf82fe2c5e7d27a9a872a94a650db3fa0` |
| 3 | Font Provenance & Redistribution Policy | Complete — PR #75, merge `4f612348eb02b4c86e128bf53a6cfeb285bd330d` |
| 4 | Release Artifact Manifest & Evidence Capture | Complete — PR #76, merge `e22e06ceecb80ae6023f02337cd4cc3226f8a29c` |
| 5 | Reproducibility & Compliance Verification | Complete — PR #77, merge `8de6969068768cdb55029e720aebad53a50a04a1` |

The five slices preserve the accepted architecture boundary: evidence records and verification metadata do not become a competing application or publishing source of truth.

## 3. Evidence-layer reconciliation

### Slice 1 — inventory contract

The machine-readable evidence inventory provides classifications for source, development, build, test, shipped-runtime, and shipped-asset evidence, with explicit `confirmed`, `unresolved`, and `not-applicable` states. The production inventory template remains intentionally empty as a blank form. A separately maintained production inventory at `docs/release-compliance/evidence-inventory.json` is populated under foundation readiness evidence ops Slices 1–5 (Gate 5/6 runtimes, Gate 6 fonts, desktop-path npm production closure, Tauri/Cargo crate closure); FOUNDATION-READY is not declared.

### Slice 2 — third-party notices

The human-readable third-party notice mechanism is established and explicitly remains a maintenance surface rather than a replacement for package manifests, lockfiles, runtime provenance, or the evidence inventory. Production notice population for Gate 5/6 runtimes, Gate 6 fonts, the desktop-path npm production closure, and the Tauri/Cargo crate closure is recorded under evidence ops.

### Slice 3 — fonts

The font policy requires authoritative provenance, licensing basis, redistribution disposition, attribution/notice obligations, integrity evidence, and artifact scope before a bundled font is treated as release-ready. Unresolved font evidence remains unresolved. Gate 6's four pinned Noto fonts have dispositions recorded in `FONT-CLEARANCE-DISPOSITIONS.md` (evidence ops Slice 2).

### Slice 4 — artifact manifest

The artifact manifest records release-oriented artifact identity, provenance, integrity, validation, notice, and font-evidence relationships. Its template is intentionally unpopulated, and it does not claim that a production release artifact currently exists or is fully evidenced.

### Slice 5 — verification

The verification mechanism defines `verified`, `verified-with-limitations`, `unresolved`, and `failed` outcomes. It explicitly prohibits promoting missing or unresolved evidence to verified status by inference and requires environmental limitations to remain visible.

## 4. CI and DCO evidence

PR #77 completed successfully through the observed pull-request workflows before merge:

- DCO: success.
- CI: success.
- required `test`: success.
- Gate 5 validator runtime (linux-x64): success.
- Gate 6 PDF Typst runtime (linux-x64): success.

The CI `test` job completed `npm ci`, `npm test`, the Book Model build, and the Desktop build successfully. Gate 5 and Gate 6 runtime jobs also completed successfully.

This is evidence for the merged implementation PR; it is not a production release certification.

## 5. Remaining evidence and policy limitations

The implementation closes the architecture-defined evidence mechanisms, but it does not resolve every underlying release/compliance question.

The following remain explicitly open unless and until authoritative evidence is collected:

1. **Production dependency/third-party inventory completeness.** The inventory and notice mechanisms exist, but the repository does not claim that a complete production-populated inventory has been established by these slices.
2. **Bundled-font disposition.** The font policy is established, but font-by-font redistribution clearance remains dependent on authoritative evidence.
3. **Full repository-control verification.** Earlier foundation reconciliation could not independently read the complete branch-protection configuration because the available GitHub integration returned HTTP 403 for the branch-protection endpoint. No unavailable control is inferred as present or absent by this record.
4. **Exact reproducibility.** Slice 5 provides a verification framework but does not make a byte-for-byte reproducibility claim where environmental evidence is insufficient.

These are evidence/policy limitations, not failures of the ADR-0028 implementation slices.

## 6. Relationship to Foundation Readiness

ADR-0028 completion does not change the earlier Foundation Readiness determination. The project may have an implementation-complete Gate 1–8 foundation and a substantially established contributor-governance set while still carrying release/compliance evidence limitations.

Accordingly, this record does **not** declare:

- `FOUNDATION-READY`;
- `FOUNDATION-GOVERNANCE-READY`; or
- a project-wide release/compliance certification.

## 7. Backlog reconciliation note

The implementation backlog remains a planning artifact and must not be interpreted as authorization by itself. ADR-0028's five implementation slices are complete on `main` and should be treated as completed release/compliance foundation work when the backlog is next reconciled.

The historical Gate 8 merge reference in the backlog predates ADR-0028 and remains a historical checkpoint; it is not a statement that Gate 8 was reopened or changed by this work.

Remaining future areas continue to require their own architecture decisions and explicit authorization, including DTP/typography, AI/Ollama, autosave, cloud synchronization, filesystem project packages, and export/product UX expansion.

## 8. Closure determination

**ADR-0028 implementation is closed as an implementation/reconciliation activity.**

The accepted architecture has been implemented through five reviewable slices, each preserving the required separation between release/compliance evidence and application/publishing semantics.

The remaining open evidence items are intentionally carried forward rather than represented as resolved. Any future work that populates release evidence, changes repository controls, acquires or redistributes fonts, modifies runtimes, automates releases, or introduces new architecture requires its own explicit authorization under the project's normal governance sequence.
