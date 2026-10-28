# Phase 1 — Next Domain Selection: Word (.docx) Import

- **Status:** Selected; ADR-0040 accepted (PR #164); implementation not authorized
- **Date:** 2026-10-28
- **Baseline:** `main` at `b975bd9` (PR #162 — save/autosave race fix)
- **Prior records:** `docs/adr-0039-closure-reconciliation.md`; `docs/PHASE-1-COVER-WIZARD-SELECTION.md`
- **Selected domain:** ROADMAP Phase 1 MVP — **Import Existing Book** (§3.1), Word `.docx` with embedded images
- **Architecture ADR:** ADR-0040 (Accepted in PR #164; implementation not authorized). Selection alone does not authorize a slice.

## 1. Why this domain

ROADMAP §3.1 lists “Import Existing Book” as one of the four ways to start. PRD §24 and ARCHITECTURE §28 name DOCX as an import format. Today OpenBook imports only Markdown and plain text:

- ADR-0015 §2.3 deferred every binary document format, DOCX included;
- ADR-0020 INV-2 (format firewall) accepts only `markdown` and `text`;
- `packages/importer/src/importer.test.ts` asserts `canImport("docx") === false`;
- the Markdown importer has no image path, so even a hand-converted book loses its pictures.

Most authors keep their books in Word. The maintainer's own book, *Little Krishna's Wisdom Stories* (25 stories, 27 embedded images, published on KDP), exists only as a `.docx`. It cannot be brought into OpenBook without retyping it and re-inserting every image. A first-time author with a finished Word manuscript hits the same wall on the start screen.

## 2. Scope proposed

- The author picks a `.docx` file from the start screen or the Write step.
- OpenBook reads its text, headings, lists, links, and embedded images into the canonical Book.
- Images go through the existing asset pipeline (ADR-0017, ADR-0021) and become `image` blocks.
- Word fonts, sizes, colours, and page size are dropped. Design Studio (ADR-0036) owns the look.
- The author sees a plain-language import summary: what came in, what was dropped, and why.

Legacy `.doc`, `.odt`, `.rtf`, PDF, and EPUB import are not part of this selection.

## 3. What this selection authorizes

1. Accept ADR-0040 DOCX import architecture (PR #164).
2. Record front-door reconciliation that the next Phase 1 import ADR is Word `.docx` import.

## 4. What this selection does **not** authorize

- Any DOCX import implementation slice
- Adding or changing any dependency, including reuse of `fflate` in `packages/importer`
- Changing `SupportedImportFormat`, `ImportSource`, or the `canImport` test
- Any Book Model change (ADR-0040 needs none)
- Tracked changes, comments, footnotes, text boxes, SmartArt, tables as tables, or fixed layout
- `.doc`, `.odt`, `.rtf`, PDF, EPUB, or HTML import
- External converters (Pandoc, LibreOffice, Calibre)
- Touching ADR-0038 Cover Wizard files or its Slice 1 work (Draft PR #163)

## 5. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0040 (Draft PR → CI/DCO → explicit merge authorization). **Done** — PR #164.
2. Maintainer separately authorizes implementation Slice 1 per ADR-0040 §8. **Authorized** 2026-10-28 — see `docs/adr-0040-slice-1-docx-container.md`.
3. Later slices only under their own explicit authorization.
4. Closure reconciliation only after the authorized slices land.

ADR-0040 and ADR-0038 touch different packages and can proceed in either order. The maintainer decides which slice comes next.

## 6. Candidates not selected

| Candidate | Note |
|---|---|
| Mammoth.js-based DOCX import | Recorded in ADR-0040 §3 as the alternative; not chosen |
| Pandoc / LibreOffice conversion | Rejected again (ADR-0015); subprocess, size, licence |
| HTML import | PRD §24 lists it; later ADR |
| EPUB import | PRD §24 lists it; later ADR |
| Legacy `.doc` (binary Word 97–2003) | Different container (CFB); later, if ever |
| Preview (§3.9) | Still a natural Phase 1 domain after Cover Wizard |
| Book Doctor MVP experience (§3.10) | After Preview |
