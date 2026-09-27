# Conversation Record — ADR-0035 Slice 3 move and role

- **Date:** 2026-09-27
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0035 Slice 3 (move and role)
- **Related:** `docs/adr/0035-phase-1-structure-studio-architecture.md`; `docs/adr-0035-slice-3-move-role.md`

## Context

After PR #133 landed Slice 2, the maintainer authorized Slice 3 with
“ok go ahead with ADR-0035 Slice 3”.

## Decisions

1. Implement Slice 3 only: move between matters and set a role valid for the current matter.
2. Role lists come from `@openbook/authoring` `rolesForMatter`.
3. The last main chapter and invalid roles stay fail-closed. No remove control.
4. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0035-slice-3-move-role`.
- Matter rail `move` / `setRole` and Structure rail controls.
