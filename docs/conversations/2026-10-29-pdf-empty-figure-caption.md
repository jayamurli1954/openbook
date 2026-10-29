# Conversation Record — PDF figures without a caption

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** Stop printing an empty "Figure N:" label under pictures that have no caption
- **Related:** `docs/adr/0013-pdf-publishing-engine-architecture.md` (PDF engine); `docs/adr-0038-closure-reconciliation.md`

## Context

A full review of the maintainer's book through OpenBook after ADR-0038 closed showed "Figure 1:", "Figure 2:", … under every picture in the PDF. None of the book's 27 pictures has a caption. The PDF engine always wrote `caption: [ ]`, and Typst numbers any figure with a caption. The HTML and EPUB engines already omit an empty caption. The maintainer asked for the fix ("yes fix it").

## Decisions

1. The PDF engine writes the `caption` argument only when the caption has visible text; empty or whitespace-only captions are left out, matching the HTML and EPUB engines.
2. Books whose pictures all have captions, and books without pictures, produce identical Typst source and PDF bytes (checked against `main` for the four PDF bake-off fixtures and an English book with a captioned picture).
3. Process: fix PR, Draft → CI/DCO → merge only on the maintainer's authorization.

## Outcomes

- Branch `fix/pdf-empty-figure-caption`.
- The maintainer's book (with the lesson corrections made in a separate copy of their Word file, outside the repository): 85 pages, 0 "Figure N:" labels.
