# Conversation Record — Word (.docx) import selection and ADR-0040

- **Date:** 2026-10-28
- **Participants:** Coding agent sessions, drafting for maintainer review
- **Topic:** Propose Word `.docx` import (with embedded images) and draft ADR-0040 architecture
- **Related:** `docs/PHASE-1-DOCX-IMPORT-SELECTION.md`; `docs/adr/0040-docx-import-architecture.md`; ADR-0015; ADR-0017; ADR-0020; ADR-0021; ADR-0029

## Context

The maintainer's children's book, *Little Krishna's Wisdom Stories* (25 stories, 27 embedded images, published on KDP), exists only as a `.docx`. OpenBook cannot import it: ADR-0015 §2.3 deferred binary formats, the ADR-0020 INV-2 format firewall accepts only `markdown` and `text`, `importer.test.ts` asserts `canImport("docx") === false`, and the Markdown importer drops images.

A coding-agent session asked for a selection record and an architecture ADR, docs only, as a Draft PR. **The maintainer has not yet reviewed or accepted anything recorded here.** Everything below is a proposal until the Draft PR merges on the maintainer's explicit authorization.

## Discussion points

- `fflate` 0.8.3 (MIT) is already a shipped-runtime dependency of `@openbook/epub` and is confirmed in the npm production closure. No ZIP library is a dependency of `packages/importer` or `apps/desktop`.
- `validateBook` does not check that image blocks reference existing assets. Only package Save (`DANGLING_IMAGE_REFERENCE`) does, so the import path needs its own check.
- Package Save builds asset entries from `Book.assets` only, so assets left in the store by a rolled-back import do not become orphan package entries.
- Manuscripts often format chapter titles by hand without heading styles; structure detection needs a fallback.
- A self-review pass (code review of the Draft PR) found ten gaps: placeholder checking, unstyled chapter titles, field codes, tracked moves, front-matter detection after the first chapter, the importer's string-only guard and id seed, the orphan-asset claim, a wrong ADR-0015 cross-reference, a ratio limit that was too strict, and this record. All ten were addressed in the same PR.

## Alternatives considered

| Option | Outcome proposed |
|---|---|
| In-house OOXML reader over `fflate` with a restricted XML tokenizer | Proposed |
| `mammoth` (BSD-2-Clause; about a dozen transitive packages) | Fallback if the in-house reader proves too costly; would need an ADR amendment |
| Pandoc / LibreOffice subprocess | Rejected again (ADR-0015) |
| Webview `DOMParser` | Not chosen; unavailable under `node --test` |

## Proposals awaiting maintainer decision

1. Select ROADMAP §3.1 “Import Existing Book” for Word `.docx`, including embedded images.
2. Accept ADR-0040 architecture only. No implementation slice is authorized.
3. Amend ADR-0015 §2.1 item 2 / §2.3 and ADR-0020 INV-1 / INV-2 for `.docx` only: the importer accepts bytes for `docx`; the firewall becomes `markdown`, `text`, `docx`.
4. Images return as byte payloads; the coordinator ingests them through the ADR-0017/ADR-0021 pipeline and explicitly checks image references before commit.
5. Keep structure, drop appearance. Untagged front matter maps to front-matter roles only before the first chapter; a typed table of contents is dropped after it is used to find chapter titles.
6. Fixed ZIP, XML, and size limits; no macros, no external fetches, no field-target resolution, no OLE parsing.
7. No Book Model change.

## Maintainer confirmations

- 2026-10-28: the maintainer confirmed the Kannada front-matter and contents-page words in ADR-0040 §4.3–§4.4 (“ಮುನ್ನುಡಿ, ಪೀಠಿಕೆ, ಪರಿವಿಡಿ, … yes this is correct”).

## Unresolved questions

- Is the 1,000 : 1 compression-ratio ceiling right? Slice 1 is to measure real manuscripts first.
- Does Slice 4 need a binary host read command, or is `asset_read_bytes` fast enough for real manuscript sizes?
- May the maintainer's own book be used as a local manual check in Slice 5?
- ADR-0038 Cover Wizard and ADR-0040 are independent. Which slice comes next is the maintainer's choice.

## Action items

- Maintainer: review Draft PR #164; merge only by writing `I authorize merge PR #164`.
- After merge: each ADR-0040 slice needs its own explicit authorization.

## Outcomes

- Branch `docs/adr-0040-docx-import-selection`, Draft PR #164.
- ADR-0038 Cover Wizard files and its Slice 1 Draft PR #163 are not touched.
