# ADR-0038: Phase 1 — Cover Wizard Architecture (Image Cover)

- **Status:** Accepted; implementation not authorized
- **Date:** 2026-10-14
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (§3.7)
- **Area:** Book Model / Publishing Engines / Desktop / Cover Wizard
- **Depends on:** ADR-0006, ADR-0009, ADR-0010, ADR-0011, ADR-0013, ADR-0017, ADR-0019, ADR-0021, ADR-0029, ADR-0031, ADR-0037
- **Amends:** ADR-0010 §“cover-specific publishing semantics” exclusion (cover semantics are now in scope for the EPUB engine)
- **Supersedes:** None
- **Selection record:** `docs/PHASE-1-COVER-WIZARD-SELECTION.md`
- **Implementation authorization:** None. This ADR does not authorize a slice.

## 1. Context

OpenBook has closed Guided Start (ADR-0033), Writing Studio (ADR-0034), Structure Studio (ADR-0035), Design Studio (ADR-0036), and Metadata Wizard (ADR-0037). The desktop already provides:

- content-addressed asset storage with magic-byte media-type detection and reject-only SVG handling (ADR-0017, ADR-0021);
- `Book.assets` as `AssetRef` entries with `altText` and `licence`;
- `BookSession.addAsset` / `removeAsset`, and the Writing Studio image picker host path (ADR-0034 Slice 4);
- EPUB, HTML, and Typst PDF engines that project the Book at publish time (ADR-0009–ADR-0013);
- ADR-0029 package Save/Open and ADR-0031 autosave.

ROADMAP §3.7 asks for: choose a cover direction, import an image, use an illustration, enter title/author text, preview the cover, and export it as the EPUB cover asset. PRD §13 adds typography, positioning, and warnings for poor image quality or contrast.

**Gap:** nothing marks an asset as the cover. The EPUB engine writes no `cover-image` manifest property and no cover page; ADR-0010 explicitly excluded cover semantics. HTML and PDF output have no cover.

**Scope decision (maintainer, 2026-10-14):** image cover first. Text-on-cover designs and generated covers are a later ADR.

## 2. Decision

OpenBook will implement Phase 1 Cover Wizard as an **image-cover architecture** that:

1. Adds one optional Book Model field that names the cover asset.
2. Keeps **Book Model + DesktopStudioCoordinator** authoritative.
3. Stores the cover as an ordinary content-addressed image asset. No second cover file or cover document.
4. Projects the cover in each publishing engine at publish time.
5. Checks the image and reports plain-language warnings; it does not edit the image.
6. Reuses ADR-0031 autosave and ADR-0029 package binding.
7. Remains **AI-optional**.

```text
React Cover Wizard (import image, alt text, preview, warnings)
        |
        v
Cover port (set / clear cover; image checks)
        |
        v
DesktopStudioCoordinator  ──>  asset store (ADR-0017, content-addressed)
        |
        v
Book Model: publishing.coverAssetId -> assets[] image  — canonical
        |
        +--> ADR-0031 autosave / ADR-0029 package
        +--> EPUB: cover-image manifest item + cover page (publish time)
        +--> HTML: cover image first (publish time)
        +--> PDF: cover image as first page (publish time)
```

### 2.1 Book Model change

Add one optional field to the existing `PublishingSettings`:

```ts
interface PublishingSettings {
  intendedOutputs: PublishingOutput[];
  /** Asset id of the cover image. Absent or undefined means no cover. */
  coverAssetId?: string;
}
```

- **Additive and optional.** `schemaVersion` stays `1`. A Book without the field is valid and has no cover. No package migration is needed: existing packages read as “no cover”.
- **Validation (`validateBook`, severity error):** when present, `coverAssetId` must name an asset in `Book.assets` whose `kind` is `image` and whose `mediaType` is `image/jpeg` or `image/png`.
- **Accessibility:** the cover asset's `altText` must be non-empty when it is the cover (error). Text in a cover image is invisible to screen readers otherwise.
- **Fail-closed removal:** because validation rejects a dangling cover reference, `removeAsset` on the current cover asset fails through normal Book validation. The wizard clears the cover first.
- Placing the field in `PublishingSettings` keeps it next to other publish-time intent. It is not an EPUB, HTML, or PDF document (ADR-0006 boundary).

This is a Book Model change under ADR-0006. It is recorded here and implemented only under its own slice authorization.

### 2.2 Capability mapping (MVP)

| ROADMAP §3.7 / PRD §13 item | Architecture position |
|---|---|
| Import an image | In scope. JPEG or PNG through the existing asset store and picker host |
| Use an illustration | In scope as an image the author supplies |
| Preview the cover | In scope. Shows the stored asset; no rendering pipeline |
| Export as the EPUB cover asset | In scope. EPUB `cover-image` property and cover page |
| HTML and PDF cover | In scope. Projection only |
| Poor image quality warning | In scope. Pixel size and aspect-ratio warnings |
| Cover alt text | In scope. Required |
| Choose a cover direction | **Deferred.** Later generated-cover ADR |
| Enter title/author text on the cover | **Deferred.** Later generated-cover ADR |
| Cover typography and positioning | **Deferred.** Later generated-cover ADR |
| Contrast warnings | **Deferred.** Only meaningful with generated text |
| Print cover wrap, spine, back cover, bleed, barcode | **Out of scope.** Phase 2 DTP / print |
| AI cover concepts | **Out of scope.** Phase 3 |

