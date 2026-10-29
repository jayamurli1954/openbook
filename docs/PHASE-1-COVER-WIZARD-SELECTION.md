# Phase 1 — Next Domain Selection: Cover Wizard

- **Status:** Selected; ADR-0038 accepted (PR #153); Slice 1 done on main (PR #163, `docs/adr-0038-slice-1-cover-contract.md`); Slice 2 done on main (PR #177, `docs/adr-0038-slice-2-image-checks.md`); Slice 3 done on main (PR #179, `docs/adr-0038-slice-3-cover-wizard-chrome.md`); Slice 4 authorized 2026-10-29 and in progress (`docs/adr-0038-slice-4-epub-cover.md`); later slices not authorized
- **Date:** 2026-10-14
- **Baseline:** `main` at `1ce98ec` (PR #152 — ADR-0037 closure reconcile)
- **Prior record:** `docs/adr-0037-closure-reconciliation.md`
- **Selected domain:** ROADMAP Phase 1 MVP — **Cover Wizard** (§3.7), image cover scope
- **Architecture ADR:** ADR-0038 (Accepted in PR #153; implementation not authorized). Selection alone does not authorize a slice.

## 1. Why this domain

ADR-0037 Metadata Wizard is closed (Slices 1–3). Authors can now create a book, write it, structure it, choose a design, and set its metadata. The ROADMAP MVP acceptance flow continues: create → chapters → write → design → metadata → **cover** → EPUB → validate → preview.

Nothing in OpenBook handles a cover today:

- the Book has no field that says which asset is the cover;
- the EPUB engine never marks a `cover-image` manifest item or writes a cover page. ADR-0010 left cover-specific publishing semantics out of Gate 3;
- HTML and PDF output have no cover page.

A cover is also part of the MVP gate (“Add cover”) and of the deferred items ADR-0037 handed on (cover metadata).

## 2. Scope chosen by the maintainer

On 2026-10-14 the maintainer chose **image cover first**:

- the author imports a finished cover image;
- the wizard marks it as the Book's cover, checks it, and previews it;
- EPUB, HTML, and PDF use it.

Cover directions, title and author text on the cover, cover typography, positioning, and generated covers move to a later ADR.

## 3. What this selection authorizes

1. Accept ADR-0038 Cover Wizard architecture (PR #153).
2. Record front-door reconciliation that Phase 1's next product ADR is Cover Wizard.

## 4. What this selection does **not** authorize

- Any Cover Wizard implementation slice, including the Book Model field
- Generated or text-on-image covers, cover templates, typography, or positioning
- Print-cover wraps (spine, back cover, bleed) or ISBN barcodes
- AI cover concepts or image generation
- Image editing (crop, resize, colour) inside OpenBook
- Changing Gate 6 font pins, Typst version, or frozen desktop pins

## 5. Controlled sequence after ADR acceptance

1. Merge this selection + ADR-0038 (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer separately authorizes implementation Slice 1 per ADR-0038 sequencing.
3. Later slices only under their own explicit authorization.
4. Closure reconciliation only after the authorized slices land.

## 6. Candidates not selected

| Candidate | Note |
|---|---|
| Generated / text-on-image cover | Later ADR, after the image cover lands |
| Preview (§3.9) | Natural next domain after Cover Wizard |
| Book Doctor MVP experience (§3.10) | After Preview |
| Book Idea / AI outline (§3.2) | AI remains separately gated |
| Accessibility metadata | Still needs a Book Model ADR |
| Pin Gate 6 font downloads to a commit | CI reliability follow-up; not a product domain |
| Signing / multi-OS / Gate 11 | Optional / later gates |
