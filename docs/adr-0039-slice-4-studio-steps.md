# ADR-0039 Slice 4: Studio Steps — Implementation Proposal

- **Status:** Implemented on this PR; awaiting merge
- **Date:** 2026-10-15
- **Parent architecture:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Depends on:** Slice 3 outline and Write step (PR #157)
- **Scope:** Full-width Structure, Design, Details, and Publish steps; stage chips and Export leave Write; book re-check fix
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-15)

## 1. Purpose

Give each studio step the full-width layout from the accepted mockup, and make Publish the single place to check the book and export it.

## 2. Slice 4 objective

1. **Publish** (`ui/PublishStep.tsx`, `workflow/domain/studioShellPublish.ts`):
   - **Check my book** walks the workflow forward only as far as needed (`stagesToReachBookCheck`), runs the book check, and moves to PREVIEW when clean, so export unlocks without the author ever seeing stages
   - plain summary: not checked / ready / ready with suggestions / N things to fix; each finding listed, with its fix suggestion and a **Go there** link when it points at a section
   - export cards: EPUB ebook (primary), PDF, Web page — `ExportPanel` rewritten as cards, still delegating to `DesktopExportController`
   - top bar **Export…** opens Publish
2. **Stage chips and Next stage** move from Write into the Diagnostics drawer (developers only). The Export panel leaves Write.
3. **Design**: three ready-made looks (Classic, Modern, Kannada) applied through the ADR-0036 port (`applyPreset`), limited to the four Noto fonts bundled for PDF; typeface fields suggest those fonts; live preview beside the fields. The preview says it uses installed fonts and that ebook readers may substitute their own.
4. **Details**: the twelve fields grouped as Essentials, Publishing, and Help readers find it, two columns, **Save details**.
5. **Structure**: the existing rail and reading-order preview styled as cards (no behaviour change).

## 3. Domain fix in this PR (maintainer-approved)

Workflow stages only move forward, and the book check could run only in `VALIDATION`. After reaching `PREVIEW`, any edit cleared the check and no new check was possible, so export stayed blocked for the rest of the session. On 2026-10-15 the maintainer chose "Allow re-check, fix now": `runValidation` is permitted from `VALIDATION` onward. Export still requires a clean check of the current book; stages stay forward-only. Recorded as an amendment to ADR-0022 (INV-6) and committed separately.

## 4. Explicit exclusions

- Guide panel (Slice 5); start screen, Guided Start, Import, and Save moving out of Write (Slice 6)
- Plain-language mapping of export failure codes (Slice 7)
- New theme or typography Book Model fields; bundling new fonts
- Device preview (ROADMAP §3.9)

## 5. Acceptance criteria

- Publish: one button checks the book from any stage; export unlocks when clean
- an edit after checking shows "not checked"; checking again unlocks export
- stage chips appear only in Diagnostics; Write has no Export panel
- presets set theme and typography through the port and use only bundled fonts
- Details shows three groups; every field still saves through the ADR-0037 port
- desktop `npm test` / build / CI pass

## 6. Verification

Browser dev build: Export… opens Publish; before checking, export buttons are disabled; Check my book → "Your book is ready to export", EPUB enabled, step shows "✓ Ready", stage PREVIEW (in Diagnostics). Typing in Write → Publish shows "Not checked" and disables export; Check again → ready. Kannada look: preset pressed, fonts Noto Serif/Sans Kannada, preview follows, step shows "Kannada". Details shows the three groups. Screenshots were unavailable, so the layout was not inspected visually.
