# OpenBook Studio — Project Constitution

These documents are the architectural constitution of OpenBook Studio. They exist so the project does not accidentally become a conventional EPUB editor, a licence-incompatible FOSS collage, or an implementation that outruns product decisions.

**Application implementation is frozen** until the Product Owner lifts that freeze in [`05-decision-log.md`](05-decision-log.md). See [`00-constitution.md`](00-constitution.md) and the root [`AGENTS.md`](../AGENTS.md).

## Read in this order

| # | Document | Purpose |
| --- | --- | --- |
| — | [PROJECT_VISION.md](../PROJECT_VISION.md) | **Canonical** Product Owner vision |
| — | [PRODUCT_REQUIREMENTS.md](../PRODUCT_REQUIREMENTS.md) | **Canonical** Product Owner PRD |
| — | [ARCHITECTURE.md](../ARCHITECTURE.md) | **Canonical** technical architecture |
| — | [FOSS_STRATEGY.md](../FOSS_STRATEGY.md) | **Canonical** FOSS strategy |
| — | [LICENSING_POLICY.md](../LICENSING_POLICY.md) | **Canonical** licensing policy |
| — | [ROADMAP.md](../ROADMAP.md) | **Canonical** capability roadmap and gates |
| — | [CONTRIBUTING.md](../CONTRIBUTING.md) | **Canonical** contributor guide |
| 00 | [Constitution](00-constitution.md) | Authority, standing orders, change control |
| 01 | [Vision pointer](01-vision.md) | Redirect only |
| 02 | [PRD pointer](02-product-requirements.md) | Redirect only |
| 03 | [Architecture pointer](03-architecture.md) | Redirect only |
| 04 | [FOSS pointer](04-foss-strategy.md) | Redirect only |
| 05 | [Decision Log](05-decision-log.md) | DECIDED and OPEN architectural decisions |
| 06 | [Engineering Review](06-engineering-review.md) | Pre-vision repository review |
| 07 | [Vision review](07-vision-review.md) | `PROJECT_VISION.md` |
| 08 | [PRD review](08-prd-review.md) | `PRODUCT_REQUIREMENTS.md` |
| 09 | [Architecture review](09-architecture-review.md) | `ARCHITECTURE.md` |
| 10 | [FOSS and licensing review](10-foss-licensing-review.md) | `FOSS_STRATEGY.md`, `LICENSING_POLICY.md` |
| 11 | [Roadmap and contributing review](11-roadmap-contributing-review.md) | `ROADMAP.md`, `CONTRIBUTING.md` |
| — | [FOSS research notes](foss-research/) | Per-project classification records |

## Status vocabulary

Every requirement, principle, and decision in this tree is labelled:

- **DECIDED** — Product Owner has stated it. Binding.
- **PROPOSED** — Drafted for review. Not binding. Must not be implemented as if approved.
- **OPEN** — A decision is required before implementation in that area.

## What this repository is today

A constitution-only repository. There is no application source. OpenBook’s own licence is not frozen. No approved third-party dependencies.
