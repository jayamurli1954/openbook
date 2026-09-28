# ADR-0036 Slice 2: Guided Choices — Implementation Proposal

- **Status:** Implemented on main (PR #140)
- **Date:** 2026-09-28
- **Parent architecture:** ADR-0036 — Phase 1 Design Studio Architecture
- **Scope:** Design chrome for theme, body typeface, heading typeface, body size, and line height
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Let authors set the Book theme and typography from labeled fields. Every change goes through the Slice 1 design port.

## 2. Slice 2 objective

1. `createDesignStudioChoices` reads the Book and sends `set-theme` and `set-typography`
2. Design chrome: theme name, theme id, body typeface, heading typeface, body size, and line height
3. A rejected measure leaves the Book unchanged and reports the port error
4. No stylesheet editor

## 3. Explicit exclusions

- English and Kannada package Save/Open (Slice 3)
- Paragraph spacing beyond line height, image treatment, and chapter opening
- CSS, Typst, or EPUB stylesheet editing

## 4. Acceptance criteria

- applying a theme and typefaces updates the Book
- Kannada theme and font names are preserved
- body size `0` does not change the Book
- desktop `npm test` / CI pass
- diff stays within Slice 2
