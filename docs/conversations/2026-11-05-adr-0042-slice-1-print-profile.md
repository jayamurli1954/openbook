# Conversation Record — ADR-0042 Slice 1: print profile in the PDF engine

- **Date:** 2026-11-05
- **Participants:** Maintainer + coding agent
- **Topic:** Paperback interior page setup in `@openbook/pdf`
- **Related:** `docs/adr/0042-print-ready-paperback-pdf-architecture.md` §2.1, §7; `docs/adr-0042-slice-1-print-profile.md`

## Context

ADR-0042 was accepted in PR #209. The Slice 1 proposal asked where page 1 should be. The maintainer chose "Count from title page".

## Decisions

1. `PdfProfile` is either `{ kind: "reading" }` (the default, unchanged) or `{ kind: "print", trim }`. There are eight trim sizes, from 5 × 8 in to 8.5 × 11 in, plus A5.
2. A print PDF:
   - has the trim size on every page;
   - has mirrored margins: 0.75 in inside, 0.5 in outside, 2.25 cm top and bottom;
   - has page numbers counted from the title page and hidden there;
   - has no cover page;
   - is refused past 700 pages with a plain message (`PRINT_PAGE_LIMIT_EXCEEDED`).
3. The body text is the same as in the reading PDF. No Book Model, package, dependency, or font change.
4. Process: Draft PR → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `feat/adr-0042-slice-1-print-profile`.
- **Tests:** `@openbook/pdf` 39 pass, rendered tests included.
- **Reading PDF:** byte-identical to `main` for the four fixtures and for the maintainer's book.
- **Real-book check at 5.5 × 8.5 in:** 69 pages; numbers on pages 2–69; text and pictures at least 0.68 in from the inside edge and 0.43 in from the outside edge (hanging punctuation); 25 lesson boxes; no cover page.
- **Note for the maintainer:** at 69 pages, a future OpenBook-exported paperback would fall under KDP's 72-page Standard colour minimum. The live paperback uses the hand-built 72-page file.
