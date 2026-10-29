# Conversation Record — ADR-0038 Slice 1: cover model and contract

- **Date:** 2026-10-23
- **Participants:** Maintainer + coding agent
- **Topic:** First Cover Wizard slice — Book Model field, validation, session, and desktop port
- **Related:** `docs/adr/0038-phase-1-cover-wizard-architecture.md`; `docs/adr-0038-slice-1-cover-contract.md`

## Context

After the Save/autosave race fix merged (PR #162), the agent wrote the Slice 1 proposal. The maintainer authorized it: "I authorize ADR-0038 Slice 1 as proposed."

## Decisions

1. `publishing.coverAssetId` is optional; `schemaVersion` stays `1` and no package migration is needed.
2. `validateBook` adds three errors: `cover-asset-missing`, `cover-asset-not-image`, `cover-alt-text-missing`. Removing the cover asset therefore fails closed.
3. `BookSession.setCover(assetId, altText)` sets the alt text and the cover in one undo step; `clearCover()` keeps the asset.
4. The coordinator treats `setCover` / `clearCover` as session mutations, so autosave and the Book Doctor report follow cover edits.
5. `coverWizardContract.ts` checks before mutation and returns structured codes; it only works with assets already on the Book.
6. Engines are unchanged until Slices 4–5.
7. Noted, not changed: `updateTheme` / `updateTypography` are missing from the coordinator's mutation list, so Design Studio edits do not schedule autosave. Recorded as a separate follow-up.
8. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0038-slice-1-cover-contract`.
