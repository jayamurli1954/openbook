# 12 — Foundation documents: remaining gaps

**Date:** 2026-09-03  
**Scope:** `PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, `CONTRIBUTING.md`  
**Purpose:** Single list of ambiguities that still bind implementers. Prior reviews: `docs/07`–`11`.

None of these block **Phase 0 skeleton + Book Model**. They block later phases or a claim of `FOUNDATION-READY`.

---

## Cross-cutting (still open)

| Gap | Why it matters | When it bites |
| --- | --- | --- |
| OpenBook `LICENSE` unfrozen (Apache-2.0 vs AGPL-3.0-or-later) | EMBED of copyleft code cannot be fully classified | Any GPL library or bundled tool |
| Trademark / “OpenBook Studio” name collision | Brand vs other organisations | Public launch, forks |
| Exact Book Model **on-disk** format | Architecture: SQLite + folder; schema still “defined separately” | Persistence (Step 3) |
| Tauri / React / ProseMirror not scorecarded | Named in architecture; not in FOSS portfolio | UI shell (Step 4) |
| EPUBCheck USE vs EMBED | BSD-3 candidate; prefer process first | Validator phase |
| PDF renderer unnamed | Highest FOSS/licence risk | Phase 2 DTP |
| HTML QA tool unnamed | Port only | Phase 2 HTML |
| ADR numbering: `docs/adr/0001` vs decision-log ADR-001 | Collision risk | This Phase 0 uses `docs/adr/0001-…` |
| `FOSS_STRATEGY.md` citation tokens (`turn0search…`) | Hygiene | Strip on `main` |
| chrome-devtools-mcp | Deferred, not now | Optional later agent debugging |

---

## PROJECT_VISION.md

- Preview vs validate order vs later docs (journey vs diagram). **Roadmap MVP now: Generate → Validate → Preview.**
- FOSS classes were four; strategy is five (USE/EMBED/…). Vision text is stale.
- Personas not ranked; roadmap implies first-time author is MVP primary.
- Ollama named as local AI; still not a dependency.

## PRODUCT_REQUIREMENTS.md

- **MVP PDF / HTML** listed; **ROADMAP Phase 1 is EPUB-only.** Confirm roadmap wins (recommended).
- Extra studios (Structure, Cover, Metadata) vs architecture presentation layers — treat as panels.
- “Rich text” vs semantic editor — architecture: semantic. Phase 0 Book Model is semantic blocks, not HTML.
- AI-off journey must work — not restated in roadmap MVP gate.
- Wizard type catalogue vs MVP types — don’t implement children’s/textbook layout in Phase 1.

## ARCHITECTURE.md

- Conceptual schema vs this Phase 0 TypeScript model: aligned on metadata, structure, assets, styles, publishing, `schemaVersion`. Persistence still later.
- “Publishing engines ↓ Book Model” arrow: engines **consume** the model; they must not write it.
- Quality checklist §53: schema spec starts here; FOSS process exists; licence file does not.

## FOSS_STRATEGY.md

- Desktop stack missing from portfolio table (Tauri, React, ProseMirror, SQLite).
- EPUBCheck / ImageMagick still “candidates.”
- Calibre “proprietary/permissive core” wording is sloppy (OpenBook is not proprietary).

## LICENSING_POLICY.md

- No `LICENSE` until Product Owner freezes it. Phase 0 files have **no** contradictory SPDX headers on application code (package.json has no license field claiming Apache/MIT for OpenBook).
- CLA/DCO, CoC, SECURITY.md still future (`CONTRIBUTING.md`).

## ROADMAP.md

- `FOUNDATION-READY` asks for a reproducible **application** build. Phase 0 here is **library + tests**, not a desktop app. The gate remains unmet until a later freeze-lift for the shell.
- Phase 0 deliverable list omitted ROADMAP and CONTRIBUTING (they now exist).
- Import in the wizard vs “supported formats” for round-trip tests — define before Step 5–6.
- EPUBCheck “quality threshold” undefined; fixtures should aim at **zero errors** when an engine exists.

## CONTRIBUTING.md

- Names Tauri/React/Rust as if chosen; still recommendations until scorecards + UI freeze-lift.
- Cursor rules live in architecture/FOSS/AGENTS, not duplicated here (fine).
- First Author Program and in-app “Help improve OpenBook” are Phase 4-shaped.

---

## Phase 0 response

This slice implements the **executable Book Model + monorepo layout + tests**. It does not pretend `FOUNDATION-READY` is complete. It does not resolve Apache vs AGPL, PDF engines, or UI toolkit adoption.
