# 02 — Product Requirements

**Status of this document:** Feature *presence* for the named studios and concerns is **DECIDED**. Depth, v1 cut, and interaction rules are **PROPOSED** or **OPEN**.

This is a product map, not a sprint backlog. No requirement here authorizes implementation.

## 1. Feature map (index)

| ID | Area | Intent status | v1 depth |
| --- | --- | --- | --- |
| M1 | Beginner Mode | DECIDED | OPEN |
| M2 | Expert Mode | DECIDED | OPEN |
| S1 | Writing Studio | DECIDED | OPEN |
| S2 | Design Studio | DECIDED | OPEN |
| S3 | DTP Studio | DECIDED | OPEN |
| S4 | AI Studio | DECIDED | OPEN |
| Q1 | Book Doctor | DECIDED | OPEN |
| P1 | Preview | DECIDED | OPEN |
| P2 | Publishing | DECIDED | OPEN |
| A1 | Accessibility | DECIDED | OPEN |
| L1 | Multilingual support | DECIDED | OPEN |
| X1 | EPUB projection | DECIDED | OPEN |
| X2 | PDF projection | DECIDED | OPEN |
| X3 | HTML projection | DECIDED | OPEN |
| V1 | EPUBCheck | DECIDED | OPEN |
| V2 | PDF preflight | DECIDED | OPEN |

**OPEN.** Priority order among these for a first implementable slice. Constitution forbids coding until several blocking ADRs exist; even then, this map must be cut.

## 2. Cross-cutting product rules

**DECIDED.**

- One Book Model behind every studio.
- Beginner and Expert are modes of one product.
- Publish-ready is gated, not merely exported.

**PROPOSED.**

- A work created in Beginner Mode must remain a valid Book Model when opened in Expert Mode.
- Expert Mode may reveal controls; it may not require a different file type.
- Destructive operations (flattening semantics to raw CSS, stripping languages, discarding DTP constraints) require an explicit warning.
- Defaults must produce accessible, semantically structured content even when the beginner never opens those panels.

## 3. M1 — Beginner Mode

**DECIDED.** Exists.

**PROPOSED capabilities:**

- Create a book from a small set of templates (novel, essay collection — **book types OPEN**).
- Edit a chapter list and chapter prose with headings, emphasis, quotes, lists, images, notes.
- Set title, author, language, cover image.
- Apply a theme without seeing CSS.
- Preview reflowable and paginated views.
- Run a simplified Book Doctor and export EPUB + PDF when the gate is green (or export with warnings if the Product Owner allows — **OPEN**).

**PROPOSED non-capabilities** (hidden, not absent from the model):

- OPF/NCX/XHTML source.
- Master pages, baseline grids, bleed.
- Arbitrary CSS.
- Raw font-feature debugging.

**OPEN.** Can Beginner Mode users ever see a “you have expert features in this file” banner if a collaborator used Expert Mode?

## 4. M2 — Expert Mode

**DECIDED.** Exists.

**PROPOSED capabilities:**

- Full style system, including projection-specific overrides.
- DTP controls (see S3).
- EPUB package inspection (manifest, spine, nav, media overlays — **media overlays OPEN**).
- Preflight reports with identifiers, not only prose.
- Custom hyphenation, OpenType features, script-specific shaping options.
- Possibly a plugin or script surface (**OPEN** whether this exists at all).

**OPEN.** Is Expert Mode a global toggle, a per-studio depth, or a permissioned role?

## 5. S1 — Writing Studio

**DECIDED.** A writing surface exists as a first-class studio.

**PROPOSED:**

