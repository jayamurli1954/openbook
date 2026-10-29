# Conversation Record — ADR-0038 Slice 5: HTML and PDF cover

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** Project the Book's cover into HTML and PDF output
- **Related:** `docs/adr/0038-phase-1-cover-wizard-architecture.md` §2.4; `docs/adr-0038-slice-5-html-pdf-cover.md`

## Context

Slices 1–4 merged (PRs #163, #177, #179, #181). The HTML and PDF asset pipelines had the same gap Slice 4 fixed for EPUB: they packaged only pictures image blocks use. The proposal raised one decision: a PDF uploaded to KDP as a paperback interior must not contain the cover. The maintainer authorized Slice 5 as proposed: cover always first in the PDF, with a leave-out choice deferred to print work.

## Decisions

1. Both pipelines package the cover picture, once even when a chapter also shows it; a missing cover asset fails with a cover-specific `MISSING_ASSET_REFERENCE` message.
2. HTML: `figure.book-cover` is the first child of the article, before the header, with the cover description as alt text. Cover CSS is appended only when there is a cover, so other books keep identical HTML.
3. PDF: one cover page before the title page, `#page(margin: 0pt)` with the picture at `fit: "contain"` and its alt text. Found while rendering: Typst 0.15.1 rejects `margin: 0` (a bare integer); it needs a length.
4. No Typst, font, or page-profile change.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0038-slice-5-html-pdf-cover`.
- Merged as PR #183 (merge commit `eb59f2a`) on 2026-10-29 after the maintainer authorized the merge; all four checks passed.
- Rendered locally with Typst 0.15.1 using the maintainer's real KDP cover in the `kannada-prose` fixture: the PDF went from 6 to 7 pages; page 1 shows the whole cover uncropped, page 2 is the unchanged title page.
- Books without a cover: HTML, Typst source, and PDF bytes identical to `main` for `simple-english`, `kannada-indic`, `kannada-prose`, and an English book with a chapter picture (compared against builds of `main`'s engines).
