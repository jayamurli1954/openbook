# Conversation Record — ADR-0040 Slice 2: DOCX text and structure

- **Date:** 2026-10-28
- **Participants:** Maintainer + coding agent
- **Topic:** Implement ADR-0040 Slice 2
- **Related:** `docs/adr-0040-slice-2-docx-text-structure.md`; `docs/adr/0040-docx-import-architecture.md`; `docs/adr-0040-slice-1-docx-container.md`

## Context

After Slice 1 merged (PR #166) and its status was reconciled (PR #167), the maintainer wrote: “ok go ahead with -> ADR-0040 Slice 2: turning the Word file's text into a book (headings and chapters, front matter, dropping the typed contents page, bold/italic, links, lists). This is when .docx import gets switched on in the importer.”

## Decisions

1. Implement Slice 2 only. `canImport("docx")` is now `true`; the desktop still rejects `.docx` until Slice 4.
2. `ImportSource` becomes `TextImportSource | DocxImportSource`. Two desktop UI files switch to `TextImportSource["format"]` (type only).
3. Slice decision beyond ADR-0040 §4.1: when most letters are Kannada and the declared language is not, the language is set to `kn`, with an info issue.
4. Captions right after a picture are held for Slice 3.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Unresolved questions

- Should a large bold first line be used as the book title when neither the core properties nor a Title paragraph names it? Not done in this slice (record §5).

## Action items

- Slice 3 (pictures) needs its own authorization.

## Outcomes

- Branch `feat/adr-0040-slice-2-docx-text`; merged as PR #168 after a review pass (10 findings fixed).
