# Conversation Record — ADR-0041 Slice 2: lesson boxes in EPUB, HTML, and PDF

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** Render the callout block as a framed lesson box in all three engines
- **Related:** `docs/adr/0041-lesson-box-callout-block-architecture.md` §2.4; `docs/adr-0041-slice-2-callout-publishing.md`

## Context

Slice 1 (PR #196) added the callout to the Book Model; the engines still refused it. The proposal asked one question: title on its own line or on the same line as the text. The maintainer chose "Own line".

## Decisions

1. EPUB and HTML: `<div class="ob-callout" role="note">`, an optional `<p class="ob-callout-title">`, then `<p>` for the body. `div`, not `aside`, so readers don't turn boxes into pop-up notes.
2. Styles only when a book has a callout (EPUB: appended to `openbook.css`; HTML: appended to the inline `<style>`); frame in `currentColor` with no background, so it follows night and sepia modes; `break-inside: avoid`.
3. PDF: a Typst `#block` with a thin rounded stroke, `breakable: false`, bold title then a line break.
4. Not in any table of contents; an empty title gives no title line.
5. Process: Draft PR → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `feat/adr-0041-slice-2-callout-publishing`.
- Merged as PR #198 (merge commit `e75eba0`) on 2026-10-29 after the maintainer authorized the merge; all four checks passed.
- EPUBCheck 5.3.0 (local): English and Kannada books with lesson boxes, zero errors and zero warnings. Typst renders English and Kannada boxes deterministically.
- Without callouts: EPUB, HTML, Typst source, and PDF byte-identical to `main`'s engines for five books (four fixtures and one with a picture and a cover).
- Real-book check (local, not committed): the maintainer's cleaned Word file imported, its 25 "What We Learned:" paragraphs turned into lesson boxes by a script, a cover set; book check clean; EPUB 28.5 MB passes EPUBCheck with zero errors and warnings; HTML has 25 boxes; PDF 73 pages, boxes framed with the title on its own line.
