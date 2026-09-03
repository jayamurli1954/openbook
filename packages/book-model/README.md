# `@openbook/book-model`

Canonical in-memory **Book Model** for OpenBook Studio.

This package is the authoring source of truth. EPUB, PDF, and HTML engines
consume a `Book`. They must not push OPF, spine, or other package-format
fields back into this model.

See [`docs/book-model.md`](../../docs/book-model.md).
