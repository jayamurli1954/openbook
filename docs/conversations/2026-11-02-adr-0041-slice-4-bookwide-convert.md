# Conversation Record — ADR-0041 Slice 4: turn labelled paragraphs into lesson boxes

- **Date:** 2026-11-02
- **Participants:** Maintainer + coding agent
- **Topic:** One Write-step action that boxes every paragraph starting with a label
- **Related:** `docs/adr/0041-lesson-box-callout-block-architecture.md` §2.3, §7; `docs/adr-0041-slice-4-bookwide-convert.md`

## Context

Slice 3 (PR #202) lets an author box lessons one at a time. Books imported from Word keep their lessons as paragraphs ("**What We Learned:** …"), 25 of them in the maintainer's book. The proposal asked whether the box title should be the label as typed or always the last-used title; the maintainer chose "Label as typed".

## Decisions

1. Matching (`lessonBoxConversion.ts`, free of TipTap and React): a paragraph matches when its text, after leading spaces, starts with the label at a word boundary; case, curly/straight quotes, Unicode form, and the label's trailing colon don't matter. Headings, quotes, lists, pictures, and existing boxes never match.
2. Each match becomes a callout titled with the label as typed, without its trailing colon; its text is what follows the label, colon, and spaces, with formatting kept even when the label and text share a run. A label-only paragraph becomes a title-only box.
3. `BookSession.replaceSectionsBlocks(changes)` applies every changed section in one mutation: one undo step, validated once, all or nothing. It is a session mutator, so autosave and the book check follow it.
4. Write panel "Lesson boxes from labelled paragraphs": Label prefilled with the last box title plus a colon; Find lists the count and where (first 10, then "and N more"); "Turn into lesson boxes" converts and offers Undo until the next edit. Typing in the open chapter is moved into the Book first; the chapter is reloaded afterwards.
5. No Book Model, engine, import, or dependency change.
6. Process: Draft PR → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `feat/adr-0041-slice-4-bookwide-convert`.
- Merged as PR #204 (merge commit `5d0d354`) on 2026-11-02 after the maintainer authorized the merge; all four checks passed.
- Desktop `npm test` passes (541); authoring tests pass; the app builds.
- Real-book check (local, not committed): `Little_Krishnas_Wisdom_cleaned.docx` imported; the prefilled label "What We Learned:" found 25 matches and converted them in one revision to 25 boxes titled "What We Learned"; one undo restored the book exactly; the EPUB passed EPUBCheck 5.3.0 with no messages and holds 25 `ob-callout` boxes.
- Checked in the running app (Vite, browser pane): Find listed 2 matches (a bold label and a lowercase one, not "Remember:"); converting showed both boxes in the open chapter with "Turned 2 paragraphs into lesson boxes." and Undo; Undo restored the paragraphs exactly; after converting again, typing in the editor removed the Undo button; "Moral:" gave "No paragraphs start with “Moral:”."
