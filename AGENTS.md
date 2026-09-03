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
   - [`PROJECT_VISION.md`](PROJECT_VISION.md) (canonical Product Owner vision)
   - [`docs/00-constitution.md`](docs/00-constitution.md)
   - [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md) (canonical Product Owner PRD, when reviewing requirements)
   - [`docs/03-architecture.md`](docs/03-architecture.md) until `ARCHITECTURE.md` exists (topology in the vision **supersedes** the older diagram)
   - [`docs/04-foss-strategy.md`](docs/04-foss-strategy.md)
   - [`docs/05-decision-log.md`](docs/05-decision-log.md)
   - [`docs/07-vision-review.md`](docs/07-vision-review.md)
   - [`docs/08-prd-review.md`](docs/08-prd-review.md)
3. **Identify** ambiguities, contradictions, and missing decisions. Record them; do not paper over them in code.
4. **Do not make architectural decisions** without documenting them in [`docs/05-decision-log.md`](docs/05-decision-log.md) and waiting for Product Owner approval unless the decision is already marked **DECIDED**.
5. **Do not introduce dependencies** without checking their licences against [`docs/04-foss-strategy.md`](docs/04-foss-strategy.md) and recording the classification.

## Hard constraints

- OpenBook is **not** a conventional EPUB editor. Do not start from Sigil/Calibre/InDesign clones.
- The **Book Model** is the single source of truth. Studios are views. EPUB, PDF, and HTML are projections.
- **AI suggests. The Book Model decides. Deterministic engines publish. Validators verify.**
- Product Owner files at the repo root (`PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`) beat agent drafts under `docs/` when they conflict.
- Status labels in `docs/` mean what they say: **DECIDED**, **PROPOSED**, **OPEN**. Treat **PROPOSED** as unapproved.
- When in doubt, stop and document. Do not guess the product into existence.
