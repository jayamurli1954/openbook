# OpenBook Architecture & Decision Index

- **Status:** Active
- **Last updated:** 2026-09-03

This index is the navigation point for durable OpenBook decisions. Individual ADRs remain authoritative for their specific subjects.

| ID | Decision | Status | Area | Date |
|---|---|---|---|---|
| ADR-0003 | Apache-2.0 license and contributor protection | Accepted | Licensing / Governance | 2026-09-03 |
| ADR-0004 | Publishing engine technology architecture | Accepted direction; renderer bake-off pending | Publishing / Architecture | 2026-09-03 |
| ADR-0005 | EPUBCheck bundling, Java runtime isolation and compliance | Proposed for formal ADR | EPUB / Runtime / Compliance | 2026-09-03 |

## Governance

The project follows `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`.

Important conversations are captured under `docs/conversations/` and durable decisions are promoted into ADRs or other authoritative project documents.

## Pending decisions

- Final PDF renderer after Typst/pdf-lib/Chromium bake-off
- Exact EPUBCheck 5.3.0 runtime packaging strategy
- Exact Temurin runtime version and supported platforms
- Bundled-font policy
- Contributor agreement mechanism
- Final Tauri/editor dependency versions

## Decision status meanings

- **PROPOSED:** suggested but not approved
- **UNDER REVIEW:** actively being evaluated
- **ACCEPTED:** approved direction
- **FROZEN:** implementation must follow unless formally changed
- **SUPERSEDED:** replaced by a later decision
- **REJECTED:** explicitly not adopted
- **DEPRECATED:** no longer recommended
