# ADR-0010: EPUB 3.3 Asset & Resource Packaging Architecture — Gate 3

* **Status:** Proposed
* **Date:** 2026-09-07
* **Decision scope:** EPUB 3.3 Engine Gate 3 — Asset & Resource Packaging
* **Depends on:** ADR-0006, ADR-0009
* **Implementation status:** Not authorized by this ADR

## 1. Context

OpenBook's canonical `Book` Model already represents assets semantically through `AssetRef` and image content blocks through `ContentBlock`.

ADR-0006 establishes the Book Model as the canonical, format-neutral source of truth. ADR-0009 establishes the EPUB 3.3 engine as a downstream projection of that model.

EPUB Gate 1 established deterministic in-memory EPUB package generation for text-oriented content.

EPUB Gate 2 established deterministic OCF ZIP packaging:

```text
Book
  ↓
buildEpubPackage()
  ↓
EpubPackage
  ↓
buildEpub()
  ↓
Uint8Array
```

Gate 3 must extend this pipeline to package image resources without introducing EPUB-specific concepts into the Book Model or coupling the EPUB engine to desktop storage, SQLite, Tauri, or the filesystem.

## 2. Decision

OpenBook will introduce an injected asynchronous asset-resolution boundary between the canonical Book Model and the EPUB package generator.

The conceptual pipeline becomes:

```text
Book
  │
  ├── content blocks
  │      └── image.assetId
  │
  └── AssetRef
          │
          ▼
    AssetResolver
          │
          ▼
     Uint8Array
          │
          ▼
    @openbook/epub
       ├── XHTML
       ├── OPF manifest
       └── EPUB/images/*
          │
          ▼
      EpubPackage
          │
          ▼
       buildEpub()
          │
          ▼
      EPUB Uint8Array
          │
          ▼
   ValidatorService
          │
          ▼
    EPUBCheck 5.3.0
```

The EPUB engine remains a pure downstream projection and does not own asset persistence.

## 3. AssetResolver Boundary

The Gate 3 architecture defines the following conceptual contract:

```ts
interface AssetResolver {
  resolve(asset: AssetRef): Promise<Uint8Array>;
}
```

The resolver is an injected dependency.

It may eventually be backed by:

* in-memory fixtures;
* SQLite-backed project storage;
* local project files;
* Tauri/Rust IPC;
* another approved storage implementation.

Those storage mechanisms are outside the EPUB engine.

The asynchronous boundary is intentional. It prevents a future breaking API change when real project assets are retrieved from persistent or platform-specific storage.

The exact source implementation and dependency-injection mechanics are implementation concerns and are not frozen beyond this architectural boundary.

## 4. Builder API Direction

Because asset resolution may require asynchronous I/O, the EPUB package-generation boundary will be asynchronous.

Conceptually:

```ts
buildEpubPackage(book, options?): Promise<EpubPackage>
```

and:

```ts
buildEpub(book, options?): Promise<Uint8Array>
```

Existing Gate 1/2 behavior must be preserved semantically while being adapted to the asynchronous asset-resolution boundary.

The exact TypeScript signatures, option types, and error types remain implementation details unless separately frozen.

## 5. Book Model Integrity

Gate 3 MUST NOT modify:

* `Book`;
* `AssetRef`;
* `ContentBlock`;
* SemanticDocument;
* persistence schemas.

The existing abstraction remains:

```text
AssetRef
  ├── id
  ├── kind
  ├── fileName
  ├── mediaType
  ├── altText
  └── licence
```

Binary asset data MUST NOT be added to `AssetRef`.

EPUB-specific concepts such as:

* manifest;
* spine;
* package paths;
* OPF item IDs;
* OCF paths;
* EPUB image directories;

MUST NOT enter the canonical Book Model.

If future requirements demonstrate that the Book Model lacks a necessary semantic asset concept, that change requires a separate Book Model architecture decision.

## 6. Gate 3 Asset Scope

Gate 3 supports image resources only.

