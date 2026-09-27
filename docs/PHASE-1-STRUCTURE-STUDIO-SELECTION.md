# Phase 1 — Next Domain Selection: Structure Studio

- **Status:** Selected by maintainer direction after ADR-0034 closure (2026-09-27)
- **Date:** 2026-09-27
- **Baseline:** `main` at `5f63414` (PR #130 — ADR-0034 closure reconcile)
- **Prior record:** `docs/adr-0034-closure-reconciliation.md`
- **Selected domain:** ROADMAP Phase 1 MVP — **Structure Studio** (§3.4)
- **Architecture ADR:** ADR-0035 (Accepted on this follow-on; **implementation not authorized** by selection alone)

## 1. Why this domain

ADR-0034 Writing Studio is closed (Slices 1–5). Authors can write semantic chapter content, count words, search the Book, and insert images. Chapter structure in the desktop shell is still a flat main-matter list.

ROADMAP Phase 1’s next product surface is **Structure Studio** (§3.4): front matter, main matter, back matter, chapter order, section hierarchy, and navigation derived from that order.

Optional leftovers (Design Studio, Metadata Wizard, Cover Wizard, AI outline, tables, signing, Gate 11, recover chrome, DTP) must not displace Structure Studio as the next controlled domain.

## 2. What this selection authorizes

1. Accept ADR-0035 Structure Studio architecture (this PR).
2. Record front-door reconciliation that Phase 1’s next product ADR is Structure Studio.

## 3. What this selection does **not** authorize

- Any Structure Studio UI/host implementation slice
- A second outline, TOC, or navigation document stored beside the Book
- Book Model / SDM schema changes (including nested heading trees or tables) without a separate model ADR
- Design Studio / Metadata Wizard / Cover Wizard
- AI outline generation (ROADMAP §3.2 / Phase 3)
- DTP, signing, Gate 11, React recover chrome
- Changing publishing engines or frozen desktop pins

## 4. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0035 (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer separately authorizes **implementation Slice 1** per ADR-0035 sequencing.
3. Further slices only under explicit authorization.

## 5. Candidates not selected

| Candidate | Note |
|---|---|
| Basic Design Studio (§3.5) | Themes/typography; after structure is explicit |
| Metadata Wizard (§3.6) | After the book’s matter and order exist |
| Cover Wizard (§3.7) | After metadata and structure |
| Book Idea / AI outline (§3.2) | AI remains separately gated |
| Basic tables | Still blocked on a Book Model / SDM extension ADR |
| React recover/discard chrome | ADR-0031 residual; polish, not structure |
| Signing / multi-OS / Gate 11 | Optional / later gates |
