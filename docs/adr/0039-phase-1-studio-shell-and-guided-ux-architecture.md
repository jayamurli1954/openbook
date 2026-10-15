# ADR-0039: Phase 1 — Studio Shell & Guided UX Architecture

- **Status:** Accepted; Slices 1–3 done; Slice 4 authorized
- **Date:** 2026-10-14
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (objective and MVP gate)
- **Area:** Desktop / Product Surface / UX
- **Depends on:** ADR-0007, ADR-0019, ADR-0030, ADR-0031, ADR-0033, ADR-0034, ADR-0035, ADR-0036, ADR-0037, ADR-0038
- **Supersedes:** None. Re-hosts the chrome of ADR-0033–ADR-0037 without changing their contracts
- **Selection record:** `docs/PHASE-1-STUDIO-SHELL-UX-SELECTION.md`
- **Design reference:** clickable mockup "OpenBook Studio UX Mockup" (maintainer's private artifact, https://claude.ai/artifact/12J6rfbTnfvLPeWgw3PGpx), accepted as the starting design on 2026-10-14
- **Implementation authorization:** Slices 1–3 done (PRs #155–#157); Slice 4 authorized (`docs/adr-0039-slice-4-studio-steps.md`); later slices need their own authorization.

## 1. Context

Phase 1 studios (ADR-0033 Guided Start, ADR-0034 Writing, ADR-0035 Structure, ADR-0036 Design, ADR-0037 Metadata) each delivered a contract, a port, and React chrome. The chrome was added to one developer page: `App.tsx` renders Book Model and SDM diagnostics and SQLite connectivity, and `EditorSurface.tsx` (about 780 lines) stacks Guided Start, workflow stage chips, Import, Export, project actions, a chapter list, the Structure rail, a navigation preview, Design, Book details, and the editor.

That page served slice verification. It does not serve authors:

- internals are shown as product (schema versions, pipeline paths, gate and slice names);
- there is no hierarchy or layout; forms sit in a narrow sidebar;
- chapters are listed three times;
- nothing tells the author what to do next;
- raw exception text reaches the screen.

PROJECT-CONTEXT says the product should never leave an author wondering what to do next, and that Beginner and Expert modes should coexist. The ROADMAP MVP gate requires that a new user completes the basic workflow without documentation.

## 2. Decision

OpenBook will replace the developer page with a **studio shell**: a start screen, a book studio organised as six steps, one outline, and a Guide panel that helps at every step.

The shell is a **presentation layer**. It hosts the existing studio ports and chrome; it does not change the Book Model, the studio contracts, persistence, autosave, or the engines.

```text
Start screen (no book open)                 Book studio (book open)
┌──────────────────────────────┐            ┌──────────────────────────────────────────────┐
│ New · Import · Open · Continue│            │ Top bar: title · Saved · Help · Preview · Export│
│ What are you writing?        │            │ Step bar: Write Structure Design Details Cover Publish · progress │
│ Recent books                 │            ├────────┬───────────────────────────┬─────────┤
└──────────────────────────────┘            │Outline │ Step panel (full width)   │ Guide   │
                                            │        │                           │ panel   │
                                            └────────┴───────────────────────────┴─────────┘
```

### 2.1 Design principles

Taken from the maintainer's review of Reedsy, Atticus, Vellum, Scrivener, Kindle Create, and Designrr, adapted in OpenBook's own style (no copied layouts, assets, or wording):

1. **Guided path, never a dead end** (Kindle Create): six named steps with status, a book progress indicator, and a "Next: …" action on every step.
2. **Help at every stage** (OpenBook's own): a Guide panel per step with *What to do here*, *Tips*, and *Stuck?* questions. It can be hidden; it never blocks work.
3. **Calm writing** (Reedsy): a page-like editor in a book typeface; a Focus mode that hides everything but the page.
4. **One outline** (Scrivener): a single front matter / chapters / back matter tree with per-chapter word counts replaces the three duplicate lists.
5. **See changes immediately** (Atticus, Vellum): design choices restyle a live sample beside them; a Preview entry point is always in the top bar.
6. **Start from something familiar** (Designrr): the start screen offers book types (novel, memoir, how-to guide, poetry, Kannada book) that preset structure and theme.
7. **Plain language, no internals**: no schema, gate, slice, or library names in product copy. Diagnostics live behind a "Show diagnostics" toggle.
8. **Accessible by default**: real buttons, links, and labels; keyboard reachable; visible focus; text contrast at least 4.5:1; colour is never the only signal.

### 2.2 Shell structure

| Region | Content | Source |
|---|---|---|
| Start screen | New book, Import a manuscript, Open a book, Continue writing; book types; recent books | ADR-0033 Guided Start contract and host adapter; import moves here from the editor page |
| Top bar | Book title, save status, Help, Preview, Export | `DesktopStudioCoordinator` state, ADR-0031 autosave status, ADR-0030 export host |
| Step bar | Write, Structure, Design, Details, Cover, Publish, each with a status; progress | Step model (§2.3) |
| Outline | One tree: front matter, chapters, back matter; select, add; word counts | ADR-0035 structure port; ADR-0034 query adapter |
| Step panel | The current step, full width | Existing studio chrome, re-hosted |
| Guide panel | Per-step help (§2.4) | Guide content module |
| Diagnostics | Book Model version, package path, autosave state, runtime versions | Today's `App.tsx` and `EditorSurface.tsx` internals, hidden by default |

| Step | Hosts | Notes |
|---|---|---|
| Write | ADR-0034 toolbar, find, image insert, editor | Focus mode |
| Structure | ADR-0035 matter rail and move/role controls | Full-width groups |
| Design | ADR-0036 guided choices | Theme cards and a live sample |
| Details | ADR-0037 Book details fields | Grouped: Essentials, Publishing, Help readers find it |
| Cover | ADR-0038 when implemented | Until then, a plain "coming next" panel |
| Publish | Book Doctor report and ADR-0030 export | Checks first, then EPUB / PDF / Web cards; a warning links to the step that fixes it |

The workflow stage chips (IMPORT … PUBLISH) are no longer shown to authors. `@openbook/workflow` stage semantics and PREVIEW/PUBLISH gating (ADR-0022) are unchanged; the shell derives step status from them.

### 2.3 Step model

A pure domain module defines the six steps and derives each step's status from the Book and coordinator state (for example: Write in progress while the book has fewer words than a short threshold; Details complete when title, language, and an author are set; Publish shows the count of Book Doctor findings). Status is advisory; every step is always reachable.

### 2.4 Guide content

Guide content is data in one module, not markup scattered through components:

- per step: an introduction, a checklist (items evaluated against the Book where possible), tips, and question/answer pairs;
- plain-language copy guarded by tests (no internal terms, no blame, no invitation to save editor JSON);
- written so it can be translated later; Kannada UI is out of scope for this ADR.

AI help may later add an "Ask" box to the Guide panel (Phase 3). The guide must stay complete without it.

### 2.5 Visual system

- CSS custom properties for colour, spacing, radius, and type scale in one place; components use the tokens.
- UI text uses the existing system font stack. Book text (editor, previews) uses fonts already bundled for publishing where available. Bundling new UI fonts (for example IBM Plex Sans or Source Serif) needs ADR-0028 font-provenance evidence first and is not part of this ADR.
- Light theme first; tokens leave room for dark mode later.
- Minimum window width for the three-column layout; narrower windows hide the Guide panel behind Help and collapse the outline.

### 2.6 Boundaries

The shell must not:

- change the Book Model, studio contracts, persistence, autosave, or engines;
- add a second state store for book content; the coordinator stays the authority;
- persist UI state into the Book or package (Guide open/closed and Focus mode are app preferences, held in memory until a preferences ADR exists);
- show exception text to authors; errors map to plain-language messages, with detail in diagnostics;
- remove the source-shape test guards of ADR-0033–ADR-0037; when chrome moves, the guards move with it.

### 2.7 Explicit non-goals

- Device-accurate Preview (ROADMAP §3.9 domain); the shell provides the entry point
- Cover Wizard behaviour (ADR-0038)
- AI help
- Dark mode, UI translation, keyboard-shortcut customisation
- Mobile or web deployment
- Frozen pin changes

## 3. Implementation sequencing (not authorized here)

When separately authorized, implementation should proceed in small slices, for example:

1. **Slice 1 — Step and guide contract:** step model and status derivation; guide content module for all six steps; plain-language guards; tests; no chrome. **(done — PR #155)**
2. **Slice 2 — Shell frame and visual tokens:** start screen vs book studio switch; top bar with save status; step bar; three-column layout; CSS tokens; diagnostics moved behind a toggle; existing panels mounted unchanged inside the Write step so nothing is lost. **(done — PR #156)**
3. **Slice 3 — Outline and Write step:** one outline replacing the three lists; full-width editor; Focus mode. **(done — PR #157)**
4. **Slice 4 — Studio steps:** Structure, Design (with live sample), Details (grouped), Publish (checks, then export cards), Cover placeholder. **(authorized — this PR; includes the ADR-0022 re-check amendment)**
5. **Slice 5 — Guide panel:** render the Slice 1 guide; live checklist; questions; Next step; Help toggle.
6. **Slice 6 — Start screen:** Guided Start as the start screen; book-type presets mapped to existing structure and theme choices; Import and recent books there.
7. **Slice 7 — Hardening:** keyboard and focus order, contrast, English and Kannada books through the full flow, plain-language error mapping, source-shape guards re-pointed, one end-to-end walk through all six steps.

Exact slice boundaries may be adjusted in per-slice proposals; each slice still needs explicit authorization.

## 4. Testable architectural invariants

1. No Book Model, persistence, autosave, or engine behaviour changes; existing domain and end-to-end tests pass unchanged.
2. Every studio action available before the shell is still reachable after it.
3. Every step shows a Guide with at least one checklist item and one question, and a Next step except Publish.
4. Product copy contains no internal terms (schema, slice, gate, Tiptap, SDM, SQLite); a test enforces it.
5. Diagnostics are hidden by default and reachable by one action.
6. Every interactive element is a real control with an accessible name and is keyboard reachable.
7. Errors shown to authors are plain-language messages, never raw exception text.
8. No AI dependency is introduced.

## 5. Consequences

### Positive

- The app becomes usable by authors, which the MVP gate requires.
- Later domains (Cover, Preview, Book Doctor) land as steps in a known place.
- Help is a first-class, testable part of the product.

### Trade-offs

- Seven slices of mostly UI work before Cover Wizard resumes.
- Moving chrome means re-pointing source-shape tests; Slice 7 accounts for it.
- The first visual system uses system fonts until font evidence allows bundling UI fonts.

## 6. Non-authorizations

This ADR does **not** authorize implementation, dependency changes, font bundling, Book Model or engine changes, AI features, or any shell slice until a maintainer issues an explicit slice authorization.
