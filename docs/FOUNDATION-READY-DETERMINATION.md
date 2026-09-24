# OpenBook — FOUNDATION-READY Determination

- **Status:** **Declared** — ROADMAP Phase 0 gate `FOUNDATION-READY`
- **Date:** 2026-09-24
- **Baseline:** `main` at `13ba691` (post–evidence ops Slice 5 / PR #114)
- **Authority:** ROADMAP.md Phase 0 Acceptance Gate; maintainer-directed determination after evidence ops Slices 1–5
- **Prior records:** `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md`; `docs/FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`
- **Implementation authorization:** Documentation / governance determination only — no dependency, packaging, or product-slice code changes

## 1. Purpose

Formally determine whether OpenBook has satisfied ROADMAP Phase 0 and may declare **`FOUNDATION-READY`**.

This record is the **sole authoritative declaration** of that gate. Gate 10 packaging verification artifacts continue to keep `foundationReady: false` so a packaging report never substitutes for this governance determination (ADR-0032 / Gate 10 Slice 5 design).

## 2. Evidence closed before this determination

| Area | Evidence |
|---|---|
| Engineering Gates 1–10 | Done on `main` (ADRs through ADR-0032) |
| Required product capabilities (export, package, autosave, packaging) | Done |
| Contributor governance (ADR-0024–0027) | Established on `main` |
| ADR-0028 mechanisms | Done (PRs #73–#77) |
| Evidence ops Slice 1 | Gate 5/6 runtime inventory — PR #110 |
| Evidence ops Slice 2 | Gate 6 font OFL clearance — PR #111 |
| Evidence ops Slice 3 | Direct production npm — PR #112 |
| Evidence ops Slice 4 | npm production closure — PR #113 |
| Evidence ops Slice 5 | Tauri/Cargo crate closure — PR #114 |

## 3. ROADMAP Phase 0 criteria — determination

| Criterion | Determination |
|---|---|
| Product vision documented | **Met** — `PROJECT_VISION.md` |
| Requirements documented | **Met** — `PRODUCT_REQUIREMENTS.md` |
| Architecture documented | **Met** — `ARCHITECTURE.md` + ADRs through ADR-0032 |
| FOSS strategy documented | **Met** — `FOSS_STRATEGY.md` |
| Licensing policy documented | **Met** — `LICENSING_POLICY.md` / Apache-2.0 |
| Book Model canonical | **Met** — ADR-0006 |
| Dependency decisions have a documented process | **Met** — ADR-0028 + populated Windows-first production evidence (Slices 1–5) |
| Automated testing can run in CI | **Met** — required `test` + Gate 5/6 runtime jobs |
| Application can be built reproducibly by a new contributor | **Met for Phase 0** — documented contributor/CI path; Windows-first Gate 10 packaging architecture and pins exist. See §4 waiver for signing/multi-OS. |
| No major architectural contradiction | **Met** within documented Gate/ADR limits |

## 4. Formal position: signing / multi-OS packaging

**Not required for Phase 0 `FOUNDATION-READY`.**

Code signing, SmartScreen reputation, notarization, store submission, and production-supported macOS/Linux packaging remain **post–Phase 0 release/distribution hardening**. They are tracked as future/optional work and must not block the Phase 0 gate.

This is an explicit waiver of treating signed multi-platform production certification as a Phase 0 acceptance criterion. It does **not** claim that signed multi-OS releases currently exist.

## 5. Determination

### `FOUNDATION-READY`

**Declared.**

ROADMAP Phase 0 Acceptance Gate is satisfied on the baseline above, subject to the signing/multi-OS position in §4 and the continuing separation that Gate 10 packaging reports do not themselves assert this gate.

### `FOUNDATION-GOVERNANCE-READY`

**Declared** for contributor-governance readiness on the same baseline (ADR-0024 DCO, ADR-0025 stewardship, ADR-0026 Code of Conduct, ADR-0027 security disclosure; DCO workflow + branch protection observed). This does not expand product scope.

## 6. What this does **not** authorize

- Starting Phase 1 MVP product work without normal ADR/slice authorization
- Dependency upgrades, font/runtime pin changes, or Cargo/npm lock churn
- Code signing, notarization, or multi-OS production packaging implementation
- Claiming a production-certified signed release exists
- Changing Gate 10 verification to emit `foundationReady: true` in packaging artifacts (those stay false by design)

## 7. Front-door linkage

After merge, the current readiness snapshot is this determination. The post–Gate 10 closure remains historical bridge context and is superseded for the Phase 0 gate outcome.
