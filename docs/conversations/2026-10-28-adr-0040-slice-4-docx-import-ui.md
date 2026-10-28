# Conversation Record — ADR-0040 Slice 4: desktop Word import surface

- **Date:** 2026-10-28
- **Participants:** Maintainer + coding agent
- **Topic:** Implement ADR-0040 Slice 4
- **Related:** `docs/adr-0040-slice-4-docx-import-ui.md`; `docs/adr/0040-docx-import-architecture.md` §6; ADR-0039

## Context

After Slice 3 merged (PR #170) and its status was reconciled (PR #171), the maintainer authorized Slice 4: “Import a Word file” on the start screen, “Add chapters from a Word file” in Write, a file-size check before the file is read, and the import summary in the Guide panel.

## Decisions

1. A dedicated host command `docx_read_bytes` checks the size before reading and returns binary bytes. It has its own allow-entry, like `asset_read_bytes`; no plugin permission is added.
2. A new book can be imported from Word only while the open book is at its start. Otherwise the author is pointed to New blank book, or to adding chapters from Write; work in progress is never replaced.
3. The import summary lives in the Guide panel until dismissed.
4. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Action items

- Maintainer: try importing *Little Krishna's Wisdom Stories* locally in the desktop app.
- Slice 5 (hardening) needs its own authorization.

## Outcomes

- Branch `feat/adr-0040-slice-4-docx-import-ui`; merged as PR #172 after a review pass (8 findings fixed).
