# ADR-0033 Slice 3: React Guided-Start Wizard Shell — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-24); implementation in progress
- **Date:** 2026-09-24
- **Parent architecture:** ADR-0033 — Phase 1 Book Wizard / Guided Start Architecture
- **Scope:** Minimal React wizard for the four paths + New Book form with terminology stubs; host factory wiring; no durable recent-list
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Give authors a visible guided-start surface that calls `GuidedStartHostAdapter` only — no parallel project model, no Tauri/filesystem in the React layer.

## 2. Slice 3 objective

1. `GuidedStartWizard` under `apps/desktop/src/ui/`
2. Path hub: New Book / Import / Open Recent / Continue
3. New Book form covering ROADMAP §3.1 fields + terminology stubs
4. Import paste form through `host.importBook`
5. Open Recent list (empty until Slice 4) + package-root text entry
6. Continue button through `host.continueExisting`
7. `createGuidedStartHost` with in-memory recent/continue stubs
8. Wire wizard into `EditorSurface`
9. Terminology + factory + UI source-shape tests

## 3. Explicit exclusions

- Durable recent-list persistence / recovery handoff (Slice 4)
- Hardening / empty-state polish / EN+KN round-trip UX (Slice 5)
- Native folder/file dialogs for package/import selection
- Persisting authors/subtitle/wizard-only beyond `newProject(name, language)`
- AI outline generation
- Changes to Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- wizard delegates only through `IGuidedStartHostAdapter`
- terminology stubs cover all New Book fields and avoid AI dependency
- desktop `npm test` / `tsc` / CI pass
- diff stays within Slice 3
