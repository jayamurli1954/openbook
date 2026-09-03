# 05 — Decision Log

Architectural decisions live here. If it is not in this file (or an ADR it points to), it is not decided.

Status values: **DECIDED** | **PROPOSED** | **OPEN**.

Product Owner marks DECIDED. Engineering executors may add OPEN/PROPOSED records; they may not silently promote them.

---

## DECIDED

### ADR-001 — Source of truth

- **Status:** DECIDED
- **Decision:** GitHub repository `jayamurli1954/openbook` is the source of truth for OpenBook Studio.
- **Consequences:** Chat notes are not canonical. Documents must land in this repo.

### ADR-002 — Roles

- **Status:** DECIDED
- **Decision:** Product Owner owns vision and architecture. Cursor Cloud Agent (and other engineering executors) execute under the constitution.
- **Consequences:** Agents do not “just pick” a stack, licence, or Book Model format.

### ADR-003 — Implementation freeze

- **Status:** DECIDED
- **Decision:** Do not begin application implementation until the Product Owner explicitly lifts this freeze in this log (or an equivalent written instruction that is then recorded here).
- **Consequences:** This repository remains constitution-only until then.

### ADR-004 — Single Book Model

- **Status:** DECIDED
- **Decision:** User-experience studios edit one Book Model. EPUB, PDF, and HTML are projections of that model, not parallel originals.
- **Consequences:** No dual-document workflows. Imports from EPUB/PDF/DOCX are loss-aware conversions into the model.

### ADR-005 — Not a conventional EPUB editor

- **Status:** DECIDED
- **Decision:** OpenBook must not be designed or bootstrapped as a conventional EPUB editor.
- **Consequences:** Sigil/Calibre editor UX may INSPIRE; their document identity must not become ours.

### ADR-006 — Studio topology (superseded)

- **Status:** SUPERSEDED by ADR-009
- **Decision (old):** Writing, Design, and DTP as editing surfaces; Book Doctor after validators; HTML web checks.
- **Superseded by:** `PROJECT_VISION.md` §3 / ADR-009.

### ADR-007 — Modes and first-class concerns

