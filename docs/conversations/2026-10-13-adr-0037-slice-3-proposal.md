# Conversation Record — ADR-0037 Slice 3 proposal

- **Date:** 2026-10-13
- **Participants:** Maintainer + coding agent
- **Topic:** Draft the Metadata Wizard Slice 3 (hardening) proposal
- **Related:** `docs/adr-0037-slice-3-hardening.md`; `docs/adr-0037-slice-2-guided-fields.md`

## Context

After PRs #148–#149 merged (Slice 2 on `main`), the maintainer asked for the Slice 3 proposal to be drafted first, before any implementation.

## Decisions

1. Draft Slice 3 following the ADR-0036 Slice 3 hardening pattern.
2. Cover package Save/Open and autosave; leave SQLite-only Save and publishing-engine output out of scope.
3. Record Slice 2 as done (PR #149).
4. The proposal does not authorize implementation. Slice 3 code needs an explicit maintainer authorization. ADR-0037 closure follows separately.

## Outcomes

- Branch `docs/adr-0037-slice-3-proposal`.