### 2.3 Image checks

Checks read the stored bytes. They never change the image.

| Check | Result |
|---|---|
| Media type is not JPEG or PNG (by magic bytes, ADR-0017) | Error — cannot be the cover |
| Pixel dimensions unreadable | Error — cannot be the cover |
| Longest side under 1600 px | Warning — may look blurry on high-resolution screens |
| Height-to-width ratio outside 1.3–1.8 | Warning — most stores expect a portrait cover near 1.6 |
| File larger than the ADR-0017 image size limit | Error, as for any image asset |

Dimensions come from the PNG `IHDR` chunk or the JPEG start-of-frame marker. No image-decoding dependency is added. Thresholds are constants in one module so a later ADR can tune them.

### 2.4 Publishing projections

- **EPUB (amends ADR-0010):** the cover asset's manifest item carries `properties="cover-image"`. The engine generates `cover.xhtml` (the image with its alt text) as the first spine item and adds a `cover` landmark. Output must still pass the official EPUBCheck gate. No cover file is stored in the project.
- **HTML (ADR-0011):** the cover image is placed before the first section, with its alt text.
- **PDF (ADR-0013):** the cover image is the first page, scaled to fit the page without cropping. No Typst or font pin change.
- With no cover set, every engine produces the same output as today.

### 2.5 Host vs UI boundary

- React UI: pick an image, enter alt text, see the preview and warnings, set or clear the cover. No image editor.
- Domain: `DesktopStudioCoordinator` remains the mutation authority. A cover port may add the cover asset and set or clear `publishing.coverAssetId`.
- Host: file picking reuses the ADR-0034 Slice 4 image picker host path. No new Tauri permission is expected.
- Metadata Wizard remains the place for title and authors. The cover image does not change `Book.metadata`.

### 2.6 Explicit non-goals for this ADR

- Generated or text-on-image covers, cover directions, templates, typography, positioning, contrast checks
- Print cover wraps, spine width, back cover, bleed, barcodes
- Image editing, cropping, or format conversion
- WebP, GIF, or SVG covers
- AI cover generation
- Accessibility metadata beyond cover alt text
- Code signing / multi-OS packaging; Gate 10 verification changes

## 3. Implementation sequencing (not authorized here)

When separately authorized, implementation should proceed in small slices, for example:

1. **Slice 1 — Cover model and contract:** `publishing.coverAssetId` in the Book Model; validation (image kind, JPEG/PNG, non-empty alt text); `BookSession` set/clear cover; desktop cover port with fail-closed errors; tests; no chrome.
2. **Slice 2 — Image checks:** read pixel dimensions from PNG/JPEG bytes; size and aspect-ratio warnings; plain-language messages; tests.
3. **Slice 3 — Cover Wizard chrome:** pick image, alt text, preview, warnings, set and clear cover, through the port and existing picker host.
4. **Slice 4 — EPUB cover:** `cover-image` manifest property, generated `cover.xhtml`, `cover` landmark; EPUBCheck passes with English and Kannada books.
5. **Slice 5 — HTML and PDF cover:** cover first in HTML; cover as first PDF page.
6. **Slice 6 — Hardening:** English and Kannada books with a cover through package Save/Open and autosave; removing the cover asset fails closed; no cover document stored in the package.

Exact slice boundaries may be adjusted in per-slice proposals; each slice still needs explicit authorization.

## 4. Testable architectural invariants

1. Every cover edit yields a Book Model–valid Book, or a structured fail-closed error.
2. A cover, when set, is an existing JPEG or PNG image asset with non-empty alt text.
3. A Book without `coverAssetId` is valid, and every engine's output for it is unchanged.
4. The cover round-trips through the ADR-0029 package as an ordinary asset plus the `coverAssetId` field. No cover XHTML, HTML, or PDF page is stored.
5. Generated EPUBs with a cover pass the official EPUBCheck gate.
6. Image checks never modify the stored image bytes.
7. Autosave continues to use ADR-0031 package Save semantics when a package root is bound.
8. No AI dependency is introduced by this ADR's slices.

## 5. Consequences

### Positive

- Gives the MVP a real EPUB cover, the most visible part of a published ebook.
- One small, optional Book Model field; no schema version bump or package migration.
- Reuses the asset store, picker host, and existing engines.

### Trade-offs

- Authors who lack a finished cover image cannot make one in OpenBook until the generated-cover ADR.
- Image checks warn but cannot fix a low-resolution image.
- The EPUB engine gains cover semantics that ADR-0010 had excluded; this ADR records that amendment.

## 6. Non-authorizations

This ADR does **not** authorize implementation, Book Model changes, engine changes, dependency changes, UI chrome delivery, AI features, or any Phase 1 Cover Wizard slice until a maintainer issues an explicit slice authorization.
