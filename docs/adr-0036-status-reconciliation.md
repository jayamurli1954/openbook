# ADR-0036 Design Studio — Status Reconciliation

- **Status:** Documentation reconciliation; Slice 3 not authorized
- **Date:** 2026-09-28
- **Baseline:** `main` after ADR-0036 Slice 2 merge (PR #140, `4547b4c`)
- **Authority:** ADR-0036 — Phase 1 Design Studio Architecture
- **Implementation authorization:** None. This record does not authorize Slice 3 or any later work

## 1. Purpose

Reconcile front-door status after ADR-0036 Slice 2 landed on `main`. Slice 2’s own PR still described itself as in progress because those lines were written before merge.

This is a documentation record only. It does not implement Slice 3, close ADR-0036, or select the next domain.

## 2. What is complete

| Slice | Scope | Result |
|---|---|---|
| Selection + ADR-0036 | Design Studio architecture; theme and typography only | Done — PR #138 |
| 1 | Design contract: read and set theme and typography; reject blank theme and non-positive measures; no chrome | Done — PR #139 |
| 2 | Guided choices: theme name and id, body typeface, heading typeface, body size, line height | Done — PR #140 |

## 3. What is not authorized

Slice 3 — Hardening remains listed in ADR-0036 sequencing: English and Kannada theme and font names through package Save/Open, and a regression guard that no stylesheet is persisted. It is **not** authorized by this record.

Also not authorized:

- A CSS, Typst, or EPUB stylesheet editor or stored stylesheet
- Book Model fields for paragraph spacing beyond line height, image treatment, chapter opening, or style properties
- Metadata Wizard, Cover Wizard, AI, DTP, or Gate 6 font-pin changes
- Closure of ADR-0036 (that follows Slice 3, if Slice 3 is later authorized and completed)

## 4. Front doors updated by this record

- `docs/IMPLEMENTATION-BACKLOG.md`
- `docs/adr/0036-phase-1-design-studio-architecture.md`
- `docs/adr-0036-slice-2-guided-choices.md`
- `docs/PHASE-1-DESIGN-STUDIO-SELECTION.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- `docs/README.md`
- `PROJECT-CONTEXT.md`
