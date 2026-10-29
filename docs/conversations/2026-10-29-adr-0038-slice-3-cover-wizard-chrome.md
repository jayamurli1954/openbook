# Conversation Record — ADR-0038 Slice 3: Cover Wizard chrome

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** Replace the Cover step placeholder with a working Cover Wizard
- **Related:** `docs/adr/0038-phase-1-cover-wizard-architecture.md`; `docs/adr-0038-slice-3-cover-wizard-chrome.md`

## Context

Slices 1–2 merged (PRs #163, #177). The agent proposed Slice 3 with one open decision: whether replacing or removing the cover should also remove the old picture when no chapter uses it. The maintainer authorized Slice 3 with that tidy-up ("Authorize, tidy up").

## Decisions

1. A separate cover picker, limited to PNG and JPEG, reuses the dialog plugin and the existing `asset_read_bytes` command. No new Tauri command or permission.
2. A picked picture is checked before anything is added to the Book. Cancelling, or choosing an unusable file, adds nothing.
3. Cover pictures are ingested with a fixed id seed, so choosing the current picture again reuses it instead of failing on a duplicate id.
4. Replacing or removing the cover removes the old picture when no section uses it, as its own undo step. If setting the cover fails, a picture added for that attempt is taken back out.
5. The preview uses a `blob:` URL from the stored bytes, revoked when the picture changes or the step closes.
6. The shell shows "Not added" / "Added" for the Cover step; the guide drops "coming soon" and ticks "Add the cover picture and describe it" when a cover is set.
7. Found while trying it in the running app: a replacement picture inherited the old picture's description. It now starts empty, since each picture needs its own description.
8. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0038-slice-3-cover-wizard-chrome`.
- Merged as PR #179 (merge commit `15b041f`) on 2026-10-29 after the maintainer authorized the merge; all four checks passed.
- Checked in the running app (Vite, browser picker with a generated test picture): choose, preview, warnings, set, replace, cancel, and remove all behaved as described. The browser-only mode cannot open the SQLite store; that is expected outside the desktop app and unrelated to this slice.
