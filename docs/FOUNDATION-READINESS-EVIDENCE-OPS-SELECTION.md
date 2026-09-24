# Foundation Readiness — Next Domain Selection: Evidence Operations

- **Status:** Selected by maintainer direction (2026-09-22); Slices 1–4 done on main (PRs #110–#113); **Slice 5 authorized** on this follow-on
- **Date:** 2026-09-24
- **Baseline:** `main` at `0c10929` (post–evidence ops Slice 4 / PR #113)
- **Prior records:** `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md`; Slice 1–4 conversations
- **Selected domain:** Foundation readiness **evidence operations** (ADR-0028 mechanisms)
- **Implementation authorization:** Slice 5 — Tauri/Cargo production crate closure inventory; no `FOUNDATION-READY`

## 1. Why this domain

The post–Gate 10 closure left `FOUNDATION-READY` undeclared primarily because production ADR-0028 evidence population remained open. Product domains (DTP, AI, Gate 11) should not displace closing that evidence path.

## 2. Slices 1–4 (done — PRs #110–#113)

1. Gate 5/6 runtime inventory/notices
2. Gate 6 Noto font OFL clearance
3. Direct production npm (desktop path)
4. npm production closure (transitive)

## 3. Slice 5 (authorized — this PR)

1. Record method in `docs/release-compliance/CARGO-PRODUCTION-INVENTORY-SLICE-5.md`.
2. Generate `docs/release-compliance/cargo-production-closure-inventory.json` from `Cargo.lock` + `cargo metadata` via `scripts/release-compliance/generate-cargo-production-closure.mjs`.
3. Update parent `evidence-inventory.json` Cargo bucket to `confirmed` (bucket redistribution `conditional` due to five standalone MPL-2.0 crates).
4. Update `THIRD-PARTY-NOTICES.md` and front-door docs.
5. Keep `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` **not declared**.

## 4. Explicit exclusions

- Declaring `FOUNDATION-READY`
- Dependency upgrades or Cargo pin changes
- Code signing / multi-OS production packaging
- Gate 11, DTP, AI, React recover chrome

## 5. Later slices (not authorized here)

- Explicit `FOUNDATION-READY` determination PR (may include formal waiver of signing/multi-OS packaging as a Phase 0 requirement, if the maintainer so decides)
