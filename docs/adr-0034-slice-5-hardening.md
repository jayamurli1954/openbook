# ADR-0034 Slice 5: Writing Studio Hardening — Implementation Proposal

- **Status:** Implemented on this branch (Draft PR)
- **Date:** 2026-09-27
- **Parent architecture:** ADR-0034 — Phase 1 Writing Studio Architecture
- **Scope:** Empty-state and failure copy; EN/KN authoring Save → Open; regression guard that TipTap is never the stored Book
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Close Phase 1 Writing Studio hardening: authors see plain-language empty and failure states, English and Kannada chapter text survives package Save/Open through the coordinator, and persisted package JSON cannot be a TipTap document.

## 2. Slice 5 objective

1. `writingStudioUx` — empty-chapter, no-section, editor-unavailable, search, and image failure copy (unit-tested)
2. Find panel, image button, and `EditorSurface` use that copy
3. Hardening e2e: EN + KN TipTap transport → Book → package Save → Open, with Unicode preserved
4. `findTipTapCanonicalLeak` rejects `type: "doc"` and editor-state keys on the stored package payload
5. Mark ADR-0034 Slices 1–4 complete; Slice 5 authorized on this PR

## 3. Explicit exclusions

- Tables / Book Model schema changes
- AI outline generation
- Changing Gate 10 packaging `foundationReady`
- Writing Studio closure reconciliation (follows this slice)

## 4. Acceptance criteria

- empty and failure copy maps image/search codes without inviting TipTap storage
- EN and KN chapter text survive package Save → Open
- saved `book.json` has no TipTap document root
- desktop `npm test` / CI pass
- diff stays within Slice 5 (UX helpers + chrome wiring + hardening tests + docs)
