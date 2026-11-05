# Conversation Record — ADR-0041 Slice 5: lesson box hardening and closure

- **Date:** 2026-11-02
- **Participants:** Maintainer + coding agent
- **Topic:** Prove the lesson-box slices work together; close ADR-0041
- **Related:** `docs/adr/0041-lesson-box-callout-block-architecture.md` §4, §7; `docs/adr-0041-slice-5-hardening.md`; `docs/adr-0041-closure-reconciliation.md`

## Context

Slices 1–4 (PRs #196, #198, #202, #204) were each tested on their own. The proposal asked whether closure should wait for the maintainer's Kindle Previewer check. The maintainer chose "Close without waiting".

## Decisions

1. **End-to-end tests** (`lessonBoxHardening.e2e.test.ts`), for an English book and a Kannada book:
   - conversion through the panel's functions
   - editing through the editor path
   - package Save → Open, and autosave
   - the empty-box refusal and the book check
   - EPUB, HTML, and Typst exports from the reopened book
   - a version 1 package that opens and converts
2. **Panel styling only:** the Label field and buttons match the Find-in-book row; the match list stays inside the panel.
3. **No-box byte identity** is checked locally against engines built from `4a06d32`, the `main` before ADR-0041.
4. **Kindle Previewer** was recorded as "not run" at merge. The maintainer then ran it (Kindle Previewer 4): boxes correct on Tablet, Phone, and E-reader at text sizes 4, 7, and 8, never split. At size 8, story pictures move to the page after their heading — ordinary reflow, unrelated to boxes, noted as a possible picture-height change.
5. **ADR-0041** is marked "Slices 1–5 implemented; sequencing closed".
6. **Process:** Draft PR → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `feat/adr-0041-slice-5-hardening`.
- Merged as PR #206 (merge commit `92674f4`) on 2026-11-02 after the maintainer authorized the merge; all four checks passed. ADR-0041 is closed.
- The new end-to-end tests pass (3), and the full repository `npm test` passes.
- **Real-book check:**
  - 25 lessons were converted into 25 boxes, and Save → Open gave an identical Book.
  - EPUBCheck reported nothing (0 fatals, 0 errors, 0 warnings, 0 infos).
  - The PDF has 73 pages and 25 boxes; a boxed page was checked by eye.
- **No-box identity:**
  - EPUB and HTML are byte-identical to `4a06d32`.
  - The Typst source differs only in the two font-list lines from PR #200.
- **No dependency or permission changes:** the only `package.json` change is the desktop test script; nothing under `src-tauri` changed.
