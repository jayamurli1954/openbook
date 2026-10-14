# Conversation Record — Studio shell & guided UX selection and ADR-0039

- **Date:** 2026-10-14
- **Participants:** Maintainer + coding agent
- **Topic:** Rework the desktop UI/UX before Cover Wizard; accept ADR-0039
- **Related:** `docs/PHASE-1-STUDIO-SHELL-UX-SELECTION.md`; `docs/adr/0039-phase-1-studio-shell-and-guided-ux-architecture.md`; `docs/adr/0038-phase-1-cover-wizard-architecture.md`

## Context

After ADR-0038 was accepted (PR #153), the maintainer shared a screenshot of the running app and said OpenBook needs UI/UX work. The page showed developer internals, one long stacked layout, duplicate chapter lists, and no guidance.

## Decisions

1. Do the UI/UX work before Cover Wizard. ADR-0038 stays Accepted; its slices wait for the shell's Cover step.
2. Produce a clickable mockup first. The maintainer reviewed reference products (Reedsy, Atticus, Vellum, Scrivener, Kindle Create, Designrr) and asked to take the best of each, not copy, in OpenBook's own style, with an easy learning curve and help at every stage.
3. The mockup (start screen; six-step book studio; one outline; Guide panel with checklist, tips, and questions; Preview with device switcher; Focus mode; book-type presets) was accepted as "good to start with; we improve as we go".
4. Accept ADR-0039 architecture only. No implementation slice is authorized. The shell is presentation only: no Book Model, engine, persistence, or autosave change.
5. UI fonts stay the system stack until font-provenance evidence allows bundling; AI help stays Phase 3.
6. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `docs/adr-0039-studio-shell-ux-selection`.
- Mockup: maintainer's private artifact "OpenBook Studio UX Mockup".
