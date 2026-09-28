# Conversation Record — ADR-0036 Slice 1 design contract

- **Date:** 2026-09-28
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0036 Slice 1 (design contract)
- **Related:** `docs/adr/0036-phase-1-design-studio-architecture.md`; `docs/adr-0036-slice-1-design-contract.md`

## Context

After PR #138 accepted ADR-0036, the maintainer authorized Slice 1 with
“ok go ahead with ADR-0036 Slice 1”.

## Decisions

1. Implement Slice 1 only: a design command port over `Book.theme` and `Book.typography`.
2. Blank themes and non-positive body size or line height fail closed.
3. No chrome. Paragraph spacing, image treatment, and chapter opening stay deferred.
4. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0036-slice-1-design-contract`.
- `executeDesignCommand` and `BookSession.updateTheme` / `updateTypography`.
