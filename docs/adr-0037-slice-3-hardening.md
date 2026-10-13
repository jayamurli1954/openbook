# ADR-0037 Slice 3: Metadata Wizard Hardening — Implementation Proposal

- **Status:** Proposed; awaiting maintainer authorization
- **Date:** 2026-10-13
- **Parent architecture:** ADR-0037 — Phase 1 Metadata Wizard Architecture
- **Depends on:** Slice 1 metadata contract (PR #147); Slice 2 guided fields (PR #149)
- **Scope:** English and Kannada metadata through package Save/Open; regression guard that no OPF or ONIX document is stored
- **Implementation authorization:** None yet. Requires an explicit maintainer authorization for this slice

## 1. Purpose

Close Phase 1 Metadata Wizard hardening. Metadata set through the wizard must survive package Save/Open unchanged, in English and Kannada, and an EPUB package document or ONIX record must never sit beside the Book. This covers ADR-0037 invariants 3–5.

Save/Open is the one path the Slice 2 browser check could not exercise, because SQLite only runs inside Tauri. The ADR-0029 package path runs under Node, so it is testable here.

## 2. Slice 3 objective

1. `apps/desktop/src/workflow/domain/metadataWizardUx.ts` — `findStoredMetadataDocumentLeak(value)`, following ADR-0036 `findStoredStylesheetLeak`. It walks a persisted payload and reports the path of any `opf`, `packageDocument`, `onix`, or `onixRecord` key
2. Hardening e2e (`metadataWizardHardening.e2e.test.ts`):
   - set all twelve in-scope fields through the Slice 2 fields adapter, in English and in Kannada (title, authors, subjects, description, copyright)
   - bind a temporary package root, Save through the coordinator, Open into a fresh coordinator
   - the reopened `Book.metadata` equals what was applied, including list order and multi-line description
   - autosave: a metadata edit on a bound package schedules autosave, and the flushed package contains the new value (ADR-0031, invariant 5)
3. Regression guard on the saved package:
   - `book.json`, `manifest.json`, and `assets.json` have no OPF or ONIX key (`findStoredMetadataDocumentLeak` returns null)
   - the package directory contains no `.opf`, `.onix`, or `.xml` file
4. UI source-shape test (`metadataWizardHardening.ui.test.ts`): the Book details panel and fields adapter do not import a publishing engine or write files
5. Status docs: Slice 3 authorized on the implementation PR. ADR-0037 closure stays a separate reconciliation step

## 3. Explicit exclusions

- Changes to the metadata contract, the Book details panel, or `BookSession`
- SQLite-only Save/Open (package Save is the bound path since ADR-0031 Slice 5)
- Checking EPUB, HTML, or PDF metadata output from the publishing engines
- Cover metadata, accessibility metadata, ISBN or language validation
- ADR-0037 closure reconciliation (follows this slice, after it lands)

## 4. Acceptance criteria

- English metadata survives package Save → Open
- Kannada metadata survives package Save → Open, byte-for-byte as Unicode text
- list order and multi-line description are preserved
- a metadata edit on a bound package is written by autosave
- no saved package file has an OPF or ONIX key
- the package directory has no `.opf`, `.onix`, or `.xml` file
- desktop `npm test` / CI pass
- diff stays within Slice 3

## 5. Expected files

- `apps/desktop/src/workflow/domain/metadataWizardUx.ts` (new)
- `apps/desktop/src/workflow/domain/metadataWizardUx.test.ts` (new)
- `apps/desktop/src/workflow/domain/metadataWizardHardening.e2e.test.ts` (new)
- `apps/desktop/src/workflow/domain/metadataWizardHardening.ui.test.ts` (new)
- `apps/desktop/package.json` (add the tests to the `test` script)
- status docs: this proposal, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-METADATA-WIZARD-SELECTION.md`, `docs/adr/0037-phase-1-metadata-wizard-architecture.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`
