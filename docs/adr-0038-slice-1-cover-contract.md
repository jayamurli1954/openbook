# ADR-0038 Slice 1: Cover Model and Contract — Implementation Proposal

- **Status:** Implemented on main (PR #163)
- **Date:** 2026-10-23
- **Parent architecture:** ADR-0038 — Phase 1 Cover Wizard Architecture (Image Cover)
- **Scope:** `publishing.coverAssetId` in the Book Model, its validation, `BookSession` set/clear cover, and a fail-closed desktop cover port; no chrome
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-23)

## 1. Purpose

Give the Book a way to name its cover image, and give the Cover Wizard a tested, fail-closed port over it. Image checks, chrome, and engine projections stay in later slices.

Today nothing marks an asset as the cover. `Book.assets` already holds `AssetRef` entries with `kind`, `mediaType`, and `altText`, and `BookSession.addAsset` / `removeAsset` already exist. The package (ADR-0029) and SQLite store the whole Book as JSON, so a new optional field round-trips without a mapping change.

## 2. Slice 1 objective

1. **Book Model** (`packages/book-model/src/types.ts`): add `coverAssetId?: string` to `PublishingSettings`, as specified in ADR-0038 §2.1. `schemaVersion` stays `1`; `createBook` does not set the field.
2. **Validation** (`packages/book-model/src/validate-book.ts`), all severity `error`, only when `coverAssetId` is present:

   | Code | Rule |
   |---|---|
   | `cover-asset-missing` | `coverAssetId` names no asset in `Book.assets` |
   | `cover-asset-not-image` | the asset's `kind` is not `image`, or its `mediaType` is not `image/jpeg` or `image/png` |
   | `cover-alt-text-missing` | the asset's `altText` is blank after trimming |

   Because these are errors, `BookSession.removeAsset` on the current cover fails through normal validation and the Book is unchanged (ADR-0038 §2.1 fail-closed removal). A package whose `book.json` has a dangling cover fails to open with the existing `BOOK_VALIDATION_FAILED` error.
3. **Authoring** (`packages/authoring/src/book-session.ts`), both through the existing `#mutate` path, so each is one undo step and a rejected call leaves the Book unchanged:
   - `setCover(assetId: string, altText: string)` sets the asset's `altText` and `publishing.coverAssetId` together. Setting alt text in the same mutation lets an image that arrived with empty alt text become the cover in one step.
   - `clearCover()` removes `coverAssetId`. The asset stays in `Book.assets`.
4. **Coordinator** (`apps/desktop/src/domain/desktopStudioCoordinator.ts`): add `setCover` and `clearCover` to `SESSION_MUTATORS`, so cover edits clear the last Book Doctor report and mark ADR-0031 autosave dirty when a package root is bound.
5. **Desktop contract** (`apps/desktop/src/workflow/domain/coverWizardContract.ts`), following the ADR-0037 `metadataWizardContract.ts` pattern:
   - capability matrix for ROADMAP §3.7 / PRD §13 per ADR-0038 §2.2 (in scope, deferred, out of scope)
   - `readCover(book)` → the cover asset's id, file name, media type, and alt text, or `null`
   - narrow `CoverWizardSessionPort` (`getBook`, `setCover`, `clearCover`) that `BookSession` satisfies
   - commands `set-cover { assetId, altText }` and `clear-cover`
   - checks run before the session is touched, with structured codes: `UNKNOWN_ASSET`, `NOT_AN_IMAGE`, `UNSUPPORTED_IMAGE_TYPE` (anything but JPEG or PNG, including SVG, WebP, GIF), `EMPTY_ALT_TEXT`, `NO_COVER` (clear with no cover set); a `DomainValidationError` from the session maps to `COVER_REJECTED`
   - alt text is trimmed; Kannada and other Unicode text is kept exactly
6. The port works on assets already on the Book. Bringing in a new image stays with the existing `ingestAsset` and picker host path; the wizard chrome (Slice 3) ingests first, then sets the cover.
7. Tests only. No React chrome.

## 3. Explicit exclusions

- Pixel-size and aspect-ratio checks and their warnings (Slice 2)
- Cover Wizard chrome, and switching the studio Cover step off "Coming soon" (Slice 3)
- EPUB `cover-image`, `cover.xhtml`, and landmark (Slice 4); HTML and PDF cover (Slice 5). Engines are not changed and ignore the field until then
- English and Kannada package Save/Open and autosave hardening with a cover (Slice 6)
- Any `schemaVersion` bump, package migration, or SQLite schema change
- Generated covers, cover text, templates, typography, contrast checks, print covers, AI
- New dependencies or Tauri permissions

## 4. Acceptance criteria

- a Book without `coverAssetId` validates exactly as before, and existing book-model, authoring, and desktop tests pass unchanged
- `setCover` on a JPEG or PNG image asset with alt text sets the cover and the alt text in one undo step; undo restores both
- each validation code fires for its case, and the session rejects the mutation with the Book unchanged
- `removeAsset` on the current cover fails; after `clearCover` it succeeds
- each contract error code is returned for its case, with the Book unchanged
- Kannada alt text is preserved exactly
- a cover edit through the coordinator marks autosave dirty when a package root is bound (the same mutation hook clears the validation report)
- a Book with a cover survives `serializeBook` / `parseBook` and the package Book mapping unchanged
- the contract module imports no React, Tauri, filesystem, or TipTap
- desktop, book-model, and authoring `npm test` and CI pass
- diff stays within Slice 1

## 5. Expected files

- `packages/book-model/src/types.ts`, `validate-book.ts`, `book-model.test.ts`
- `packages/authoring/src/book-session.ts`, `authoring.test.ts`
- `apps/desktop/src/domain/desktopStudioCoordinator.ts` (`SESSION_MUTATORS` only)
- `apps/desktop/src/workflow/domain/coverWizardContract.ts` (new)
- `apps/desktop/src/workflow/domain/coverWizardContract.test.ts` (new)
- `apps/desktop/package.json` (add the test to the `test` script)
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-COVER-WIZARD-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`

## 6. Noted while preparing this proposal (not changed here)

`SESSION_MUTATORS` in `desktopStudioCoordinator.ts` does not list `updateTheme` or `updateTypography`. Design Studio edits (ADR-0036) therefore set the session's dirty flag but do not schedule autosave or clear the last Book Doctor report. This is recorded as a separate follow-up and is out of scope for this slice.
