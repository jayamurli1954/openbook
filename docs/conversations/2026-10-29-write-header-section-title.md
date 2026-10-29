# Conversation Record — Write header names front and back matter by title

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agents
- **Topic:** Selecting a front-matter section in Write showed its internal id in the header
- **Related:** `docs/adr/0039-phase-1-studio-shell-and-guided-ux-architecture.md` (presentation only); `docs/conversations/2026-10-29-adr-0040-front-matter-title-variants.md`

## Context

After PR #189, the maintainer imported *Little Krishna's Wisdom Stories* and selected “Publisher's Note” in the Write step. The header read `Selected “imp-ce3c20b9fe55-s0003”`. The note looked the title up among chapters only and fell back to the section id, so every front- and back-matter section showed an id. The maintainer authorized the fix.

## Decisions

1. The note uses one pure helper beside the book outline, `outlineSectionTitle`, which looks in front matter, chapters and back matter.
2. An untitled or unknown section reads “Untitled section”; an internal id is never shown to the author.
3. Presentation only: no change to the book model, the coordinator, import or export.
4. Process: fix PR, Draft → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `fix/write-header-section-title`.
