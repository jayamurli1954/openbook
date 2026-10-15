# ADR-0039 Slice 5: Guide Panel — Implementation Proposal

- **Status:** Implemented on this PR; awaiting merge
- **Date:** 2026-10-15
- **Parent architecture:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Depends on:** Slice 1 guide content (PR #155); Slice 4 studio steps (PR #158)
- **Scope:** Guide panel on every step; Help toggle; guide copy aligned with the built screens
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-15)

## 1. Purpose

Give authors help at every step, so nobody is left wondering what to do next (PROJECT-CONTEXT; ADR-0039 principle 2).

## 2. Slice 5 objective

1. `ui/StudioGuidePanel.tsx` (presentation only) in the shell's right-hand region:
   - **Guide · {step}** with the step introduction
   - **What to do here**: the Slice 1 checklist evaluated against the Book, ticking itself off, with an “N of M done” count (optional items marked, not counted)
   - **Tips**
   - **Stuck?**: questions that expand to answers (`<details>`)
   - **Next: {step} →** on every step except Publish
2. Top bar **Help / Hide guide** toggle. The guide is open by default and held in memory (no preferences store yet). Focus mode hides it.
3. Narrow windows place the guide below the step instead of squeezing the editor.
4. Guide copy updated to match the built screens:
   - Publish checklist: “Press Check my book” (was “Run the book check”)
   - Publish tip: “Changed something? Check again, then export again.” — true since the Slice 4 re-check fix
   - Design tip: points Kannada writers to the Kannada look

## 3. Known gap

“Export your ebook” cannot tick yet: the app does not record that an export happened. Recording it needs a small piece of session state and is left for a later slice.

## 4. Explicit exclusions

- Persisting Help open/closed (needs a preferences ADR)
- AI help in the guide (Phase 3)
- First-run tour; translation of guide copy
- Start screen (Slice 6)

## 5. Acceptance criteria

- every step shows its guide; the checklist reflects the current book
- Next moves to the following step; Publish has none
- Help hides and restores the guide; Focus hides it
- all guide copy passes the plain-language check
- desktop `npm test` / build / CI pass

## 6. Verification

Browser dev build: Write guide shows “2 of 3 done” with two items ticked, three questions that expand, and Next: Structure; Next switches step and guide; Publish shows “0 of 3 done”, then “2 of 3 done” after Check my book; Help hides and restores the guide; Focus hides it. Screenshots were unavailable, so the layout was not inspected visually.
