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
- **Consequences:** Agent draft `docs/02-product-requirements.md` is not canonical. Freeze remains in force.

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

- **Status:** DECIDED (intent)
- **Decision:** Preview must reflect the actual publishing model, not an editor-only approximation. PDF must be visually previewable before final export. User-visible journey is Doctor → Preview → Validate → Publish.
- **Consequences:** EPUB-oriented preview must remain a projection. Do not edit the preview artefact as the Book Model.

---

## PROPOSED

These are drafted for Product Owner accept/reject. They are **not** approved by being written down.

| ID | Proposal | Where |
| --- | --- | --- |
| P-01 | Document conflict rule (root Product Owner files beat `docs/` drafts; freeze still binds) | `00-constitution.md` |
| P-02 | Freeze-lift requires named remaining OPEN items | `00-constitution.md` |
| P-05 | Pagination vs reflow mapping even for MVP PDF | O-06 |
| P-08 | Projectors / engines do not write the Book Model | PRD engines + vision AI loop |
| P-09 | Validators as ports; invoke vs incorporate | Vision dropped EXTERNAL |
| P-10 | HTML/CSS typesetting engines must not become the Book Model | Still valid; EPUB-oriented preview increases the risk |
| P-12 | Dual-phase Book Doctor + Preview-then-Validate as user order | `08-prd-review.md` R-C1 |
| P-13 | Writing surface is a semantic editor, not visual rich-text as source | `08-prd-review.md` R-A4 |
| P-14 | MVP AI = optional Wizard outline and/or Doctor explain | `08-prd-review.md` R-A5 |
| P-15 | MVP PDF = flowing pages, page size, margins, header/footer, numbers, cover; no facing-page masters | `08-prd-review.md` R-A3 |
| P-16 | Extra PRD modules (Structure, Type, Cover, Metadata, Wizard) are panels/modes unless architecture says otherwise | `08-prd-review.md` R-A1 |

---

## OPEN (blocking or shaping)

Must be decided or explicitly deferred before implementation in that area. Items marked **blocking for any code** are required before the freeze may lift.

| ID | Question | Blocking for any code? | Notes |
| --- | --- | --- | --- |
| O-01 | **Project licence** (SPDX) | **Yes** | PRD assumes `LICENSING_POLICY.md` |
| O-02 | **Public product name / trademark** | Branding | Collision with existing “OpenBook Studio” uses |
| O-03 | Runtime: desktop-first vs also web; native vs embedded web | **Yes** | PRD: desktop-first; also an a11y framework choice |
| O-04 | Implementation language(s) and UI toolkit | **Yes** | Do not infer from “desktop-first” |
| O-05 | Book Model on-disk format | **Yes** | PRD lists contents, not serialization |
| O-06 | Pagination vs reflow mapping | Before honest dual output | Still missing |
| O-07 | Default AI provider / model-weight licences | Before AI calls | Optional cloud; local path |
| O-08 | **MVP book-type cut** | Before wizard themes | PRD catalogues many types; children’s/textbook “where supported” |
| O-09 | **MVP PDF meaning** | Before PDF engine | “Appropriate initial level” undefined |
| O-10 | How Beginner/Expert combines with assistance levels | Before UI shell | |
| O-11 | Publishing Engine = family of three engines? | `ARCHITECTURE.md` | PRD names EPUB/PDF/HTML engines |
| O-12 | HTML in MVP, plus HTML checker | Before HTML engine | “Where feasible” |
| O-13 | PDF preflight engine (post-MVP vs foundation) | Before strong preflight | Post-MVP in §33; Doctor still mentions PDF issues |
| O-14 | EPUB profile (3.3?) | Before EPUB engine | |
| O-15 | Which Indic language in the first fixture | Before i18n tests | PRD: EN + Indic + mixed-script |
| O-16 | Accessibility standard and level | Before Doctor a11y bar | |
| O-17 | MVP import formats | Before importers | Progressive; MD/HTML/DOCX/EPUB named |
| O-18 | Collaboration / sync / accounts | **Deferred** | PRD post-MVP |
| O-19 | Plugin/script API | **Deferred** | PRD future; G9 must not force MVP ABI |
| O-20 | Font and dictionary licence policy | Before default themes | PRD: font licensing must be respected |
| O-21 | Governance (DCO/CLA, committers, CoC) | Before community push | Next: `CONTRIBUTING.md` |
| O-22 | Maths, citations, audio/video, children’s layout | Treat as out of MVP unless type picker says otherwise | |
| O-23 | Export with Book Doctor Errors | Before export UI | Waive exists; Ready label rules unclear |
| O-24 | Cover | **Product intent closed** | Guided import + type + position (ADR-015) |
| O-25 | Preview pipelines (EPUB vs PDF vs live) | Before preview | See `08-prd-review.md` R-A2 |
| O-26 | Unify FOSS classes (invoke vs incorporate) | Before any USE | |
| O-27 | Studio vs panel map for extra PRD modules | `ARCHITECTURE.md` | R-A1 |
| O-28 | The one MVP AI workflow | Before AI Studio | R-A5 |
| O-29 | Readiness state owner (user vs Doctor) | Before readiness UI | R-A6 |
| O-30 | Requirement IDs (`FR-…`) | Helpful for PRs | R-A10 |

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
