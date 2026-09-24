# ADR-0033 Slice 1: Guided-Start Contract — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-24); implementation in progress
- **Date:** 2026-09-24
- **Parent architecture:** ADR-0033 — Phase 1 Book Wizard / Guided Start Architecture
- **Scope:** Types/ports for the four entry paths + New Book field validation; unit tests; no UI/host wiring
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Establish the guided-start domain contract before React wizard chrome or host adapters. Slice 1 proves path enumeration, New Book validation (title + language minimum viable), and mapping onto existing coordinator-shaped inputs — without mutating projects, opening packages, or rendering UI.

## 2. Slice 1 objective

1. `guidedStartContract` under `apps/desktop/src/workflow/domain/`
2. four paths: `new-book` | `import` | `open-recent` | `continue`
3. `NewBookFields` covering ROADMAP §3.1; wizard-only fields isolated from coordinator request
4. `validateNewBook` + `toNewBookCoordinatorRequest` (no coordinator calls)
5. ports for coordinator / recent-list / continue target resolution (shape only)
6. register `guidedStartContract.test.js` in desktop `npm test`

## 3. Explicit exclusions

- Host adapter wiring (Slice 2)
- React wizard shell / terminology UI (Slice 3)
- Durable recent-list persistence (Slice 4)
- Failure UX / empty-state chrome (Slice 5)
- AI outline generation
- Changes to Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- unit tests cover paths, validation (EN + KN), coordinator mapping, port shape boundaries
- desktop `npm test` / CI pass
- diff stays within Slice 1 (contract + tests + docs)
