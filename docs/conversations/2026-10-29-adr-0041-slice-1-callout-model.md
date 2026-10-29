# Conversation Record — ADR-0041 Slice 1: callout model and schema version 2

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** The lesson box as a Book Model block; Book Model version 2 on every read path
- **Related:** `docs/adr/0041-lesson-box-callout-block-architecture.md`; `docs/adr-0041-slice-1-callout-model.md`; `docs/conversations/2026-10-29-write-step-pictures.md`

## Context

ADR-0041 was accepted (PR #192) with `schemaVersion` 2 decided. The Slice 1 proposal found that the SQLite store rejects any non-current version, that the package path had no Book upgrade, and that TipTap drops unknown nodes. The maintainer authorized Slice 1 with version-1 books rewritten at the next Save ("Authorize, upgrade at Save"). Midway, the agent found the Write editor was turning pictures into text; the maintainer had that fixed first (PR #194), then Slice 1 resumed.

## Decisions

1. `callout` block: plain-text `title` plus `inlines`; validation errors `callout-title-not-text`, `callout-inlines-not-array`, `empty-callout`.
2. `BOOK_MODEL_SCHEMA_VERSION = 2`; `upgradeBook` turns a version-1 Book into version 2 with no other change; `parseBook` reads 1 and 2.
3. Package Open and SQLite read version 1 and upgrade in memory; Open reports `upgradedFrom: 1` and writes nothing; the next Save writes version 2. Newer versions and mismatched manifest/document versions are still refused.
4. A display-only `openbookCallout` editor node (moved into Slice 1 from Slice 3) so a callout is never dropped while editing; an emptied box is removed with a warning.
5. Engines still refuse callouts (`UnsupportedContentError`) until Slice 2.
6. Process: Draft PR → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `feat/adr-0041-slice-1-callout-model`.
- Full repository `npm test` passes (desktop 529). Exports: a version-1 and a version-2 copy of the same book give identical EPUB, HTML, Typst source, and PDF for three fixtures; the engines are unchanged in this slice.
