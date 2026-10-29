# ADR-0038 Slice 6: Cover Wizard Hardening and Closure — Implementation Proposal

- **Status:** Implemented on main (PR #185)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0038 — Phase 1 Cover Wizard Architecture (Image Cover), §3 Slice 6 and §4 invariants
- **Scope:** End-to-end English and Kannada tests of the whole cover path; a local check with the maintainer's real book; the Kindle Previewer check; closure of the ADR-0038 sequence
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-29)

## 1. Purpose

Prove that the five cover slices work together as a book moves through the studio, the project package, autosave, and all three exports, then close ADR-0038. Fix anything this turns up.

Already in place (PRs #163, #177, #179, #181, #183): the cover field and validation; image checks; the Cover step; EPUB, HTML, and PDF covers. Each slice was tested on its own. What has not been tested is a whole book going through every step with a cover, and reopened from disk.

The project package writes every asset on `Book.assets`, not only those chapters use (`packageAssetMapping.ts`), so a cover picture should survive Save and Open. Slice 6 proves it.

## 2. Slice 6 objective

1. **End-to-end tests** (`apps/desktop/src/workflow/domain/coverWizardHardening.e2e.test.ts`), following `metadataWizardHardening.e2e.test.ts` and `wordImportHardening.e2e.test.ts`. For an **English** and a **Kannada** book, each with chapters and one chapter picture:
   - add a cover through the Cover Wizard fields port (picker faked; real coordinator), with a description in the book's language
   - package Save to a temporary folder; check `book.json` holds only `publishing.coverAssetId` plus the ordinary asset entry, and the package stores **no cover page or cover document** (no `cover.xhtml`, HTML, or PDF page) — ADR-0038 invariant 4
   - Open in a new studio: the cover, its description (Kannada code point for code point), and its picture bytes are identical
   - autosave: replace the cover with a package folder bound, then Open again and find the new cover; the old picture is gone because no chapter used it
   - removing the cover picture while it is still the cover fails and leaves the Book unchanged; after the cover is removed, the picture can be removed
   - Book check is clean with a cover
   - export EPUB, HTML, and PDF from the reopened book: each contains the cover once (EPUB `cover-image` plus cover page; HTML `figure.book-cover`; PDF cover page in the Typst source)
   - a book with no cover still exports with no cover parts
2. **Invariant guards**, reconciled in the closure record against ADR-0038 §4:
   - the check modules never change picture bytes (bytes compared before and after)
   - the cover slices added no npm dependency and no Tauri command or permission (`package.json` and capabilities compared against the pre-ADR-0038 baseline, `af4ca6e`)
3. **Local check with the maintainer's real book** (recorded in the closure record, not committed): import the KDP Word file through the built coordinator, set its cover picture through the fields port, then Save → Open → export all three formats. Run EPUBCheck 5.3.0 on the EPUB and render the PDF with Typst 0.15.1, both installed on this machine. The file is only read; temporary folders are deleted afterwards.
4. **Kindle Previewer check (maintainer, manual):** open the exported EPUB of the real book in Kindle Previewer and note whether the cover appears once or twice. The agent supplies the file and the steps; the result goes in the closure record. If it appears twice, the fix is a later, separately authorized change (see §6).
5. **Closure:** `docs/adr-0038-closure-reconciliation.md` with slice reconciliation, invariants, the local and Kindle results, and what stays deferred; ADR-0038 status set to "Slices 1–6 implemented; sequencing closed"; status docs updated.

## 3. Explicit exclusions

- Fixing a doubled Kindle cover, if found (separate authorization)
- A "leave the cover out" PDF option for print interiors (print work, Phase 2)
- Using a picture already in the book as the cover (the Cover step picks files only)
- Generated covers, cover text, print wraps, AI covers (ADR-0038 non-goals)
- The Design Studio autosave gap (recorded in the Slice 1 proposal §6; separate fix)
- CI changes for EPUBCheck

## 4. Acceptance criteria

- the English and Kannada end-to-end tests pass every step in §2.1
- the package holds no generated cover page or document; the cover survives Save → Open and autosave → Open with identical bytes and description
- removing the current cover's picture fails closed
- exports from a reopened book contain the cover exactly once in each format; a book with no cover exports none
- no new npm dependency or Tauri permission since `af4ca6e`
- the local real-book check is recorded: chapter and picture counts, Save/Open, EPUBCheck result, PDF page count, and any issues found
- the Kindle Previewer result is recorded, or marked "not run" if the maintainer has not run it by merge time
- desktop `npm test`, the full repository `npm test`, and CI pass
- diff stays within Slice 6

## 5. Expected files

- `apps/desktop/src/workflow/domain/coverWizardHardening.e2e.test.ts` (new)
- `apps/desktop/package.json` (add the test to the `test` script)
- fixes in the cover modules, if the tests or the real-book check find problems
- `docs/adr-0038-closure-reconciliation.md` (new), `docs/adr/0038-phase-1-cover-wizard-architecture.md` (status line)
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-COVER-WIZARD-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Notes for the maintainer

1. **Kindle Previewer** is a free Amazon desktop app; I can't run it here. When the real-book EPUB is ready, I'll give you its path and the steps. If the cover shows twice, the usual fix is to keep the `cover-image` marking and drop the cover page from the reading order for Kindle-bound files. That needs its own decision.
2. **Your Word book already has the cover picture on its title page.** The Word import puts it in a front-matter "title page" section. If you also set that picture as the cover, the EPUB and PDF will show it twice in a row: once as the cover, once on the title page. That is a content choice, not a bug. The real-book check will show what it looks like, and you can delete the picture from the title page in the Write step.
