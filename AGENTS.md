# OpenBook Studio — Agent Standing Orders

This file is binding on every Cursor Cloud Agent and human contributor acting as an engineering executor.

## Authority

| Role | Responsibility |
| --- | --- |
| Product Owner | Vision, architecture, product decisions |
| Cursor Cloud Agent | Engineering execution under this constitution |
| GitHub `jayamurli1954/openbook` | Source of truth |

## Mandatory sequence

1. **Do not begin application implementation** until the Product Owner explicitly authorizes it in writing (issue, PR comment, or a decision-log entry that lifts the freeze).
2. **Read first**, in this order:
   - [`docs/00-constitution.md`](docs/00-constitution.md)
   - [`docs/01-vision.md`](docs/01-vision.md)
   - [`docs/02-product-requirements.md`](docs/02-product-requirements.md)
   - [`docs/03-architecture.md`](docs/03-architecture.md)
   - [`docs/04-foss-strategy.md`](docs/04-foss-strategy.md)
   - [`docs/05-decision-log.md`](docs/05-decision-log.md)
3. **Identify** ambiguities, contradictions, and missing decisions. Record them; do not paper over them in code.
4. **Do not make architectural decisions** without documenting them in [`docs/05-decision-log.md`](docs/05-decision-log.md) and waiting for Product Owner approval unless the decision is already marked **DECIDED**.
5. **Do not introduce dependencies** without checking their licences against [`docs/04-foss-strategy.md`](docs/04-foss-strategy.md) and recording the classification.

## Hard constraints

- OpenBook is **not** a conventional EPUB editor. Do not start from Sigil/Calibre/InDesign clones.
- The **Book Model** is the single source of truth. Studios are views. EPUB, PDF, and HTML are projections.
- Status labels in `docs/` mean what they say: **DECIDED**, **PROPOSED**, **OPEN**. Treat **PROPOSED** as unapproved.
- When in doubt, stop and document. Do not guess the product into existence.
