# Conversation Record — ADR-0039 Slice 4 authorization

- **Date:** 2026-10-15
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement Studio Shell Slice 4 (Structure, Design, Details, Publish steps)
- **Related:** `docs/adr-0039-slice-4-studio-steps.md`; `docs/adr/0022-desktop-book-doctor-validation-integration-architecture.md` (Amendment)

## Context

After PR #157 merged (Slice 3), the maintainer authorized Slice 4: full-width Structure, Design, Details, and Publish steps; Publish gets the book check and export cards so the stage chips and Export panel can leave Write.

While designing Publish, the agent found that stages are forward-only and the book check ran only in VALIDATION, so any edit after reaching PREVIEW blocked export for the rest of the session.

## Decisions

1. Authorize ADR-0039 Slice 4 only.
2. Maintainer chose "Allow re-check, fix now": permit the book check from VALIDATION onward; export still requires a clean check of the current book. Recorded as an ADR-0022 amendment and a separate commit.
3. Publish's "Check my book" walks the workflow forward automatically; authors never see stages. Stage chips move to Diagnostics.
4. Design presets use only the four Noto fonts bundled for PDF.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0039-slice-4-studio-steps`.
