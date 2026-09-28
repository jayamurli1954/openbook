# ADR-0035 Slice 5: Structure Studio Hardening — Implementation Proposal

- **Status:** Implemented on main (PR #136)
- **Date:** 2026-09-28
- **Parent architecture:** ADR-0035 — Phase 1 Structure Studio Architecture
- **Scope:** Empty-matter copy; EN/KN structure titles through package Save/Open; regression guard that no parallel outline is stored
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Close Phase 1 Structure Studio hardening: empty front, main, and back groups explain what to add, English and Kannada section titles survive package Save/Open, and a stored outline or table of contents cannot sit beside the Book.

## 2. Slice 5 objective

1. `structureStudioUx` — empty-matter copy and `findStoredOutlineLeak`
2. Structure rail shows that copy when a matter group has no sections
3. Hardening e2e: EN + KN section titles through coordinator package Save → Open, with navigation order preserved
4. Saved `book.json` has no `outline`, `toc`, or `tableOfContents` key
5. Mark ADR-0035 Slices 1–4 complete; Slice 5 authorized on this PR

## 3. Explicit exclusions

- Deleting sections from the structure rail
- Nested section trees
- EPUB `nav.xhtml` generation
- Structure Studio closure reconciliation (follows this slice)

## 4. Acceptance criteria

- empty front and back groups show plain copy that names the Book
- EN and KN section titles survive package Save → Open
- reopened navigation order is front, main, then back
- saved `book.json` has no stored outline
- desktop `npm test` / CI pass
- diff stays within Slice 5
