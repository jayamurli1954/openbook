# ADR-0038 Slice 2: Cover Image Checks — Implementation Proposal

- **Status:** Implemented on main (PR #177)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0038 — Phase 1 Cover Wizard Architecture (Image Cover)
- **Scope:** Read pixel dimensions from PNG and JPEG bytes; size and aspect-ratio warnings; refuse covers whose bytes cannot be read; no chrome
- **Implementation authorization:** Granted for this slice only, including the EXIF orientation swap (maintainer, 2026-10-29)

## 1. Purpose

Tell the author, in plain language, when a cover image will look blurry or the wrong shape, and refuse an image OpenBook cannot read as a cover. The checks read the stored bytes and never change them (ADR-0038 §2.3, invariant 6).

Slice 1 (PR #163) made the cover a validated Book Model field. `validateBook` cannot read image bytes, so it checks only the asset's declared kind and media type. Slice 2 adds the byte-level checks.

No dimension reader exists in the repo today. Asset bytes are available through the coordinator's `AssetResolver.resolve(assetRef)`.

## 2. Slice 2 objective

1. **Dimension reader** (`packages/assets/src/image-dimensions.ts`, exported from `@openbook/assets`):
   - `readImageDimensions(bytes): { format, width, height } | undefined`
   - PNG: width and height from the `IHDR` chunk, which must be the first chunk
   - JPEG: walk the markers to the first start-of-frame marker (`SOF0`–`SOF15`, skipping `DHT`, `JPG`, and `DAC`), with bounds checks on every segment length
   - JPEG EXIF orientation: when an `APP1` EXIF segment says the image is rotated a quarter turn (orientation 5–8), swap width and height, so a portrait phone photo is measured as it is displayed
   - truncated, malformed, or zero-sized data returns `undefined`; the reader never throws on bad input and never reads past the buffer
   - no image-decoding dependency (ADR-0038 §2.3)
2. **Cover checks** (`apps/desktop/src/workflow/domain/coverImageChecks.ts`):
   - thresholds as named constants in this one module: `COVER_MIN_LONGEST_SIDE_PX = 1600`, `COVER_MIN_RATIO = 1.3`, `COVER_MAX_RATIO = 1.8` (height ÷ width)
   - `checkCoverImage(asset, bytes)` returns the measured size and a list of issues:

     | Code | Severity | When |
     |---|---|---|
     | `COVER_NOT_JPEG_OR_PNG` | error | magic bytes are not JPEG or PNG, whatever the declared media type says |
     | `COVER_SIZE_UNREADABLE` | error | `readImageDimensions` returns `undefined` |
     | `COVER_FILE_TOO_LARGE` | error | bytes exceed `DEFAULT_ASSET_SIZE_LIMIT_BYTES` (covers a package edited outside OpenBook) |
     | `COVER_LOW_RESOLUTION` | warning | longest side under 1600 px |
     | `COVER_UNUSUAL_SHAPE` | warning | height ÷ width outside 1.3–1.8 |

   - each issue carries a plain-language message with the measured numbers, for example "This picture is 841 × 1261 pixels. Covers look sharpest at 1600 pixels or more on the long side." Messages contain no internal terms (same test as ADR-0039 guide copy)
3. **Contract** (`coverWizardContract.ts`):
   - `inspectCover(asset, resolver)`: async; resolves the bytes and returns `checkCoverImage`'s result, for the wizard preview (Slice 3)
   - `executeCheckedCoverCommand(session, resolver, command)`: async; for `set-cover`, runs the image checks first and refuses with the check's error code when any error is found, leaving the Book unchanged; warnings never block. Then it delegates to the Slice 1 `executeCoverCommand`. `clear-cover` needs no bytes and is delegated directly
   - the synchronous Slice 1 `executeCoverCommand` stays as it is; Slice 3 chrome uses the checked command
4. Tests only. No React chrome, no Book Model or engine change.

## 3. Explicit exclusions

- Cover Wizard chrome and showing the warnings on screen (Slice 3)
- Showing cover warnings in Book Doctor or the Publish step (later slice, if wanted)
- Contrast checks, colour-profile checks, CMYK warnings
- Cropping, resizing, or converting the image
- GIF, WebP, or SVG covers (already rejected in Slice 1)
- Changing the thresholds' values (ADR-0038 §2.3 sets them)

## 4. Acceptance criteria

- dimensions are read correctly from PNG headers and from baseline and progressive JPEG headers
- a JPEG with EXIF orientation 6 or 8 reports swapped dimensions; orientation 1 or no EXIF does not
- truncated, malformed, and empty inputs return `undefined` without throwing
- an image at exactly 1600 px on the long side and a ratio of exactly 1.3 or 1.8 gets no warning; just below gets the warning
- the KDP-style cover (841 × 1261) gets the low-resolution warning and no shape warning
- a square 1024 × 1024 picture gets the shape warning
- a file that claims to be JPEG but holds PNG bytes is measured as PNG; bytes that are neither are refused
- `executeCheckedCoverCommand` refuses an unreadable or non-JPEG/PNG image and leaves the Book unchanged; it sets the cover when there are only warnings
- the bytes passed to the checks are unchanged afterwards
- check messages contain no internal terms
- the dimension reader imports nothing outside `packages/assets`; the contract stays free of React, Tauri, filesystem, and TipTap imports
- assets and desktop `npm test` and CI pass
- diff stays within Slice 2

## 5. Expected files

- `packages/assets/src/image-dimensions.ts` (new), `index.ts` (export), `assets.test.ts`
- `apps/desktop/src/workflow/domain/coverImageChecks.ts` (new)
- `apps/desktop/src/workflow/domain/coverImageChecks.test.ts` (new)
- `apps/desktop/src/workflow/domain/coverWizardContract.ts`, `coverWizardContract.test.ts`
- `apps/desktop/package.json` (add the new test to the `test` script)
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-COVER-WIZARD-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Decision for the maintainer

ADR-0038 §2.3 does not mention JPEG EXIF orientation. Without it, a portrait photo taken on a phone is often stored sideways and would wrongly get the shape warning. This proposal includes the orientation swap (about 40 lines plus tests). If you'd rather keep Slice 2 to the ADR's exact wording, drop item 1's orientation bullet and its acceptance criterion.
