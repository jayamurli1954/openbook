# Conversation Record — Metadata Wizard selection and ADR-0037

- **Date:** 2026-10-03
- **Participants:** Maintainer + coding agent
- **Topic:** Select Phase 1 Metadata Wizard and accept ADR-0037 architecture
- **Related:** `docs/PHASE-1-METADATA-WIZARD-SELECTION.md`; `docs/adr/0037-phase-1-metadata-wizard-architecture.md`; `docs/adr-0036-closure-reconciliation.md`

## Context

After PR #143 closed ADR-0036, the maintainer authorized the next domain with
“Ok go ahead” following the Metadata Wizard selection offer.

## Decisions

1. Select ROADMAP §3.6 Metadata Wizard.
2. Accept ADR-0037 architecture only. No implementation slice is authorized.
3. Guided fields write `Book.metadata` only. Publishing package documents stay in the engines.
4. Cover metadata, accessibility metadata, and Guided Start terminology that is not on the Book stay deferred.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `docs/adr-0037-metadata-wizard-selection`.
