# ADR-0042: Print-Ready Paperback PDF Architecture

- **Status:** Proposed
- **Date:** 2026-11-05
- **Phase:** ROADMAP Phase 2 print, narrowed to flow-based paperback interiors
- **Area:** PDF Publishing Engine / Desktop Export
- **Depends on:** ADR-0013, ADR-0019, ADR-0022, ADR-0036, ADR-0038, ADR-0039
- **Amends:** ADR-0013 §10 (page numbering and a print profile move from "covered later" to implemented); ADR-0038 §7 ("leave the cover out" for print interiors)
- **Supersedes:** None
- **Selection record:** `docs/PRINT-READY-PDF-SELECTION.md`
- **Implementation authorization:** None. This ADR does not authorize a slice.

## 1. Context

The PDF engine (ADR-0013) renders every book with one fixed profile, `DEFAULT_PDF_PROFILE`:

- A5 pages with symmetric 1.75 cm × 2.25 cm margins;
- Noto fonts at 11 pt;
- no page numbers;
- a full cover page first when the book has a cover (ADR-0038).

That suits reading on a screen. Uploading the same file as a paperback interior failed for the maintainer's book:

- KDP offered no A5 trim with Standard colour;
- printed books need page numbers;
- the interior must not contain the cover.

The interior was rebuilt by hand at 5.5 × 8.5 in with page numbers, and KDP's previewer accepted it (selection record §1).

ADR-0013 §9 already places trim size, margins, and page counters in a **publishing profile** outside the Book Model. No such profile is selectable today.

## 2. Decision

Add a **print profile** to the PDF engine, and a **"Paperback (print)"** PDF choice to the Export step.

### 2.1 Print profile (engine, not Book Model)

```ts
interface PdfPrintProfile {
  kind: "print";
  /** One of PRINT_TRIM_SIZES. */
  trim: PrintTrimId;
}
type PdfProfile = { kind: "reading" } | PdfPrintProfile;
```

- **Reading** keeps today's behaviour. Its output stays byte-identical for every book (invariant 2).
- **Print** changes only page setup:
  - **Trim:** from a fixed list of common US paperback sizes: 5 × 8, 5.25 × 8, 5.5 × 8.5, 6 × 9, 7 × 10, 8 × 10, 8.5 × 11 in. A5 stays available for services that offer it. Which sizes a service offers for a given ink varies (KDP did not offer A5 with Standard colour for the maintainer's book), so the Export step says to check the service's list.
  - **Margins:** mirrored (inside and outside differ on left and right pages).
    - Inside 0.75 in and outside 0.5 in, which meets KDP's no-bleed minimums for books up to 700 pages.
    - Top and bottom stay as today.
    - A book over 700 pages is refused with a plain message.
  - **Page numbers:** centred in the footer, on every page except the first (the title page), counted from the first page.
  - **No cover page.** The cover is uploaded separately.
- Fonts, sizes, headings, pictures, and lesson boxes are rendered exactly as in the reading PDF. A print book reads the same, on a different page.
- **Deterministic.** The same Book, assets, profile, and fonts give byte-identical PDFs (ADR-0013 §8).

### 2.2 Picture check for print

Before export, each picture's resolution at its printed width is computed from its pixel size and the page's text width.

- **Under 200 dpi** gives a warning naming the story or section, for example: "This picture may print blurry (150 dpi). Use a larger picture (at least 300 dpi) for sharp print."
- **200–299 dpi** gives a softer note.
- Export is never blocked by these warnings.

### 2.3 Export step

- The PDF choice becomes **"PDF for reading"** (today's file) or **"PDF for a paperback"** with a **Trim size** list.
- After a paperback export, the step shows:
  - the page count;
  - a reminder that the cover is uploaded separately;
  - any picture warnings.
- **Where the trim choice is kept** — see §6. In no case does it go into the Book Model (ADR-0013 §9).

## 3. Explicit exclusions

- Cover wraps (back + spine + front), spine text, barcodes
- Bleed, full-page pictures to the edge, crop marks, CMYK
- Hardcover sizes and rules
- Running headers, Roman numerals for front matter, chapters starting on right-hand pages
- Changing text for print (e.g. "eBook" wording): authors edit the text
- Applying Design-step text size and fonts to the PDF (today the PDF uses its own profile for both kinds)
- Indian print-on-demand services' specific rules; they accept standard sizes and get the same file

## 4. Testable invariants

1. The reading PDF is byte-identical before and after this ADR for every book.
2. A print PDF has every page at the chosen trim size, numbers on pages 2…n matching their page index, and no cover page, even when the book has a cover.
3. Print margins are at least 0.75 in inside and 0.5 in outside on every page; books over 700 pages are refused.
4. The same inputs and profile give a byte-identical print PDF.
5. Picture-resolution warnings match the dpi computed from pixel width and text width; export is never blocked by them.
6. English and Kannada books render the same text, fonts, and lesson boxes in both kinds.
7. No Book Model change, no new npm dependency, Tauri permission, or font.
8. No AI dependency.

## 5. Consequences

### Positive

- An author can upload OpenBook's PDF to KDP (and similar services) without outside tools.
- The cover-in-interior problem deferred by ADR-0038 is solved for print.
- The publishing-profile boundary from ADR-0013 §9 gets its first real use, without touching the Book Model.

### Trade-offs

- Two PDF kinds to explain. The Export step says what each is for in one line.
- Fixed margins are not tuned per page count. They are safe up to 700 pages, which covers most books.
- Page numbers on blank or picture-only pages are kept. Hiding them is a later refinement.

## 6. Decision for the maintainer: where to keep the trim size

- **Recommended: chosen in the Export step and remembered on this computer per book.**
  - Nothing changes in the Book or the project package.
  - The same book reopened on another computer asks again, which takes one click.
- **Alternative: saved inside the project package** as a print setting next to the book.
  - The setting travels with the project.
  - Needs a package-format addition (ADR-0029/0030 area) with its own migration and tests.

## 7. Implementation sequencing (not authorized here)

1. **Slice 1 — Print profile in the engine:**
   - `PdfProfile`, the trim list, mirrored margins, page numbers, and no cover in print;
   - the reading-PDF byte-identity check against `main`;
   - Typst-source and rendered-PDF tests in English and Kannada.
2. **Slice 2 — Picture check:** dpi at printed width, warning text, tests.
3. **Slice 3 — Export step:**
   - the two PDF choices and the trim list;
   - the page count and warnings after export;
   - remembering the choice (§6).
4. **Slice 4 — Hardening and closure:**
   - the maintainer's book exported for a paperback at 5.5 × 8.5 in, compared with the hand-built file (page count, numbers, margins);
   - KDP Print Previewer check by the maintainer;
   - the closure record.

Each slice needs explicit authorization; boundaries may be adjusted in per-slice proposals.

## 8. Non-authorizations

This ADR authorizes no code, no Book Model or package change, and no new dependency.
