# Fixes Found Testing *Little Krishna's Wisdom Stories* — Proposal

- **Status:** Proposed (no code yet)
- **Date:** 2026-10-30
- **Parent architecture:** ADR-0013 (PDF engine, §6 fonts), ADR-0040 (Word import, §4.5 and §4.6)
- **Scope:** Four OpenBook fixes found by running the maintainer's book through import → book check → EPUB (EPUBCheck) → HTML → PDF on `main` (`67505b9`). No Book Model change.
- **Implementation authorization:** Not granted yet. Each part below needs an explicit maintainer authorization.

## 1. What the test showed

The book (`DIGITAL_BOOK_BLOCK_lessons-fixed.docx`, a local copy, not committed) imports as 4 front sections, 25 chapters and 27 pictures. The book check is clean, EPUBCheck 5.3.0 reports no errors, and all three exports work. Reading the outputs found four problems in OpenBook itself:

| # | Problem | Cause |
|---|---|---|
| 1 | In the PDF, digits and punctuation in English text and headings come from the Kannada font: “1:” in “Story 1: The Chariot Lesson” looks bolder than the words | `DEFAULT_PDF_PROFILE` lists `Noto Serif Kannada` / `Noto Sans Kannada` **before** the Latin fonts for every book. Those fonts also contain digits and punctuation, so Typst takes them from there |
| 2 | In the PDF, italic text (the whole Foreword and Preface) prints upright | No italic font is bundled (`packages/pdf/packaging/inventory.json` has upright Noto Serif / Noto Sans only); Typst does not slant a font itself |
| 3 | In the PDF, emoji (🌟✨) print as empty boxes | No bundled font has emoji |
| 4 | “With warmth and blessings,” and “The Publisher” end up on one line | A line break inside a paragraph (Shift+Enter, `w:br`) becomes a space (ADR-0040 §4.5 table) |
| 5 | The EPUB is 28.6 MB, and nothing tells the author | 11 pictures are PNGs of 1.6–2.7 MB. Kindle charges a delivery fee by file size on every sale at the 70% royalty, so a large book costs the author money. The import does not mention picture size |

The “What We Learned” box drawn with ╭──╮ characters is already covered by ADR-0041 (lesson boxes) and is not part of this proposal.

## 2. Part A — no new downloads

### A1. Latin fonts first for books not in Kannada (problem 1)

The PDF font lists depend on the book's language:

- `kn…`: `("Noto Serif Kannada", "Noto Serif")` and `("Noto Sans Kannada", "Noto Sans")` — **unchanged**, so Kannada PDFs stay byte-identical;
- any other language: `("Noto Serif", "Noto Serif Kannada")` and `("Noto Sans", "Noto Sans Kannada")`. Kannada words inside an English book still get the Kannada font (Typst falls back per character).

English PDFs change (digits and punctuation now match the words). Change in `packages/pdf/src/default-profile.ts` and `typst-serializer.ts`.

### A2. Line breaks inside a paragraph start a new paragraph (problem 4)

In a body paragraph or quote, a line break (`w:br` without a type, or `textWrapping`) ends the paragraph and starts another with the same style and formatting. No empty paragraphs are made (a break at the start or end, or two in a row, counts once). In headings, list items, table cells and captions a line break stays a space, as today. Page and column breaks are unchanged.

This amends the ADR-0040 §4.5 table row for `w:br`. The Book Model has no line-break inline, and adding one would be a schema change; separate paragraphs keep each line on its own line in every output.

### A3. A warning when pictures are large (problem 5)

The import adds one warning (“Please check”) when the pictures together are over **10 MB**, or any one picture is over **1 MB**:

> Your 27 pictures add up to 28.7 MB, and 11 are over 1 MB. Large pictures make the ebook large, and Kindle charges a delivery fee by file size on each sale. In Word, use File › Compress Pictures, or save large PNG pictures as JPEG, then import again.

The message names no prices, since store fees change. Change in the importer (`packages/importer/src/docx/`), the same way as the alt-text warning; the desktop app recounts after it refuses any pictures, as it does for alt text.

## 3. Part B — new pinned fonts (problems 2 and 3)

This adds font files to the checksum-pinned PDF runtime (ADR-0013 §6), so it is kept separate from Part A.

- **B1 (italics):** `NotoSerif-Italic[wdth,wght].ttf` and `NotoSans-Italic[wdth,wght].ttf` from `google/fonts` (OFL-1.1, same source and pin style as the four existing fonts). Kannada has no italic tradition, so no Kannada italic is added.
- **B2 (emoji, optional):** `NotoEmoji[wght].ttf`, the monochrome Noto Emoji (OFL-1.1). Emoji print as black-and-white symbols instead of empty boxes. The colour emoji font is not proposed (much larger).

Work: download each file once to record its SHA-256 and size in `inventory.json`; rebuild `.cache/pdf-runtime`; update `docs/release-compliance/FONT-CLEARANCE-DISPOSITIONS.md`, `evidence-inventory.json`, and the packaged-resource test that lists the font files. The Gate 6 CI job downloads the new files automatically. Each font is a few MB; sizes are recorded when pinned.

## 4. Tests

- A1: Typst source for an English book lists Noto Serif first; for a Kannada book it is unchanged (byte-identical to `main`).
- A2: a Word paragraph “With warmth and blessings,⏎The Publisher” becomes two paragraphs, the second still bold; breaks at the edges or doubled make no empty paragraph; a heading, list item and caption with a break keep a space.
- A3: the warning appears over the limits and not under them; the count matches after the desktop app refuses a picture.
- B: the PDF of a book with italic text uses the italic font (checked in the PDF's font list); with B2, an emoji uses Noto Emoji.
- All existing tests pass, including the desktop Word-import end-to-end tests; all 12 workspaces' `npm test`.
- Local check: the maintainer's book again, comparing the PDF before and after.

## 5. Not included

- Lesson boxes and their emoji (ADR-0041).
- Shrinking or converting pictures automatically (would change the author's pictures; a later decision).
- Using the title-page line as the subtitle.
- Fixes in the Word file itself (repeated paragraphs, quote marks, the “Back Cover” text inside Story 25, the Foreword's different book name).
