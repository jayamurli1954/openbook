# ADR-0037 Slice 1: Metadata Contract — Implementation Proposal

- **Status:** Implemented on main (PR #147)
- **Date:** 2026-10-12
- **Parent architecture:** ADR-0037 — Phase 1 Metadata Wizard Architecture
- **Scope:** Capability matrix and command port for `Book.metadata`; no chrome
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-12)

## 1. Purpose

Give Metadata Wizard a fail-closed port over the metadata the Book already stores. Guided fields and Save/Open hardening stay in later slices.

`BookSession.updateMetadata` already exists. `validateBook` rejects a blank language (`missing-language`, error) but only warns on a blank title (`missing-title`, warning), so the session accepts an empty title. Slice 1 adds the product-facing contract on top: its own blank-title and blank-language checks before mutation (the title check is what enforces ADR-0037 invariant 2), structured error codes, and normalized list fields. No authoring or Book Model change is expected.

## 2. Slice 1 objective

1. `apps/desktop/src/workflow/domain/metadataWizardContract.ts`, following the ADR-0036 `designStudioContract.ts` pattern:
   - capability matrix for ROADMAP §3.6 per ADR-0037 §2.2: twelve in-scope fields; cover metadata and accessibility metadata **deferred**; book type, audience, length, and writing goal **out of scope**
   - `readBookMetadata(book)` returning a copy of `Book.metadata`
   - narrow `MetadataWizardSessionPort` (`getBook`, `updateMetadata`) that `BookSession` already satisfies
   - one `set-metadata` command carrying a partial `BookMetadata`
2. Checks run before `BookSession` mutation so a rejected command leaves the Book unchanged:
   - a title or language that is present but blank after trimming → `EMPTY_TITLE` / `EMPTY_LANGUAGE`
   - an unknown field name → `UNKNOWN_FIELD`
   - a `DomainValidationError` from the session → `METADATA_REJECTED`
3. Normalization: trim text fields; trim list entries and drop blank ones; keep list order; keep Unicode text unchanged
4. `identifier` is stored as text. No ISBN checksum or agency lookup
5. Tests only. No React chrome

## 3. Explicit exclusions

- Guided field chrome (Slice 2)
- English and Kannada package Save/Open regression and the no-OPF/ONIX guard (Slice 3)
- Book Model schema changes or new metadata properties
- Cover metadata, accessibility metadata, ONIX, ISBN validation
- Writing an EPUB OPF, HTML head, or PDF info dictionary from the wizard
- AI metadata suggestions

## 4. Acceptance criteria

- `set-metadata` updates each in-scope field on the Book
- Kannada title, author, and description text is preserved exactly
- a blank title or blank language leaves the Book unchanged and returns a structured error
- author, contributor, and subject lists are trimmed, keep their order, and drop blank entries
- a partial update leaves the other metadata fields unchanged
- the contract module stays free of React, Tauri, filesystem, and TipTap imports
- desktop and authoring tests pass
- diff stays within Slice 1

## 5. Expected files

- `apps/desktop/src/workflow/domain/metadataWizardContract.ts` (new)
- `apps/desktop/src/workflow/domain/metadataWizardContract.test.ts` (new)
- `apps/desktop/package.json` (add the test to the `test` script)
- status docs: this proposal, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-METADATA-WIZARD-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`
