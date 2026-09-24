# ADR-0033 Slice 2: Guided-Start Host Adapter — Implementation Proposal

- **Status:** Implemented on main (PR #118)
- **Date:** 2026-09-24
- **Parent architecture:** ADR-0033 — Phase 1 Book Wizard / Guided Start Architecture
- **Scope:** Host adapter wiring New Book / Import / Open Recent / Continue onto existing coordinator ports; fake-host unit tests; no React/Tauri
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Execute the four guided-start paths through injectable ports so later UI can invoke a single host boundary without calling `DesktopStudioCoordinator` directly or inventing a parallel project model.

## 2. Slice 2 objective

1. `GuidedStartHostAdapter` under `apps/desktop/src/workflow/domain/`
2. `startNewBook` — validate via Slice 1 contract, then `coordinator.newProject(name, language)`
3. `importBook` — delegate to `coordinator.importContent`
4. `openRecent` — fail closed on empty root; else `openFromProjectPackage`
5. `continueExisting` — resolve continue target; unavailable fails closed without open; package opens via coordinator
6. `listRecent` — delegate to recent-list port (persistence is Slice 4)
7. structured outcomes + AbortSignal cancel with no mutation
8. register `guidedStartHostAdapter.test.js` in desktop `npm test`

## 3. Explicit exclusions

- React wizard shell / terminology UI (Slice 3)
- Durable recent-list persistence / recovery handoff chrome (Slice 4)
- Package first-Save binding after New Book (product Save flow; not this slice)
- Persisting authors/subtitle/wizard-only onto Book metadata beyond `newProject(name, language)`
- AI outline generation
- Changes to Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- fake coordinator/recent/continue ports cover success, validation fail-closed, continue unavailable, cancel, empty root
- desktop `npm test` / CI pass
- diff stays within Slice 2 (adapter + tests + docs)
