# 11 — Review of ROADMAP.md and CONTRIBUTING.md

**Date:** 2026-09-03  
**Reviewer:** Cursor Cloud Agent (engineering executor)  
**Reviewed:** [`ROADMAP.md`](../ROADMAP.md) (`cf193c7`), [`CONTRIBUTING.md`](../CONTRIBUTING.md) (`c96993c`)  
**Implementation:** none. Freeze is not lifted.

The Product Owner roadmap **replaces** the agent draft previously on this branch. Canonical sequence is theirs.

---

## 1. Verdict

Both documents are the right kind of foundation: capability gates instead of dates, and a community that is not only programmers.

The most important product decision in the roadmap is now explicit:

> **Do not wait for professional DTP before the author journey works.**  
> Smallest complete publishing journey first (validated EPUB), then deepen.

That is `MVP-READY` as an EPUB-first guided path. PDF, HTML, master pages, and preflight are **Phase 2**. That is a cleaner MVP than the PRD’s “PDF at an appropriate initial level.”

`CONTRIBUTING.md` is genuinely usable by authors, designers, translators, and accessibility specialists. It repeats the architectural invariants in contributor language. CLA/DCO and `CODE_OF_CONDUCT.md` remain future, which matches `LICENSING_POLICY.md`.

**FOUNDATION-READY is not passed yet.** Phase 0’s gate asks for more than the markdown files: Book Model specification, ADR process, CI, and a **reproducible application build**. That last item is the first code. This review does not treat the upload of `ROADMAP.md` / `CONTRIBUTING.md` as a freeze-lift.

---

## 2. ROADMAP — what it decides

| Topic | Decision |
| --- | --- |
| Sequence | Phase 0 Foundation → 1 MVP (guided book) → 2 Professional DTP → 3 AI-assisted → 4 Ecosystem |
| Completeness | A phase is done only when its named gate is satisfied |
| MVP | Idea → validated, readable **EPUB**. Not a DTP app. |
| PDF / HTML | Phase 2, not Phase 1 |
| AI in MVP | Optional outline from the wizard; full AI Studio is Phase 3, after DTP |
| Preview in MVP | Reflowable desktop/tablet/mobile |
| EPUBCheck | In MVP; release builds must not knowingly ship validation errors |
| Indic | At least one Indic-script fixture in MVP |
| Maturity labels | Alpha → Beta → Stable → Professional → Ecosystem |
| Out of MVP | Cloud collab, plugin marketplace, print automation, model-dependent correctness |
| Priority | Author success, correctness, a11y, interoperability, ease, then professional quality |
| Governance | Feature-level changeable; Book Model / engines / licence / security / APIs need ADR |

Gates: `FOUNDATION-READY`, `MVP-READY`, `PRO-DTP-READY`, `AI-ASSISTED-READY`, `ECOSYSTEM-READY`.

Cross-phase invariants (§7) match architecture: Book Model, deterministic publishing, validation, a11y, Unicode, user ownership, schema migrations, security boundaries, performance, explainable errors.

---

## 3. How this answers earlier OPEN items

| ID | Effect |
| --- | --- |
| O-09 MVP PDF | **Out of MVP.** PDF is Phase 2. |
| O-12 HTML in MVP | **Out of MVP.** HTML is Phase 2 §4.6. |
| O-23 export/errors | **Product releases** must not knowingly ship EPUBCheck errors. User-export of a *their* invalid book is still not fully specified. |
| O-28 one AI workflow | Wizard outline is the MVP-shaped optional AI; full assistant is Phase 3. |
| O-19 plugins | Phase 4; interfaces before marketplace. |
| O-18 collab | Explicitly out until later. |
| O-15 Indic fixture | Required for MVP-READY. |

PRD §32 still lists initial PDF and HTML “where feasible” in MVP. **This roadmap is later and more specific.** Treat PDF/HTML as Phase 2 unless the Product Owner restores them to MVP. That conflict should be closed in one sentence on `main` (PRD note or ADR) so an agent does not implement a stub PDF “because the PRD said so.”

---

## 4. Ambiguities and tensions

### G-A1. FOUNDATION-READY includes a buildable application

Phase 0 deliverables still include “initial repository structure,” “CI foundation,” “Book Model specification,” “ADR process,” and the gate “the application can be built reproducibly by a new contributor.”

Documents on `main` do **not** yet satisfy that gate. Meeting it **is** application implementation (shell + test runner + CI), plus a real Book Model schema spec.

`AGENTS.md` still says do not implement until a freeze-lift ADR. Either:

1. the freeze-lift **is** “you may do Phase 0 engineering only” (monorepo, CI, schema spec, empty shell after FOSS scorecards), or  
2. Phase 0’s buildable-app bullet is premature and should move to the start of Phase 1.

**Do not guess.** This review does not start a Tauri scaffold.

### G-A2. Phase 0 deliverable list is stale

`ROADMAP.md` and `CONTRIBUTING.md` exist but are not listed in §2 deliverables. Add them. `CODE_OF_CONDUCT.md` / `SECURITY.md` are still called out as future in CONTRIBUTING.

### G-A3. MVP “Import Existing Book” vs EPUB-as-output

