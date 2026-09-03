# `@openbook/book-model`

Canonical in-memory **Book Model** for OpenBook Studio.

This package is the authoring source of truth. EPUB, PDF, and HTML engines
consume a `Book`. They must not push OPF, manifest, spine, container, nav, or
other package-format fields back into this model; `validateBook` rejects them.

Licensed under Apache-2.0 (see the repository `LICENSE` and ADR-0003).

See [`docs/adr/0006-book-model-executable-specification.md`](../../docs/adr/0006-book-model-executable-specification.md)
and [`docs/adr/0004-publishing-engine-technology-architecture.md`](../../docs/adr/0004-publishing-engine-technology-architecture.md).
