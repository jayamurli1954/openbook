# Conversation Record — Word (.docx) import selection and ADR-0040

- **Date:** 2026-10-28
- **Participants:** Maintainer + coding agent
- **Topic:** Select Word `.docx` import (with embedded images) and propose ADR-0040 architecture
- **Related:** `docs/PHASE-1-DOCX-IMPORT-SELECTION.md`; `docs/adr/0040-docx-import-architecture.md`; ADR-0015; ADR-0020; ADR-0017; ADR-0021

## Context

The maintainer's children's book, *Little Krishna's Wisdom Stories* (25 stories, 27 embedded images, published on KDP), exists only as a `.docx`. OpenBook cannot import it: ADR-0015 §2.3 deferred binary formats, the ADR-0020 INV-2 format firewall accepts only `markdown` and `text`, `importer.test.ts` asserts `canImport("docx") === false`, and the Markdown importer drops images.

Review found that `fflate` 0.8.3 (MIT) is already a shipped-runtime dependency of `@openbook/epub` and is confirmed in the npm production closure. No ZIP library is a dependency of `packages/importer` or `apps/desktop`.

## Decisions

1. Select ROADMAP §3.1 “Import Existing Book” for Word `.docx`, including embedded images.
2. Propose ADR-0040 architecture only. No implementation slice is authorized.
3. Parsing: in-house read-only OOXML reader over the already-cleared `fflate`, with a restricted in-house XML tokenizer. `mammoth` recorded as the fallback alternative; Pandoc/LibreOffice stay rejected.
4. Amend ADR-0015 §2.1 item 2 / §2.3 and ADR-0020 INV-1 / INV-2 for `.docx` only: the importer accepts bytes for `docx`; the firewall becomes `markdown`, `text`, `docx`.
5. Images return as byte payloads; the coordinator ingests them through the ADR-0017/ADR-0021 pipeline before any `image` block is committed.
6. Keep structure, drop appearance. Untagged front-matter pages map to front-matter roles; a typed table of contents is dropped.
7. Fixed ZIP-bomb, entry-count, size, and XML limits; no macros, no external fetches, no OLE parsing.
8. No Book Model change.
9. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `docs/adr-0040-docx-import-selection`.
- ADR-0038 Cover Wizard files and its Slice 1 Draft PR #163 are not touched.
