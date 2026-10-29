# ADR-0038 Slice 3: Cover Wizard Chrome — Implementation Proposal

- **Status:** Implemented on main (PR #179)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0038 — Phase 1 Cover Wizard Architecture (Image Cover)
- **Scope:** The studio's Cover step: choose a picture, describe it, preview it with warnings, set, replace, or remove the cover
- **Implementation authorization:** Granted for this slice only, with the recommended tidy-up of unused old cover pictures (maintainer, 2026-10-29)

## 1. Purpose

Replace the Cover step's "coming soon" placeholder with a working Cover Wizard, built only on the Slice 1 and Slice 2 contracts. After this slice an author can give their book a cover inside OpenBook. Engines still ignore the cover until Slices 4–5.

Today:

- `EditorSurface.tsx` renders a placeholder for the Cover step and passes `cover: "unavailable"` to the studio shell, so the step shows "Coming soon".
- The Cover guide (`studioShellGuide.ts`) says covers are coming soon.
- The Writing Studio picker (`createWritingStudioImagePickPort.ts`) opens a file dialog through the dialog plugin and reads bytes through the existing `asset_read_bytes` command. It allows GIF and WebP, which can't be covers.
- The editor never displays stored image bytes, so the preview is new.

## 2. Slice 3 objective

1. **Cover picker host** (`apps/desktop/src/host/createCoverImagePickPort.ts`):
   - same pattern as the Writing Studio picker (Tauri dialog plus `asset_read_bytes`, with a browser fallback for Vite)
   - dialog title "Choose a cover picture"; filters limited to PNG and JPEG
   - no new Tauri command, permission, or capability
2. **Chrome-free fields port** (`apps/desktop/src/workflow/domain/coverWizardFields.ts`), following `metadataWizardFields.ts`:
   - `read()` returns the current cover (Slice 1 `readCover`) and its check report (Slice 2 `inspectCover`)
   - `choose()` runs the picker and checks the **picked bytes before anything is added to the Book** (Slice 2 `checkCoverImage`). Cancelling, or choosing a picture with an error, leaves the Book unchanged and adds no asset
   - `apply(altText)` adds the chosen picture through the existing ingestion path (moving the workflow to its assets stage the way the Writing Studio does), then sets it with `executeCheckedCoverCommand`. It is one Save-worthy edit that autosave picks up
   - `remove()` runs `clear-cover`
   - results carry the Slice 1/2 codes; the port maps each to a plain-language message
3. **React chrome** (`apps/desktop/src/ui/CoverWizard.tsx`), rendered in the Cover step in place of the placeholder:
   - **No cover yet:** a short explanation and a "Choose picture…" button
   - **Picture chosen, not yet set:** preview, its size ("841 × 1261 pixels"), any warnings, a required "Describe the cover" field with a hint ("for readers who use screen readers"), and "Use as cover" / "Cancel"
   - **Cover set:** preview, size, warnings, the description (editable, saved with "Update description"), "Replace picture…", and "Remove cover"
   - errors block "Use as cover"; warnings are shown but never block
   - the preview uses a `blob:` URL made from the bytes, revoked when the picture changes or the step closes. Nothing is written to disk for the preview
   - text is plain language and passes the existing internal-terms test
4. **Studio shell wiring:**
   - `EditorSurface.tsx` passes `cover: "none"` or `"set"` from `readCover`, so the Cover step shows "Not added" or "Added" and counts towards book progress
   - the Cover guide intro, checklist, and answers describe the working wizard (for example "Add a JPEG or PNG picture" ticks itself off when a cover is set). "Coming soon" disappears from the shipped copy; the `"unavailable"` state stays in the contract type for compatibility
5. **Tests:** fields-port tests with a fake picker and the real coordinator (cancel, picture with an error, picture with warnings, set, replace, remove, undo); source-shape UI tests like the metadata and design steps; shell status and guide tests for the new copy and statuses; internal-terms checks on all new strings.

## 3. Explicit exclusions

- EPUB, HTML, and PDF cover output (Slices 4–5)
- English and Kannada package Save/Open and autosave hardening with a cover (Slice 6)
- Cropping, rotating, resizing, or converting pictures
- Drag-and-drop, paste, or choosing an image already in the book (picker only)
- Cover text, templates, or generated covers
- Showing cover warnings in Book Doctor or the Publish step
- Any new Tauri permission, dependency, Book Model, or engine change

## 4. Acceptance criteria

- the Cover step shows the wizard, not the placeholder, and its status reads "Not added" or "Added"
- cancelling the picker, or choosing a GIF, WebP, damaged, or oversized file, leaves the Book unchanged with no new asset, and shows a plain message
- a picture with only warnings can be set after entering a description; a blank description keeps "Use as cover" disabled
- setting, replacing, and removing the cover each change the Book as expected and undo restores the previous state
- with a package folder bound, each cover edit schedules autosave
- the preview shows the stored picture, and its `blob:` URL is revoked when it is no longer shown
- the picker filters to PNG and JPEG and uses no new Tauri command or permission
- guide and status copy no longer say "coming soon" and contain no internal terms
- desktop `npm test` and CI pass
- diff stays within Slice 3

## 5. Expected files

- `apps/desktop/src/host/createCoverImagePickPort.ts` (new)
- `apps/desktop/src/workflow/domain/coverWizardFields.ts`, `coverWizardFields.test.ts`, `coverWizard.ui.test.ts` (new)
- `apps/desktop/src/ui/CoverWizard.tsx` (new), `apps/desktop/src/App.css` (cover step styles)
- `apps/desktop/src/EditorSurface.tsx` (Cover step and shell status wiring)
- `apps/desktop/src/workflow/domain/studioShellGuide.ts`, `studioShellContract.ts` (comment only), and their tests
- `apps/desktop/package.json` (add the new tests to the `test` script)
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-COVER-WIZARD-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Decision for the maintainer

When an author replaces or removes the cover, the old picture stays in the book's assets. If no chapter uses it, it would still be stored in the project package and could be copied into exported files.

- **Recommended:** after replacing or removing, also remove the old picture when no chapter uses it. That is a second, separate undo step.
- **Alternative:** leave it in place. Simpler, but unused pictures pile up after a few replacements.

## 7. Noted while preparing this proposal (not changed here)

- `apps/desktop/src-tauri/tauri.conf.json` sets `"csp": null`, so the webview has no Content Security Policy. The `blob:` preview works either way. Tightening the policy is a separate security task.
- The Design Studio autosave gap recorded in the Slice 1 proposal (§6) is still open.
