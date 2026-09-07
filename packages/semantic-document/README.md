# `@openbook/semantic-document`

Format-neutral **semantic document / editor contract** for OpenBook Studio.

This package defines structured manuscript content that an editor (any editor)
may produce or consume. Deterministic mapping projects a `SemanticDocument`
into the canonical `@openbook/book-model` `Book`.

- The **Book Model** remains the publishing source of truth.
- This contract is **editor-independent** (no Tiptap/ProseMirror).
- This package is **not** EPUB, HTML, PDF, SQLite, or a UI.

See [`CONTRACT.md`](./CONTRACT.md) for invariants and mapping rules.

Licensed under Apache-2.0 (repository `LICENSE` / ADR-0003).
