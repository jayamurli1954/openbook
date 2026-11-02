# ADR-0041 Slice 4: Turn Labelled Paragraphs into Lesson Boxes — Implementation Proposal

- **Status:** In progress (this PR)
- **Date:** 2026-11-02
- **Parent architecture:** ADR-0041 — Lesson Box (Callout Block) Architecture, §2.3 (book-wide action), §4 invariant 6, §7 Slice 4
- **Scope:** one Write-step action that finds every paragraph starting with a label (e.g. "What We Learned:"), shows how many and where, and turns them all into lesson boxes as one undoable change
- **Implementation authorization:** Granted for this slice only; box title is the label as typed (maintainer, 2026-11-02: "Label as typed")

## 1. Purpose

Books imported from Word keep their lessons as ordinary paragraphs ("**What We Learned:** True honesty…"). Slice 3 (PR #202) lets an author box them one at a time. With 25 stories that is 25 clicks plus retyping titles. This slice does it in one action. It is explicit: the author types the label and sees the count first. Import stays unchanged (ADR-0041 §2.5).

Today:

- `BookSession` changes one section at a time (`setSectionBlocks`); each call is its own undo step;
- the Write step's visible Undo is the editor's own history (TipTap), which only knows about edits made in the editor. A change made to the Book from outside the editor can't be undone there;
- after a Book change outside the editor, the Write step reloads the chapter into the editor with `setContent(…, { emitUpdate: false })` (as after "Insert image");
- the Find panel (`WritingStudioFindPanel.tsx`) already searches Book text across sections.

## 2. Slice 4 objective

1. **Matching rule** (`apps/desktop/src/workflow/domain/lessonBoxConversion.ts`, free of TipTap and React):
   - a block matches when it is a **paragraph** whose text, after leading spaces, starts with the label. Matching ignores case and treats curly and straight quotes alike; the trailing colon in the label is optional ("What We Learned" also matches "What We Learned:")
   - only paragraphs, never headings, quotes, lists, existing boxes, or pictures
   - `findLabelledParagraphs(book, label)` → each match's section, chapter title, and a short excerpt
   - `convertLabelledParagraphs(book, label)` → the new blocks for each changed section. Each match becomes `{ type: "callout", title, inlines }`: `title` is the label as typed, without its trailing colon; `inlines` is the paragraph's text after the label and any following colon and spaces. Bold, italics, and links in the remaining text are kept, even when the label and the text share a formatted run
   - a paragraph that is only the label (nothing after it) becomes a box with that title and no text
   - Kannada and other scripts are compared in Unicode normal form (NFC); the text itself is kept exactly
2. **One change, one undo:** a new `BookSession.replaceSectionsBlocks(changes)` applies the blocks for several sections in **one** mutation, so the whole conversion is one undo step in the Book, validated once (all or nothing).
3. **Write-step panel "Lesson boxes from labelled paragraphs"**, next to Find:
   - a **Label** field, prefilled with the last lesson-box title used in the book plus a colon (Slice 3), e.g. "What We Learned:"
   - **Find** shows "25 paragraphs start with “What We Learned:”" and lists where (chapter and a short excerpt; the first 10, then "and 15 more")
   - **Turn into lesson boxes** converts them all, then says "Turned 25 paragraphs into lesson boxes." with an **Undo** button
   - **Undo** restores the book exactly; it stays available until the next edit, because the editor's own Undo can't reach a change made outside it
   - before converting, unsaved typing in the open chapter is moved into the Book (the existing flush); afterwards the open chapter is reloaded so the editor shows the boxes
   - when nothing matches: "No paragraphs start with “…”." Nothing changes
4. Autosave and the book check follow the change through the existing session-mutation hooks.

## 3. Explicit exclusions

- Converting during Word or Markdown import
- Matching anywhere but the start of a paragraph; regular expressions; several labels at once
- Choosing which matches to convert (all or none in this slice)
- Design-step choices for the box's look
- Any Book Model, engine, or dependency change

## 4. Acceptance criteria

- matching: case and quote style ignored; colon optional; leading spaces ignored; only paragraphs; existing boxes untouched; Kannada labels match
- conversion keeps the remaining text's formatting, including when the label is bold and the text is not, or the label and text share one run
- the whole conversion is one Book mutation: one undo restores the exact previous book; a validation failure changes nothing
- the panel shows the count and where before anything changes; the result message and Undo appear after
- Undo is offered only until the next edit, and works after the open chapter is reloaded
- typing in the open chapter just before the conversion is not lost
- **real-book check (local, not committed):** the maintainer's cleaned Word file imported; the panel's logic finds 25 matches for "What We Learned:" and converts them; exports pass EPUBCheck with 25 boxes (the same result Slice 2 reached with a script)
- checked in the running app (browser pane): Find, convert, see the boxes in the open chapter, Undo
- desktop `npm test`, the app build, and CI pass; diff stays within Slice 4

## 5. Expected files

- `packages/authoring/src/book-session.ts`, `types.ts` (`replaceSectionsBlocks`), `authoring.test.ts`
- `apps/desktop/src/domain/desktopStudioCoordinator.ts` (session-mutator list)
- `apps/desktop/src/workflow/domain/lessonBoxConversion.ts` and tests (new)
- `apps/desktop/src/ui/LessonBoxConversionPanel.tsx` (new), `EditorSurface.tsx`, `App.css`
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-LESSON-BOX-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Decision for the maintainer

**Should the box title be the label as typed, or always the last-used title?**

- **Recommended: the label as typed, without its colon.** Typing "What We Learned:" gives boxes titled "What We Learned"; typing "Remember:" gives "Remember". What you search for is what you get.
- **Alternative: always the last-used title.** The label is only for finding paragraphs, and every box gets the same title. Useful only when the paragraphs' labels differ from the box title you want.
