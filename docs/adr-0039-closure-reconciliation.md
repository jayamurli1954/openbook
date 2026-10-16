# ADR-0039 Studio Shell & Guided UX — Closure & Reconciliation

- **Status:** Implementation-complete on merge of Slice 7; closure/reconciliation record
- **Date:** 2026-10-16
- **Baseline:** `main` after ADR-0039 Slice 6 merge (PR #160, `0647641`) plus Slice 7 (this PR)
- **Authority:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Implementation authorization:** Completed for the seven approved ADR-0039 slices; no further ADR-0039 slice is authorized by this record

## 1. Purpose

Reconcile ADR-0039 implementation against the accepted architecture and close the studio shell slice sequence.

This record does not authorize Cover Wizard slices, Preview, AI help, UI translation, dark mode, or bundled UI fonts.

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| 1 | Step model and Guide content | Done — PR #155 (with a test-determinism fix) |
| 2 | Shell frame, visual tokens, Diagnostics drawer | Done — PR #156 |
| 3 | One outline, full-width Write, Focus mode | Done — PR #157 |
| 4 | Structure, Design, Details, Publish steps | Done — PR #158 (with the ADR-0022 re-check amendment) |
| 5 | Guide panel | Done — PR #159 |
| 6 | Start screen | Done — PR #160 |
| 7 | Hardening and closure | This PR |

## 3. Architectural invariants preserved

1. No Book Model, persistence, autosave, or engine behaviour change from the shell — **with one approved exception**: ADR-0022 was amended (Slice 4) so the book check may run from VALIDATION onward, fixing a dead end where export stayed blocked after any edit in PREVIEW.
2. Every studio action available before the shell is reachable after it (source-tested panel by panel).
3. Every step shows a Guide with a checklist, tips, and questions, and a Next step except Publish.
4. Author-facing copy contains no internal terms (tested for guide, statuses, save messages, check results, start copy, and mapped errors).
5. Diagnostics are hidden by default and one click away.
6. Interactive elements are real controls; the skip link and step focus support keyboard and screen-reader users; colour pairs meet WCAG AA.
7. Errors shown to authors are plain language; originals stay in Diagnostics.
8. No AI dependency was introduced.

## 4. Explicitly still open (not ADR-0039 failures)

- **Manual check in the Tauri app:** create a book from a book type (for example Kannada book) and confirm the Design step shows the matching look. The browser preview cannot create books (SQLite needs Tauri); the path is covered by the Slice 7 domain walk.
- **Explicit Save vs autosave race** (found during Slice 1) — fixed after closure; see the ADR-0031 amendment (2026-10-16).
- **Gate 6 font downloads from a moving branch** (CI reliability; separate task).
- “Export your ebook” cannot tick until the app records exports.
- Help/Focus preferences are not remembered between sessions (needs a preferences ADR).
- Visual review of the layout: automated screenshots were unavailable throughout; behaviour was verified through the page.
- Device-accurate Preview (ROADMAP §3.9), UI translation, dark mode, bundled UI fonts, AI help.

## 5. Closure determination

**ADR-0039 implementation is closed as a slice sequence once Slice 7 merges.**

ADR-0038 Cover Wizard (image cover), Accepted in PR #153, is **unblocked**: the shell's Cover step exists and shows “coming soon”. Its Slice 1 still needs explicit maintainer authorization.
