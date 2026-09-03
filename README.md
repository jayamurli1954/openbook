# OpenBook Studio

Open-source desktop and digital publishing studio — write, design, typeset, validate and publish books.

**Application implementation is frozen.** Foundation documents so far: vision, requirements, architecture. Next: `FOSS_STRATEGY.md`.

## Start here

1. [Project vision](PROJECT_VISION.md)
2. [Product requirements](PRODUCT_REQUIREMENTS.md)
3. [Architecture](ARCHITECTURE.md)
4. [Agent standing orders](AGENTS.md)
5. [Architecture review](docs/09-architecture-review.md)
6. [Decision log](docs/05-decision-log.md)
7. [Document index](docs/README.md)

## Frozen publishing chain

```text
BOOK MODEL → EPUB / PDF / HTML → EPUBCheck / Preflight / QA → PUBLICATION READY

AI → Suggest / Explain → User/Command → Book Model → Engine → Validator
```

## Status

| Item | State |
| --- | --- |
| Vision / PRD / Architecture | Canonical drafts on `main` |
| FOSS strategy / licensing / roadmap / contributing | Not yet at repo root |
| Product licence | OPEN (no `LICENSE`) |
| Recommended stack | Tauri + React/TS + SQLite — **not adopted** |
| Application source | None — freeze in force |
