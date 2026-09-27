# Conversation Record — Structure Studio selection and ADR-0035

- **Date:** 2026-09-27
- **Participants:** Maintainer + coding agent
- **Topic:** Select Phase 1 Structure Studio and accept ADR-0035 architecture
- **Related:** `docs/PHASE-1-STRUCTURE-STUDIO-SELECTION.md`; `docs/adr/0035-phase-1-structure-studio-architecture.md`; `docs/adr-0034-closure-reconciliation.md`

## Context

After PR #130 closed ADR-0034, the maintainer authorized the next domain with
“ok go ahead with the Structure Studio selection and ADR-0035”.

## Decisions

1. Select ROADMAP §3.4 Structure Studio.
2. Accept ADR-0035 architecture only. No implementation slice is authorized.
3. Reuse `BookSession` front/main/back operations. Navigation stays a projection of Book order.
4. Nested section trees and tables stay deferred pending a Book Model ADR.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `docs/adr-0035-structure-studio-selection`.
