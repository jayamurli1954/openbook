# Conversation Record — ADR-0038 Slice 6: hardening and closure

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** End-to-end cover tests, real-book check, and closing ADR-0038
- **Related:** `docs/adr-0038-slice-6-hardening.md`; `docs/adr-0038-closure-reconciliation.md`

## Context

Slices 1–5 merged (PRs #163, #177, #179, #181, #183). The maintainer authorized Slice 6 as proposed ("Authorize Slice 6").

## Decisions

1. English and Kannada end-to-end tests drive the real coordinator and package filesystem: cover via the fields port, Save → Open, autosave replacement, the remove-while-cover guard, the book check, and all three exports from a reopened book.
2. The EPUB's file list is read from the archive; its OPF is checked through `buildEpubPackage` on the reopened book, so the desktop tests need no new unzip dependency. The PDF is checked through a recording publisher that runs the real PDF asset pipeline and Typst writer.
3. The "no new dependency or permission" guard is a one-off check against `af4ca6e`, recorded in the closure, because CI's shallow checkout cannot see that commit.
4. The real-book check found a PDF bug outside the cover code: a language with a region (`en-US`) fails Typst's `lang`. The agent reported it first, because the fix changes the PDF engine for every book; the maintainer chose "Fix in this PR". It is a separate commit.
5. Kindle Previewer is the maintainer's to run; its result goes in the closure record.
6. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0038-slice-6-hardening`.
- Merged as PR #185 (merge commit `01c0fbc`) on 2026-10-29 after the maintainer authorized the merge; all four checks passed. GitHub auto-merge is not enabled for the repository, so the merge waited for the maintainer's "Check and merge" after CI finished.
- Kindle Previewer: not run by closure.
- Desktop tests: 514 pass, including the new end-to-end file (four tests).
- Real-book check: import, cover, Save → Open, book check, EPUB (EPUBCheck clean), HTML, and, after the language fix, PDF (86 pages, cover first, from the book's own `en-US`) all pass.
