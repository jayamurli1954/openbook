# Phase 1 — Next Domain Selection: Metadata Wizard

- **Status:** Selected; ADR-0037 accepted on this PR; implementation not authorized
- **Date:** 2026-10-03
- **Baseline:** `main` at `01f832d` (PR #143 — ADR-0036 closure reconcile)
- **Prior record:** `docs/adr-0036-closure-reconciliation.md`
- **Selected domain:** ROADMAP Phase 1 MVP — **Metadata Wizard** (§3.6)
- **Architecture ADR:** ADR-0037 (Accepted on this PR; implementation not authorized). Selection alone does not authorize a slice.

## 1. Why this domain

ADR-0036 Design Studio is closed (Slices 1–3). Authors can set theme and typography on the Book. Those choices survive package Save/Open, and the package does not store a stylesheet.

ROADMAP Phase 1’s next product surface is **Metadata Wizard** (§3.6): title, subtitle, author, language, publisher, copyright, identifier, description, and subjects. The Book already stores those fields. Guided Start collects title, subtitle, authors, and language when a book is created. It does not offer a later surface for the rest of `Book.metadata`.

Optional leftovers (Cover Wizard, AI outline, tables, nested section trees, a design Book Model ADR, signing, Gate 11, recover chrome, DTP page layout) must not displace Metadata Wizard as the next controlled domain.

## 2. What this selection authorizes

1. Accept ADR-0037 Metadata Wizard architecture (this PR).
2. Record front-door reconciliation that Phase 1’s next product ADR is Metadata Wizard.
3. Stamp ADR-0036 closure as done (PR #143).

## 3. What this selection does **not** authorize

- Any Metadata Wizard UI or host implementation slice
- Book Model schema changes
- An ONIX record, ISBN checksum, or identifier-agency lookup
- Cover metadata or a Cover Wizard
- Accessibility metadata beyond the `rights` string the Book already stores
- Book type, audience, length, or writing goal (Guided Start terminology; not Book fields)
- AI metadata generation
- Changing publishing engines, Gate 6 font pins, or frozen desktop pins

## 4. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0037 (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer separately authorizes implementation Slice 1 per ADR-0037 sequencing.
3. Later slices only under their own explicit authorization.
4. Closure reconciliation only after the authorized slices land.

## 5. Candidates not selected

| Candidate | Note |
|---|---|
| Cover Wizard (§3.7) | After metadata is editable on the Book |
| Book Idea / AI outline (§3.2) | AI remains separately gated |
| Paragraph spacing, image treatment, chapter opening, style properties | Still blocked on a Book Model ADR |
| Nested section trees | Still blocked on a Book Model ADR |
| Basic tables | Still blocked on a Book Model / SDM extension ADR |
| Structure-rail remove control | Polish, not metadata |
| React recover/discard chrome | ADR-0031 residual |
| Signing / multi-OS / Gate 11 | Optional / later gates |
