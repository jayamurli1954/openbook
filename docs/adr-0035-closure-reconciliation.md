# ADR-0035 Structure Studio — Closure & Reconciliation

- **Status:** Implementation-complete; closure/reconciliation record
- **Date:** 2026-09-28
- **Baseline:** `main` after ADR-0035 Slice 5 merge (PR #136, `0ddef29`)
- **Authority:** ADR-0035 — Phase 1 Structure Studio Architecture
- **Implementation authorization:** Completed for the five approved ADR-0035 slices; no further ADR-0035 slice is authorized by this record

## 1. Purpose

Reconcile ADR-0035 implementation against the accepted architecture and close the Phase 1 Structure Studio slice sequence on `main`.

This is a documentation / governance record only. It does not authorize Design Studio, Metadata Wizard, Cover Wizard, a tables or nested-section Book Model ADR, a remove control, AI outline, signing, or Gate 11 work.

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| 1 | Structure contract (capability matrix; list/add/rename/reorder/move/remove/role; fail-closed last chapter and invalid role) | Done — PR #132 |
| 2 | Matter rail: front/main/back groups, add, rename, reorder within a matter | Done — PR #133 |
| 3 | Move between matters and set a role valid for the matter; last main chapter stays fail-closed | Done — PR #134 |
| 4 | Read-only navigation preview of Book order (title, matter, role); no stored TOC | Done — PR #135 |
| 5 | Empty-matter copy, EN+KN titles through package Save/Open, no parallel outline stored | Done — PR #136 |

## 3. Architectural invariants preserved

1. Every structure edit yields a Book Model–valid Book, or a structured fail-closed error.
2. The last main-matter chapter cannot be deleted or moved out of main matter.
3. A section role must be valid for its matter kind.
4. Navigation preview and EPUB `nav.xhtml` are projections of Book order, never a second stored document.
5. Autosave continues to use ADR-0031 package Save semantics when a package root is bound.
6. No AI dependency was introduced by ADR-0035 slices.
7. Nested section trees were not shipped. They still require a Book Model ADR.

## 4. Explicitly still open (not ADR-0035 failures)

- Remove control on the structure rail (`BookSession.removeSection` exists; the rail does not expose it)
- Nested section trees (ROADMAP §3.4 hierarchy beyond a flat list per matter)
- ROADMAP §3.5 Design Studio / §3.6 Metadata Wizard / §3.7 Cover Wizard
- Basic tables — still blocked on a Book Model / SDM extension ADR
- AI outline (ROADMAP §3.2 / Phase 3)
- Writing Studio’s chapter list coexisting with the structure rail
- Code signing / multi-OS packaging

## 5. Closure determination

**ADR-0035 implementation is closed as a slice sequence.**

The next Phase 1 product domain requires a separate selection record and ADR. Design Studio is a natural candidate. This record does not select it.
