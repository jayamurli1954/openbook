# ADR-0041 Slice 2: Lesson Boxes in EPUB, HTML, and PDF — Implementation Proposal

- **Status:** In progress (this PR)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0041 — Lesson Box (Callout Block) Architecture, §2.4, §7 Slice 2
- **Scope:** the three publishing engines render callouts as framed boxes, with styles emitted only when a book has a callout; EPUBCheck; no-callout output byte-identical
- **Implementation authorization:** Granted for this slice only, with the box title on its own line (maintainer, 2026-10-29: "Own line")

## 1. Purpose

Slice 1 (PR #196) made the lesson box part of the book format, but all three engines still refuse it (`UnsupportedContentError`). This slice makes them draw it. After this slice a book with lesson boxes exports; the Write controls to make them come in Slices 3–4.

Today:

- **EPUB** (`packages/epub/src/xhtml-serializer.ts`): each block maps to semantic XHTML; one shared stylesheet, `EPUB/styles/openbook.css` (`DEFAULT_CSS` in `epub-builder.ts`), linked from every page.
- **HTML** (`packages/html/src/html-serializer.ts`, `html-builder.ts`): one `index.html` with an inline `<style>`; ADR-0038 Slice 5 already appends cover styles only when needed.
- **PDF** (`packages/pdf/src/typst-serializer.ts`): blocks map to Typst markup; Typst 0.15.1 with pinned fonts. The Typst runtime is installed here and in the CI Gate 6 job; EPUBCheck runs only on this machine.

## 2. Slice 2 objective

1. **EPUB:**
   - `callout` → `<div class="ob-callout" role="note" id="…">`, then `<p class="ob-callout-title">Title</p>` when the title isn't blank, then `<p>body</p>`
   - lesson-box rules are appended to `openbook.css` **only when the book has a callout**, so every other EPUB keeps its exact bytes
   - the frame uses `border: … solid currentColor`: it takes the text colour, so it stays visible in Kindle and Apple Books night and sepia modes. No background colour and no fixed text colour
   - `break-inside: avoid` (plus `page-break-inside: avoid` for older readers), so a short box isn't split across pages
   - `<div role="note">`, not `<aside>`: some readers turn `aside` into pop-up footnotes (ADR-0041 §2.4)
2. **HTML:** the same markup; the same rules appended to the inline `<style>` only when needed.
3. **PDF:**
   - `#block(width: 100%, inset: (x: 10pt, y: 8pt), radius: 6pt, stroke: 0.75pt + luma(110), breakable: false)[…]` holding `#strong[Title]`, a line break, then the body
   - title and body are escaped like other text; Kannada uses the existing font fallback
   - no Typst, font, or page-profile change
4. **Empty title:** no title line in any format.
5. **Not in the table of contents** in any format.
6. **No callouts:** EPUB, HTML, Typst source, and PDF are byte-identical to `main`, checked against builds of `main`'s engines (the method used in ADR-0038 Slices 4–5).

## 3. Explicit exclusions

- Write-step controls to make, remove, and edit boxes (Slice 3); book-wide conversion (Slice 4)
- A Design-step choice for the box's look
- Colours, icons, emoji, or box kinds
- Kindle-specific output; running EPUBCheck in CI
- Any new dependency or pin change

## 4. Acceptance criteria

- each engine renders a callout with title and body, a callout with no title, and a Kannada callout; title and body are escaped (e.g. `<`, `&`, `"` in the text)
- a picture and a lesson box in the same chapter both render
- EPUBs with callouts pass EPUBCheck 5.3.0 with zero errors and zero warnings (English and Kannada; run locally, results recorded in the PR)
- PDFs with callouts render with Typst 0.15.1 (locally and in the CI Gate 6 job); a short box sits on one page
- the lesson-box CSS appears only in books with a callout
- books without callouts: EPUB, HTML, Typst source, and PDF byte-identical to `main` for the existing fixtures and a book with a chapter picture
- each engine stays deterministic: the same book gives identical bytes twice
- **real-book check (local, not committed):** the maintainer's cleaned Word file imported, its 25 "What We Learned:" paragraphs turned into lesson boxes by a one-off script (Slice 4 will do this in the app), then all three exports; EPUBCheck clean, PDF pages looked at
- full repository `npm test` and CI pass; diff stays within Slice 2

## 5. Expected files

- `packages/epub/src/xhtml-serializer.ts`, `epub-builder.ts` (conditional CSS), `epub.test.ts`
- `packages/html/src/html-serializer.ts`, `html-builder.ts`, `css.ts`, `html.test.ts`
- `packages/pdf/src/typst-serializer.ts`, `pdf.test.ts`
- `apps/desktop/src/workflow/domain/calloutContract.test.ts` (the "engines refuse callouts" test becomes "engines render callouts")
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-LESSON-BOX-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Decision for the maintainer

**Where the title goes inside the box.**

- **Recommended: on its own line**, bold, above the text, like a small heading in the box:

  > **What We Learned**
  > True honesty means doing the right thing even when no one is watching.

- **Alternative: on the same line**, as your Word file has it now: **What We Learned:** True honesty means…, with the box drawn around it. Slightly more compact. The colon is then added by OpenBook, not stored in the title.
