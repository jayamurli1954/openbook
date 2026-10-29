# Conversation Record — Lesson box (callout block) selection and ADR-0041

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** Can the Design step insert text boxes, and can OpenBook design picture-book pages?
- **Related:** `docs/PHASE-1-LESSON-BOX-SELECTION.md`; `docs/adr/0041-lesson-box-callout-block-architecture.md`

## Context

After cleaning up the maintainer's 25-story book (each story ends with a "What We Learned" lesson), the maintainer asked whether the Design step can insert text boxes, and whether pages can be designed like three picture-book examples (text on full-page illustrations, two-page spreads).

The agent checked the code: the Design step sets theme and typography only; the Book Model has no box block; page layout (text frames, fixed layout) is ROADMAP Phase 2 and not started. It suggested a semantic lesson box now, and a fixed-layout tool for a picture-book edition until Phase 2. The maintainer asked for the ADR ("Draft the ADR").

## Decisions

1. A semantic `callout` block: plain-text title plus one paragraph; one look for all boxes.
2. Rendered in EPUB, HTML, and PDF; styles only when the book has a callout, so other books stay byte-identical; no background colour, for night modes.
3. Writing Studio: make, remove, and book-wide convert ("Turn matching paragraphs into lesson boxes"). Import stays unchanged.
4. Picture-book layouts and positioned text boxes are out of scope (Phase 2).
5. `schemaVersion`: the maintainer chose to bump to 2 with an identity 1 → 2 migration ("Yes, bump to 2").
6. Process: Draft PR → CI/DCO → merge only on the maintainer's authorization; each slice separately authorized.

## Outcomes

- Branch `docs/lesson-box-selection-adr`.
- Merged as PR #192 (merge commit `f64c86a`) on 2026-10-29 after the maintainer authorized the merge; all four checks passed. ADR-0041 accepted; no slice authorized.
