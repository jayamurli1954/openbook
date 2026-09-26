# ADR-0034 Slice 2: Formatting Chrome — Implementation Proposal

- **Status:** Implemented on this branch (Draft PR)
- **Date:** 2026-09-26
- **Parent architecture:** ADR-0034 — Phase 1 Writing Studio Architecture
- **Scope:** Complete heading/emphasis/list/quote/link toolbar chrome bound TipTap → EditorAdapter → BookSession; EN/KN smoke; no word-count/search UI
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Productize the Writing Studio formatting toolbar so every Slice 1 toolbar command is reachable from React chrome, routed through an injectable TipTap command port, and projected into the canonical Book via the existing editor update path.

## 2. Slice 2 objective

1. `writingStudioToolbarAdapter` — maps `WritingStudioToolbarCommand` onto `WritingStudioEditorCommandPort`
2. `createTipTapEditorCommandPort` — TipTap Editor binding (host)
3. `WritingStudioToolbar` React chrome — all contract commands (H1–H6, bold/italic, lists, quote, link/unlink, undo/redo)
4. Wire `EditorSurface` to the new toolbar (replace incomplete inline buttons)
5. EN/KN formatting smoke through `applyActiveSectionTipTap` → Book Model
6. Source-shape UI guards; register tests in desktop `npm test`

## 3. Explicit exclusions

- Word-count / document-search UI (Slice 3)
- Image insertion UI (Slice 4)
- Hardening / empty-state polish (Slice 5)
- Tables / Book Model schema changes
- AI outline generation
- Changing Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- adapter maps every contract toolbar command; set-link fails closed without href
- EN + KN formatting smoke lands in Book Model (not TipTap-as-canonical)
- toolbar UI stays free of coordinator/Tauri/FS calls
- desktop `npm test` / CI pass
- diff stays within Slice 2 (adapter + TipTap port + toolbar chrome + tests + docs)
