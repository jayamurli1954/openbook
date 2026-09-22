# Foundation Readiness — Next Domain Selection: Evidence Operations

- **Status:** Selected by maintainer direction (2026-09-22)
- **Date:** 2026-09-22
- **Baseline:** `main` at `359b046` (post–Gate 10 closure PR #109)
- **Prior record:** `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md`
- **Selected domain:** Foundation readiness **evidence operations** (ADR-0028 mechanisms)
- **Implementation authorization:** Slice 1 only (this follow-on PR) — populate inventory/notices from existing Gate 5/6 pins; fonts remain unresolved; no `FOUNDATION-READY`

## 1. Why this domain

The post–Gate 10 closure left `FOUNDATION-READY` undeclared primarily because production ADR-0028 evidence population and font-by-font clearance remain open. Product domains (DTP, AI, Gate 11) should not displace closing that evidence path.

## 2. Slice 1 (authorized)

1. Select evidence ops as the controlled next path (this record).
2. Populate `docs/release-compliance/evidence-inventory.json` from authoritative Gate 5/6 packaging inventories and package notices:
   - EPUBCheck 5.3.0 — `confirmed` shipped-runtime (windows-x64 Gate 10 focus noted)
   - Eclipse Temurin 21 (`jdk-21.0.12.1+1`) windows-x64 pin — `confirmed` shipped-runtime
   - Typst 0.15.1 windows-x64 pin — `confirmed` shipped-runtime
   - Gate 6 bundled fonts — entries present with integrity + OFL claim from packaging inventory, but **`status: unresolved`** / redistribution **`unresolved`** until release-clearance disposition is separately completed
3. Update `docs/release-compliance/THIRD-PARTY-NOTICES.md` to reference those confirmed runtime notices without asserting font clearance.
4. Keep `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` **not declared**.

## 3. Explicit exclusions

- Declaring `FOUNDATION-READY`
- Font acquisition or changing Gate 5/6 pins
- Code signing / multi-OS production packaging
- Gate 11, DTP, AI, React recover chrome
- Asserting production inventory “complete”

## 4. Later slices (not authorized here)

- Font-by-font release-clearance dispositions (or formal waivers)
- Broader dependency inventory beyond Gate 5/6 shipped runtimes
- Explicit `FOUNDATION-READY` determination PR when evidence warrants
