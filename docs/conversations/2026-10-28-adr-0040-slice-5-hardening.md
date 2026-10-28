# Conversation Record — ADR-0040 Slice 5: hardening and closure

- **Date:** 2026-10-28
- **Participants:** Maintainer + coding agent
- **Topic:** Test the maintainer's real book, implement ADR-0040 Slice 5, close ADR-0040
- **Related:** `docs/adr-0040-slice-5-hardening.md`; `docs/adr-0040-closure-reconciliation.md`; `docs/adr/0040-docx-import-architecture.md`

## Context

After Slice 4 merged (PR #172), the maintainer asked to test importing the Word file and pointed to a local copy of the manuscript (a `.docx` with 27 pictures, saved without its extension). The local import showed the contents page becoming a chapter and “python-docx” as the author. The maintainer then wrote “Yes, start Slice 5”.

## Decisions

1. Fix the two gaps found with the real book, and the one-line contents page found by the new test.
2. Correct the alt-text claim: Book Doctor does not review alt text (ADR-0018), so the import warns itself.
3. End-to-end tests use manuscripts shaped like the book, built in the test; the real book is used only as a local check and is not committed (ADR-0040 §8).
4. EPUBCheck is not run locally, because it needs a Java download the maintainer has not approved.
5. Close ADR-0040 on merge.
6. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Action items

- Maintainer: import the manuscript (`.docx` copy) in the desktop app; add alt text to the pictures in Word; decide whether to run EPUBCheck locally (needs a Java runtime download).

## Outcomes

- Branch `feat/adr-0040-slice-5-hardening`.
