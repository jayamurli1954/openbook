# ADR-0041 Slice 3: Lesson Box Controls in Write — Implementation Proposal

- **Status:** Implemented on main (PR #202)
- **Date:** 2026-11-02
- **Parent architecture:** ADR-0041 — Lesson Box (Callout Block) Architecture, §2.3, §7 Slice 3
- **Scope:** Write-step controls to make a lesson box from a paragraph, edit its title, and turn it back into a paragraph; no book-wide conversion (Slice 4)
- **Implementation authorization:** Granted for this slice only; new boxes start with the last title used in the book (maintainer, 2026-11-02: "Last used title")

## 1. Purpose

Since Slices 1–2 (PRs #196, #198), a book can hold lesson boxes and every export draws them. An author still can't make one in the app: the Write editor shows boxes (display only) but has no control to create or change them. This slice adds those controls.

Today:

- the Write toolbar (`WritingStudioToolbar.tsx`) runs commands through `writingStudioToolbarAdapter.ts` and a TipTap command port (`createTipTapEditorCommandPort.ts`): bold, italic, headings, lists, quote, link, undo, redo;
- the `openbookCallout` node (`ui/openbookCalloutNode.ts`, Slice 1) has a `title` attribute and editable inline text; the title is drawn with CSS and can't be changed;
- every editor change flows into the Book through `applyActiveSectionTipTap`, so undo, autosave, and the book check already follow edits;
- toolbar tests drive TipTap JSON and a fake command port; there is no browser editor in the test runner.

## 2. Slice 3 objective

1. **Toolbar button "Lesson box"** (command `toggle-lesson-box`):
   - with the cursor in a **paragraph**, turns that paragraph into a lesson box titled with the default title (§6); its text and formatting are kept
   - with the cursor in a **lesson box**, turns it back into a paragraph and keeps the title as bold text at the start: **What We Learned:** True honesty… — nothing is lost (ADR-0041 §2.3)
   - in a heading, list, quote, or picture, the button does nothing and the status line says "Put the cursor in a paragraph to make a lesson box."
2. **Box title field:** while the cursor is in a lesson box, a small "Box title" field appears beside the toolbar showing the title. Typing changes it (one undo step per change). An empty title is allowed: the box then has no title line.
3. **Commands on the node** (`openbookCallout`, built with the pinned `@tiptap/core`, no new package): `setLessonBox(title)`, `unsetLessonBox()`, `setLessonBoxTitle(title)`. The command port and adapter gain matching methods, following the existing pattern.
4. **Editing inside a box:** Enter at the end of a box starts a normal paragraph below it; Enter in the middle splits the box into two boxes (standard editor behaviour); Backspace at the start of an empty box turns it back into a paragraph.
5. **Guide copy:** the Write step's guide gains one tip: "Put a lesson or tip in a box: click in its paragraph, then Lesson box." Plain-language and internal-term checks apply.
6. **Undo/redo** work for every change through the editor's history, and the Book follows through the existing editor → Book path.

## 3. Explicit exclusions

- Book-wide "turn matching paragraphs into lesson boxes" (Slice 4)
- Design-step choices for the box's look; colours, icons, or box kinds
- Multi-paragraph boxes, lists or pictures inside a box
- A keyboard shortcut (can follow if wanted)
- Any Book Model, engine, or dependency change

## 4. Acceptance criteria

- a paragraph becomes a lesson box with the default title, keeping its text and bold/italic/links; the Book then holds a `callout` block
- turning a box back gives a paragraph starting with the title in bold followed by ": ", then the original text; a box with no title becomes a plain paragraph
- the title field shows the current box's title and changes it; clearing it removes the title line in Write and in every export
- the button is refused with a plain message outside paragraphs and boxes
- undo and redo restore each step; autosave picks up the change when the book is saved to a folder
- Kannada text and titles are kept exactly
- the toolbar and title field contain no internal terms
- checked in the running app (browser pane): make a box, edit the title, type in it, press Enter at its end, turn it back, undo
- desktop `npm test`, the app build, and CI pass; diff stays within Slice 3

## 5. Expected files

- `apps/desktop/src/ui/openbookCalloutNode.ts` (commands)
- `apps/desktop/src/host/createTipTapEditorCommandPort.ts`, `apps/desktop/src/workflow/domain/writingStudioToolbarAdapter.ts`, `writingStudioContract.ts` (new command and its label)
- `apps/desktop/src/ui/WritingStudioToolbar.tsx` (button, title field), `apps/desktop/src/EditorSurface.tsx` (wiring), `App.css`
- `apps/desktop/src/workflow/domain/studioShellGuide.ts` (one tip)
- tests: toolbar adapter, a TipTap-JSON round trip for make/unmake, source-shape UI tests, guide copy
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-LESSON-BOX-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Decision for the maintainer

**What title should a new box start with?**

- **Recommended: the title of the last box made in this book, or "What We Learned" for the first.** In your book every box gets the same title without retyping, and authors of other books change it once and then keep their own.
- **Alternative: always "What We Learned".** Simple, but authors with tips or notes retype the title for every box.
- **Alternative: no title.** The box starts untitled and the author types one when wanted.