Wizard includes Import. Import of EPUB into the Book Model is loss-aware (architecture). MVP-READY also wants “import/export round-trip tests for supported formats.” If the only MVP format is native project + generated EPUB, define **supported formats** (OpenBook project only vs Markdown/DOCX/EPUB). Otherwise agents will EMBED Pandoc in Phase 1.

### G-A4. MVP Cover “use an illustration”

If that means bundled artwork, licence provenance (`LICENSING_POLICY.md` §9) is a Phase 1 blocker. If it means “user imports an image,” say so.

### G-A5. Optional AI outline vs AI-off journey

PRD: AI is not a hard dependency. Roadmap wizard “optionally request an AI-generated outline.” MVP-READY does not say the journey works with AI unavailable. Keep the PRD rule: **AI off must still complete MVP-READY.**

### G-A6. Preview vs Validate order

MVP journey is Generate EPUB → Validate → Preview. That matches architecture tests, not the older PRD “Preview then Validate” copy. Treat **Generate → Validate → Preview** as canonical for artefacts. Book Doctor can still run domain checks earlier.

### G-A7. “EPUBCheck quality threshold”

Undefined. Zero errors? Errors allowed if Doctor waives? “Must not knowingly ship validation errors” sounds like **zero errors on release fixtures**. User books may still have Doctor Errors — specify.

### G-A8. Test-book suite vs MVP types

§8 lists poetry, children’s, technical, academic, RTL. Those are **regression assets over time**, not all required for MVP-READY. MVP-READY names Unicode + one Indic fixture. Keep the rest for later gates so Phase 1 does not grow a children’s layout engine.

### G-A9. Phase 3 after Phase 2

Full AI Studio waits until after professional DTP. That is a stronger sequencing than “AI path in MVP.” Compatible if MVP outline is a thin optional adapter, not AI Studio.

### G-A10. CONTRIBUTING names Tauri/React/Rust as the developer stack

That matches architecture’s *recommendation*. It is still not FOSS-scorecard approval. Contributors should not open PRs that add Tiptap Pro or a GPL PDF engine because CONTRIBUTING mentioned the stack.

### G-A11. Cursor rules live outside CONTRIBUTING

The user note mentioned Cursor/AI contribution rules. CONTRIBUTING §17–18 covers AI-assisted *contributions* (human remains responsible). Agent implementation rules remain `ARCHITECTURE.md` §51, `FOSS_STRATEGY.md` §27, and `AGENTS.md`. Fine — don’t duplicate three ways. Point CONTRIBUTING at those files in a later edit.

---

## 5. CONTRIBUTING — what it decides

| Topic | Decision |
| --- | --- |
| Who | Developers, authors, editors, designers, translators, a11y, testers, educators, publishers |
| Read first | The six foundation docs (now seven with CONTRIBUTING itself) |
| Rules | Book Model; EPUB is output; AI is assistant; deterministic publish; validate; beginner mode; i18n; a11y |
| Process | Issue → architecture check → branch → tests → PR → CI |
| FOSS | USE/EMBED/ADAPT/INSPIRE/AVOID; stop if licence unclear |
| Assets | Provenance required |
| AI PRs | Contributor owns the result; not automatically free of copyright/security issues |
| Security | Private report; no secrets or private manuscripts in fixtures |
| Steward | SanMitra Tech Solutions; no automatic copyright assignment |
| CLA/DCO | Future, after review |
| CoC | `CODE_OF_CONDUCT.md` before the community grows |
| First Author Program | Future usability programme |
| Help improve OpenBook | Future in-app path; Git not required for all contribution |

This is enough to *receive* community work once the project is public and the licence exists. It is not enough to pass FOUNDATION-READY’s “new contributor can build” test.

---

## 6. Remaining Phase 0 work (no MVP features)

To honestly claim `FOUNDATION-READY`:

1. Add ROADMAP + CONTRIBUTING to the Phase 0 deliverable list.  
2. Resolve PRD vs roadmap on PDF/HTML-in-MVP (recommend: roadmap wins).  
3. Book Model **specification** (versioned schema, not only architecture §9).  
4. `docs/adr/` numbering vs `docs/05-decision-log.md`.  
5. FOSS scorecards for the first EMBED/USE set.  
6. Product Owner freeze-lift for **Phase 0 engineering only** (repo layout, toolchain, CI, empty test that runs).  
7. Then a reproducible build — which is the first application commit.

Until (6), this agent will not scaffold Tauri.

---

## 7. What this agent will not do

- Will not start Writing Studio, EPUB engine, or DTP.
- Will not add PDF/HTML in Phase 1 against this roadmap.
- Will not add `LICENSE`, `CODE_OF_CONDUCT.md`, or `SECURITY.md` unless asked.
- Will not treat CONTRIBUTING’s stack names as dependency approval.
- Will not import Sigil/Scribus/Calibre.

---

## 8. Recommended Product Owner replies

1. Confirm PDF and HTML are **out of MVP** (roadmap over PRD).  
2. Confirm MVP works **with AI disabled**.  
3. Confirm whether Phase 0 “reproducible build” authorizes a **shell-only** freeze-lift after scorecards, or stays blocked until you say so.  
4. Define the EPUBCheck threshold for MVP-READY (zero errors on fixtures).  
5. Define MVP import formats (native project only vs Markdown, etc.).
