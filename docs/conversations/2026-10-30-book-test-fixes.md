# Conversation Record — Fixes found testing the maintainer's book

- **Date:** 2026-10-30
- **Participants:** Maintainer + coding agent
- **Topic:** Run *Little Krishna's Wisdom Stories* through every OpenBook step and propose fixes for what OpenBook gets wrong
- **Related:** `docs/book-test-fixes-proposal.md`; ADR-0013; ADR-0040; ADR-0041

## Context

After PR #189 (front-matter title variants), the maintainer asked what OpenBook could improve in the book. The book was imported on `main` and taken through the book check, EPUB with EPUBCheck, HTML and PDF. Everything passed, so the outputs were read by hand. Findings were split into fixes for the Word file, settings to fill in OpenBook (Details, subtitle, Cover), and fixes in OpenBook itself. The maintainer chose the OpenBook fixes.

## Decisions

1. Propose first; the proposal does not authorize code.
2. Part A (font order by language, line breaks as new paragraphs, a large-picture warning) needs no download. Part B (italic fonts, optional emoji font) adds pinned fonts and is authorized separately.
3. The drawn “What We Learned” box is left to ADR-0041.

## Open questions

- Authorize Part A, Part B, or both? Include the emoji font (B2)?

## Action items

- Maintainer: review the proposal.
