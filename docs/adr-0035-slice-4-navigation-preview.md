# ADR-0035 Slice 4: Navigation Preview — Implementation Proposal

- **Status:** Implemented on main (PR #135)
- **Date:** 2026-09-28
- **Parent architecture:** ADR-0035 — Phase 1 Structure Studio Architecture
- **Scope:** Read-only navigation preview of Book section order
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Show authors the reading order the publishing engine already derives from the Book: front matter, then main matter, then back matter. The preview lists title, matter, and role. It is not a stored table of contents.

## 2. Slice 4 objective

1. `projectBookNavigation` projects `listBookStructure` into a single reading order
2. Structure chrome renders that list and does not edit the Book
3. Tests that the projection follows Book order, preserves titles, and leaves the Book unchanged
4. Source-shape guard that the preview does not call structure commands or write `nav.xhtml`

## 3. Explicit exclusions

- Empty-matter copy polish and package round-trips (Slice 5)
- Deleting sections from the structure rail
- Nested section trees
- A stored outline or TOC document
- EPUB `nav.xhtml` generation (ADR-0009 publishing engine)

## 4. Acceptance criteria

- preview order is front, then main, then back
- reorder in the Book changes the next preview
- calling the projection does not change the Book
- preview chrome has no edit controls
- desktop `npm test` / CI pass
- diff stays within Slice 4
