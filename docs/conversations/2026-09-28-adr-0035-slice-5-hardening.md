# Conversation Record — ADR-0035 Slice 5 hardening

- **Date:** 2026-09-28
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0035 Slice 5 (hardening)
- **Related:** `docs/adr/0035-phase-1-structure-studio-architecture.md`; `docs/adr-0035-slice-5-hardening.md`

## Context

After PR #135 landed Slice 4, the maintainer authorized Slice 5 with
“ok goahead with ADR-0035 Slice 5 — Hardening”.

## Decisions

1. Implement Slice 5 only: empty-matter copy, EN/KN title Save/Open, and an outline firewall.
2. Empty groups explain what to add. The copy does not invite a stored outline.
3. EPUB navigation stays in the publishing engine.
4. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0035-slice-5-hardening`.
- Empty-matter copy on the structure rail and a package Save/Open title round-trip.
