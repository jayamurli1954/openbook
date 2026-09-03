# OpenBook Book Model (schema version 1)

Executable spec: [`packages/book-model`](../packages/book-model). This document is the human contract.

Persistence (`BookProject`, SQLite, project folder) is **not** this package. That is STEP 3.

## Rule

> **No EPUB-specific structure in the authoring layer unless it represents a genuine publishing concept.**

Forbidden as identity of the work: OPF, package document, manifest, spine, NCX, `nav.xhtml` as the book.

Allowed as later **projections**: EPUB, PDF, HTML engines consume this model. They must not write package fields back into it.

## Shape

```text
Book
├── schemaVersion
├── metadata
├── frontMatter[]
├── chapters[]
├── backMatter[]
├── assets[]
├── styles
├── theme
├── typography
└── publishing
```

- **metadata** — title, subtitle, authors, contributors, language (BCP-47), a single `identifier` string (ISBN/UUID later), publisher, dates, copyright, description, subjects, rights. Language is a required field; empty string is a domain **error**. Empty title is a **warning**.
- **frontMatter / chapters / backMatter** — ordered `StructuralSection`s with semantic `kind` (`front` | `main` | `back`) and `role` (chapter, preface, title-page, …). Roles are publishing concepts, not EPUB landmark storage.
- **sections contain blocks** — paragraph, heading, list, quote, image-ref. Headings use rank 1–6. Inline spans are text / emphasis / strong / link. This is not an HTML document.
- **assets** — references + alt text + licence fields. No embedded font or image bytes in v1 objects.
- **styles / theme / typography** — named semantic intent (`paragraphStyles`, font family names as strings). Not a CSS file as the model.
- **publishing** — intended outputs (`epub` | `pdf` | `html`). Not a package document.

## Versioning

`schemaVersion` is an integer (`BOOK_MODEL_SCHEMA_VERSION = 1`). `parseBook` rejects unknown versions. Migrations will live beside this package when v2 exists.

## Validation

Domain validation (architecture Level 1–2) lives here: required language, empty title, duplicate ids, EPUB-authoring-leak keys.

EPUBCheck is **not** this package.
