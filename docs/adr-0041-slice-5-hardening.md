# ADR-0041 Slice 5: Lesson Box Hardening and Closure — Implementation Proposal

- **Status:** Implemented on main (PR #206)
- **Date:** 2026-11-02
- **Parent architecture:** ADR-0041 — Lesson Box (Callout Block) Architecture, §4 invariants, §7 Slice 5
- **Scope:** End-to-end English and Kannada tests of the whole lesson-box path; the maintainer's cleaned book with its 25 lessons converted in the app's own flow; the Kindle Previewer check; small Write-panel fixes; closure of the ADR-0041 sequence
- **Implementation authorization:** Granted for this slice only; close without waiting for the Kindle Previewer check (maintainer, 2026-11-02: "Close without waiting")

## 1. Purpose

Prove that the four lesson-box slices work together as a book moves through the studio, the project package, autosave, and all three exports, then close ADR-0041. Fix anything this turns up.

Already in place:

- PR #196: the `callout` block, `schemaVersion` 2, and the 1 → 2 upgrade.
- PR #198: EPUB, HTML, and PDF boxes.
- PR #202: the Write-step controls (Lesson box button, Box title field).
- PR #204: book-wide conversion and `BookSession.replaceSectionsBlocks`.

Each slice was tested on its own. Slice 2 checked that books without boxes export byte for byte as before. What has not been tested is a whole book with boxes, written in the app, saved, reopened, autosaved, and exported.

## 2. Slice 5 objective

1. **End-to-end tests** (`apps/desktop/src/workflow/domain/lessonBoxHardening.e2e.test.ts`). They follow `coverWizardHardening.e2e.test.ts` and use the real coordinator. Each test runs for an **English** book and a **Kannada** book (box titles "What We Learned" and "ನಾವು ಕಲಿತದ್ದು"), each with three chapters, a picture, and labelled paragraphs:
   - **Convert:** run the book-wide conversion; the count matches the labelled paragraphs, and other paragraphs, headings, and the picture are unchanged.
   - **Edit:** edit one box through the editor path: change its title, turn it back into a paragraph, then make it a box again.
   - **Save → Open:** save the package to a temporary folder; `book.json` is version 2 and holds the boxes. Opening it in a new studio gives an identical Book (Kannada matched code point for code point).
   - **Autosave:** with a package folder bound, convert in a second chapter, then open the package again and find the new boxes.
   - **Older books:** a version 1 package (no boxes) opens as version 2 and converts. The file on disk stays version 1 until Save.
   - **Book check:** clean with boxes. A box with neither title nor text is refused with the Book unchanged (invariant 1).
   - **Exports from the reopened book:**
     - EPUB, HTML, and Typst source have one box per callout, with the title.
     - The EPUB passes EPUBCheck when the local runtime is present (CI skips EPUBCheck, as today).
   - **No boxes:** a book without boxes exports byte for byte as on the pre-ADR-0041 main (`4a06d32`). This repeats Slice 2's check once all slices have landed (invariant 2).
2. **Invariant guards.** The closure record reconciles these against ADR-0041 §4:
   - no npm dependency, Tauri command, or permission was added since `4a06d32` (the `package.json` files and capabilities are compared)
   - the conversion is one undo step and leaves non-matching blocks untouched (invariant 6, already unit-tested; restated in the e2e test)
3. **Write-panel fixes found in Slice 4:**
   - the panel's Find button and Label field get the same style as the Find-in-book row
   - the "Turn into lesson boxes" button gets the step's button style
   - no behaviour change
4. **Local check with the maintainer's real book.** It is recorded in the closure record and nothing from it is committed:
   - import `Little_Krishnas_Wisdom_cleaned.docx` through the built coordinator and convert the 25 lessons through the panel's functions
   - Save → Open, then export all three formats
   - run EPUBCheck 5.3.0 on the EPUB and render the PDF with Typst 0.15.1; look at a page with a box
   - the Word file is only read; temporary folders are deleted afterwards
5. **Kindle Previewer check (manual, by the maintainer):** open the exported EPUB in Kindle Previewer and note whether the boxes show their frame and title on tablet and phone views. I'll supply the file and the steps. The result goes in the closure record, or "not run" if it hasn't been done by merge time (see §6).
6. **Closure:**
   - `docs/adr-0041-closure-reconciliation.md`: slice reconciliation, invariants, the local and Kindle results, and what stays deferred
   - the ADR-0041 status set to "Slices 1–5 implemented; sequencing closed"
   - status docs updated

## 3. Explicit exclusions

- A Design-step "lesson box look" choice (ADR-0041 §2.6; a later slice or ADR)
- Detecting labels during Word import (ADR-0041 §2.5)
- Choosing which matches to convert; several labels at once
- Fixing Kindle-specific box rendering, if found (needs its own authorization)
- The Design Studio autosave gap (`updateTheme`/`updateTypography` are not session mutators; separate fix)
- CI changes for EPUBCheck

## 4. Acceptance criteria

- The English and Kannada end-to-end tests pass every step in §2.1.
- Boxes survive conversion, editing, Save → Open, and autosave → Open unchanged.
- A version 1 package opens and converts.
- Exports from a reopened book contain each box once with its title.
- A book without boxes exports byte for byte as at `4a06d32`.
- No new npm dependency or Tauri permission since `4a06d32`.
- The panel's controls look like the rest of the Write step.
- The local real-book check is recorded: lesson count, Save/Open, EPUBCheck result, PDF page count, and any issues found.
- The Kindle Previewer result is recorded, or marked "not run".
- Desktop `npm test`, the full repository `npm test`, and CI pass.
- The diff stays within Slice 5.

## 5. Expected files

- `apps/desktop/src/workflow/domain/lessonBoxHardening.e2e.test.ts` (new)
- `apps/desktop/package.json` (add the test to the `test` script)
- `apps/desktop/src/ui/LessonBoxConversionPanel.tsx` and `App.css` (styling only)
- fixes in the lesson-box modules, if the tests or the real-book check find problems
- `docs/adr-0041-closure-reconciliation.md` (new), `docs/adr/0041-lesson-box-callout-block-architecture.md` (status line)
- status docs:
  - this proposal
  - a `docs/conversations/` record
  - `docs/IMPLEMENTATION-BACKLOG.md`
  - `docs/PHASE-1-LESSON-BOX-SELECTION.md`
  - `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
  - `PROJECT-CONTEXT.md`
  - `docs/README.md`

## 6. Decision for the maintainer

**Should closing ADR-0041 wait for your Kindle Previewer check?**

- **Recommended: close without waiting; record "not run" if needed.** This matches the Cover Wizard closure (ADR-0038 Slice 6). Everything else is checked automatically, and the EPUB passes EPUBCheck. If Kindle later shows a problem with the boxes, the fix is a small separate change.
- **Alternative: wait.** Closure stays open until you have looked at the boxes in Kindle Previewer. This is the safer choice if you plan to upload the boxed book to KDP soon, because Kindle is where readers will see it.
