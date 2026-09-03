# OpenBook Studio — Agent Standing Orders

This file is binding on every Cursor Cloud Agent and human contributor acting as an engineering executor.

Canonical Product Owner files: `PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, `CONTRIBUTING.md`.

Implementation rules: `ARCHITECTURE.md` §51, `FOSS_STRATEGY.md` §27, `CONTRIBUTING.md` (AI-assisted contributions).

## Authority

| Role | Responsibility |
| --- | --- |
| Product Owner | Vision, architecture, product decisions, project licence, roadmap gates |
| Cursor Cloud Agent | Engineering execution under this constitution |
| GitHub `jayamurli1954/openbook` | Source of truth |

## Mandatory sequence

1. **Do not begin application implementation** until a freeze-lift ADR names the allowed work. `FOUNDATION-READY` is **not** passed (no CI, no Book Model spec, no reproducible app build). Uploading the roadmap is not a freeze-lift.
2. **Read first:** the seven canonical files above, then [`docs/00-constitution.md`](docs/00-constitution.md), [`docs/05-decision-log.md`](docs/05-decision-log.md), [`docs/11-roadmap-contributing-review.md`](docs/11-roadmap-contributing-review.md).
3. **Identify** ambiguities. Record them. Do not paper over them in code.
4. **Do not violate** the frozen Book Model chain or FOSS classes.
5. **Do not introduce dependencies** without USE / EMBED / ADAPT / INSPIRE / AVOID, licence + transitives, and inventory. If unclear, **stop**.

## Frozen chain

```text
BOOK MODEL → EPUB / PDF / HTML → EPUBCheck / Preflight / QA → PUBLICATION READY

AI → Suggest / Explain → User/Command → Book Model → Engine → Validator
```

## Roadmap (capability gates, not dates)

```text
Phase 0 Foundation        → FOUNDATION-READY
Phase 1 Guided EPUB MVP   → MVP-READY
Phase 2 Professional DTP  → PRO-DTP-READY
Phase 3 AI-assisted       → AI-ASSISTED-READY
Phase 4 Ecosystem         → ECOSYSTEM-READY
```

**MVP does not wait for professional DTP.** Phase 1 is a complete author journey to a validated EPUB. PDF and HTML are Phase 2 unless the Product Owner restores them.

Prefer the current milestone. Do not skip to DTP or plugins because they are more interesting.

## FOSS and licence

Not a merge of Sigil, Scribus, Calibre, or LibreOffice. OpenBook licence is **unfrozen** (Apache-2.0 vs AGPL-3.0-or-later). Do not add `LICENSE` without approval.

## Hard constraints

- Book Model is the source of truth. EPUB is an output.
- AI is not the publishing engine. AI-off must still complete the MVP journey.
- Tests with domain work. UI-only is not done.
- User content stays the user's. No private manuscripts in fixtures.
- Small, reviewable PRs. Map work to a roadmap phase.
- Product Owner root files beat agent drafts under `docs/`.
- Where PRD and ROADMAP disagree on MVP scope, **stop and document**; do not implement both.
