# Semantic Document Model — Contract & Invariants

## Purpose

The Semantic Document Model (SDM) is the **editor-facing, format-neutral**
content contract between authoring surfaces and the canonical OpenBook
**Book Model** (`@openbook/book-model`).

```text
Editor (future)  →  SemanticDocument  →  Book (canonical)  →  EPUB/HTML/PDF engines
```

Editors adapt *to* this contract. The Book Model does not adapt to an editor.

## Non-goals

- Not an editor implementation or UI
- Not Tiptap / ProseMirror / any editor package
- Not EPUB OPF/manifest/spine/nav/container structures
- Not HTML or PDF documents
- Not SQLite / persistence schema
- Not a replacement for `@openbook/book-model`

## Schema

- `SEMANTIC_DOCUMENT_SCHEMA_VERSION = 1`
- Independent of `BOOK_MODEL_SCHEMA_VERSION` (also currently 1). Changing one
  does not silently change the other.

## Content coverage

The SDM represents the structured content the Book Model already authorizes:

| Concern | SDM | Maps to Book |
| --- | --- | --- |
| Title / authors / language / metadata | `metadata` | `Book.metadata` |
| Front / main / back sections | `sections[].matter` | `frontMatter` / `chapters` / `backMatter` |
| Section role + title | `sections[]` | `StructuralSection` |
| Paragraphs, headings, quotes, lists, images | `blocks` | `ContentBlock` |
| Text, emphasis, strong, links | `inlines` | `InlineSpan` |
| Asset references | `assets` | `AssetRef` |

Book fields that are **not** part of the editor content contract
(`styles`, `theme`, `typography`, `publishing`) receive deterministic defaults
on mapping (empty style lists, default theme, empty typography families,
`intendedOutputs: []`).

## Mapping rules (SDM → Book)

Function: `semanticDocumentToBook(doc)`.

1. Reject unknown `schemaVersion`.
2. Reject EPUB packaging / container / navigation authoring leaks
   (`opf`, `manifest`, `spine`, `ncx`, `nav`, `navDoc`, `container`,
   `packageDocument`) on the document root.
3. Copy metadata field-for-field into `Book.metadata`.
4. Partition `sections` by `matter`:
   - `"front"` → `frontMatter`
   - `"main"` → `chapters`
   - `"back"` → `backMatter`
5. Preserve section order within each matter partition.
6. Map each section’s `id`, `role`, `title`, and `blocks` 1:1 onto
   `StructuralSection` (`kind` ← `matter`).
7. Map blocks and inlines 1:1 (same discriminators and fields as Book Model).
8. Map `assets` 1:1 onto `Book.assets`.
9. Set `Book.schemaVersion` to `BOOK_MODEL_SCHEMA_VERSION`.
10. Apply publishing defaults: `intendedOutputs: []` (format-neutral).

Reverse helper `bookToSemanticDocument(book)` exists for tests and future
editor load paths. It extracts content/metadata/assets only; style/theme/
typography/publishing are not represented in the SDM and are dropped on the
round-trip *into* SDM (then restored to defaults when mapping back to Book).

## Invariants

1. **Book Model is canonical.** Engines and validators consume `Book`, not SDM.
2. **Format neutrality.** SDM must not contain EPUB/HTML/PDF package structures.
3. **Determinism.** Identical SDM input yields identical `Book` output
   (including preserved ids).
4. **Lossless content projection.** For content covered by the SDM, mapping
   to Book and back to SDM preserves metadata, section partition/order,
   blocks, inlines, and assets.
5. **Editor independence.** No dependency on any editor library.
6. **No persistence semantics.** SDM is an in-memory contract, not a database
   schema.

## Validation

`validateSemanticDocument` returns domain-style issues. Errors include missing
language, duplicate ids, unknown schema, and EPUB authoring leaks. Empty title
is a warning (aligned with Book Model validation posture).
