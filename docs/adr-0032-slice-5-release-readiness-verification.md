# ADR-0032 Slice 5: Release-Readiness Verification — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-22)
- **Date:** 2026-09-22
- **Parent architecture:** ADR-0032 — Gate 10 Desktop Packaging & Release Readiness Architecture
- **Scope:** Automated checks that the packaged tree contains Gate 5/6 runtimes, validation does not require network, and failure kinds remain distinct — without declaring FOUNDATION-READY
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Prove Gate 10 packaging can be **verified** as release-readiness evidence for the Windows-first packaged desktop: runtimes present, offline validation posture, distinct failure kinds. Passing verification is **not** `FOUNDATION-READY`.

## 2. Slice 5 objective

1. `verifyGate10ReleaseReadiness` under `apps/desktop/src/host/`
2. Check packaged resource root contains Gate 5/6 layouts via `locatePackagedRuntimes`
3. Check failure kinds: packaged locator uses `missing_runtime` (not conformance)
4. Scan resolve/host sources for forbidden first-run / runtime-download acquisition patterns
5. Keep `foundationReady` / `foundationGovernanceReady` always `false`
6. Optionally verify Slice 4 identity + ADR-0028 manifest remain `unresolved`
7. Overall status is at most `verified-with-limitations` (never a foundation declaration)
8. CLI: `scripts/desktop/verify-release-readiness.mjs`
9. Tests with fake resource roots (no installer / no FOUNDATION-READY claim)

## 3. Explicit exclusions

- Declaring `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY`
- Code signing, publication, SmartScreen, store submission
- Font clearance or ADR-0028 production inventory completion
- macOS/Linux production packaging claims
- Changing Gate 5/6 pins; committing binaries/installers
- React UI / Gate 11+

## 4. Acceptance criteria

- complete fake packaged root → checks pass with `foundationReady: false` and `verified-with-limitations`
- incomplete packaged root → packaged-runtimes check fails; overall `failed`
- identity claiming `foundationReady: true` → verification fails
- offline posture scan fails when sources invite runtime download
- desktop tests / CI pass; Draft PR only until explicit merge authorization
