# ADR-0033 Book Wizard / Guided Start — Closure & Reconciliation

- **Status:** Implementation-complete; closure/reconciliation record
- **Date:** 2026-09-24
- **Baseline:** `main` after ADR-0033 Slice 5 merge (PR #121)
- **Authority:** ADR-0033 — Phase 1 Book Wizard / Guided Start Architecture
- **Implementation authorization:** Completed for the five approved ADR-0033 slices; no further ADR-0033 slice is authorized by this record

## 1. Purpose

Reconcile ADR-0033 implementation against the accepted architecture and close the Phase 1 Book Wizard / Guided Start slice sequence on `main`.

This is a documentation / governance record only. It does not authorize Writing Studio, Structure Studio, Metadata Wizard, AI outline, signing, or Gate 11 work.

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| 1 | Guided-start contract (paths, New Book validation, ports) | Done — PR #117 |
| 2 | Host adapter wiring to coordinator/import/package APIs | Done — PR #118 |
| 3 | React wizard shell + terminology stubs | Done — PR #119 |
| 4 | Durable recent list + Continue via ADR-0031 recovery discovery | Done — PR #120 |
| 5 | Failure UX, empty-state copy, EN/KN host round-trips | Done — PR #121 |

## 3. Architectural invariants preserved

1. Book Model remains canonical; Tiptap JSON is never the project source of truth.
2. Import reuses existing importer / coordinator contracts.
3. Open/Continue use ADR-0029 package open and ADR-0031 recovery discovery (no second recovery protocol).
4. Cancelled / fail-closed paths do not silently invent projects.
5. No AI dependency was introduced by ADR-0033 slices.

## 4. Explicitly still open (not ADR-0033 failures)

- Native folder/file dialogs for package/import selection (product polish)
- Tauri app-data file adapter for recent-list JSON (shape exists; memory default in UI)
- Persisting authors/subtitle/wizard-only fields beyond `newProject(name, language)`
- ROADMAP §3.3 Writing Studio / §3.4 Structure Studio / §3.6 Metadata Wizard
- AI outline (ROADMAP §3.2 / Phase 3)
- Code signing / multi-OS packaging

## 5. Closure determination

**ADR-0033 implementation is closed as a slice sequence.**

The next Phase 1 product domain requires a separate selection record and ADR (or explicit slice authorization under a new architecture) — Writing Studio is the natural candidate after guided start lands authors in the existing editor surface.
