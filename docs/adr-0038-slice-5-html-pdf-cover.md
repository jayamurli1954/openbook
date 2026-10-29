# ADR-0038 Slice 5: HTML and PDF Cover — Implementation Proposal

- **Status:** Implemented on main (PR #183)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0038 — Phase 1 Cover Wizard Architecture (Image Cover), §2.4
- **Scope:** When the Book has a cover, the HTML engine shows it before the book's title and sections, and the PDF engine renders it as the first page. Without a cover, output is unchanged
- **Implementation authorization:** Granted for this slice only, as proposed: cover always first in the PDF, with a leave-out choice later in print work (maintainer, 2026-10-29)

## 1. Purpose

Finish the cover's publishing projections. Slice 4 did EPUB; this slice does HTML (ADR-0011) and PDF (ADR-0013).

Today:

- Both engines' asset pipelines (`packages/html/src/assets/asset-pipeline.ts`, `packages/pdf/src/assets/asset-pipeline.ts`) package only pictures that image blocks use, the same gap Slice 4 closed for EPUB. A cover picture never reaches HTML or PDF output.
- HTML: `buildHtml` writes one `index.html` with an inline `<style>` (`DEFAULT_HTML_CSS`), then `<article class="book">` → `<header>` (title, authors) → table of contents → `<main>` with the sections.
- PDF: `serializeBookToTypst` writes a title page (title, authors, subtitle) and a page break, then the sections. Typst 0.15.1 renders it with pinned fonts and a fixed creation timestamp. The Typst runtime is present on this machine and in the CI Gate 6 job, so PDF render tests run in both places.

## 2. Slice 5 objective

1. **Packaging the cover picture** in both asset pipelines: when `book.publishing.coverAssetId` is set, add it to the pictures to package, with the same checks, path rules, and resolver. A picture also shown in a chapter is packaged once. A missing cover asset raises the existing `MISSING_ASSET_REFERENCE` error with a cover-specific message, as in the EPUB engine.
2. **HTML** (`html-builder.ts`):
   - insert `<figure class="book-cover"><img src="…" alt="…"></figure>` as the first child of `<article class="book">`, before the header; the `alt` is the cover description
   - style it with a few extra CSS lines appended to the inline `<style>` **only when there is a cover**, so books without a cover keep identical HTML: centred, no wider than the page, no taller than the window, never cropped
   - the cover is not added to the table of contents
3. **PDF** (`typst-serializer.ts`):
   - before the title page, emit one cover page: `#page(margin: 0pt)[#align(center + horizon)[#image("…", width: 100%, height: 100%, fit: "contain", alt: "…")]]`
   - `fit: "contain"` scales the picture to fit the page without cropping or stretching, leaving bands of plain page if the shapes differ
   - the title page and sections follow unchanged
   - no Typst version, font, or page-profile change
4. **No cover:** neither engine emits any cover markup. HTML strings and Typst source are identical to today's, so PDF bytes are identical too.
5. Engine changes and tests only. No desktop chrome, EPUB, or Book Model change.

## 3. Explicit exclusions

- English and Kannada package Save/Open and autosave hardening with a cover, and the Kindle Previewer check (Slice 6)
- Print covers: wraps, spine, back cover, bleed (ADR-0038 out of scope; Phase 2)
- A PDF option to leave the cover out (see §6)
- Resizing, converting, or re-encoding the picture
- Cover text drawn by OpenBook

## 4. Acceptance criteria

- HTML: with a cover, `index.html` has exactly one `figure.book-cover` before the header, its `img` points at the packaged picture, and the alt text is the description (Kannada preserved exactly); the picture is in the publication files once
- PDF: with a cover, the Typst source has one cover page before the title page with the picture and its alt text; the rendered PDF has one more page than the same book without a cover, and starts with `%PDF`
- a picture shown in a chapter and used as the cover is packaged once in each engine
- a missing cover asset or missing resolver fails with the engines' existing structured errors
- without a cover, HTML output and Typst source are byte-identical to `main` (checked against a build of `main`'s engines), and PDF bytes match for the same runtime
- both engines stay deterministic: the same Book and cover give identical bytes twice
- html, pdf, and desktop `npm test` and CI (including the Gate 6 PDF job) pass
- diff stays within Slice 5

## 5. Expected files

- `packages/html/src/assets/asset-pipeline.ts`, `html-builder.ts`, `css.ts` (cover CSS constant), `html.test.ts`
- `packages/pdf/src/assets/asset-pipeline.ts`, `typst-serializer.ts`, `pdf.test.ts`
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-COVER-WIZARD-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Decision for the maintainer

**The PDF and KDP paperbacks.** ADR-0038 puts the cover on the first PDF page, which suits a PDF for reading or sharing. But if the PDF is uploaded to KDP as a **paperback interior**, it must not include the cover: KDP takes the cover as a separate file and would print the cover picture as page 1 inside the book.

- **Recommended:** follow the ADR now (cover first in the PDF), and add a "leave the cover out" export choice when print work starts (Phase 2, which ADR-0038 already reserves for print covers). Authors printing through KDP in the meantime can remove the cover before exporting the PDF.
- **Alternative:** add a `includeCover` PDF build option now (default on), and an "Include cover" checkbox on the PDF export. That makes this slice touch the desktop export screen as well.
