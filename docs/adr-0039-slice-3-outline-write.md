# ADR-0039 Slice 3: Outline and Write Step — Implementation Proposal

- **Status:** Implemented on main (PR #157)
- **Date:** 2026-10-15
- **Parent architecture:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Depends on:** Slice 2 shell frame (PR #156)
- **Scope:** One outline, full-width Write step, Focus mode; existing studio panels re-homed in their steps unchanged
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-14)

## 1. Purpose

Replace the three ways of listing chapters (Chapters list, Structure rail list, reading-order preview) with one outline, and give the writing page the full width.

## 2. Slice 3 objective

1. `workflow/domain/studioShellOutline.ts` (pure): `buildStudioOutline` groups front matter, chapters (numbered), and back matter with compact word counts (`980`, `1.2k`); untitled parts read “Untitled”; `isOutlineChapter`.
2. `ui/StudioOutline.tsx` in the shell's outline region on every step:
   - selecting any part opens it in Write
   - **+ Add chapter**; **Rename** and **Delete** for the selected chapter (Delete disabled for the last chapter) — the old Chapters list's actions, unchanged in behaviour
3. Write step: the editor area spans the main column (no inner sidebar); the session note and a **Focus** button sit above the toolbar.
4. Focus mode: hides the outline and the panels above the editor (Guided Start, stage, import, export, project); **Exit focus** or **Esc** restores them; changing step leaves Focus.
5. Existing panels move, unchanged, to their steps so nothing is lost:

   | Panel | Step |
   |---|---|
   | Structure rail (add front/back matter, move, role) and reading-order preview | Structure |
   | Design choices | Design |
   | Book details | Details |

6. Cover shows “coming soon”; Publish points to the Export panel under Write until Slice 4.
7. Removed now-unused chapter-sidebar CSS; added outline, page-like writing surface, and step-panel styles using the Slice 2 tokens.

## 3. Explicit exclusions

- Redesigning the Structure, Design, Details, and Publish steps (Slice 4)
- Moving Guided Start, Import, Export, or Save out of Write (Slices 4 and 6)
- Inline rename (Rename still uses the existing prompt)
- Guide panel (Slice 5)

## 4. Acceptance criteria

- one outline lists every part in book order with word counts
- selecting a part from any step opens it in Write
- add, rename, and delete chapter still work from the outline
- Structure, Design, and Details panels are reachable from their steps
- Focus hides everything but the page; Esc and Exit focus restore it
- desktop `npm test` / build / CI pass
- diff stays within Slice 3

## 5. Verification

Browser dev build: outline shows “1 · Chapter 1 — 22” and “2 · Chapter 2 — 0” with Add/Rename/Delete; clicking chapter 2 from Design opens it in Write and highlights it; Structure, Design, and Details show their panels; Focus hides the outline and upper panels; Esc restores them. Screenshots were unavailable, so the layout was not inspected visually.
