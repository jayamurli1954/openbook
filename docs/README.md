# OpenBook Studio — Project Constitution

These documents are the architectural constitution of OpenBook Studio. They exist so the project does not accidentally become a conventional EPUB editor, a licence-incompatible FOSS collage, or an implementation that outruns product decisions.

**Application implementation is frozen** until the Product Owner lifts that freeze in [`05-decision-log.md`](05-decision-log.md). See [`00-constitution.md`](00-constitution.md) and the root [`AGENTS.md`](../AGENTS.md).

## Read in this order

| # | Document | Purpose |
| --- | --- | --- |
| — | [PROJECT_VISION.md](../PROJECT_VISION.md) | **Canonical** Product Owner vision |
| — | [PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md) | **Canonical** Product Owner PRD (review pending) |
| 00 | [Constitution](00-constitution.md) | Authority, standing orders, change control |
| 01 | [Vision pointer](01-vision.md) | Redirect only |
| 02 | [Agent PRD draft](02-product-requirements.md) | Superseded as canonical by the root PRD |
| 03 | [Core Architecture](03-architecture.md) | Interim notes; topology superseded by the vision diagram |
| 04 | [FOSS Strategy](04-foss-strategy.md) | USE / ADAPT / INSPIRE / EXTERNAL / AVOID — see vision review for 4-class vs 5-class |
| 05 | [Decision Log](05-decision-log.md) | DECIDED and OPEN architectural decisions |
| 06 | [Engineering Review](06-engineering-review.md) | Pre-vision repository review |
| 07 | [Vision review](07-vision-review.md) | Ambiguities and tensions in `PROJECT_VISION.md` |

## Status vocabulary

Every requirement, principle, and decision in this tree is labelled:

- **DECIDED** — Product Owner has stated it. Binding.
- **PROPOSED** — Drafted for review. Not binding. Must not be implemented as if approved.
- **OPEN** — A decision is required before implementation in that area.

## What this repository is today

A constitution-only repository. There is no application source, no chosen runtime, no project licence file, and no approved third-party dependencies.
