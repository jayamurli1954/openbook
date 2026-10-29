# Conversation Record — ADR-0038 Slice 4: EPUB cover

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** Project the Book's cover into EPUB output
- **Related:** `docs/adr/0038-phase-1-cover-wizard-architecture.md` §2.4; `docs/adr/0010-epub-3-3-asset-and-resource-packaging-architecture-gate-3.md` (amended); `docs/adr-0038-slice-4-epub-cover.md`

## Context

Slices 1–3 merged (PRs #163, #177, #179). While preparing Slice 4, the agent found that the EPUB engine packages only pictures image blocks use, so a cover picture was absent from exported EPUBs. The proposal raised two decisions: where to run EPUBCheck for covers, and the unverified risk of a doubled cover in Kindle conversions. The maintainer authorized Slice 4 with EPUBCheck run locally ("Authorize, local check").

## Decisions

1. The cover picture is added to the pictures the EPUB packages, through the same checks and resolver; a picture also shown in a chapter is packaged once.
2. Its manifest item carries `properties="cover-image"`; the OPF also gets the EPUB 2 `<meta name="cover">` fallback.
3. A generated `text/cover.xhtml` (`epub:type="cover"`, alt text from the cover description) is first in the spine, with a `cover` landmark first in the landmarks nav. It is not in the table of contents.
4. The cover page carries its own `<style>`. Changed from the proposal, which put the rule in the shared stylesheet: that would have changed every EPUB's bytes, including books without a cover.
5. EPUBCheck runs locally (the CI `test` job has no runtime); results are recorded in the PR.
6. Kindle Previewer check for a doubled cover is left for Slice 6.
7. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0038-slice-4-epub-cover`.
- Local EPUBCheck 5.3.0, zero errors and zero warnings: English JPEG cover, Kannada JPEG cover, English PNG cover (unit tests); the `simple-english` and `kannada-indic` fixtures with the maintainer's real KDP cover (841 × 1261 JPEG).
- Books without a cover: EPUB bytes identical to `main` for the `simple-english` and `kannada-indic` fixtures and an English book with a chapter picture (compared against a build of `main`'s engine).
