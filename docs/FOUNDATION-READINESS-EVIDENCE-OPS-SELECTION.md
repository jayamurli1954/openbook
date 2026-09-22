# Foundation Readiness — Next Domain Selection: Evidence Operations

- **Status:** Selected by maintainer direction (2026-09-22); Slice 1 done on main (PR #110); **Slice 2 authorized** on this follow-on
- **Date:** 2026-09-22
- **Baseline:** `main` at `50b2173` (post–evidence ops Slice 1 / PR #110)
- **Prior records:** `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md`; Slice 1 conversation
- **Selected domain:** Foundation readiness **evidence operations** (ADR-0028 mechanisms)
- **Implementation authorization:** Slice 2 — Gate 6 font-by-font OFL clearance dispositions; no `FOUNDATION-READY`

## 1. Why this domain

The post–Gate 10 closure left `FOUNDATION-READY` undeclared primarily because production ADR-0028 evidence population and font-by-font clearance remain open. Product domains (DTP, AI, Gate 11) should not displace closing that evidence path.

## 2. Slice 1 (done — PR #110)

1. Select evidence ops as the controlled next path (this record).
2. Populate `docs/release-compliance/evidence-inventory.json` from authoritative Gate 5/6 packaging inventories and package notices:
   - EPUBCheck 5.3.0 — `confirmed` shipped-runtime (windows-x64 Gate 10 focus noted)
   - Eclipse Temurin 21 (`jdk-21.0.12.1+1`) windows-x64 pin — `confirmed` shipped-runtime
   - Typst 0.15.1 windows-x64 pin — `confirmed` shipped-runtime
   - Gate 6 bundled fonts — entries present with integrity + OFL claim from packaging inventory, initially **`status: unresolved`**
3. Update `docs/release-compliance/THIRD-PARTY-NOTICES.md` to reference those confirmed runtime notices without asserting font clearance.
4. Keep `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` **not declared**.

## 3. Slice 2 (authorized — this PR)

1. Record font-by-font release-clearance dispositions for the four Gate 6 Noto fonts in `docs/release-compliance/FONT-CLEARANCE-DISPOSITIONS.md`, using upstream `google/fonts` `OFL.txt` (SIL OFL 1.1) plus Gate 6 inventory SHA-256 pins.
2. Update `evidence-inventory.json` so those four fonts are `status: confirmed` with `redistribution: conditional`.
3. Update `THIRD-PARTY-NOTICES.md` to reflect confirmed / conditional font clearance and OFL shipping conditions.
4. Reconcile front-door / conversation docs.
5. Keep `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` **not declared**.

## 4. Explicit exclusions

- Declaring `FOUNDATION-READY`
- Font acquisition or changing Gate 5/6 pins
- Code signing / multi-OS production packaging
- Gate 11, DTP, AI, React recover chrome
- Asserting production inventory “complete” (npm tree still deferred)

## 5. Later slices (not authorized here)

- Broader dependency inventory beyond Gate 5/6 shipped runtimes and Gate 6 fonts
- Explicit `FOUNDATION-READY` determination PR when evidence warrants
