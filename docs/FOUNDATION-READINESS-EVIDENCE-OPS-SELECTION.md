# Foundation Readiness — Next Domain Selection: Evidence Operations

- **Status:** Selected by maintainer direction (2026-09-22); Slices 1–2 done on main (PRs #110–#111); **Slice 3 authorized** on this follow-on
- **Date:** 2026-09-23
- **Baseline:** `main` at `657fe7b` (post–evidence ops Slice 2 / PR #111)
- **Prior records:** `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md`; Slice 1–2 conversations
- **Selected domain:** Foundation readiness **evidence operations** (ADR-0028 mechanisms)
- **Implementation authorization:** Slice 3 — direct production npm inventory for the desktop shipping path; no `FOUNDATION-READY`

## 1. Why this domain

The post–Gate 10 closure left `FOUNDATION-READY` undeclared primarily because production ADR-0028 evidence population remained open. Product domains (DTP, AI, Gate 11) should not displace closing that evidence path.

## 2. Slice 1 (done — PR #110)

Populate Gate 5/6 runtime inventory/notices from packaging pins; fonts initially unresolved; no `FOUNDATION-READY`.

## 3. Slice 2 (done — PR #111)

Gate 6 four Noto fonts → `confirmed` / `conditional` OFL; dispositions in `FONT-CLEARANCE-DISPOSITIONS.md`; no `FOUNDATION-READY`.

## 4. Slice 3 (authorized — this PR)

1. Record method/scope in `docs/release-compliance/NPM-PRODUCTION-INVENTORY-SLICE-3.md`.
2. Add inventory + notice entries for **direct** third-party production npm deps on the desktop path (`react` / TipTap / Tauri JS plugins / `fflate` / `markdown-it`), using `package-lock.json` integrity and published LICENSE files.
3. Classify desktop build/dev toolchain as build-only (`redistribution: not-applicable`).
4. Leave **transitive npm** and **Cargo/Rust crates** explicitly `unresolved`.
5. Reconcile front-door / conversation docs.
6. Keep `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` **not declared**.

## 5. Explicit exclusions

- Declaring `FOUNDATION-READY`
- Dependency upgrades or pin changes
- Full transitive npm enumeration
- Cargo crate inventory
- Code signing / multi-OS production packaging
- Gate 11, DTP, AI, React recover chrome
- Asserting production inventory “complete”

## 6. Later slices (not authorized here)

- Transitive npm production dependency enumeration (or formal waiver)
- Tauri/Cargo crate inventory
- Explicit `FOUNDATION-READY` determination PR when evidence warrants
