# OpenBook Studio — Agent Standing Orders

This file is binding on every Cursor Cloud Agent and human contributor acting as an engineering executor.

Canonical Product Owner files: `PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`. `ROADMAP.md` is the sequenced work programme once accepted.

Implementation rules: `ARCHITECTURE.md` §51 and `FOSS_STRATEGY.md` §27.

## Authority

| Role | Responsibility |
| --- | --- |
| Product Owner | Vision, architecture, product decisions, project licence |
| Cursor Cloud Agent | Engineering execution under this constitution |
| GitHub `jayamurli1954/openbook` | Source of truth |

## Mandatory sequence

1. **Do not begin application implementation** until a freeze-lift ADR names the allowed phase. Foundation docs are not a freeze-lift. `CONTRIBUTING.md` is still due.
2. **Read first:**
   - [`PROJECT_VISION.md`](PROJECT_VISION.md)
   - [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md)
   - [`ARCHITECTURE.md`](ARCHITECTURE.md)
   - [`FOSS_STRATEGY.md`](FOSS_STRATEGY.md)
   - [`LICENSING_POLICY.md`](LICENSING_POLICY.md)
   - [`ROADMAP.md`](ROADMAP.md)
   - [`docs/00-constitution.md`](docs/00-constitution.md)
   - [`docs/05-decision-log.md`](docs/05-decision-log.md)
3. **Identify** ambiguities and missing decisions. Record them. Do not paper over them in code.
4. **Do not make architectural decisions** that violate the frozen Book Model chain.
5. **Do not introduce dependencies** without USE / EMBED / ADAPT / INSPIRE / AVOID classification, licence + transitive check, and inventory update. If the licence is unclear, **stop**.

## Frozen chain

```text
BOOK MODEL → EPUB / PDF / HTML → EPUBCheck / Preflight / QA → PUBLICATION READY

AI → Suggest / Explain → User/Command → Book Model → Engine → Validator
```

## FOSS

OpenBook is **not** Sigil + Scribus + Calibre + LibreOffice. Peer apps are INSPIRE (or selective USE). EPUBCheck is a validation integration candidate, behind Book Doctor.

Do not assume OpenBook is Apache-2.0 or AGPL. That choice is unfrozen. Do not add a `LICENSE` file without Product Owner approval.

Preferred **embedded** licences: MIT, BSD, Apache-2.0. Strong copyleft: do not EMBED casually; USE via adapter may be appropriate after review.

## Hard constraints

- Book Model is the single source of truth. EPUB is not.
- AI is not the publishing engine.
- No unlicensed copies of code, fonts, templates, or artwork.
- Tests with domain functionality. UI-only is not done.
- User content stays the user's. No manuscript in default logs.
- Small, reviewable changes. Map PRs to a roadmap phase (e.g. `1B`).
- Product Owner root files beat agent drafts under `docs/`.
