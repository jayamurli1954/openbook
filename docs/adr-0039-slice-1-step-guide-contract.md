# ADR-0039 Slice 1: Step and Guide Contract — Implementation Proposal

- **Status:** Implemented on main (PR #155)
- **Date:** 2026-10-14
- **Parent architecture:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Scope:** Step model, step status, book progress, and Guide content for all six steps; no chrome
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-14)

## 1. Purpose

Give the studio shell a tested, chrome-free source for its six steps and the help shown at each one. Later slices render it; this slice decides what it says.

## 2. Slice 1 objective

1. `apps/desktop/src/workflow/domain/studioShellContract.ts`:
   - `STUDIO_STEPS`: Write, Structure, Design, Details, Cover, Publish, in that order
   - `deriveStudioStepStatuses(snapshot)` from the Book, the book word count, the last Book Doctor summary, and cover availability:

     | Step | Status rule |
     |---|---|
     | Write | no words → Not started; else "N words" (in progress) |
     | Structure | any untitled part → "N untitled" (attention); else "N parts" (done) |
     | Design | default theme → "Default look"; else the theme name (done) |
     | Details | title or language blank → attention; missing author or description → "N to fill"; else Complete |
     | Cover | until ADR-0038 → "Coming soon"; then Not added / Added |
     | Publish | not checked → Not checked; errors → "N things to fix"; warnings → "N warnings"; else Ready |

   - `deriveStudioProgress` (done steps out of available steps; "coming soon" steps don't count), `nextStudioStep`, `isStudioStepId`
2. `apps/desktop/src/workflow/domain/studioShellGuide.ts`:
   - per step: introduction, checklist, tips, and questions
   - checklist items tick themselves off from the Book where OpenBook can tell (for example "A short description" is done when the description is filled)
   - `findInternalTerms` and `allStudioGuideCopy` so tests keep every guide string free of internal terms
3. Status is advisory. Every step stays reachable.
4. Tests only. No React chrome.

## 3. Copy decisions

- The guide describes the shell being built (for example "Add chapter in the outline"); it is rendered from Slice 5, after the outline exists (Slice 3).
- Statements match current behaviour: autosave only after the book is saved to a folder; warnings do not block export, errors do (Book Doctor `isClean`); the ebook table of contents is generated.
- The Cover guide says covers are coming soon and that publishing without one is fine, until ADR-0038 lands.

## 4. Explicit exclusions

- Any chrome, layout, or CSS (Slices 2–6)
- Persisting Guide or Focus preferences
- AI help
- Translation of guide copy

## 5. Acceptance criteria

- six steps in order; next step; Publish has no next
- a new book, a finished Kannada book, and a book with problems each produce the expected statuses and progress
- every step has an intro, at least one checklist item, tip, and question
- checklists tick off from the Book
- no guide copy or status text contains internal terms
- shell modules import no React, Tauri, TipTap, file system, or coordinator
- desktop `npm test` / CI pass
- diff stays within Slice 1 (plus the test-determinism fix below)

## 6. Also in this PR: test determinism fix

`metadataWizardHardening.e2e.test.ts` (ADR-0037 Slice 3) failed intermittently on Windows: binding a book with unsaved edits schedules an autosave, which could fire during the test's explicit Save and rewrite the package while the test was reading it. The test now uses a fake autosave clock. The underlying product race between explicit Save and autosave is recorded as a separate follow-up and is not changed here.
