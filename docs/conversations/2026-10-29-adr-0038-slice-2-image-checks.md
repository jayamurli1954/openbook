# Conversation Record — ADR-0038 Slice 2: cover image checks

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** Read cover pixel sizes from PNG and JPEG bytes; warnings and fail-closed errors
- **Related:** `docs/adr/0038-phase-1-cover-wizard-architecture.md` §2.3; `docs/adr-0038-slice-2-image-checks.md`

## Context

Slice 1 merged as PR #163. The agent proposed Slice 2, with one open decision: whether to handle JPEG EXIF orientation, which ADR-0038 §2.3 does not mention. The maintainer authorized Slice 2 as proposed, including the orientation swap.

## Decisions

1. `readImageDimensions` lives in `@openbook/assets`. It reads PNG `IHDR` and the first JPEG start-of-frame marker, and applies EXIF quarter-turn orientation (5–8). It adds no dependency and never throws on bad input.
2. Thresholds (1600 px long side; height ÷ width 1.3–1.8) are constants in `coverImageChecks.ts` only.
3. Errors refuse the cover: not JPEG/PNG by magic bytes, size unreadable, or over the asset size limit. Warnings (low resolution, unusual shape) never block.
4. `executeCheckedCoverCommand` runs the Slice 1 checks first, then reads bytes only for a plausible cover. The synchronous Slice 1 command is unchanged.
5. Messages are plain language with the measured numbers and are tested for internal terms.
6. Checked locally against the 27 pictures in the maintainer's KDP Word file: every size read matched Pillow. The cover (841 × 1261) gets the low-resolution warning only.
7. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`. This branch includes PR #176's status edits so the status lines don't conflict.

## Outcomes

- Branch `feat/adr-0038-slice-2-image-checks`.
- PR #176 (Slice 1 status) merged first as `aec23c4`, which dropped its edits from this PR's diff.
- Merged as PR #177 (merge commit `c6b126f`) on 2026-10-29 after the maintainer authorized the merge; all four checks passed.
