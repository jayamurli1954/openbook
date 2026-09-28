# Conversation Record — ADR-0035 Slice 4 navigation preview

- **Date:** 2026-09-28
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0035 Slice 4 (navigation preview)
- **Related:** `docs/adr/0035-phase-1-structure-studio-architecture.md`; `docs/adr-0035-slice-4-navigation-preview.md`

## Context

After PR #134 landed Slice 3, the maintainer authorized Slice 4 with
“ok go ahead with ADR-0035 Slice 4”.

## Decisions

1. Implement Slice 4 only: a read-only reading-order projection of the Book.
2. The preview lists title, matter, and role. It stores no table of contents.
3. EPUB `nav.xhtml` stays in the publishing engine.
4. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0035-slice-4-navigation-preview`.
- `projectBookNavigation` and read-only Navigation chrome beside the matter rail.
