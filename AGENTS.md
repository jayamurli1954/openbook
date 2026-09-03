# OpenBook Studio — Agent Standing Orders

This file is binding on every Cursor Cloud Agent and human contributor acting as an engineering executor.

Canonical Product Owner files: `PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`. Implementation rules in `ARCHITECTURE.md` §51 also bind.

## Authority

| Role | Responsibility |
| --- | --- |
| Product Owner | Vision, architecture, product decisions |
| Cursor Cloud Agent | Engineering execution under this constitution |
| GitHub `jayamurli1954/openbook` | Source of truth |

## Mandatory sequence

1. **Do not begin application implementation** until the Product Owner explicitly authorizes it in writing (issue, PR comment, or a decision-log entry that lifts the freeze). `ARCHITECTURE.md` does **not** lift the freeze. Next foundation document: `FOSS_STRATEGY.md`.
2. **Read first**, in this order:
   - [`PROJECT_VISION.md`](PROJECT_VISION.md)
   - [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md)
   - [`ARCHITECTURE.md`](ARCHITECTURE.md)
   - [`docs/00-constitution.md`](docs/00-constitution.md)
   - [`docs/05-decision-log.md`](docs/05-decision-log.md)
   - [`docs/09-architecture-review.md`](docs/09-architecture-review.md)
3. **Identify** ambiguities, contradictions, and missing decisions. Record them; do not paper over them in code.
4. **Do not make architectural decisions** without documenting them. Frozen contracts in `ARCHITECTURE.md` §54–60 beat convenience.
5. **Do not introduce dependencies** without licence verification against `FOSS_STRATEGY.md` / `LICENSING_POLICY.md` when those exist, otherwise [`docs/04-foss-strategy.md`](docs/04-foss-strategy.md) research notes. Named tools (Tauri, Tiptap, Ollama, EPUBCheck) are **recommendations**, not adoptions.

## Frozen chain

```text
BOOK MODEL → EPUB / PDF / HTML → EPUBCheck / Preflight / QA → PUBLICATION READY

AI → Suggest / Explain → User/Command → Book Model → Deterministic Engine → Validator
```

## Hard constraints (from vision, PRD, architecture §51)

- The Book Model is the single source of truth. EPUB, PDF, HTML, preview, and the editor are not.
- AI is not the publishing engine. AI must not write EPUB packages, bypass validators, or silently mutate the project database.
- Do not invent major product scope. Do not copy third-party source unless licence and policy permit.
- Add tests with new domain functionality. UI-only is not done.
- Keep user content and secrets out of logs.
- Prefer small, reviewable changes. Document significant deviations.
- Beginner and Expert share the same domain; only presentation differs.
- Product Owner root files beat agent drafts under `docs/` when they conflict.
