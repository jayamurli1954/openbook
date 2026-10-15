# ADR-0039 Slice 2: Shell Frame and Visual Tokens — Implementation Proposal

- **Status:** Implemented on this PR; awaiting merge
- **Date:** 2026-10-14
- **Parent architecture:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Depends on:** Slice 1 step and guide contract (PR #155)
- **Scope:** Top bar, step bar, layout regions, visual tokens, diagnostics drawer; existing panels kept in Write
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-14)

## 1. Purpose

Replace the developer page frame with the studio shell, without losing any working feature. Every existing panel stays reachable in the Write step; later slices move them to their own steps.

## 2. Slice 2 objective

1. `ui/StudioShellFrame.tsx` — presentation only:
   - top bar: OpenBook, book title, save status (`role="status"`), Diagnostics toggle
   - step bar: the six Slice 1 steps with status and a mark (number, ✓, or !), current step marked `aria-current="step"`, book progress
   - regions: outline (left), main, guide (right); outline and guide render only when given content (Slices 3 and 5)
   - diagnostics drawer, hidden by default
2. `workflow/domain/studioShellStatus.ts`:
   - `describeSaveStatus`: New book / Not saved yet / Saved / Unsaved changes / Saving soon / Saving… / Couldn’t save — never raw error text
   - `buildStudioShellSnapshot` from the Book, word count, and Book Doctor report (fatal + errors count as things to fix)
   - `shellBookTitle` (never blank)
3. `EditorSurface.tsx` hosts the frame. The existing content stays in a `hidden`-toggled Write section, so the editor stays mounted while another step is shown. Other steps show a short “moving here soon” note with a link back to Write.
4. `App.tsx` no longer renders a page heading or developer sections; Book Model, Semantic Document, SQLite, and the editor pipeline notes move into the Diagnostics drawer. Their test ids are unchanged.
5. `App.css`: ADR-0039 visual tokens (colour, spacing, radius, fonts, focus ring) on `:root`, shell styles that use them, visible keyboard focus. System font stack only.
6. The leftover developer starting message (“Canonical BookSession (Gate 8 Slice 2)”) is removed.

## 3. Known leftovers (by design)

Inside the Write step, existing panels still show some internal text until they move:

| Text | Moves or changes in |
|---|---|
| Workflow stage chips and Next stage | Slice 4 (Publish step) |
| “Export (Gate 9)” panel | Slice 4 |
| Raw database error in the browser preview | Slice 7 (plain-language errors) |

## 4. Explicit exclusions

- Outline, Guide panel, step panels, start screen (Slices 3–6)
- Help, Preview, and Export buttons in the top bar (arrive with the steps they open)
- Persisting the active step or diagnostics preference
- New fonts, dark mode, translations

## 5. Acceptance criteria

- the shell renders with title, save status, six steps with live status, and progress
- every panel rendered before is still rendered in Write
- switching steps keeps the editor mounted
- diagnostics are hidden by default and reachable by one button
- save status never shows raw error text or internal terms
- desktop `npm test` / build / CI pass
- diff stays within Slice 2

## 6. Verification

Checked in the browser dev build: steps show “22 words”, “2 parts”, “Default look”, “1 to fill”, “Coming soon”, “Not checked”; progress “1 of 5”; Design shows the placeholder and hides the editor; Write restores it with the editor still loaded; Diagnostics shows the four developer sections. Screenshots were not possible (window minimized), so layout was not inspected visually.
