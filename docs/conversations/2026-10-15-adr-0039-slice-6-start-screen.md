# Conversation Record — ADR-0039 Slice 6 authorization

- **Date:** 2026-10-15
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement Studio Shell Slice 6 (start screen)
- **Related:** `docs/adr-0039-slice-6-start-screen.md`

## Context

After PR #159 merged (Slice 5), the maintainer authorized Slice 6 (pasting the agent's next-step text, treated as authorization as in earlier turns): the start screen with New book, Import a manuscript, Open, Continue writing, and the "What are you writing?" book types, moving Guided Start, Import, and Save out of Write.

## Decisions

1. Authorize ADR-0039 Slice 6 only.
2. Reuse the ADR-0033 Guided Start wizard on the start screen; book types pre-fill it and apply a Design look after creation.
3. Save moves to the top bar; importing into the current book moves to Structure as "Add chapters from a file".
4. Book type → structure presets are left out; only language and look are set.
5. The create-book path could not be run in the browser (SQLite needs Tauri); one manual check in the Tauri app is required.
6. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0039-slice-6-start-screen`.
