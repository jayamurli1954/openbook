# OpenBook Studio — Project Constitution

These documents are the architectural constitution of OpenBook Studio. They exist so the project does not accidentally become a conventional EPUB editor, a licence-incompatible FOSS collage, or an implementation that outruns product decisions.

**Application implementation is frozen** until the Product Owner lifts that freeze in [`05-decision-log.md`](05-decision-log.md). See [`00-constitution.md`](00-constitution.md) and the root [`AGENTS.md`](../AGENTS.md).

## Read in this order

| # | Document | Purpose |
| --- | --- | --- |
| 00 | [Constitution](00-constitution.md) | Authority, standing orders, change control |
| 01 | [Project Vision](01-vision.md) | What OpenBook is, who it is for, philosophies |
| 02 | [Product Requirements](02-product-requirements.md) | Feature map by studio, mode, and quality gate |
| 03 | [Core Architecture](03-architecture.md) | Book Model, studios, projections, Book Doctor |
| 04 | [FOSS Strategy](04-foss-strategy.md) | USE / ADAPT / INSPIRE / EXTERNAL / AVOID |
| 05 | [Decision Log](05-decision-log.md) | DECIDED and OPEN architectural decisions |
| 06 | [Engineering Review](06-engineering-review.md) | Ambiguities, contradictions, missing decisions |

## Status vocabulary

Every requirement, principle, and decision in this tree is labelled:

- **DECIDED** — Product Owner has stated it. Binding.
- **PROPOSED** — Drafted for review. Not binding. Must not be implemented as if approved.
- **OPEN** — A decision is required before implementation in that area.

## What this repository is today

A constitution-only repository. There is no application source, no chosen runtime, no project licence file, and no approved third-party dependencies.
