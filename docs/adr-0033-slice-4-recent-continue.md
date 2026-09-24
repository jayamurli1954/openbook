# ADR-0033 Slice 4: Recent List + Continue Integration — Implementation Proposal

- **Status:** Implemented on main (PR #120)
- **Date:** 2026-09-24
- **Parent architecture:** ADR-0033 — Phase 1 Book Wizard / Guided Start Architecture
- **Scope:** Durable recent-list state + Continue via ADR-0031 recovery discovery; remember on successful open; no React redesign
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Make Open Recent and Continue real: remember package roots after successful open, and resolve Continue through the existing recovery discovery protocol — not a second recovery stack.

## 2. Slice 4 objective

1. `guidedStartRecentStore` — schema v1 JSON state (entries + lastContinueRoot) behind injectable text store
2. `createGuidedStartContinuePort` — map discovery live-ready / recoverable / ambiguous / unavailable
3. Host adapter optional `recentWrite` remembers successful open/continue
4. `createGuidedStartHost` defaults to durable recent + continue wiring (memory text store in-process)
5. Node file text store for durability round-trip tests
6. Wizard copy updated for empty recent / continue behavior

## 3. Explicit exclusions

- Hardening / empty-state polish / EN+KN round-trip UX (Slice 5)
- Native folder dialogs for package selection
- Tauri app-data file adapter (JSON shape is ready; memory is default in UI)
- AI outline generation
- Changes to Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- recent list MRU + cap + continue root persist through text-store reload
- continue fails closed with no root / ambiguous backups
- recoverable discovery uses `restore-if-live-missing`
- desktop `npm test` / `tsc` / CI pass
- diff stays within Slice 4
