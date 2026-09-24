# Conversation Record — ADR-0033 Slice 1 guided-start contract

- **Date:** 2026-09-24
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0033 Slice 1 (guided-start contract)
- **Related:** `docs/adr/0033-phase-1-book-wizard-guided-start-architecture.md`; `docs/adr-0033-slice-1-guided-start-contract.md`

## Context

After PR #116 accepted ADR-0033 architecture-only, the maintainer authorized
Slice 1 with “ok go ahead.”

## Decisions

1. Implement Slice 1 only: types/ports + New Book validation + tests.
2. No React UI, Tauri, filesystem, or coordinator mutation in this slice.
3. Minimum viable New Book fields: non-empty title + language; authors optional.
4. Wizard-only fields (`bookType`, audience, length, writingGoal) are not
   persisted by this contract.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0033-slice-1-guided-start-contract`.
- Module `apps/desktop/src/workflow/domain/guidedStartContract.ts` (+ tests).