The initial supported image media types are:

* `image/jpeg`
* `image/png`
* `image/svg+xml`
* `image/webp`
* `image/gif`

The implementation must verify actual EPUB 3.3 and EPUBCheck compatibility for every media type included in the implementation.

Unsupported or invalid image media types must produce deterministic publishing diagnostics rather than being silently accepted.

The following remain outside Gate 3:

* fonts;
* audio;
* video;
* DRM;
* encryption;
* remote assets;
* image downloading;
* image transformation;
* image resizing;
* image optimization;
* automatic format conversion;
* cover-specific publishing semantics;
* advanced accessibility processing;
* CSS image-layout systems;
* Tauri filesystem access;
* SQLite schema changes;
* KDP-specific processing.

## 7. Canonical EPUB Image Paths

Packaged image resources will use the canonical structure:

```text
EPUB/images/{canonical-asset-id}.{extension}
```

The extension is derived from the validated media type.

Examples:

```text
image/jpeg    → .jpg
image/png     → .png
image/svg+xml → .svg
image/webp    → .webp
image/gif     → .gif
```

The user-supplied `fileName` MUST NOT directly determine the EPUB package path.

This prevents path traversal and makes package generation deterministic.

## 8. Asset ID Safety

The canonical package filename is derived from the asset ID.

The implementation must reject unsafe asset identifiers or normalize them according to a deterministic, documented rule.

At minimum, the package-path boundary must reject:

* `/`;
* `\`;
* `..`;
* null bytes;
* control characters;
* absolute-path forms;
* Windows drive-path forms.

The resulting package path must always remain within:

```text
EPUB/images/
```

The implementation must not permit user-controlled input to escape that directory.

## 9. Image Content Mapping

An image content block references an asset through:

```text
ContentBlock.image.assetId
```

The EPUB engine resolves that reference through `AssetResolver`.

For example:

```text
ContentBlock
  assetId = "cover-image"
        ↓
AssetRef
  id = "cover-image"
  mediaType = "image/jpeg"
        ↓
AssetResolver
        ↓
Uint8Array
        ↓
EPUB/images/cover-image.jpg
```

The generated XHTML must reference the canonical package path.

Example:

```html
<img src="../images/cover-image.jpg" alt="..." />
```

The implementation must XML/HTML-escape generated attribute values.

## 10. Figure and Caption Semantics

The existing image content block contains a caption represented as `InlineSpan[]`.

When a caption is present, the EPUB XHTML representation should use semantic HTML5 structure:

```html
<figure id="...">
  <img src="../images/example.jpg" alt="..." />
  <figcaption>...</figcaption>
</figure>
```

When no caption is present, an appropriate image representation may be used without an empty `figcaption`.

The implementation must preserve the existing caption semantics and must not introduce a second caption representation into the Book Model.

## 11. Accessibility Boundary

`AssetRef.altText` is the authoritative semantic source for image alternative text.

If meaningful `altText` exists, it must be emitted into the XHTML image representation.

Gate 3 MUST NOT invent alternative text through:

* AI;
* filename inference;
* image recognition;
* arbitrary generated descriptions.

If `altText` is absent or empty, Gate 3 should produce a deterministic diagnostic according to the implementation's defined severity policy.

A complete EPUB accessibility conformance system is outside the scope of Gate 3.

## 12. OPF Manifest Registration

Every packaged image resource must have a corresponding EPUB package manifest item.

Conceptually:

```xml
<item
  id="img-cover-image"
  href="images/cover-image.jpg"
  media-type="image/jpeg"/>