| Topic | Notes | Status |
| --- | --- | --- |
| Structure | Parts, chapters, sections as model objects, not merely styled headings | PROPOSED |
| Blocks | Paragraph, heading, verse, quote, list, table, figure, footnote/endnote, code | PROPOSED; code/tables OPEN for v1 |
| Inline | Emphasis, strong, quote, link, index mark, citation | PROPOSED; index/citation OPEN for v1 |
| Navigation | Binder / outline adjacent to the manuscript | PROPOSED |
| Notes | Footnotes vs endnotes vs margin notes as semantics | OPEN |
| Imports | DOCX, ODT, Markdown, pasted HTML | OPEN which, and how much semantics survive |
| Focus | Typewriter/focus mode | PROPOSED, non-blocking |
| Versioning | Snapshots, compare, git-backed projects | OPEN |

## 6. S2 — Design Studio

**DECIDED.** Design is a studio, distinct from writing and from DTP.

**PROPOSED distinction:** Design Studio owns **visual intent that can survive reflow** (and be interpreted by pagination). DTP Studio owns **paginated realisation**.

| Topic | Notes | Status |
| --- | --- | --- |
| Themes | Named, swappable; do not bake raw CSS into every paragraph | PROPOSED |
| Styles | Semantic styles (Heading 1, Body, Caption) mapped to projection rules | PROPOSED |
| Typography | Family, size scale, measure, leading *intent* | PROPOSED |
| Colour | Constrained palettes; contrast as an accessibility concern | PROPOSED |
| Cover | Cover as a model object with print and raster/ebook variants | PROPOSED |
| Figures | Placement intent (inline, block, wrap) vs exact page coordinates | PROPOSED |
| Master branding | Series identity across multiple books | OPEN |

**OPEN.** Are covers designed inside OpenBook or attached as external assets? Both?

## 7. S3 — DTP Studio

**DECIDED.** Desktop publishing is a first-class studio, not an export preset.

**PROPOSED capabilities** (this is where OpenBook either becomes serious or becomes a themed writer):

| Topic | Notes | Status |
| --- | --- | --- |
| Page size / margins / bleed / slug | Print PDF requires these | PROPOSED |
| Spreads | Facing pages | PROPOSED |
| Master pages | Headers, folios, recurring furniture | PROPOSED |
| Baseline grid | Optional but real | PROPOSED |
| Hyphenation & justification | Language-aware | PROPOSED |
| Floats and holds | Figures tied to anchors with fallback for reflow | PROPOSED |
| Imposition | Signatures, printer spreads | OPEN (likely not v1) |
| Colour management | CMYK, ICC, spot | OPEN |
| Optical margin alignment | | OPEN |

**OPEN.** What is the quality bar: “better than a word-processor PDF” or “Scribus/InDesign-class”? That single answer changes architecture more than any library choice.

## 8. S4 — AI Studio

**DECIDED.** Exists as a studio. Bound by the AI philosophy in [`01-vision.md`](01-vision.md).

**PROPOSED tasks** (each must be independently approvable):

- Outline and structure suggestions.
- Blurb / back-cover copy drafts.
- Consistency pass (names, timeline, glossary).
- Alt-text *drafts* clearly marked unverified.
- Plain-language explanations of Book Doctor findings.
- Translation assistance (**OPEN**, high risk for literary work).

**PROPOSED prohibitions:**

- Silent full-manuscript rewrite.
- Presenting generated text as already in the Book Model without accept.
- Sending manuscript to a network endpoint unless the data-boundary policy allows it (**policy OPEN**).

## 9. Q1 — Book Doctor

**DECIDED.** Book Doctor sits after projection validators and before publish-ready.

**PROPOSED responsibilities:**

1. Aggregate EPUBCheck, PDF preflight, and HTML/web checks.
2. Add model-level checks validators cannot see (missing language, empty alt, broken internal refs, orphan styles, beginner-unfriendly expert constructs).
3. Explain issues in Beginner language and Expert language.
4. Distinguish **errors** (block publish-ready), **warnings**, and **advice**.
5. Never “auto-fix” structure without a reviewable proposal (AI or otherwise).

**OPEN.** Is publish-ready a hard gate on export, or can users export a non-ready package with a stamp?