- **Status:** DECIDED (refined by vision)
- **Decision:** Beginner Mode and Expert Mode exist. Accessibility and multilingual support are first-class. AI is a studio and is not the source of truth. Vision adds three assistance levels (I'll do it myself / Guide me / Do it for me) and Unicode-first / Indic-early.
- **FOSS classes:** Vision names USE / ADAPT / INSPIRE / AVOID. The agent FOSS draft also uses EXTERNAL. Unresolved — see vision review V-C2.
- **Consequences:** These constrain v1 design even if v1 depth is still OPEN.

### ADR-008 — Dependency licence gate

- **Status:** DECIDED
- **Decision:** No dependency without licence verification and FOSS classification recorded in an ADR.
- **Consequences:** No starter templates that drag in a stack “for convenience”. Naming Ollama or EPUBCheck in the vision is **intent**, not adoption.

### ADR-009 — Vision topology (Book Model centre)

- **Status:** DECIDED (vision-level)
- **Decision:** Topology in `PROJECT_VISION.md` §3 is canonical: Book Model; then Writing / Design / DTP / AI / Book Doctor-Preflight; then Publishing Engine; then EPUB / PDF / HTML; then EPUBCheck (and accessibility) and PDF Preflight; then Preview; then Publish.
- **Open inside this decision:** pipeline order vs the beginner journey; definition of Publishing Engine; Book Doctor vs PDF Preflight; HTML checker.
- **Consequences:** `docs/03-architecture.md` old diagram must not be implemented.

### ADR-010 — AI control loop

- **Status:** DECIDED
- **Decision:** AI suggests. The Book Model decides. Deterministic engines publish. Validators verify. Structural and formatting AI changes require user review/approval. Local AI is first-class where practical; Ollama is the intended local provider; cloud is optional; providers are abstracted.
- **Consequences:** Do not vendor-lock the AI layer. Do not add Ollama as a dependency until a licence ADR. Do not let AI write publishing artefacts.

### ADR-011 — Stewardship and user content

- **Status:** DECIDED (intent)
- **Decision:** SanMitra Tech Solutions stewards brand, identity, original code, roadmap, and official releases. Contributors retain rights in original work while granting project permissions. Third-party FOSS keeps its licences. Authors own their manuscripts. Project licence, contributor agreement, and trademark policy remain to be documented.
- **Consequences:** No CLA/LICENSE file until Product Owner publishes `LICENSING_POLICY.md`.

### ADR-012 — Product requirements baseline

- **Status:** DECIDED (product intent)
- **Decision:** `PRODUCT_REQUIREMENTS.md` is the product baseline. Executors must not invent major behaviour that conflicts with it without a documented change. Major implementation waits until `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, and `CONTRIBUTING.md` are sufficiently stable (PRD §38–39).
- **Consequences:** Agent draft `docs/02-product-requirements.md` is not canonical. Remaining before freeze-lift: Product Owner acceptance of `ROADMAP.md`, `CONTRIBUTING.md`, scorecards for first deps, freeze-lift ADR.

### ADR-013 — AI is optional for core product

- **Status:** DECIDED
- **Decision:** AI must not be a hard dependency for writing, editing, EPUB generation, PDF generation, validation, or project open. Provider abstraction; Ollama is an integration *path* in MVP, not a required runtime. Cloud must not receive manuscript content without an action or configuration that permits it.
- **Consequences:** MVP journey must complete with AI unavailable.

### ADR-014 — Book Doctor and readiness

- **Status:** DECIDED (product UX)
- **Decision:** Book Doctor is the findings surface (structure, design, accessibility, metadata, EPUB, PDF) with Error / Warning / Suggestion / Information and Fix / Guide / Show / Waive. Publication readiness is Draft → Writing Complete → Design Complete → Preflight → Validation → Ready to Publish. A health score and AI opinion cannot declare ready.
- **Open inside this decision:** dual-phase (model vs artefact) checks; who advances states; export with Errors (O-23).

### ADR-015 — MVP shape

- **Status:** DECIDED (product cut, not a stack)
- **Decision:** MVP is a complete guided journey: desktop shell, Book Model, wizard, beginner mode, structured writing, basic themes and typography assistant, cover basics, TOC from model, metadata wizard, EPUB generation, PDF at an initial level, HTML where feasible, Book Doctor foundation, EPUB validation, publication readiness, EPUB-oriented preview, AI provider abstraction plus one practical workflow, Unicode and multilingual fixtures. Post-MVP: advanced DTP, stronger preflight, plugins, collab/cloud, adapters.
- **Open inside this decision:** meaning of “PDF at an appropriate initial level”; HTML in or out; which one AI workflow; which wizard book types are first-class.

### ADR-016 — Preview reflects publishing outputs

- **Status:** DECIDED (refined by ADR-017)
- **Decision:** Preview must reflect the actual publishing model, not an editor-only approximation. Generated preview files are not the Book Model.
- **Note:** PRD user journey listed Preview before Validate. Architecture §29/§35 places artefact preview on engine output and E2E as Generate → Validate → Preview. Book Doctor remains the user-facing findings surface across both domain and output checks.

### ADR-017 — Frozen publishing chain

- **Status:** DECIDED (frozen)
- **Decision:** `ARCHITECTURE.md` §54–60. Book Model → separate EPUB/PDF/HTML engines → EPUBCheck / PDF Preflight / HTML QA → Publication Ready. AI sits beside: Suggest/Explain → User/Command → Book Model → Engine → Validator. Local-first core. Beginner/Expert share domain. Plugins deferred. Book Model must not depend on UI, SQLite, Ollama, EPUB, or PDF renderer.
- **Consequences:** Agent draft `docs/03-architecture.md` is a pointer only. This decision is not to be casually changed.

### ADR-018 — Recommended technology baseline

- **Status:** DECIDED as *initial recommendation*, not adoption
- **Decision:** `ARCHITECTURE.md` §4: Tauri; React + TypeScript; Tiptap/ProseMirror or equivalent semantic editor; SQLite; TypeScript domain; Rust only where needed; Ollama as one AI adapter; EPUBCheck or equivalent; GitHub Actions including licence checks. Substitutions must preserve ADR-017.
- **Consequences:** No package manifests until FOSS scorecards exist for that package (`FOSS_STRATEGY.md` §19–21). Tiptap vs ProseMirror licence split must be checked.

### ADR-019 — Persistence shape

- **Status:** DECIDED (requirements; packaging may vary)
- **Decision:** Local SQLite for project metadata/structured state. Portable project directory. Generated outputs and previews distinguishable from source. Schema versioned with migrations from first implementation. Conceptual `BookProject` in `ARCHITECTURE.md` §9–10. Exact schema still a separate spec.
- **Consequences:** Do not git-init user books by default. Do not treat SQLite as the public interchange format without a schema document.

### ADR-021 — FOSS classification and anti-merge

- **Status:** DECIDED
- **Decision:** `FOSS_STRATEGY.md`. Classes are USE / EMBED / ADAPT / INSPIRE / AVOID. OpenBook is built independently around the Book Model. Sigil and Scribus are INSPIRE. Calibre INSPIRE / selective USE. EPUBCheck is a primary validation integration (USE / EMBED candidate). Pandoc AST is not the Book Model. Strong-copyleft application code is not embedded casually. Standards beat copying application behaviour. Tools are invisible behind OpenBook UX.
- **Consequences:** Agent five-class EXTERNAL table is superseded. USE = invoke; EMBED = incorporate.

### ADR-022 — Project licence unfrozen; embedded preference

- **Status:** DECIDED (process)
- **Decision:** `LICENSING_POLICY.md`. OpenBook’s own licence is **not** frozen (Apache-2.0 vs AGPL-3.0-or-later). No agent may assume a final licence or add contradictory file headers. Preferred embedded licences: MIT, BSD, Apache-2.0. Users own manuscripts. Fonts/assets need provenance. AI output is not OpenBook IP. CLA/DCO deferred to `CONTRIBUTING.md`. SPDX and THIRD-PARTY-NOTICES.txt required when shipping code.
- **Consequences:** Do not add `LICENSE` without Product Owner approval.

### ADR-023 — Roadmap draft

- **Status:** PROPOSED as Product Owner sequence (this agent drafted `ROADMAP.md` from the requested phases)
- **Decision pending:** Product Owner accept/revise `ROADMAP.md`. Sequence: Foundation → MVP → Professional DTP → AI → Publishing → Ecosystem, with gates not dates.
- **Consequences:** Not a freeze-lift. Phase 1 still needs scorecards + freeze-lift ADR.

### ADR-020 — Cursor implementation rules

- **Status:** DECIDED
- **Decision:** `ARCHITECTURE.md` §51 and `FOSS_STRATEGY.md` §27 bind this agent when implementation is authorized. Engineering sequence A–I is how to build inside a product phase. `ROADMAP.md` is the product sequence.
- **Consequences:** Freeze-lift ADR still required. `CONTRIBUTING.md` still due.

---

## PROPOSED

These are drafted for Product Owner accept/reject. They are **not** approved by being written down.

| ID | Proposal | Where |
| --- | --- | --- |
| P-01 | Document conflict rule (root Product Owner files beat `docs/` drafts; freeze still binds) | `00-constitution.md` |
| P-02 | Freeze-lift requires named remaining OPEN items | `00-constitution.md` |
| P-05 | Pagination vs reflow mapping even for MVP PDF | O-06 |
| P-08 | Projectors / engines do not write the Book Model | PRD engines + vision AI loop |
| P-09 | ~~invoke vs incorporate~~ | **Superseded** by USE vs EMBED (`FOSS_STRATEGY.md`) |
| P-10 | HTML/CSS typesetting engines must not become the Book Model | Still valid; EPUB-oriented preview increases the risk |
| P-12 | UX copy: Book Doctor before “done”; artefact preview after generate+validate | Architecture vs PRD journey |
| P-13 | ~~Semantic editor~~ | **Superseded** by `ARCHITECTURE.md` §15 / §4 |
| P-14 | MVP AI = optional Wizard outline and/or Doctor explain | `08-prd-review.md` R-A5 |
| P-15 | MVP PDF = flowing pages, page size, margins, header/footer, numbers, cover; no facing-page masters | `08-prd-review.md` R-A3 |
| P-16 | Extra PRD modules are presentation panels over commands | `ARCHITECTURE.md` §3, §6 |
| P-17 | Classify ProseMirror as the editor contract; Tiptap optional UI | Tiptap Pro licence trap |
| P-18 | Unify ADR numbers before `docs/adr/` | `ARCHITECTURE.md` §50 vs this log |

---

## OPEN (blocking or shaping)

Must be decided or explicitly deferred before implementation in that area. Items marked **blocking for any code** are required before the freeze may lift.

| ID | Question | Blocking for any code? | Notes |
| --- | --- | --- | --- |
| O-01 | **Project licence** (Apache-2.0 vs AGPL-3.0-or-later) | **Yes** to EMBED copyleft; not required to keep writing docs | `LICENSING_POLICY.md` §3 — do not add `LICENSE` |
| O-02 | **Public product name / trademark** | Branding | Policy: trademark separate; still no search on file |
| O-03 | Desktop shell | Recommended: Tauri | Scorecard before EMBED; not adopted |
| O-04 | UI / language | Recommended: React + TypeScript | Same; ProseMirror vs Tiptap scorecard |
| O-05 | Persistence | Recommended: SQLite + portable folder | Exact schema still separate |
| O-06 | Pagination vs reflow mapping | Before honest dual output | Phase 2 DTP gate |
| O-07 | Default AI provider / model-weight licences | Before AI calls | Tracked separately from app licence |
| O-08 | **MVP book-type cut** | Before wizard themes | |
| O-09 | **MVP PDF meaning** | Before PDF engine | |
| O-10 | Beginner/Expert × assistance levels | Before UI shell | Same domain |
| O-11 | Publishing engines | **Closed** | Three engines |
| O-12 | HTML in MVP | Before HTML engine | Roadmap allows slip to Phase 4 |
| O-13 | PDF preflight engine | Before strong preflight | USE adapter until EMBED justified |
| O-14 | EPUB profile (3.3?) | Before EPUB engine | EPUBCheck is the conformance tool |
| O-15 | Which Indic language in first fixture | Before i18n tests | Architecture names Kannada fixture |
| O-16 | Accessibility standard and level | Phase 4 publishing | |
| O-17 | MVP import formats | Phase 4 default | Progressive |
| O-18 | Collaboration / sync | **Deferred** | Phase 5 |
| O-19 | Plugin runtime | **Deferred** | Phase 5 |
| O-20 | Font provenance process | **Policy exists** | Still need actual font picks |
| O-21 | CLA/DCO | Before community programme | `CONTRIBUTING.md` |
| O-22 | Maths, citations, audio/video, children’s | Out of MVP unless picker lies | |
| O-23 | Export with Errors | Roadmap **default**: Errors block Ready | Change if you disagree |
| O-24 | Cover | **Closed** | Guided import + type |
| O-25 | Preview in MVP vs later | MVP: EPUB-oriented + PDF before export | |
| O-26 | USE vs EMBED | **Closed** | `FOSS_STRATEGY.md` |
| O-27 | Studio vs panel map | UI | Presentation until contradicted |
| O-28 | One MVP AI workflow | Before 1G | Optional outline and/or Doctor explain |
| O-31 | PDF layout/renderer | Before Phase 2 | Unnamed on purpose |
| O-32 | ADR numbering | Before `docs/adr/` | |
| O-33 | EPUBCheck USE vs EMBED | Before shipping validator | Prefer USE/process first |

---

## Freeze-lift template

When the Product Owner is ready:

```text
### ADR-xxx — Lift implementation freeze (partial | full)

- Status: DECIDED
- Scope allowed:
- Scope still forbidden:
- OPEN items explicitly deferred:
- OPEN items that still block this scope:
```
