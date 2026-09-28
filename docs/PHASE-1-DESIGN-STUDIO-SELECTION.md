# Phase 1 — Next Domain Selection: Design Studio

- **Status:** Selected by maintainer direction after ADR-0035 closure (2026-09-28)
- **Date:** 2026-09-28
- **Baseline:** `main` at `aee88ca` (PR #137 — ADR-0035 closure reconcile)
- **Prior record:** `docs/adr-0035-closure-reconciliation.md`
- **Selected domain:** ROADMAP Phase 1 MVP — **Basic Design Studio** (§3.5)
- **Architecture ADR:** ADR-0036 (Accepted on this follow-on; **implementation not authorized** by selection alone)

## 1. Why this domain

ADR-0035 Structure Studio is closed (Slices 1–5). Authors can arrange front, main, and back matter, move sections, set roles, and see reading order as a projection of the Book.

ROADMAP Phase 1’s next product surface is **Basic Design Studio** (§3.5): guided choices for theme, typography, heading style, paragraph spacing, image treatment, and chapter opening. The author should select a design without writing CSS.

Optional leftovers (Metadata Wizard, Cover Wizard, AI outline, tables, nested section trees, signing, Gate 11, recover chrome, DTP page layout) must not displace Design Studio as the next controlled domain.

## 2. What this selection authorizes

1. Accept ADR-0036 Design Studio architecture (this PR).
2. Record front-door reconciliation that Phase 1’s next product ADR is Design Studio.

## 3. What this selection does **not** authorize

- Any Design Studio UI/host implementation slice
- A CSS, Typst, or EPUB stylesheet stored beside the Book
- Book Model schema changes for paragraph spacing, image treatment, chapter opening, or property-bearing styles
- Metadata Wizard / Cover Wizard
- AI outline generation (ROADMAP §3.2 / Phase 3)
- DTP page layout, signing, Gate 11, React recover chrome
- Changing publishing engines, Gate 6 font pins, or frozen desktop pins

## 4. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0036 (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer separately authorizes **implementation Slice 1** per ADR-0036 sequencing.
3. Further slices only under explicit authorization.

## 5. Candidates not selected

| Candidate | Note |
|---|---|
| Metadata Wizard (§3.6) | After a design choice can be stored on the Book |
| Cover Wizard (§3.7) | After metadata and design |
| Book Idea / AI outline (§3.2) | AI remains separately gated |
| Nested section trees | Still blocked on a Book Model ADR |
| Basic tables | Still blocked on a Book Model / SDM extension ADR |
| Structure-rail remove control | `BookSession` can remove; the rail does not expose it. Polish, not design |
| React recover/discard chrome | ADR-0031 residual |
| Signing / multi-OS / Gate 11 | Optional / later gates |
