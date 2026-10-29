# ADR-0038 Slice 4: EPUB Cover — Implementation Proposal

- **Status:** Implemented on main (PR #181)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0038 — Phase 1 Cover Wizard Architecture (Image Cover), §2.4 (amends ADR-0010)
- **Scope:** When the Book has a cover, the EPUB engine packages it as the cover image, adds a generated cover page first in reading order, and adds a `cover` landmark. EPUBCheck must stay clean
- **Implementation authorization:** Granted for this slice only, with EPUBCheck run locally and results recorded in the PR (maintainer, 2026-10-29)

## 1. Purpose

Make the cover set in the Cover Wizard (Slices 1–3) show up as the book's cover in reading apps and stores. With no cover set, EPUB output stays byte-for-byte as it is today (ADR-0038 invariant 3).

Today (`packages/epub`):

- `processBookAssets` packages only pictures that an image block uses. A cover picture that no chapter shows is not in the EPUB at all.
- No manifest item carries `properties="cover-image"`, the spine starts with the first front-matter section, and the landmarks list only `titlepage` and `bodymatter`.
- EPUBCheck 5.3.0 tests in `epub.test.ts` run when the local runtime in `.cache/spike` exists, and are skipped otherwise. The CI `test` job has no such runtime, so they are skipped there; the CI Gate 5 job runs only the validator package's own tests.

## 2. Slice 4 objective

1. **Packaging the cover picture** (`assets/asset-pipeline.ts`): when `book.publishing.coverAssetId` is set, add that asset to the set of pictures to package, alongside the ones image blocks use. It goes through the same checks, path rules, and resolver as any other picture. If a chapter also shows it, it is packaged once.
2. **Manifest** (`epub-builder.ts`): the cover picture's manifest item gets `properties="cover-image"`.
3. **EPUB 2 fallback** (`opf-serializer.ts`): also write `<meta name="cover" content="<cover manifest id>" />` in the package metadata. EPUB 3 readers ignore it; older readers and some conversion tools, Kindle's among them, look for it. EPUBCheck accepts it in EPUB 3.
4. **Cover page** (new `cover-serializer.ts`): generate `text/cover.xhtml`:
   - the book's language on `<html>`; title "Cover"
   - `<body epub:type="cover">` containing a `<section>` with one `<img>` whose `alt` is the cover's description (Slice 1 makes it required)
   - styled by a small `<style>` block in the cover page itself: centred, scaled to fit the screen without cropping. (Changed during implementation: adding the rule to the shared stylesheet would have changed the bytes of every EPUB, including books without a cover, breaking item 6.)
   - added to the manifest and placed **first in the spine**
5. **Landmarks** (`nav-serializer.ts`): add `<a epub:type="cover" href="text/cover.xhtml">Cover</a>` as the first landmark. The cover page is **not** added to the table of contents.
6. **No cover:** none of the above is emitted; existing byte-for-byte determinism tests must pass unchanged.
7. **Engine errors:** a cover asset that is missing, not an image, or of an unsupported type raises the same `AssetValidationError` codes as an image block would. The Book Model validation from Slice 1 already prevents this for Books edited in OpenBook.
8. Tests only, plus the engine change. No desktop chrome, HTML, or PDF change.

## 3. Explicit exclusions

- HTML and PDF covers (Slice 5)
- English and Kannada package Save/Open and autosave hardening with a cover (Slice 6)
- Moving the EPUBCheck-with-cover tests into a CI job that has the runtime (see §6)
- Resizing, converting, or re-encoding the cover picture
- A cover entry in the table of contents, or a separate title page
- Kindle-specific output (KF8/KPF)

## 4. Acceptance criteria

- with a cover set, the OPF has exactly one manifest item with `properties="cover-image"`, pointing at the cover picture, plus `<meta name="cover">` naming the same item
- `text/cover.xhtml` is first in the spine, has `epub:type="cover"`, and its `<img>` alt text is the cover description, with Kannada text preserved exactly
- the landmarks nav lists `cover` first; the table of contents does not include the cover page
- a cover picture that no chapter shows is packaged; one that a chapter also shows is packaged once and shared
- a Book without a cover produces exactly the same EPUB bytes as before this slice
- the generated EPUB passes official EPUBCheck 5.3.0 with zero errors and zero warnings for an English book and a Kannada book with a JPEG cover, and for one with a PNG cover (run where the local runtime exists; results recorded in the PR)
- the build stays deterministic: the same Book and cover give identical bytes twice
- epub and desktop `npm test` and CI pass
- diff stays within Slice 4

## 5. Expected files

- `packages/epub/src/assets/asset-pipeline.ts`, `epub-builder.ts`, `opf-serializer.ts`, `nav-serializer.ts`
- `packages/epub/src/cover-serializer.ts` (new)
- `packages/epub/src/epub.test.ts`
- `docs/adr/0010-epub-3-3-asset-and-resource-packaging-architecture-gate-3.md` (a short "Amended by ADR-0038" note)
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-COVER-WIZARD-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 6. Decisions for the maintainer

1. **EPUBCheck in CI.** The cover EPUBCheck tests will run on this machine, where the runtime exists, but CI skips them. Two options:
   - **Recommended for this slice:** run them locally and record the results in the PR, as the existing multi-image EPUBCheck test is handled today. Wiring EPUBCheck into the CI `test` job is a separate, wider change.
   - **Alternative:** extend this slice to run the `@openbook/epub` EPUBCheck tests in the CI Gate 5 job, which already builds the runtime.
2. **Cover page and Kindle.** ADR-0038 asks for a cover page first in reading order, the usual EPUB 3 practice. Some forum reports say Kindle conversions can show a cover twice when it is both set as the cover and placed in the book's text. I could not find Amazon's own guidance confirming or ruling this out. This proposal follows the ADR. Checking the exported EPUB in Kindle Previewer belongs in Slice 6; if it shows the cover twice, a later change can drop the cover page for that case.
