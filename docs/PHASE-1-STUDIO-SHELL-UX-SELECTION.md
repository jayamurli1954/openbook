# Phase 1 — Next Domain Selection: Studio Shell & Guided UX

- **Status:** Selected; ADR-0039 proposed for acceptance on this PR; implementation not authorized
- **Date:** 2026-10-14
- **Baseline:** `main` at `af4ca6e` (PR #153 — Cover Wizard selection and ADR-0038)
- **Prior record:** `docs/PHASE-1-COVER-WIZARD-SELECTION.md`
- **Selected domain:** Phase 1 MVP — **Studio shell and guided UX** (cross-cutting; serves ROADMAP Phase 1 objective and MVP gate)
- **Architecture ADR:** ADR-0039 (Accepted on this PR; implementation not authorized). Selection alone does not authorize a slice.

## 1. Why this domain, and why now

Phase 1 has five closed studios (ADR-0033 to ADR-0037). Each slice added its panel to one long developer page (`EditorSurface.tsx`). Reviewing the running app on 2026-10-14, the maintainer found it unusable for authors:

- developer internals shown to authors (Book Model and SDM tables, "Tiptap → EditorAdapter → BookSession", SQLite connectivity, "Gate 8 Slice 2");
- one long page with no hierarchy: Guided Start, Import, Export, workflow chips, editor, and every studio stacked;
- studio forms squeezed into a narrow sidebar;
- the same chapters listed three times (Chapters, Structure, Navigation);
- no guidance on what to do next, and raw error text.

This contradicts PROJECT-CONTEXT ("the product should never leave an author wondering what to do next") and the ROADMAP MVP gate ("new user can complete the basic workflow without documentation").

The maintainer decided:

1. Do the UI/UX work **before** Cover Wizard. ADR-0038 stays Accepted; its slices wait so the cover lands as a step in the new shell instead of another stacked panel.
2. Start from a clickable mockup, reviewed and accepted as the starting design ("good to start with; we improve as we go").
3. Take the best ideas from Reedsy, Atticus, Vellum, Scrivener, Kindle Create, and Designrr, in OpenBook's own style, with help available at every stage.

## 2. What this selection authorizes

1. Accept ADR-0039 Studio Shell & Guided UX architecture (this PR).
2. Record that ADR-0038 Cover Wizard implementation waits for ADR-0039's Cover step slot.

## 3. What this selection does **not** authorize

- Any shell, guide, or step implementation slice
- Book Model, engine, persistence, or autosave changes
- Device-accurate Preview (ROADMAP §3.9 is its own domain)
- AI help ("Ask OpenBook") — Phase 3, stays optional
- Bundling new UI fonts (needs ADR-0028 font-provenance evidence first)
- Kannada or other UI translations
- Changing frozen desktop pins (Tauri, React, TypeScript, Tiptap)

## 4. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0039 (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer separately authorizes implementation Slice 1 per ADR-0039 sequencing.
3. Later slices only under their own explicit authorization.
4. ADR-0038 Cover Wizard Slice 1 may proceed once the ADR-0039 Cover step slot exists (Slice 4), or earlier if the maintainer decides.
5. Closure reconciliation only after the authorized slices land.

## 5. Candidates not selected

| Candidate | Note |
|---|---|
| Cover Wizard (ADR-0038) | Accepted; waits for the shell's Cover step |
| Preview (§3.9) | Separate domain; the shell provides its entry point |
| Book Doctor MVP experience (§3.10) | The Publish step shows today's report; the full experience is later |
| AI help in the Guide panel | Phase 3 |
| Pin Gate 6 font downloads to a commit | CI reliability follow-up |
