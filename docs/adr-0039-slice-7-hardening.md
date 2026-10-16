# ADR-0039 Slice 7: Hardening — Implementation Proposal

- **Status:** Implemented on this PR; awaiting merge
- **Date:** 2026-10-16
- **Parent architecture:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Depends on:** Slices 1–6 (PRs #155–#160)
- **Scope:** Plain-language errors, keyboard and focus, colour contrast, a six-step walk in English and Kannada; ADR-0039 closure
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-16)

## 1. Purpose

Close the studio shell: authors never see raw technical text, keyboard and screen-reader users can move through it, colours meet contrast minimums, and the whole flow is proven end to end in English and Kannada.

## 2. Slice 7 objective

1. **Plain-language errors** (`workflow/domain/studioShellErrors.ts`):
   - `toAuthorError(err, context)` maps by situation (save, open, start, import, edit, check, export) and known codes (coordinator, package, import, export, Save-As) to short messages; unknown failures get the situation's message
   - errors from running outside the desktop app (no SQLite or file dialogs) say so plainly
   - `isAuthorSafeText` only lets text through that has no internal terms, codes, or JavaScript error text
   - every raw-message site in `EditorSurface` uses it; the original text is kept as **Last problem** in Diagnostics
   - Guided Start failures append detail only when it is author-safe; export failures map the same way
   - status copy reworded (“Saved “X”.”, “Added 3 chapters. Use Save to keep them.”; no “Persistence:”, project ids, or job states)
2. **Keyboard and focus**: **Skip to your book** link; changing step moves focus to the step region (labelled with the step name); visible focus ring kept.
3. **Contrast**: a test reads the colour tokens from `App.css` and checks fifteen text/background pairs against WCAG AA (4.5:1). All pass.
4. **Six-step walk** (`studioShellHardening.e2e.test.ts`), English and Kannada: Guided Start new book with a book type → look applied → write → add front matter → details complete → Cover “coming soon” → Check my book unlocks export → save to a book folder → reopen with title, language, look, structure, and text intact; every status the author sees passes the plain-language check.
5. ADR-0039 closure record and status reconciliation.

## 3. Explicit exclusions

- The Explicit Save vs autosave race (separate follow-up task; changes save behaviour)
- “Export your ebook” checklist tick (needs export recording)
- Translation of UI copy; dark mode; bundled UI fonts

## 4. Acceptance criteria

- no raw exception text, codes, or library names reach authors; originals stay in Diagnostics
- step changes move focus; skip link present; no clickable non-controls in shell components
- all checked colour pairs ≥ 4.5:1
- English and Kannada walks pass through all six steps and Save/Open
- desktop `npm test` / build / CI pass

## 5. Verification

Browser dev build: creating a book shows “Creating books needs the OpenBook desktop app…” instead of the database error; Save shows the matching message; Diagnostics shows the original under Last problem; no raw text visible elsewhere; changing step focuses the step region; skip link targets the book. Screenshots were unavailable.
