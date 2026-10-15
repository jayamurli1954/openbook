# Conversation Record — ADR-0039 Slice 5 authorization

- **Date:** 2026-10-15
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement Studio Shell Slice 5 (Guide panel)
- **Related:** `docs/adr-0039-slice-5-guide-panel.md`; `docs/adr-0039-slice-1-step-guide-contract.md`

## Context

After PR #158 merged (Slice 4), the maintainer authorized Slice 5: the Guide panel on the right of each step, with the self-ticking checklist, tips, "Stuck?" questions, and a Next button, using the Slice 1 help text.

## Decisions

1. Authorize ADR-0039 Slice 5 only.
2. The guide is open by default, toggled by Help, hidden in Focus; the setting is held in memory until a preferences ADR exists.
3. Guide copy updated where the built screens differ from the Slice 1 draft (Check my book, re-check wording, Kannada look).
4. "Export your ebook" stays unticked until the app records exports (later slice).
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0039-slice-5-guide-panel`.
