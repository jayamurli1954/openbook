# Conversation Record — Gate 10 packaging / release readiness

- **Conversation ID:** CONV-2026-09-22-001
- **Date:** 2026-09-22
- **Topic:** Start Gate 10 as a separately gated architecture unit after ADR-0031 Slices 1–5
- **Status:** Recorded (architecture proposal only; no implementation authorization)

## Context

ADR-0031 Slices 1–5 are merged on `main` (`d51121d`, PR #102). Maintainer direction selected the next separately gated unit: Gate 10 packaging/release readiness. ChatGPT oversight remains in force (Draft PRs until explicit `I authorize merge PR #XX`).

The ChatGPT master execution outline (2026-09-18) already described Gate 10 as desktop packaging: application + Tauri host + native filesystem integration + EPUBCheck runtime + required assets, with Windows packaging, private Java, checksums, runtime discovery, failure reporting, no network for validation, and no user-installed Java. Gate 5 remains authoritative.

## Key discussion points

- Gate 5/6 runtimes already build under `.cache/` for developer/CI use. A packaged Tauri app cannot rely on a repository root.
- ADR-0028 evidence mechanisms exist but do not ship an installer or populate production inventory.
- macOS/Linux remain Packaging Analysis Only until native CI evidence (ADR-0012 / EPUBCheck spike).
- Font-by-font redistribution clearance remains evidence-dependent (ADR-0028 Slice 3). Bundling Gate 6 OFL renderer fonts must not be treated as release clearance.
- Gates 11–16 (security, determinism, conformance wrap-up, full integration, docs reconciliation, release candidate) stay later and separately gated.

## Decisions reached

1. Gate 10 begins as **ADR-0032** (Proposed): desktop packaging / release-readiness architecture.
2. First production packaging target is **Windows x64**.
3. Implementation remains sliced and unauthorized until the ADR is accepted and each slice is separately authorized.
4. Unrelated work (React recover chrome, cloud, DTP, AI, removing SQLite, Gate 11+) stays out of this unit.

## Open questions

- Installer family for the Windows slice (NSIS vs MSI vs other Tauri target) — deferred to an implementation slice after ADR acceptance.
- Whether launch-time re-hash of the shipped `jlink` image is required, or packaging-time verification plus recorded identity is sufficient.

## Action items

- Propose ADR-0032 in the repository.
- Reconcile the architecture index and implementation backlog (ADR-0031 Slices 1–5 complete; Gate 10 Proposed).
- Do not implement bundle wiring, installers, or binary commits in this unit.

## Related documents

- `docs/adr/0032-gate-10-desktop-packaging-release-readiness-architecture.md`
- `docs/adr/0012-production-epubcheck-runtime-packaging.md`
- `docs/adr/0013-pdf-publishing-engine-architecture.md`
- `docs/adr/0028-release-compliance-architecture.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- `docs/IMPLEMENTATION-BACKLOG.md`
