# Conversation Record — Cover Wizard selection and ADR-0038

- **Date:** 2026-10-14
- **Participants:** Maintainer + coding agent
- **Topic:** Select Phase 1 Cover Wizard and accept ADR-0038 architecture
- **Related:** `docs/PHASE-1-COVER-WIZARD-SELECTION.md`; `docs/adr/0038-phase-1-cover-wizard-architecture.md`; `docs/adr-0037-closure-reconciliation.md`

## Context

After PR #152 closed ADR-0037, the maintainer wrote "go ahead with Cover Wizard selection".

Review found that nothing handles a cover today: the Book has no cover field, and the EPUB engine writes no `cover-image` property or cover page (ADR-0010 excluded cover semantics).

Asked to choose the first scope, the maintainer chose **image cover first** over "image + generated text cover" and "full cover studio".

## Decisions

1. Select ROADMAP §3.7 Cover Wizard, image cover scope.
2. Accept ADR-0038 architecture only. No implementation slice is authorized.
3. One optional Book Model field, `publishing.coverAssetId`; `schemaVersion` stays 1; no package migration.
4. The cover must be a JPEG or PNG image asset with non-empty alt text.
5. EPUB, HTML, and PDF engines project the cover at publish time; ADR-0038 amends ADR-0010's exclusion of cover semantics.
6. Generated covers, cover directions, text, typography, positioning, and contrast checks move to a later ADR.
7. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `docs/adr-0038-cover-wizard-selection`.
