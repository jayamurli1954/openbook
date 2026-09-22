# Conversation Record — Foundation readiness evidence ops Slice 1

- **Date:** 2026-09-22
- **Participants:** Maintainer + coding agent
- **Topic:** Choose next path after post–Gate 10 closure; start evidence ops
- **Related:** `docs/FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`

## Context

Maintainer was unsure which post–Gate 10 candidate to pick and asked the
agent to go ahead. Agent recommended **foundation readiness evidence ops**
(closes the path toward an eventual FOUNDATION-READY decision without jumping
to DTP/AI/Gate 11).

## Decisions

1. Select evidence ops as the next controlled domain.
2. Slice 1: populate `evidence-inventory.json` + release `THIRD-PARTY-NOTICES.md`
   from Gate 5/6 packaging pins.
3. EPUBCheck / Temurin windows-x64 / Typst windows-x64 → `confirmed`.
4. Bundled fonts → inventory entries with integrity, but `unresolved` clearance.
5. Do **not** declare FOUNDATION-READY.
6. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `docs/foundation-evidence-ops-slice-1`.
