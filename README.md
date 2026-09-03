# OpenBook Studio

Open-source desktop and digital publishing studio — write, design, typeset, validate and publish books.

**Application implementation is frozen** until a freeze-lift ADR. Foundation documents are in place; `CONTRIBUTING.md` is next for community process.

## Canonical documents

1. [Project vision](PROJECT_VISION.md)
2. [Product requirements](PRODUCT_REQUIREMENTS.md)
3. [Architecture](ARCHITECTURE.md)
4. [FOSS strategy](FOSS_STRATEGY.md)
5. [Licensing policy](LICENSING_POLICY.md)
6. [Roadmap](ROADMAP.md) (Foundation Draft — sequence and gates, not dates)
7. [Agent standing orders](AGENTS.md)
8. [Reviews and decision log](docs/README.md)

## Frozen publishing chain

```text
BOOK MODEL → EPUB / PDF / HTML → EPUBCheck / Preflight / QA → PUBLICATION READY

AI → Suggest / Explain → User/Command → Book Model → Engine → Validator
```

OpenBook is not a merge of Sigil, Scribus, Calibre, or LibreOffice.

## Status

| Item | State |
| --- | --- |
| Vision / PRD / Architecture / FOSS / Licensing | Canonical drafts |
| Roadmap | Draft in this repository — Product Owner should accept or revise |
| OpenBook `LICENSE` | **Not frozen** (Apache-2.0 vs AGPL-3.0-or-later) |
| Contributing / CLA-DCO | Not yet |
| Application source | None |
