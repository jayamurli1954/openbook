# Phase 1 — Next Domain Selection: Book Wizard / Guided Start

- **Status:** Selected by maintainer direction after `FOUNDATION-READY` (2026-09-24)
- **Date:** 2026-09-24
- **Baseline:** `main` at `4d14dfb` (PR #115 — FOUNDATION-READY determination)
- **Prior record:** `docs/FOUNDATION-READY-DETERMINATION.md`
- **Selected domain:** ROADMAP Phase 1 MVP — **Book Wizard / Guided Start** (first Phase 1 architecture)
- **Architecture ADR:** ADR-0033 (Accepted on this follow-on; **implementation not authorized** by selection alone)

## 1. Why this domain

Phase 0 is closed (`FOUNDATION-READY` declared). ROADMAP Phase 1’s objective is guided book creation; §3.1 Book Wizard is the natural first product surface: New Book, Import, Open Recent, Continue — before expanding Writing/Structure/Design studios.

Optional leftovers (signing, Gate 11, React recover chrome, DTP, AI) must not displace starting Phase 1.

## 2. What this selection authorizes

1. Accept ADR-0033 Book Wizard / Guided Start architecture (this PR).
2. Record front-door reconciliation that Phase 1 product work has a selected first ADR.

## 3. What this selection does **not** authorize

- Any wizard UI or host implementation slice
- AI outline generation (ROADMAP §3.2 optional AI remains separately gated / Phase 3)
- DTP, signing, Gate 11, React recover chrome
- Changing publishing engines, Book Model, or frozen desktop pins

## 4. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0033 (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer separately authorizes **implementation Slice 1** (contract/types or host boundary only — per ADR-0033 sequencing).
3. Further slices only under explicit authorization.

## 5. Candidates not selected (historical context)

| Candidate | Note |
|---|---|
| React recover/discard chrome (ADR-0031 residual) | Useful polish; not the Phase 1 MVP front door |
| Gate 11 security review | Named later gate; not Phase 1 Book Wizard |
| Signing / multi-OS packaging | Explicitly waived for Phase 0; optional hardening |
| DTP / AI | Phase 2 / Phase 3 |
