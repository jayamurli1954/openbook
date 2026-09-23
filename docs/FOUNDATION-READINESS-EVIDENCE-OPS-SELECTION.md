# Foundation Readiness — Next Domain Selection: Evidence Operations

- **Status:** Selected by maintainer direction (2026-09-22); Slices 1–2 done on main (PRs #110–#111); Slice 3 Draft PR #112; **Slice 4 authorized** on this follow-on (stacks on Slice 3)
- **Date:** 2026-09-23
- **Baseline:** Slice 3 branch tip (post–`919ff36`); main at `657fe7b` until #112 merges
- **Prior records:** `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md`; Slice 1–3 conversations
- **Selected domain:** Foundation readiness **evidence operations** (ADR-0028 mechanisms)
- **Implementation authorization:** Slice 4 — transitive npm production closure inventory; no `FOUNDATION-READY`

## 1. Why this domain

The post–Gate 10 closure left `FOUNDATION-READY` undeclared primarily because production ADR-0028 evidence population remained open. Product domains (DTP, AI, Gate 11) should not displace closing that evidence path.

## 2. Slice 1 (done — PR #110)

Gate 5/6 runtime inventory/notices; fonts initially unresolved; no `FOUNDATION-READY`.

## 3. Slice 2 (done — PR #111)

Gate 6 four Noto fonts → `confirmed` / `conditional` OFL; no `FOUNDATION-READY`.

## 4. Slice 3 (Draft PR #112)

Direct production npm deps for the desktop path; build/dev classified not redistributed; transitive npm and Cargo left unresolved; no `FOUNDATION-READY`.

## 5. Slice 4 (authorized — this PR)

1. Record method in `docs/release-compliance/NPM-TRANSITIVE-PRODUCTION-INVENTORY-SLICE-4.md`.
2. Generate `docs/release-compliance/npm-production-closure-inventory.json` (62 packages: 12 direct + 50 transitive) via `scripts/release-compliance/generate-npm-production-closure.mjs`.
3. Update parent `evidence-inventory.json` transitive bucket to `confirmed` (bucket redistribution `conditional` due to `argparse@2.0.1` Python-2.0).
4. Update `THIRD-PARTY-NOTICES.md` and front-door docs.
5. Leave **Cargo/Rust crates** explicitly `unresolved`.
6. Keep `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` **not declared**.

## 6. Explicit exclusions

- Declaring `FOUNDATION-READY`
- Dependency upgrades or pin changes
- Cargo crate inventory
- Code signing / multi-OS production packaging
- Gate 11, DTP, AI, React recover chrome

## 7. Later slices (not authorized here)

- Tauri/Cargo crate inventory (or formal waiver)
- Explicit `FOUNDATION-READY` determination PR when evidence warrants
