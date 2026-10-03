# ADR-0036 Slice 3: Design Studio Hardening — Implementation Proposal

- **Status:** Authorized; in progress on this PR
- **Date:** 2026-10-03
- **Parent architecture:** ADR-0036 — Phase 1 Design Studio Architecture
- **Scope:** English and Kannada theme and font names through package Save/Open; regression guard that no stylesheet is stored
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Close Phase 1 Design Studio hardening: English and Kannada theme and font names survive package Save/Open, and a CSS or Typst stylesheet cannot sit beside the Book.

## 2. Slice 3 objective

1. `designStudioUx` — `findStoredStylesheetLeak`
2. Hardening e2e: EN + KN theme and font names through the design port and coordinator package Save → Open
3. Saved `book.json` has no `stylesheet`, `css`, `typstTheme`, or `themeCss` key, and the package contains no `.css` or `.typ` file
4. Mark Slice 3 authorized on this PR. Slices 1–2 stay done. Closure stays unauthorized

## 3. Explicit exclusions

- A CSS, Typst, or EPUB stylesheet editor
- Book Model fields for paragraph spacing beyond line height, image treatment, chapter opening, or style properties
- Metadata Wizard, Cover Wizard, AI, DTP, or Gate 6 font-pin changes
- Design Studio closure reconciliation (follows this slice, after it lands)

## 4. Acceptance criteria

- English theme and font names survive package Save → Open
- Kannada theme and font names survive package Save → Open
- saved `book.json` has no stored stylesheet
- the package directory has no `.css` or `.typ` file
- desktop `npm test` / CI pass
- diff stays within Slice 3