## 10. P1 — Preview

**DECIDED.** Preview exists.

**PROPOSED:**

- Reflowable preview (ebook/HTML analogue).
- Paginated preview (print analogue).
- Device or page-size presets.
- Synchronised selection: caret in Writing Studio highlights in Preview.
- Dual preview when DTP and EPUB would diverge.

**OPEN.** Is Preview a fourth surface, a mode inside each studio, or a dedicated studio? The architecture diagram lists it separately from the three editing studios.

## 11. P2 — Publishing

**DECIDED.** Publishing exists as a product area.

**OPEN — almost entirely.** “Publishing” might mean any of:

1. Write files to disk (EPUB, PDF, HTML zip/site).
2. Package with metadata (ONIX, ISBN, series).
3. Submit to stores (Amazon, Apple, Kobo, Google) — usually EXTERNAL plus their proprietary constraints.
4. Self-host a web edition.
5. Print-on-demand handoff (bleed, spine width, ICC).

**PROPOSED minimum** until the Product Owner says otherwise: (1) is the only v1 meaning; (2)–(5) stay OPEN and must not be stubbed into the architecture as fake integrations.

## 12. A1 — Accessibility

**DECIDED.** First-class.

**PROPOSED bar** (choose a real bar or this will become “we added alt text”):

- Semantic structure in the Book Model, not CSS-as-meaning.
- Language on work and on spans where it changes.
- Image descriptions as required content, not optional captions.
- Logical reading order independent of DTP z-order.
- Table headers, list semantics, heading rank without skips.
- Contrast and reflow against WCAG-oriented checks **PROPOSED**; exact standard version **OPEN**.
- Evaluation tooling: Ace by DAISY is a licence-compatible *candidate* (MIT) — classification **OPEN**, must not be bundled by assumption. See FOSS strategy.

**OPEN.** EPUB Accessibility 1.1 / WCAG 2.2 target level (A, AA). Whether to support media overlays / TTS production.

## 13. L1 — Multilingual support

**DECIDED.** First-class.

**PROPOSED layers:**

1. **Application UI** localisation.
2. **Book content** languages, including multiple languages in one work.
3. **Scripts and layout:** Latin, Indic (given the owner’s context this is a reasonable v1 candidate — **not DECIDED**), CJK, RTL (Arabic, Hebrew).
4. **Typography:** hyphenation dictionaries, line breaking, kashida vs whitespace justification, joining behaviour.
5. **Metadata** and sorting.

**OPEN.** Which scripts are in v1. Complex text layout quality is a DTP-class problem; claiming “multilingual” without a script list is how products ship broken Indic/CJK/RTL.

## 14. Projections and validators

**DECIDED.** EPUB, PDF, HTML outputs. EPUBCheck on EPUB. Preflight on PDF. Web associated with HTML. Book Doctor above them.

**PROPOSED EPUB:** EPUB 3.3 reflowable as the default projection.

**OPEN.**

- Fixed-layout EPUB.
- EPUB 2 compatibility export.
- PDF/X, PDF/UA, PDF/A as preflight profiles.
- HTML: single file vs site vs preview-only.
- Whether validators run in-process, as EXTERNAL processes, or both.

EPUBCheck is named by the Product Owner. That names a **capability**, not an adoption. Bundling or calling EPUBCheck is a USE/EXTERNAL decision gated by the still-OPEN project licence (EPUBCheck is BSD-3-Clause — research note, re-verify at adoption).

## 15. Explicitly unscoped until DECIDED

Do not treat these as implied by “publishing studio”:

- Real-time collaboration
- Cloud sync and accounts
- Audiobooks / media overlays
- Comics / paneled layout
- Maths (TeX/MathML)
- Citation graphs / Zotero
- Plugin marketplace
- Mobile editing apps
- DRM / LCP
- Store APIs
- Font foundry and font licence manager (needs a dedicated policy; see engineering review)
