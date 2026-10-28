# ADR-0040 Slice 5: Word Import Hardening — Implementation Record

- **Status:** Implemented in a Draft PR; merge on explicit authorization
- **Date:** 2026-10-28
- **Parent architecture:** ADR-0040 — Word (.docx) Import (§8 Slice 5)
- **Scope:** Fixes found with the maintainer's real manuscript; end-to-end English and Kannada Word books through import, package Save/Open, autosave, Write's add-chapters, and EPUB/HTML/PDF export; harmful files through the studio; the local check with the maintainer's book; closure.
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-28: “Yes, start Slice 5”, after the local test of the book)

## 1. Fixes found with the maintainer's manuscript

The maintainer's book (a python-docx-generated `.docx` with 25 stories and 27 pictures) was imported locally before this slice. It exposed three gaps, all fixed here:

| Found | Fix |
|---|---|
| The typed “Table of Contents” became Chapter 1. Its lines (“1. The Chariot Lesson - Responsibility & Courage”) are worded differently from the headings (“Story 1: The Chariot Lesson”) | Contents lines are also matched by their core title (`titleKey`: leading “1.”, “Story 1:”, “Chapter IV –”, “ಕಥೆ ೧:” removed, and a trailing “ - subtitle” removed). This works both for removing the page and for finding chapters from it |
| The author came in as “python-docx” | Program and placeholder names (python-docx, docx4j, Apache POI, Aspose, “Microsoft Office User”, “Windows User”, …) are not taken as authors. Info issue `DOCX_AUTHOR_NOT_SET` asks the author to add their name |
| A one-line contents page was never recognised (found by the new end-to-end test) | A contents page with a single line counts when that line names a later heading |

**Correction to earlier wording.** ADR-0040 §4.6 and the Slice 3 record said missing alt text “is reported by Book Doctor”. It is not: ADR-0018 keeps accessibility diagnostics inactive, and only the EPUB engine notes `MISSING_ALT_TEXT` at export. The import now warns itself, with `DOCX_PICTURES_WITHOUT_ALT_TEXT` (“N pictures have no description…”). The automatic-alt-text message no longer promises a book-check reminder.

## 2. End-to-end tests (`wordImportHardening.e2e.test.ts`)

Manuscripts shaped like the maintainer's book are built in the test by `manuscriptDocx` in the shared test fixture, with no content from the real book. Each has a Title paragraph and an unstyled tagline, a title-page picture, a typed contents page worded differently from the headings, an untagged front-matter title, and five stories each with a distinct JPEG picture and alt text.

- **English** (Heading 1 story titles, “python-docx” as creator) and **Kannada** (ಪರಿವಿಡಿ with Kannada page numbers, ಮುನ್ನುಡಿ, bold page-top story titles, a Kannada author):
  - import from the start screen, with a summary in plain language;
  - five chapters and six pictures, the contents page gone;
  - the program name not taken as author; Kannada sets `kn`;
  - package Save, with no placeholder in `book.json` and NFC text;
  - Open in a new studio: same chapters, every image block naming an asset, picture bytes identical;
  - autosave keeps a later edit across another Open;
  - the book check is clean;
  - EPUB carries every picture, HTML writes every picture and story title, and the PDF renderer receives every picture.
- **Write:** a second Word file's chapters and pictures are added to an imported book.
- **Harmful files through the studio:** not a Word file, an older `.doc` or protected file, macro-enabled, billion laughs, main document outside the file, encrypted ZIP, more than 2,000 parts. Each is refused with an author-safe message; the book is unchanged and the stage stays IMPORT. The full container corpus from Slice 1 (ZIP bombs, lying headers, overlaps, XML limits) still runs in the importer suite.

The importer runs 106 tests and the desktop 473. The full repository `npm test` (12 packages, 0 failures) and the desktop build pass locally.

## 3. Local check with the maintainer's book (ADR-0040 §8)

Run locally on 2026-10-28 with `D:\Download\DIGITAL_BOOK_BLOCK.docx`, through the built importer and desktop coordinator. The file was only read and was not committed; a temporary package folder was deleted afterwards.

| Step | Result |
|---|---|
| Import | 25 chapters, 3 front-matter sections (title page with cover picture, Foreword, Publisher's Note), 8,954 words, 27 pictures; under 0.5 s for 28.8 MB |
| Summary | Please check: the title-page section (its tagline is not Subtitle-styled), 27 pictures without alt text. Good to know: no author in the file (python-docx), formatting not imported, contents page removed |
| Package Save → Open | 25/25 chapters, 27/27 pictures, 27/27 assets; picture bytes identical |
| Autosave | an edit kept across another Open |
| Book check | clean |
| EPUB | 28.6 MB, 27/27 pictures; 27 `MISSING_ALT_TEXT` notes |
| HTML | 27/27 pictures |
| PDF | the renderer received 27/27 pictures (Typst itself not run in this check) |

**Not run locally:** EPUBCheck, because there is no Java runtime on this computer and building one downloads about 100 MB (left for the maintainer to approve); Typst PDF rendering; the desktop app's file dialog with this file. In the app, pick the `.docx` copy, because the host refuses files without a `.docx` extension.

**For the author, not OpenBook bugs:** the book has no alt text; “Back Cover” text and picture sit at the end of Story 25 (covers belong to ADR-0038); the tagline is not in Word's Subtitle style.
