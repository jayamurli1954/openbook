# Conversation Record — Gate 10 Slice 2 Windows resource layout

- **Date:** 2026-09-22
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0032 Slice 2 after Slice 1 merge
- **Related:** ADR-0032, `docs/adr-0032-slice-2-windows-resource-layout.md`, Gate 5/6 inventories

## Context

ADR-0032 is Accepted. Slice 1 (packaged resource locator) merged via PR #104.
Maintainer paused brief UI/UX polish and returned to the Gate 10 schedule,
authorizing Slice 2: Windows resource layout + packaging-time inventory checksum
verification.

## Decisions

1. Slice 2 copies Gate 5/6 shippable runtime trees into
   `apps/desktop/src-tauri/resources/{validator-runtime,pdf-runtime}`.
2. Packaging-time verification against committed inventories is mandatory and
   fail-closed; jlink `java` SHA-256 is recorded in `assembly-evidence.json`.
3. Default production platform pin remains **windows-x64**.
4. Binaries stay gitignored; host locator wiring stays Slice 3; installer stays
   Slice 4.
5. Process unchanged: Draft PR → CI/DCO → merge only on
   `I authorize merge PR #XX`.

## Outcomes

- Implementation proposal and code on branch
  `feat/gate-10-slice-2-windows-resource-layout`.
- Desktop UI WIP stashed separately and excluded from this unit.
