# OpenBook Studio — Project Constitution

These documents are the architectural constitution of OpenBook Studio. They exist so the project does not accidentally become a conventional EPUB editor, a licence-incompatible FOSS collage, or an implementation that outruns product decisions.

The implementation freeze is **partially lifted** for Phase 0 skeleton + Book Model ([ADR-024](05-decision-log.md), [`adr/0001-phase-0-skeleton-and-book-model.md`](adr/0001-phase-0-skeleton-and-book-model.md)). UI, persistence, and publishing engines remain frozen. See [`00-constitution.md`](00-constitution.md) and the root [`AGENTS.md`](../AGENTS.md).

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
| 12 | [Foundation gaps](12-foundation-gaps.md) | Remaining ambiguities across the seven Product Owner docs |
| — | [Book Model](book-model.md) | Schema v1 human contract (`packages/book-model`) |
| — | [ADRs](adr/) | File ADRs (0001 = Phase 0 skeleton; does not replace numbered log ADR-001) |
| — | [FOSS research notes](foss-research/) | Per-project classification records |

## Status vocabulary

Every requirement, principle, and decision in this tree is labelled:

- **DECIDED** — Product Owner has stated it. Binding.
- **PROPOSED** — Drafted for review. Not binding. Must not be implemented as if approved.
- **OPEN** — A decision is required before implementation in that area.

## What this repository is today

A Phase 0 foundation: the seven Product Owner documents, a npm workspaces skeleton, and the `@openbook/book-model` library with tests. There is no desktop UI. OpenBook’s own licence is not frozen. Runtime product dependencies are not adopted. Dev-only: TypeScript (Apache-2.0) and `@types/node` (MIT).
