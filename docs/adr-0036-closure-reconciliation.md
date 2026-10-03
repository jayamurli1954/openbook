# ADR-0036 Design Studio — Closure & Reconciliation

- **Status:** Implementation-complete; closure/reconciliation record
- **Date:** 2026-10-03
- **Baseline:** `main` after ADR-0036 Slice 3 merge (PR #142, `590f61d`)
- **Authority:** ADR-0036 — Phase 1 Design Studio Architecture
- **Implementation authorization:** Completed for the three approved ADR-0036 slices; no further ADR-0036 slice is authorized by this record

## 1. Purpose

Reconcile ADR-0036 implementation against the accepted architecture and close the Phase 1 Design Studio slice sequence on `main`.

This is a documentation / governance record only. It does not authorize Metadata Wizard, Cover Wizard, a CSS or Typst editor, a Book Model ADR for paragraph spacing, image treatment, chapter opening, or style properties, AI outline, DTP, signing, or Gate 11 work.

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| 1 | Design contract: read and set theme and typography; reject blank theme and non-positive measures; no chrome | Done — PR #139 |
| 2 | Guided choices: theme name and id, body typeface, heading typeface, body size, line height | Done — PR #140 |
| 3 | English and Kannada theme and font names through package Save/Open; no stored stylesheet | Done — PR #142 |

PR #141 reconciled front-door status after Slice 2. It is not a Design Studio slice.

## 3. Architectural invariants preserved

1. Every design edit yields a Book Model–valid Book, or a structured fail-closed error.
2. Body size and line height must be finite and greater than zero when set.
3. Theme and typography round-trip through the ADR-0029 package. Unicode names are preserved.
4. No CSS, Typst theme, or TipTap document is stored as the design.
5. Autosave continues to use ADR-0031 package Save semantics when a package root is bound.
6. No AI dependency was introduced by ADR-0036 slices.
7. Paragraph spacing beyond line height, image treatment, chapter opening, and style properties were not shipped. They still require a Book Model ADR.

## 4. Explicitly still open (not ADR-0036 failures)

- Paragraph spacing beyond line height, per-level heading styles, image treatment, chapter opening, and property-bearing named styles
- A CSS, Typst, or EPUB stylesheet editor
- ROADMAP §3.6 Metadata Wizard / §3.7 Cover Wizard
- AI outline (ROADMAP §3.2 / Phase 3)
- DTP page layout
- Code signing / multi-OS packaging

## 5. Closure determination

**ADR-0036 implementation is closed as a slice sequence.**

The next Phase 1 product domain requires a separate selection record and ADR. Metadata Wizard is a natural candidate. This record does not select it.
