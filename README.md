# OpenBook Studio

Open-source desktop and digital publishing studio — write, design, typeset, validate and publish books.

Phase 0 has started: **repository skeleton + Book Model** only. There is no editor UI yet. `FOUNDATION-READY` is not passed (no desktop application build).

## Run tests

Requires Node.js 22+.

```text
npm install
npm test
```

## Canonical documents

1. [Vision](PROJECT_VISION.md)
2. [Product requirements](PRODUCT_REQUIREMENTS.md)
3. [Architecture](ARCHITECTURE.md)
4. [FOSS strategy](FOSS_STRATEGY.md)
5. [Licensing policy](LICENSING_POLICY.md)
6. [Roadmap](ROADMAP.md)
7. [Contributing](CONTRIBUTING.md)
8. [Agent standing orders](AGENTS.md)
9. [Book Model](docs/book-model.md)
10. [Reviews, gaps, and decision log](docs/README.md)

## Product sequence

```text
Foundation → MVP (guided EPUB) → Professional DTP → AI-assisted → Ecosystem
```

MVP is the smallest complete author journey to a **validated EPUB**. Professional DTP is later, on the same Book Model.

## Status

| Item | State |
| --- | --- |
| Foundation markdown | Vision, PRD, architecture, FOSS, licensing, roadmap, contributing |
| Book Model | `@openbook/book-model` schema v1 + tests (English + Kannada fixtures) |
| `FOUNDATION-READY` | **Not passed** (no Tauri/React app build) |
| OpenBook `LICENSE` | Not frozen |
| UI / persistence / EPUB engine | Not started |
