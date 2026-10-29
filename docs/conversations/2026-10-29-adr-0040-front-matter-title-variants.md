# Conversation Record — ADR-0040 follow-up: front-matter title variants

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agents
- **Topic:** “Preface for Parents” merged into the Foreword on Word import; propose recognising title variants
- **Related:** `docs/adr-0040-front-matter-title-variants.md`; `docs/adr/0040-docx-import-architecture.md` §4.3

## Context

While cleaning up the maintainer's children's book *Little Krishna's Wisdom Stories* (a KDP Word file), its “Preface for Parents” page was found merged into the Foreword, because the importer recognises only exact front-matter titles. Made a Heading 1, it would instead start a chapter and swallow the following “Publisher's Note”.

## Decisions

1. This changes ADR-0040 §4.3 behaviour, so a proposal is written first; it does not authorize code.
2. Recognise a short title (≤ 6 words) that starts with a known title followed by “for”, “to”, “of”, “:” or a spaced dash, keeping the known title's role. Exact matches, including Kannada, are unchanged.
3. Titles ending with “.”, “!” or “?” are not matched, so short sentences are not taken as titles.
4. A recognised title styled Heading 1 before the first chapter stays front matter (already the §4.3 rule).

## Open questions

- None yet; waiting for the maintainer's review of the proposal.

## Action items

- Maintainer: review the proposal and authorize (or not) the implementation.
