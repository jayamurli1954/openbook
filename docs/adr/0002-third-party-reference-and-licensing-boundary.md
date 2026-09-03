# ADR 0002 — Third-Party Reference and Licensing Boundary

**Status:** Accepted
**Date:** 2026-09-03
**Decision owner:** SanMitra Tech Solutions

## Context

OpenBook documentation discusses established FOSS projects such as Sigil, Scribus, Calibre, EPUBCheck, Pandoc, Booktype, LibreOffice, Inkscape, Krita and ImageMagick. These projects are useful references for publishing, DTP, conversion, validation, graphics and asset-processing capabilities.

A project name or factual reference is not the same thing as incorporating that project's source code or assets. However, documentation can create avoidable ambiguity if it does not clearly distinguish reference, inspiration, external use, embedding, adaptation and asset redistribution.

## Decision

OpenBook will openly identify relevant third-party projects in its documentation when necessary for research, comparison, interoperability or technical context.

Such references are classified as **REFERENCE** or **INSPIRE** unless an actual integration decision has been approved.

The following rule is mandatory:

> **A third-party reference is not a grant of permission to copy, modify, redistribute or brand OpenBook with the referenced project's material.**

Actual software, code, executables, libraries, fonts, artwork, templates, screenshots, documentation, model weights or other protected material must undergo the applicable licensing/provenance review before distribution.

## Documentation rule

Preferred language:

- "reference project"
- "studied the workflow"
- "inspired by established FOSS workflows"
- "independent implementation"
- "external tool, subject to license review"
- "evaluated for interoperability"

Avoid language that implies incorporation, endorsement or affiliation unless it is factually supported and separately reviewed.

## Reviewed foundation documents

The review covered the current repository versions of:

- `FOSS_STRATEGY.md`
- `LICENSING_POLICY.md`
- `PROJECT_VISION.md`
- `PRODUCT_REQUIREMENTS.md`
- `ARCHITECTURE.md`
- `CONTRIBUTING.md`
- `ROADMAP.md`
- `README.md`

### Findings

**No document was found to say that OpenBook owns, contains, forks, or is endorsed by the named FOSS projects merely because they are referenced.** The existing documents already contain strong licensing controls, including provenance tracking, dependency review, copyleft review, external-process boundaries and independent implementation guidance.

A documentation-hardening improvement was nevertheless identified: the repository should have one explicit policy defining how third-party names, references, screenshots, documentation, code and assets are treated. That policy is now provided by `THIRD_PARTY_REFERENCE_POLICY.md`.

## Specific wording decision

The FOSS strategy may use a reference map such as:

```text
Sigil       → EPUB editing and authoring workflows
Scribus     → professional DTP workflows
Calibre     → ebook management and conversion workflows
EPUBCheck   → EPUB conformance validation
Pandoc      → document conversion workflows
Booktype    → book-production workflows
LibreOffice → document interoperability workflows
Inkscape    → vector graphics workflows
Krita       → raster illustration workflows
Image tools → asset-processing workflows
```

This is acceptable as a research/reference map provided it is not presented as a list of bundled dependencies or as permission to copy implementation code.

## Architectural consequence

The existing Book Model remains the integration boundary. External FOSS projects must not silently become the canonical representation of OpenBook projects.

## Legal caveat

This ADR is an engineering and documentation control, not legal advice. Copyright, patent, trademark, database-right, trade-secret and license-compatibility questions remain fact-dependent and should receive qualified legal review where material.
