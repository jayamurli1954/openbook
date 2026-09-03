# OpenBook Architecture & Decision Index

- **Status:** Active
- **Last updated:** 2026-09-03

This index is the navigation point for durable OpenBook decisions. Individual ADRs remain authoritative for their specific subjects.

Numbering: files are `docs/adr/NNNN-slug.md`. **ADR-0001 was never issued on `main`.** Do not reuse 0001. A parallel branch/PR used `docs/adr/0001` for a Book Model skeleton; that file is not canonical here.

| ID | Decision | Status | Area | Date |
|---|---|---|---|---|
| ADR-0001 | *(not issued on `main`)* | — | Process | — |
| ADR-0002 | Third-party reference and licensing boundary | Accepted | Licensing / Documentation | 2026-09-03 |
| ADR-0003 | Apache-2.0 license and contributor protection | Accepted | Licensing / Governance | 2026-09-03 |
| ADR-0004 | Publishing engine technology architecture | Accepted direction; renderer bake-off pending | Publishing / Architecture | 2026-09-03 |
| ADR-0005 | EPUBCheck bundling, Java runtime isolation and compliance | Accepted; runtime version/`jlink` not Frozen | EPUB / Runtime / Compliance | 2026-09-03 |
| ADR-0006 | Book Model executable specification and tests (no UI) | Accepted | Book Model / Foundation | 2026-09-03 |

**Accepted is not Frozen.** Frozen means implementation must follow that decision unless a new ADR replaces it. Preferred stacks (Tauri, Tiptap, Typst-as-candidate) are Accepted directions or evaluation candidates until a later ADR freezes versions or winners.

## Governance

The project follows `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`.

Important conversations are captured under `docs/conversations/` and durable decisions are promoted into ADRs or other authoritative project documents.

See also `docs/FOUNDATION-READINESS-REPORT.md` and `docs/IMPLEMENTATION-BACKLOG.md`.

## Pending decisions

- Final PDF renderer after Typst/pdf-lib/Chromium bake-off
- Exact Temurin (or other OpenJDK) version, architectures, and whether `jlink` is used (strategy is Accepted in ADR-0005)
- Bundled-font policy
- Contributor agreement mechanism (CLA/DCO)
- Final Tauri/editor dependency versions
- Whether `FOUNDATION-GOVERNANCE-READY` / `ROADMAP.md` `FOUNDATION-READY` can be declared (audit: **not passed**)
- ~~How to merge or renumber the unmerged Book Model work on PR #1~~ — resolved by ADR-0006: reused, reconciled, and landed as `@openbook/book-model` (PR #1's `docs/adr/0001` not used; 0001 stays reserved)

## Decision status meanings

- **PROPOSED:** suggested but not approved
- **UNDER REVIEW:** actively being evaluated
- **ACCEPTED:** approved direction
- **FROZEN:** implementation must follow unless formally changed
- **SUPERSEDED:** replaced by a later decision
- **REJECTED:** explicitly not adopted
- **DEPRECATED:** no longer recommended
