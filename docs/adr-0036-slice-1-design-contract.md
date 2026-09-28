# ADR-0036 Slice 1: Design Contract — Implementation Proposal

- **Status:** Implemented on main (PR #139)
- **Date:** 2026-09-28
- **Parent architecture:** ADR-0036 — Phase 1 Design Studio Architecture
- **Scope:** Capability matrix and command port for theme and typography; no chrome
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Give Design Studio a fail-closed port over the Book fields that already exist: `theme` and `typography`. Guided choices and Save/Open stay in later slices.

## 2. Slice 1 objective

1. Capability matrix for ROADMAP §3.5, with paragraph spacing, image treatment, and chapter opening deferred
2. `readBookDesign` plus `set-theme` and `set-typography` through `BookSession`
3. Blank theme id or name, and non-positive or non-finite body size or line height, leave the Book unchanged
4. Tests only. No React chrome

## 3. Explicit exclusions

- Guided choice chrome (Slice 2)
- English and Kannada package Save/Open (Slice 3)
- Stylesheets, CSS, or Typst theme files
- Book Model fields for paragraph spacing, image treatment, or chapter opening

## 4. Acceptance criteria

- theme and typography commands update the Book
- Kannada theme and font names are preserved
- a blank theme or a non-positive measure does not change the Book
- desktop and authoring tests pass
- diff stays within Slice 1
