# Next Domain Selection: Print-Ready Paperback PDF

- **Status:** Proposed; awaiting maintainer decision on ADR-0042
- **Date:** 2026-11-05
- **Baseline:** `main` at `6b5ba06` (PR #208 — ADR-0041 Kindle Previewer result)
- **Prior records:** `docs/adr-0041-closure-reconciliation.md` (§4 real-book check, §6 Kindle); `docs/adr-0038-closure-reconciliation.md` (§7 "leave the cover out" PDF deferred)
- **Selected domain:** a **paperback interior PDF** that print-on-demand services accept as is (ROADMAP Phase 2 print, narrowed to what a flow-based book needs)
- **Architecture ADR:** ADR-0042 (proposed in this PR). Selection alone does not authorize a slice.

## 1. Why this domain

After ADR-0041 closed, the maintainer published the paperback of *Little Krishna's Wisdom* on KDP. OpenBook's PDF could not be uploaded as it was, so the interior was rebuilt by hand outside the app:

| Needed for the paperback | OpenBook's PDF today | Done by hand |
|---|---|---|
| A trim size KDP offers with Standard colour | Always A5 (`DEFAULT_PDF_PROFILE.paper`), which KDP did not offer for Standard colour | Rebuilt at 5.5 × 8.5 in |
| Page numbers | None | Added to the Typst source, hidden on the title page |
| No cover page inside the interior | A cover page whenever the book has a cover (ADR-0038) | The book had no cover set, so none appeared |
| Pictures sharp enough for print | No check | Measured by script: 220–373 dpi |

KDP's previewer then accepted the hand-built file with no issues. The steps were mechanical, and every author who wants a paperback will meet them.

## 2. Scope proposed

- a second kind of PDF, **"Paperback (print)"**, next to today's reading PDF;
- a trim size chosen from a short list of standard paperback sizes;
- page numbers; mirrored inside/outside margins that meet KDP's minimums;
- no cover page in the print interior (the cover is made separately, e.g. in KDP Cover Creator);
- a picture-resolution check at the printed size, shown as warnings;
- the page count shown after export, because print services price and limit by it.

Not in scope: cover wraps, bleed, hardcover, running headers, CMYK, and text changes for print (an author edits wording such as "eBook" in the Write step).

## 3. What this selection authorizes

1. Review ADR-0042 Print-Ready Paperback PDF Architecture.
2. Record that, once ADR-0042 is accepted, print-ready PDF is the next product domain.

## 4. What this selection does **not** authorize

- Any ADR-0042 implementation slice
- A Book Model change (ADR-0013 §9 keeps page sizes and margins out of the Book Model)
- Cover-wrap generation, bleed, or hardcover
