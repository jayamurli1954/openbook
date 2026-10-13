# ADR-0037 Metadata Wizard — Closure & Reconciliation

- **Status:** Implementation-complete; closure/reconciliation record
- **Date:** 2026-10-13
- **Baseline:** `main` after ADR-0037 Slice 3 merge (PR #151, `ab15a47`)
- **Authority:** ADR-0037 — Phase 1 Metadata Wizard Architecture
- **Implementation authorization:** Completed for the three approved ADR-0037 slices; no further ADR-0037 slice is authorized by this record

## 1. Purpose

Reconcile ADR-0037 implementation against the accepted architecture and close the Phase 1 Metadata Wizard slice sequence on `main`.

This is a documentation / governance record only. It does not authorize Cover Wizard, accessibility metadata, ONIX, ISBN validation, a language picker, AI metadata suggestions, DTP, signing, or Gate 11 work.

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| 1 | Metadata contract: capability matrix; read and set `Book.metadata`; reject blank title, blank language, and unknown fields; no chrome | Done — PR #147 |
| 2 | Guided fields: Book details panel for the twelve in-scope fields; list fields one entry per line; one Apply | Done — PR #149 |
| 3 | English and Kannada metadata through package Save/Open and autosave; no stored OPF or ONIX | Done — PR #151 |

PRs #145, #146, #148, and #150 were status reconciliation and slice proposals. They are not Metadata Wizard slices.

## 3. Architectural invariants preserved

1. Every metadata edit yields a Book Model–valid Book, or a structured fail-closed error.
2. Title and language stay non-empty when set through the wizard. `validateBook` only warns on a blank title, so the Slice 1 contract enforces the title rule itself.
3. Metadata round-trips through the ADR-0029 package. English and Kannada text, list order, and multi-line description are preserved.
4. No OPF, ONIX, or other package document is stored as the metadata, in any package file or as a file in the package.
5. Autosave continues to use ADR-0031 package Save semantics when a package root is bound.
6. No AI dependency was introduced by ADR-0037 slices.
7. Cover metadata and accessibility metadata were not shipped.

## 4. Explicitly still open (not ADR-0037 failures)

- Cover metadata — ROADMAP §3.7 Cover Wizard
- Accessibility metadata — needs a Book Model ADR
- ISBN checksum, identifier-agency lookup, publication-date validation, and a BCP-47 language picker
- ONIX export
- Checking that EPUB, HTML, and PDF output carry the metadata (engine-side; outside the wizard)
- AI metadata suggestions (Phase 3)
- DTP page layout
- Code signing / multi-OS packaging

## 5. Closure determination

**ADR-0037 implementation is closed as a slice sequence.**

The next Phase 1 product domain requires a separate selection record and ADR. Cover Wizard (ROADMAP §3.7) is a natural candidate. This record does not select it.
