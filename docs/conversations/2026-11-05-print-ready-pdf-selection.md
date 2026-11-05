# Conversation Record — Print-ready paperback PDF: selection and ADR-0042

- **Date:** 2026-11-05
- **Participants:** Maintainer + coding agent
- **Topic:** Making OpenBook's PDF usable as a paperback interior
- **Related:** `docs/PRINT-READY-PDF-SELECTION.md`; `docs/adr/0042-print-ready-paperback-pdf-architecture.md`

## Context

After ADR-0041 closed, the maintainer published the paperback of *Little Krishna's Wisdom* on KDP. The interior was built by hand at 5.5 × 8.5 in with page numbers, because OpenBook's PDF is always A5, has no page numbers, and includes the cover page when a cover is set. KDP's Print Previewer accepted the hand-built file with no issues. Asked what next, the maintainer chose "Print-ready PDF proposal".

## Decisions so far

1. Proposed domain: a "PDF for a paperback" choice beside today's reading PDF, with a trim-size list, mirrored margins, page numbers, no cover page, a picture-resolution check, and the page count after export.
2. Trim size, margins, and page numbers stay out of the Book Model (ADR-0013 §9).
3. Trim-size storage (ADR-0042 §6): the maintainer chose "Per book, this computer" — remembered locally per book; no Book Model or package change.
4. Process: Draft PR → CI/DCO → acceptance and merge only on the maintainer's authorization; each slice separately authorized.

## Outcomes

- Merged as PR #209 (merge commit `7fa47d0`) on 2026-11-05 after the maintainer authorized it; all four checks passed. ADR-0042 is accepted; Slice 1 awaits authorization.
