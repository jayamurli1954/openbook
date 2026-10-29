# Conversation Record — ADR-0040 Slice 1: DOCX container reader and limits

- **Date:** 2026-10-28
- **Participants:** Maintainer + coding agent
- **Topic:** Implement ADR-0040 Slice 1
- **Related:** `docs/adr-0040-slice-1-docx-container.md`; `docs/adr/0040-docx-import-architecture.md`; `docs/release-compliance/NPM-PRODUCTION-INVENTORY-SLICE-3.md`

## Context

After ADR-0040 was accepted (PR #164) and its status reconciled (PR #165), the maintainer wrote: “authorize ADR-0040 Slice 1 (reading the zip file safely, with the size limits)”.

## Decisions

1. Implement Slice 1 only: ZIP reader, ADR-0040 §5 limits, macro/template/encryption rejection, restricted XML reader, tests.
2. Reuse `fflate` 0.8.3 in `@openbook/importer`; the closure inventory regenerates unchanged.
3. Define `DocxImportSource` now; widen `ImportSource` and turn on `canImport("docx")` in Slice 2 (recorded in the slice record §3).
4. Keep the compression-ratio limit at 1,000 : 1 as ADR-0040 states.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Unresolved questions

- `fflate` compresses zeros at about 1,024 : 1, so the 1,000 : 1 ratio check only catches near-maximal bombs; the size caps carry the real protection. Should the ratio be lowered (for example to 200 : 1) once real manuscripts have been measured?

## Action items

- Measure the compression ratios of real Word manuscripts (maintainer's book locally in Slice 5, or earlier if the maintainer chooses) before fixing the ratio constant.
- Slice 2 needs its own authorization.

## Outcomes

- Branch `feat/adr-0040-slice-1-docx-container`; merged as PR #166 after a review pass (10 findings fixed).
