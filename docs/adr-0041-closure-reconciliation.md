# ADR-0041 Lesson Box (Callout Block) — Closure & Reconciliation

- **Status:** Implementation-complete (Slice 5 merged in PR #206, `92674f4`); closure/reconciliation record
- **Date:** 2026-11-02
- **Baseline:** `main` after ADR-0041 Slice 4 status reconcile (PR #205, `60b2947`) plus Slice 5; pre-ADR-0041 `main` is `4a06d32`
- **Authority:** ADR-0041 — Lesson Box (Callout Block) Architecture
- **Implementation authorization:** Completed for the five approved ADR-0041 slices; no further ADR-0041 slice is authorized by this record

## 1. Purpose

Reconcile the ADR-0041 implementation against the accepted architecture and close the lesson-box slice sequence.

This record does not authorize:

- a Design-step "lesson box look" choice
- box kinds, colours, or icons
- multi-paragraph boxes
- detecting labels during Word import
- a Kindle-specific box change

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| — | Selection + ADR-0041 | Accepted — PR #192 (status PR #193) |
| 1 | Model and contract: `callout` block, validation, `schemaVersion` 2 with the 1 → 2 upgrade, editor round trip | Done — PR #196 (status PR #197) |
| 2 | Publishing: EPUB, HTML, and PDF boxes; styles only when a book has a box | Done — PR #198 (status PR #199) |
| 3 | Write controls: Lesson box button, Box title field, node commands | Done — PR #202 (status PR #203) |
| 4 | Book-wide conversion: Write panel, `BookSession.replaceSectionsBlocks` | Done — PR #204 (status PR #205) |
| 5 | Hardening: English and Kannada end to end, panel styling, real-book check, closure | Done — PR #206 (status PR closes the sequence) |

## 3. Architectural invariants (ADR-0041 §4)

1. **Every callout edit yields a valid Book or a structured fail-closed error with the Book unchanged.**
   - Validation codes `callout-title-not-text`, `callout-inlines-not-array`, `empty-callout`.
   - The end-to-end tests check that a box with neither title nor text is refused and the Book is unchanged.
   - A rejected `replaceSectionsBlocks` batch changes nothing (authoring test).
2. **A Book without callouts produces byte-identical EPUB, HTML, Typst source, and PDF.**
   - Slice 2 compared each engine against `main` before it: identical.
   - Repeated here with the maintainer's whole book, with no boxes, against engines built from `4a06d32`:
     - EPUB and HTML are byte-identical.
     - The Typst source differs only in its two font-list lines, and so the PDF differs too. Those lines were changed on purpose by the book-test fixes (PR #200, `0c47ff3`: font order and emoji), not by ADR-0041.
     - The remaining 741 lines are identical, and no `ob-callout` style or box appears.
3. **Book → Semantic Document → editor → Book is lossless for callouts (title, inlines, ids), English and Kannada.**
   - Covered by the Slice 1 round-trip tests and the Slice 3 editing tests.
   - The end-to-end tests retitle a box, turn it back into a paragraph, and box it again through the editor path.
4. **Callouts survive package Save → Open and autosave unchanged.**
   - In the English and Kannada end-to-end tests, the reopened Book serializes identically, Kannada titles included.
   - A conversion made with a package bound is written by autosave and found after Open.
   - A version 1 package opens as version 2 and converts.
5. **EPUBs with callouts pass EPUBCheck 5.3.0 with zero errors and warnings.**
   - Checked in Slice 2, in Slice 4, and here with the real book's 25 boxes.
   - Run locally; the CI `test` job has no EPUBCheck runtime.
6. **The book-wide conversion changes only paragraphs that start with the label, is one undo step, and reports the count before it runs.**
   - Unit tests (Slice 4) and the end-to-end tests: quotes and pictures are untouched, the revision rises by one, and one undo restores the exact Book.
   - The panel converts exactly the matches it showed.
7. **No new npm dependency, Tauri permission, or frozen pin change.**
   - Since `4a06d32`, the only change to any `package.json` is the desktop `test` script listing new test files.
   - Nothing under `apps/desktop/src-tauri` changed, and `package-lock.json` is unchanged.
8. **No AI dependency.** None added.

## 4. Local check with the maintainer's book

Run locally on 2026-11-02 with `Little_Krishnas_Wisdom_cleaned.docx` through the built desktop modules:

- The Word file was only read, and the temporary package folder was deleted afterwards.
- Nothing from the check was committed.
- The boxed EPUB was saved for the Kindle check as a new file next to the Word file (§6).

| Step | Result |
|---|---|
| Word import | 25 chapters, 4 front-matter sections, 26 pictures, no boxes |
| Panel label | Prefilled "What We Learned:" (no boxes yet, so the default title) |
| Find | 25 paragraphs (one per story); the Publisher's note, which mentions "What We Learned" mid-paragraph, is not matched |
| Convert | 25 boxes titled "What We Learned", one Book change |
| Package Save → Open | Book identical; 25 boxes |
| EPUB | EPUBCheck 5.3.0: 0 fatals, 0 errors, 0 warnings, 0 infos |
| HTML | 25 boxes |
| PDF | Typst 0.15.1: 73 pages, 25 boxes; page 10 checked visually: the frame, the bold title, and the lesson text, kept on one page |

## 5. Found during this slice

The Write panel's controls looked unlike the rest of the step, and its match list ran a few pixels past the panel's edge. Fixed with styling only:

- the Label field and buttons now match the Find-in-book row
- "Turn into lesson boxes" uses the step's button style
- the match list stays inside the panel

Checked in the running app. No other problems were found.

## 6. Kindle Previewer

Not run by the time of closure; the maintainer chose to close without waiting ("Close without waiting", 2026-11-02). The maintainer ran it the same day, after the merge; the result is recorded here.

- **File:** the real book's EPUB with 25 boxes (§4), kept locally beside the maintainer's Word file.
- **Tool:** Kindle Previewer 4, Enhanced Typesetting on; 431 locations.
- **Checked:** the end of Stories 1 and 2 on Tablet, Phone, and Kindle E-reader, at text sizes 4, 7, and 8.

| Device | Size 4 | Size 7 | Size 8 |
|---|---|---|---|
| Tablet | Frame, bold title, text inside | Same; box moved whole to the next page | Same |
| Phone | Frame, bold title, text inside | Same | Same; box moved whole to its own page |
| Kindle E-reader | Frame (black on e-ink), bold title, text inside | Same | Same |

Result: the lesson boxes render correctly everywhere checked and are never split across pages; Kindle draws the corners squarer than the PDF, which is expected. No Kindle-specific change is needed.

Seen at the same time, unrelated to lesson boxes: at size 8, a story's full-width picture moves to the page after its heading and "Value:" line, because they no longer fit on one screen. This is ordinary Kindle reflow of large pictures. Limiting a picture's height to a share of the screen would keep them together at large sizes; that is an EPUB engine change for all pictures and needs its own proposal (§7).

## 7. Still deferred

- Keeping a story's heading and picture on one screen at large Kindle text sizes (limit picture height; EPUB engine change, see §6)

- A Design-step "lesson box look" choice (ADR-0041 §2.6)
- Detecting labels during Word import (ADR-0041 §2.5)
- Choosing which matches to convert; several labels at once
- Running EPUBCheck in CI
- The Design Studio autosave gap (`updateTheme`/`updateTypography` are not session mutators)
- Webview Content Security Policy (`"csp": null`)
