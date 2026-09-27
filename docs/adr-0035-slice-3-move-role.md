# ADR-0035 Slice 3: Move and Role — Implementation Proposal

- **Status:** Implemented on this branch (Draft PR)
- **Date:** 2026-09-27
- **Parent architecture:** ADR-0035 — Phase 1 Structure Studio Architecture
- **Scope:** Move a section between front, main, and back matter; set a role valid for the current matter; last main chapter stays fail-closed
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Let authors move sections between matter groups and set a publishing role, using the Slice 1 command port and the existing `BookSession` role rules.

## 2. Slice 3 objective

1. `rolesForMatter` on `@openbook/authoring` so the rail lists the same roles `isRoleValidForMatter` accepts
2. Matter rail `move` and `setRole` methods
3. Structure rail controls: move-to select and role select
4. Tests for last-chapter protection, invalid role, and a successful custom-role move
5. No remove control

## 3. Explicit exclusions

- Navigation preview (Slice 4)
- Empty-matter copy polish and package round-trips (Slice 5)
- Deleting sections from this rail
- Nested section trees

## 4. Acceptance criteria

- last main chapter cannot be moved out
- a chapter role cannot move into back matter
- a role invalid for the current matter is rejected and the Book is unchanged
- a `custom` front section can move to back matter
- desktop `npm test` / CI pass
- diff stays within Slice 3
