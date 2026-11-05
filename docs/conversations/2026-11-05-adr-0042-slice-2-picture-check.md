# Conversation Record — ADR-0042 Slice 2: picture check for print

- **Date:** 2026-11-05
- **Participants:** Maintainer + coding agent
- **Topic:** Warn when a picture may print blurry in a paperback PDF
- **Related:** `docs/adr/0042-print-ready-paperback-pdf-architecture.md` §2.2; `docs/adr-0042-slice-2-picture-check.md`

## Context

Slice 1 (PR #211) added the print profile. The Slice 2 proposal asked whether pictures at 200–299 dpi should be mentioned. The maintainer chose "Yes, quiet note".

## Decisions

1. **Measure the printed size from the rendered PDF.** Typst scales pictures to fit the page, so pixel sizes alone can't tell.
   - An in-house reader follows Typst 0.15.1's page drawing commands. It needs no dependency.
   - Pictures are paired with the book's picture blocks in reading order and checked against their PNG/JPEG pixel sizes.
2. **Messages:**
   - under 200 dpi: a warning, `PRINT_IMAGE_LOW_RESOLUTION`;
   - 200–299 dpi: a quiet note, `PRINT_IMAGE_BELOW_IDEAL`;
   - 300 dpi or more: nothing;
   - if the pairing doesn't line up: one note, `PRINT_IMAGE_UNCHECKED`.

   The check runs for paperback PDFs only and never blocks.
3. No Book Model, desktop, dependency, or font change. The reading PDF is unchanged.
4. Process: Draft PR → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `feat/adr-0042-slice-2-picture-check`.
- `@openbook/pdf`: 43 tests pass.
- **Real book at 5.5 × 8.5 in:**
  - every picture's dpi matches PyMuPDF for all 26 pictures;
  - 21 quiet notes at 220–241 dpi;
  - no warnings.
- **Against `main`:** the reading PDF and the print PDF bytes are unchanged.
