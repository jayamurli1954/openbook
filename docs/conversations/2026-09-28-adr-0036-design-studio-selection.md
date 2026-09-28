# Conversation Record — Design Studio selection and ADR-0036

- **Date:** 2026-09-28
- **Participants:** Maintainer + coding agent
- **Topic:** Select Phase 1 Design Studio and accept ADR-0036 architecture
- **Related:** `docs/PHASE-1-DESIGN-STUDIO-SELECTION.md`; `docs/adr/0036-phase-1-design-studio-architecture.md`; `docs/adr-0035-closure-reconciliation.md`

## Context

After PR #137 closed ADR-0035, the maintainer authorized the next domain with
“ok go ahead with the Design Studio selection and ADR”.

## Decisions

1. Select ROADMAP §3.5 Basic Design Studio.
2. Accept ADR-0036 architecture only. No implementation slice is authorized.
3. Guided choices write `Book.theme` and `Book.typography` only. Publishing stylesheets stay in the engines.
4. Paragraph spacing beyond line height, image treatment, chapter opening, and style properties stay deferred pending a Book Model ADR.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `docs/adr-0036-design-studio-selection`.
