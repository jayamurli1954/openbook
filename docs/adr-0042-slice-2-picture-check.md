# ADR-0042 Slice 2: Picture Check for Print — Implementation Proposal

- **Status:** In progress (this PR)
- **Date:** 2026-11-05
- **Parent architecture:** ADR-0042 — Print-Ready Paperback PDF Architecture, §2.2, §4 invariant 5, §7 Slice 2
- **Scope:** after a paperback PDF is built, measure each picture's resolution at the size it is actually printed, and report low ones as warnings. Engine only; showing them in the Export step is Slice 3.
- **Implementation authorization:** Granted for this slice only; pictures at 200–299 dpi get a quiet note (maintainer, 2026-11-05: "Yes, quiet note")

## 1. Purpose

A picture that looks sharp on a screen can print blurry. KDP recommends 300 dpi, and its previewer flagged the maintainer's front cover at 182 dpi. OpenBook says nothing today.

The printed size isn't simply the picture's pixel size. Typst scales a picture to fit the text width and the space left on the page. So the reliable measure is the rendered PDF itself.

- **How Typst places a picture.** It draws each picture with an explicit size. On the real book's Story 1 page, `306 0 0 204 … cm /x0 Do` places a 1536-pixel-wide picture 306 pt (4.25 in) wide, which is 361 dpi.
- **What the hand-measured book showed.** Its pictures printed at 220–373 dpi. None of them would have shown that from their pixel sizes alone.

## 2. Slice 2 objective

1. **Read picture placements from the PDF** (`packages/pdf/src/print-image-check.ts`).
   - This is an in-house reader for the PDFs Typst 0.15.1 writes: page objects, their image resources (`/Subtype /Image`, `/Width`, `/Height`), and the drawing commands (`… cm /Name Do`). Content streams are decompressed with `node:zlib`. **No new dependency.**
   - For every picture drawn, it records the page, the pixel width and height, and the printed width and height in inches.
   - **dpi** = pixels ÷ printed inches, using the smaller of the two directions.

2. **Match placements to the book's pictures.**
   - Picture blocks in reading order are paired with drawn pictures in page order. The cover is not drawn in a print PDF.
   - Each pair's pixel size must equal the stored picture's pixel size, read from its PNG or JPEG header with a small reader in the PDF package.
   - If the counts or sizes don't line up, the check reports one information note ("Picture sharpness could not be checked for this book.") instead of guessing. It never fails the export.

3. **Report** through the existing `PublishingDiagnostic` list on `PdfPublication`. Print profile only.

   | Printed resolution | Severity | Message |
   |---|---|---|
   | under 200 dpi | warning | "A picture in “Story 3: The Honest Fruit Seller” may print blurry (150 dpi). Use a larger picture (at least 300 dpi at its printed size) for sharp print." |
   | 200–299 dpi | information | "A picture in “Story 1: The Chariot Lesson” prints at 220 dpi. It should look fine; 300 dpi is ideal." |
   | 300 dpi or more | (nothing) | |

   - Codes are `PRINT_IMAGE_LOW_RESOLUTION` and `PRINT_IMAGE_BELOW_IDEAL`, with the picture's `assetId` and `blockId`.
   - Section titles come from the book. Kannada titles are kept exactly.
   - The message wording passes the plain-language and internal-term checks used for the guide copy.

4. **Never blocks.** `buildPdf` returns the PDF with these diagnostics. The reading PDF gets no picture diagnostics, and its bytes are unchanged (ADR-0042 invariant 1).

5. **Tests:**
   - **Reader unit tests** use small hand-made PDF content: a placement, a scaled placement, two pictures on a page, and a picture reused on two pages.
   - **Rendered tests**, where the Typst runtime is present:
     - a low-resolution picture gives a warning with the right dpi (±2), section title, and ids;
     - a 300 dpi picture gives nothing;
     - an English and a Kannada book;
     - the same book gives the same diagnostics twice.
   - **Reading profile:** no picture diagnostics, and source and bytes are unchanged against `main`.

## 3. Explicit exclusions

- Showing the warnings, or a page count, in the Export step (Slice 3)
- Upscaling or replacing pictures
- Checks for the cover image (the cover is uploaded to the print service separately)
- Colour checks (CMYK, ink limits) and bleed
- Any Book Model, desktop, dependency, or font change

## 4. Acceptance criteria

- **Agreement with measurement.** For the maintainer's book at 5.5 × 8.5 in, the dpi reported for every picture matches an independent measurement of the same PDF (PyMuPDF, run locally) within ±2 dpi.
  - The diagnostics list the pictures under 300 dpi by section title.
  - None is under 200 dpi; the hand-measured build had all pictures at 220 dpi or more.
- **Fails safe.** A mismatch between pictures and placements gives the single information note, never a wrong section.
- **Reading PDF unchanged:** byte-identical to `main`, and no new diagnostics.
- `npm test` for `@openbook/pdf`, the full repository, and CI pass. The diff stays within Slice 2.

## 4a. Results

- **Tests:** `@openbook/pdf` has 43 passing tests and none skipped. They cover:
  - the placement reader on hand-made PDFs: nested and saved transforms, a scaled group, a compressed stream, and a "cm … Do" inside a text string that must be ignored;
  - PNG and JPEG sizes;
  - the mismatch note;
  - rendered English and Kannada warnings, with the measured dpi, section title, and ids;
  - a sharp picture getting no message;
  - the reading PDF getting no picture check.
- **Real book at 5.5 × 8.5 in:** every picture's dpi matches PyMuPDF exactly, for all 26 pictures.
  - 21 quiet notes, all 220–241 dpi;
  - no warnings;
  - 5 pictures at 361 dpi get no message.
- **Unchanged against `main` (`7298f81`):**
  - the reading PDF's source and bytes, for the four fixtures and the real book;
  - the print PDF's bytes, which are the same as Slice 1's. The check only reads the finished PDF.
- **Note for Slice 3:** one note names the section "eBook for bedtime reads.", the book's own title-page heading. The Export step should group the notes, as §6 expects.

## 5. Expected files

- `packages/pdf/src/print-image-check.ts` (new): the PDF placement reader, the PNG/JPEG size reader, matching, and messages
- `packages/pdf/src/pdf-builder.ts` (run the check for print), `index.ts` (export the codes)
- `packages/pdf/src/pdf.test.ts`
- Status docs:
  - this proposal
  - a `docs/conversations/` record
  - `docs/IMPLEMENTATION-BACKLOG.md`
  - `docs/PRINT-READY-PDF-SELECTION.md`
  - `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
  - `PROJECT-CONTEXT.md`
  - `docs/README.md`

## 6. Decision

**Decided 2026-11-05 by the maintainer: "Yes, quiet note."** The options considered:


**Should pictures between 200 and 299 dpi be mentioned at all?**

- **Recommended: yes, as a quiet "fine, 300 is ideal" note.** You'll know exactly which pictures KDP's previewer may flag, and that they will still print acceptably. Your book has about 20 of these. The engine reports one note per picture, and the Export step (Slice 3) can group them under one line rather than show 20 separate alarms.
- **Alternative: warn only under 200 dpi.** This is quieter, but KDP may still raise a "low resolution" notice you weren't told about.
