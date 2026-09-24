# Phase 1 — Next Domain Selection: Writing Studio

- **Status:** Selected by maintainer direction after ADR-0033 closure (2026-09-24)
- **Date:** 2026-09-24
- **Baseline:** `main` at `b9ad872` (PR #122 — ADR-0033 closure reconcile)
- **Prior record:** `docs/adr-0033-closure-reconciliation.md`
- **Selected domain:** ROADMAP Phase 1 MVP — **Writing Studio** (§3.3)
- **Architecture ADR:** ADR-0034 (Accepted on this follow-on; **implementation not authorized** by selection alone)

## 1. Why this domain

ADR-0033 Book Wizard / Guided Start is closed (Slices 1–5). Authors can create, import, open, and continue a project, then land in the existing desktop editor shell.

ROADMAP Phase 1’s next product surface is **Writing Studio** (§3.3): a first-time author must be able to write a book with semantic chapter editing — not merely a foundation TipTap smoke panel.

Optional leftovers (Structure Studio, Design Studio, Metadata Wizard, AI outline, signing, Gate 11, recover chrome, DTP) must not displace Writing Studio as the next controlled domain.

## 2. What this selection authorizes

1. Accept ADR-0034 Writing Studio architecture (this PR).
2. Record front-door reconciliation that Phase 1’s next product ADR is Writing Studio.

## 3. What this selection does **not** authorize

- Any Writing Studio UI/host implementation slice
- Book Model / SDM schema changes (including tables) without a separate model ADR
- Structure Studio / Design Studio / Metadata Wizard
- AI outline generation (ROADMAP §3.2 / Phase 3)
- DTP, signing, Gate 11, React recover chrome
- Changing publishing engines or frozen desktop pins

## 4. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0034 (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer separately authorizes **implementation Slice 1** per ADR-0034 sequencing.
3. Further slices only under explicit authorization.

## 5. Candidates not selected

| Candidate | Note |
|---|---|
| Structure Studio (§3.4) | Needed later; Writing Studio is the daily authoring surface first |
| Basic Design Studio (§3.5) | Themes/typography; after writing primitives |
| Metadata Wizard (§3.6) | After core writing path |
| Book Idea / AI outline (§3.2) | AI remains separately gated |
| React recover/discard chrome | ADR-0031 residual; polish, not MVP writing |
| Signing / multi-OS / Gate 11 | Optional / later gates |
