# ADR-0037 Slice 2: Guided Fields — Implementation Proposal

- **Status:** Proposed; awaiting maintainer authorization
- **Date:** 2026-10-13
- **Parent architecture:** ADR-0037 — Phase 1 Metadata Wizard Architecture
- **Depends on:** ADR-0037 Slice 1 metadata contract (PR #147)
- **Scope:** Metadata chrome for the twelve in-scope `Book.metadata` fields
- **Implementation authorization:** None yet. Requires an explicit maintainer authorization for this slice

## 1. Purpose

Let authors set the book's metadata from labeled fields after Guided Start. Every change goes through the Slice 1 metadata port, so a blank title or language is still rejected and the Book stays unchanged.

## 2. Slice 2 objective

1. `apps/desktop/src/workflow/domain/metadataWizardFields.ts`: `createMetadataWizardFields(session)` with `read()` and `apply(metadata)`, sending one `set-metadata` command through `executeMetadataCommand`. Follows ADR-0036 `designStudioChoices.ts`
2. `apps/desktop/src/ui/MetadataWizardFields.tsx`, wired in `EditorSurface.tsx` the way `DesignStudioChoices` is (through `coordinator.getSession()`, so ADR-0031 autosave dirty hooks fire):
   - single-line fields: title, subtitle, language, identifier, publisher, publication date, copyright, rights
   - multi-line field: description
   - list fields, one entry per line: authors, contributors, subjects. One per line, not comma-separated, because names such as "Rao, Muralidhar" contain commas
   - one **Apply** button; fields show the Book's current values on open and after Apply
3. A rejected Apply leaves the Book unchanged, keeps the author's typed values in the form, and shows the port error in plain language (for example "A book title is required.")
4. Plain-language labels and hints: identifier says ISBN is optional and not checked; publication date suggests `YYYY-MM-DD` but is stored as text
5. No OPF, ONIX, or metadata preview editor

## 3. Explicit exclusions

- English and Kannada package Save/Open regression and the no-OPF/ONIX guard (Slice 3)
- Cover metadata (Cover Wizard, ROADMAP §3.7) and accessibility metadata
- ISBN checksum, identifier-agency lookup, or date validation
- A language picker or BCP-47 tag validation; language stays a text field
- Book Model schema or `BookSession` changes
- AI metadata suggestions

## 4. Acceptance criteria

- applying the fields updates `Book.metadata` through the Slice 1 port
- Kannada title, author, subject, and description text is preserved
- a blank title or blank language does not change the Book and shows the port error
- list fields split on new lines, drop blank lines, and keep order
- a metadata edit marks the project dirty for ADR-0031 autosave when a package is bound
- the UI component stays free of Tauri, filesystem, coordinator mutation, and TipTap persistence calls
- desktop `npm test` / CI pass
- diff stays within Slice 2

## 5. Expected files

- `apps/desktop/src/workflow/domain/metadataWizardFields.ts` (new)
- `apps/desktop/src/workflow/domain/metadataWizardFields.test.ts` (new)
- `apps/desktop/src/ui/MetadataWizardFields.tsx` (new)
- `apps/desktop/src/workflow/domain/metadataWizardFields.ui.test.ts` (new)
- `apps/desktop/src/EditorSurface.tsx`, `apps/desktop/src/App.css`
- `apps/desktop/package.json` (add the tests to the `test` script)
- status docs: this proposal, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-METADATA-WIZARD-SELECTION.md`, `docs/adr/0037-phase-1-metadata-wizard-architecture.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`
