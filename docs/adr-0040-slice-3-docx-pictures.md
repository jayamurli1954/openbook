# ADR-0040 Slice 3: DOCX Pictures — Implementation Record

- **Status:** Implemented in a Draft PR; merge on explicit authorization
- **Date:** 2026-10-28
- **Parent architecture:** ADR-0040 — Word (.docx) Import
- **Scope:** Embedded pictures with alt text and captions; ingestion through the ADR-0017/ADR-0021 asset pipeline in `DesktopStudioCoordinator`, with placeholder substitution, an explicit image-reference check, rejection-to-warning, and batch atomicity. No UI (Slice 4).
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-28: “authorize Slice 3.”)

## 1. Importer (`@openbook/importer`)

- `ImportResult.images?: ImportedImagePayload[]` (`placeholderId`, `bytes`, `sourceName`, `altText`), as ADR-0040 §2.2 specifies. Placeholder ids start with `IMPORTED_IMAGE_PLACEHOLDER_PREFIX` (`import-picture-`), which `AssetRef` ids (`asset-…`) never use. Markdown and text imports never set `images`.
- Pictures are found through `a:blip` (DrawingML, inline or floating) and `v:imagedata` (VML). For Word's SVG pictures, `a:blip` is the PNG fallback and `asvg:svgBlip` is never read.
- Alt text comes from `wp:docPr` `descr`, then `title`; for VML shapes, from `alt`.
- **Placement:** each picture becomes an `image` block **after its paragraph's text**, in reading order, floating pictures included. Splitting a paragraph around an inline picture is not attempted; this is recorded as a slice decision.
- A **Caption** paragraph right after a picture becomes that picture's caption.
- The same picture part used several times is one payload; the first non-empty alt text wins.
- `r:link` pictures (linked to an outside file) and missing relationships are never fetched; warning `DOCX_LINKED_PICTURES_SKIPPED`.
- A picture part the reader refuses (for example a target under `word/embeddings/`) or cannot read loses its image blocks; warning `DOCX_PICTURES_UNREADABLE`.
- Pictures before the first section are kept in a front section (titled from the first text line, or “Title page”).
- The importer does not type-check, hash, or store pictures. The Slice 2 warning “pictures not imported yet” is gone.

## 2. Coordinator (`apps/desktop`)

- `DesktopStudioCoordinator` accepts `docx`. ADR-0040 §8 places coordinator ingestion in Slice 3, so the domain accepts `.docx` from this slice. The Slice 2 record said the coordinator would reject `.docx` until Slice 4; this slice supersedes that line. No UI path reaches it until Slice 4 adds the dialog and buttons.
- Each payload goes through `AssetIngestionPipeline` (size → magic bytes → SVG reject) with the import's id seed. Placeholders are replaced by `AssetRef` ids, and new `AssetRef`s (with alt text) join `Book.assets`.
- A refused picture (EMF, WMF, TIFF, too large, unsafe SVG) loses its image blocks; one warning `DOCX_PICTURES_REJECTED` names the sections. A section left empty keeps an empty paragraph.
- **Explicit reference check (INV-D3):** before commit, every image block must name an `AssetRef` in the Book and no placeholder may remain; otherwise `IMPORT_FAILED` and nothing changes. `validateBook` does not check this.
- **New project:** pictures go into a fresh asset runtime (store, registry, pipeline, resolver) built without touching the open book's. The runtime is adopted only after the import succeeds, replacing the old reset-after-swap. A failed import leaves the open book and its pictures untouched.
- **Append:** pictures go into the current runtime; their `AssetRef`s are added inside the same rollback boundary as the sections (ADR-0020 INV-10). On rollback the Book has none of them, and package Save writes only `Book.assets`, so no orphan package entry can result.

## 3. Tests

- Importer (`docx-import.test.ts`, 95 tests in the package): payloads, placement, alt text and caption; one payload for a reused picture; SVG PNG fallback and VML; linked and unreadable pictures; a title-page picture.
- Coordinator (`desktopStudioCoordinator.import.test.ts`): a new-project import with a PNG used twice and a refused EMF (one asset, two blocks, warning naming the chapter, resolver returns the bytes); append keeping existing assets; append rollback leaving no assets; a dangling placeholder failing closed with the Book unchanged; a damaged file failing with the reader's message. The tests build `.docx` files with a small stored-ZIP writer, so `apps/desktop` gains no ZIP dependency.
- A bug found while testing: the rejection warning was built before the sections were walked, so it named no chapters. Fixed.

## 4. Explicit exclusions

- Start-screen and Write-step actions, the `.docx` dialog, host read, import summary UI (Slice 4)
- Real-manuscript fixtures, package round trip, EPUB/HTML/PDF checks (Slice 5)
- Image editing, cropping, format conversion (ADR-0040 §4.6, ADR-0038 §2.6)