```

Manifest IDs and hrefs must be:

* deterministic;
* unique;
* XML-safe;
* consistent with the generated package path.

The EPUB engine, not the Book Model, owns these EPUB-specific identifiers.

## 13. Asset Reference Validation

Gate 3 must deterministically reject at least the following conditions:

1. Duplicate asset IDs.
2. Image content block referencing a nonexistent asset.
3. Image asset with unsupported media type.
4. Unsafe asset ID/path.
5. Resolver failure.
6. Empty or invalid resolved asset bytes where detectable.
7. Conflicting canonical output paths.
8. Invalid EPUB manifest registration.

Unreferenced assets may exist in the canonical Book Model.

Gate 3 will not package unreferenced assets.

This avoids unnecessary archive growth and keeps packaging driven by actual document usage.

## 14. Deterministic Archive Ordering

Gate 2 established canonical OCF archive ordering.

Gate 3 extends that ordering with image resources:

```text
1. mimetype
2. META-INF/container.xml
3. EPUB/package.opf
4. EPUB/nav.xhtml
5. EPUB/styles/openbook.css
6. EPUB/text/*.xhtml
7. EPUB/images/*
8. remaining package files
```

Entries within each applicable directory/category must be sorted deterministically using normalized POSIX paths.

No filesystem enumeration order may influence the resulting archive.

## 15. Determinism

Gate 3 retains the deterministic publishing invariant:

> Same Book + same resolved asset bytes + same publishing options = byte-for-byte identical EPUB output.

Determinism must not depend on:

* system clock;
* local timezone;
* filesystem enumeration order;
* random identifiers;
* temporary filenames;
* host operating system;
* asset resolver iteration order.

Gate 2's deterministic timestamp and archive-ordering rules remain authoritative.

## 16. Asset Byte Integrity

The EPUB engine must package the bytes supplied by the resolver without unintended modification.

Gate 3 does not perform:

* recompression of image formats;
* transcoding;
* resizing;
* metadata rewriting;
* optimization.

Therefore:

```text
resolved asset bytes
        =
packaged EPUB resource bytes
```

unless a future architecture decision explicitly introduces an image-processing stage.

## 17. Validation

Gate 3 must validate the generated EPUB as an actual archive rather than relying solely on in-memory structures.

Minimum validation coverage includes:

* JPEG packaging;
* PNG packaging;
* SVG packaging;
* WebP packaging where supported by the selected validation environment;
* GIF packaging where supported by the selected validation environment;
* image XHTML references;
* OPF manifest registration;
* correct media types;
* Unicode/Kannada alt text;
* Unicode/Kannada captions;
* binary byte preservation;
* missing asset rejection;
* duplicate asset rejection;
* unsafe asset/path rejection;
* deterministic image ordering;
* deterministic archive bytes;
* independent ZIP readability;
* OCF structure;
* container-to-package linkage;
* no NCX;
* existing image-content rejection behavior replaced only where valid assets are available.

The resulting EPUB must be passed through the existing ValidatorService boundary and verified with EPUBCheck 5.3.0.

The Gate 3 acceptance target remains:

```text
EPUBCheck errors   = 0
EPUBCheck warnings = 0
```

## 18. Testing Requirements

Gate 3 implementation must include deterministic automated tests covering:

### Asset resolution

* successful resolution;
* missing asset;
* resolver failure;
* multiple assets.

### Image mapping

* JPEG;
* PNG;
* SVG;
* WebP;
* GIF where supported;
* image reference generation;
* caption generation;
* alt text preservation.

### Security

* path traversal;
* absolute paths;
* Windows path forms;
* separators;
* control characters;
* invalid asset identifiers.

### Manifest

* unique manifest IDs;
* correct href;
* correct media type;
* deterministic ordering.

### Archive

* canonical ordering;
* binary byte preservation;
* deterministic timestamps;
* byte-for-byte repeatability.

### Regression

* all existing Gate 1 tests;
* all existing Gate 2 tests;
* full monorepo test suite;
* full workspace build;
* actual EPUBCheck 5.3.0 validation.

## 19. Consequences

### Positive

* Existing Book Model remains clean and format-neutral.
* EPUB remains a downstream projection.
* Asset persistence can evolve independently.
* Desktop filesystem/SQLite implementation can be introduced later without changing EPUB semantics.
* Async resolution avoids a future breaking I/O refactor.
* Image packaging becomes deterministic and testable.
* Security boundaries are explicit.
* Gate 3 remains small enough to validate independently.

### Negative / Trade-offs

* EPUB builders become asynchronous.
* A resolver abstraction must be supplied by callers.
* Image publishing cannot work without an asset-resolution implementation.
* Additional validation is required for media types and paths.
* Full asset lifecycle management remains a future concern.

## 20. Alternatives Rejected

### Store binary data inside AssetRef

Rejected because it would mix semantic metadata with storage payloads and unnecessarily enlarge the canonical Book Model.

### Store filesystem paths inside AssetRef

Rejected because filesystem paths are platform-specific and violate the format-neutral Book Model boundary.

### Let EPUB directly read files

Rejected because it couples the publishing engine to filesystem/platform concerns and makes deterministic testing harder.

### Package every Book.assets entry

Rejected for Gate 3 because unreferenced assets should not automatically inflate the published EPUB.

### Use the original user filename as the EPUB path

Rejected because filenames can contain unsafe paths and make deterministic package naming harder.

### Make the resolver synchronous

Rejected because persistent asset stores and desktop IPC are naturally asynchronous, and introducing async later would create an unnecessary breaking API transition.

### Modify Book Model to add EPUB packaging information

Rejected because EPUB packaging belongs to the downstream EPUB projection, not the canonical format-neutral model.

## 21. Relationship to Existing ADRs

### ADR-0006 — Canonical Book Model

ADR-0010 reinforces ADR-0006.

The Book Model remains:

```text
canonical
format-neutral
semantic
```

No EPUB packaging information is introduced into it.

### ADR-0009 — EPUB 3.3 Engine Architecture

ADR-0010 is an implementation-gate architecture decision under ADR-0009.

It extends:

```text
Book → EpubPackage → EPUB ZIP
```

with an explicit asset-resolution boundary while preserving the EPUB publishing boundary.

### Gate 1

Gate 1 established deterministic XHTML/OPF/navigation/package generation.

### Gate 2

Gate 2 established deterministic OCF ZIP packaging.

Gate 3 extends the package contents with image resources while preserving Gate 2's deterministic archive rules.

## 22. Implementation Authorization

This ADR is an architecture decision only.

Acceptance of ADR-0010 does **not** by itself authorize implementation.

After ADR-0010 is accepted, a separate implementation instruction may authorize:

> **EPUB 3.3 Engine Gate 3 — Asset & Resource Packaging**

The implementation PR must remain limited to the approved Gate 3 scope.

Any requirement to modify:

* Book Model;
* SemanticDocument;
* SQLite schema;
* persistence architecture;
* Tauri architecture;
* asset transformation;
* fonts/audio/video;
* cover pipeline;
* accessibility architecture;

must stop implementation and trigger a separate architecture review.

## 23. Acceptance Criteria for ADR-0010

ADR-0010 may be marked **Accepted** when the Product Owner approves the following architectural invariants:

* [ ] Book Model remains unchanged.
* [ ] AssetResolver is an external injected boundary.
* [ ] Asset resolution is asynchronous.
* [ ] EPUB builders are asynchronous at the asset-aware boundary.
* [ ] Images are the only Gate 3 resource type.
* [ ] Canonical image paths are deterministic and MIME-derived.
* [ ] User filenames cannot control package paths.
* [ ] Image references resolve through AssetRef → AssetResolver.
* [ ] Images are registered in the EPUB manifest.
* [ ] Existing altText semantics are preserved.
* [ ] Unreferenced assets are not packaged.
* [ ] Gate 2 archive ordering/determinism remains authoritative.
* [ ] ValidatorService remains the validation boundary.
* [ ] EPUBCheck 5.3.0 remains authoritative for EPUB conformance.
* [ ] No Book Model, SDM, SQLite, Tauri, or unrelated publishing changes are authorized by Gate 3.
* [ ] Gate 3 implementation requires a separate explicit implementation instruction.

**Decision:** Pending Product Owner acceptance.
