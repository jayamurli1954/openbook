# ADR-0033 Slice 5: Guided-Start Hardening — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-24); implementation in progress
- **Date:** 2026-09-24
- **Parent architecture:** ADR-0033 — Phase 1 Book Wizard / Guided Start Architecture
- **Scope:** Failure UX + empty-state copy + English/Kannada round-trip tests through the host boundary
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Close Phase 1 guided-start hardening: authors see plain-language failures and empty states, and EN/KN metadata survives New Book / Import / Open Recent / Continue through the existing host + coordinator path.

## 2. Slice 5 objective

1. `guidedStartUx` — structured failure/success/empty copy (unit-tested)
2. Wizard uses status kind (`idle` / `ok` / `error` / `busy`) + UX helpers
3. Hardening e2e: EN+KN New Book, KN markdown import, package open/recent/continue with KN path names
4. Validation remains fail-closed (no silent project substitution)
5. Mark ADR-0033 Slices 1–5 complete on acceptance

## 3. Explicit exclusions

- Native folder/file dialogs
- Tauri app-data recent-file adapter (JSON shape already ready from Slice 4)
- AI outline generation
- Changes to Gate 10 packaging `foundationReady`
- Broader Writing Studio chrome beyond guided-start landing

## 4. Acceptance criteria

- UX copy maps host error codes without AI dependency
- EN and KN titles/paths survive host round-trips
- desktop `npm test` / `tsc` / CI pass
- diff stays within Slice 5
