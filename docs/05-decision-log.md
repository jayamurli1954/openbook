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

---

## PROPOSED

These are drafted in the constitution documents for Product Owner accept/reject. They are **not** approved by being written down.

| ID | Proposal | Where |
| --- | --- | --- |
| P-01 | Document conflict rule (root Product Owner files beat `docs/` drafts; freeze still binds) | `00-constitution.md` |
| P-02 | Freeze-lift requires named remaining OPEN items | `00-constitution.md` |
| P-03 | ~~Personas~~ | **Superseded** by `PROJECT_VISION.md` §4 |
| P-04 | ~~AI propose/accept~~ | **Superseded** by `PROJECT_VISION.md` §9 and ADR-010 |
| P-05 | Pagination vs reflow as first-class conflict | Still needed; vision chooses EPUB reflowable + PDF fixed but not the mapping |
| P-06 | Publishing v1 = write artefacts to disk only | Pending PRD review |
| P-07 | Design Studio = reflow-surviving intent; DTP = paginated realisation | Pending PRD / architecture |
| P-08 | Projectors do not write the Book Model | Fits vision “deterministic engines publish” |
| P-09 | Validators as ports; invoke vs incorporate | Needed because vision dropped EXTERNAL |
| P-10 | HTML/CSS typesetting engines risk making HTML the real model | Still valid |
| P-11 | Preview = model preview during authoring + artefact preview after generate | Vision review V-A1 |

---

## PROPOSED

These are drafted in the constitution documents for Product Owner accept/reject. They are **not** approved by being written down.

| ID | Proposal | Where |
| --- | --- | --- |
| P-01 | Document conflict rule (constitution > architecture > PRD > vision) | `00-constitution.md` |
| P-02 | Freeze-lift requires named remaining OPEN items | `00-constitution.md` |
| P-03 | Personas and primary v1 user ranking | `01-vision.md` |
| P-04 | AI propose/accept + provenance | `01-vision.md`, `03-architecture.md` |
| P-05 | Pagination vs reflow as first-class conflict, not exporter magic | `01-vision.md`, `03-architecture.md` |
| P-06 | Publishing v1 = write artefacts to disk only | `02-product-requirements.md` |
| P-07 | Design Studio = reflow-surviving intent; DTP = paginated realisation | `02-product-requirements.md` |
| P-08 | Projectors do not write the Book Model | `03-architecture.md` |
| P-09 | Validators as ports; EPUBCheck EXTERNAL-by-default | `04-foss-strategy.md` |
| P-10 | HTML/CSS typesetting engines risk making HTML the real model | `04-foss-strategy.md` |

---

## OPEN (blocking or shaping)

Must be decided or explicitly deferred before implementation in that area. Items marked **blocking for any code** are required before the freeze may lift.

| ID | Question | Blocking for any code? | Notes |
| --- | --- | --- | --- |
| O-01 | **Project licence** (SPDX) | **Yes** | No USE/ADAPT without this |
| O-02 | **Public product name / trademark** | **Yes** for public branding; not for private docs | Collision with existing “OpenBook Studio” uses |
| O-03 | Runtime: desktop-only vs desktop+web; native vs embedded web | **Yes** | README says “desktop”; not a stack |
| O-04 | Implementation language(s) and UI toolkit | **Yes** | Follows O-03 and a11y/script needs |
| O-05 | Book Model on-disk format | **Yes** | Conceptual schema ≠ file format |
| O-06 | Pagination vs reflow mapping | **Yes** for honest DTP+EPUB | Vision: EPUB reflowable, PDF fixed-layout; degradation rules still missing |
| O-07 | AI data boundary (default local vs cloud; model-weight licences) | Before AI Studio code | Local first-class + Ollama intended; default and ToS still OPEN |
| O-08 | v1 book types | Before templates/themes | Vision requires a type picker; list not in vision |
| O-09 | v1 DTP subset | Before DTP Studio / PDF engine | Not InDesign on day one; §6–7 list is still full-professional |
| O-10 | How Beginner/Expert combines with I'll-do-it / Guide-me / Do-it-for-me | Before UI shell | Three axes in the vision |
| O-11 | Publishing Engine definition + destinations | Before Publishing | New component, undefined |
| O-12 | HTML checker + preview vs site | Before HTML projector | Diagram has no HTML validator |
| O-13 | PDF preflight engine and profiles (PDF/X, PDF/UA, …) | Before preflight implementation | Also: live Book Doctor vs post-PDF preflight |
| O-14 | EPUB profile (3.3?) | Before EPUB projector | Vision: reflowable; FXL not in vision |
| O-15 | v1 script cut and test corpus | Before typography claims | Kannada/Hindi/Indic **early**; RTL long-term |
| O-16 | Accessibility standard and level | Before Book Doctor a11y | WCAG / EPUB Accessibility |
| O-17 | Import formats and fidelity | Before importers | DOCX, ODT, MD, EPUB |
| O-18 | Collaboration / sync / accounts | Explicit deferral OK | Vision §18: future, not MVP |
| O-19 | Plugin/script API in v1 vs later | Explicit deferral OK | Principle 10 vs §18 marketplace-later |
| O-20 | Font and dictionary licence policy | Before default themes | |
| O-21 | Governance (DCO/CLA, committers, CoC) | Before community push | Vision defers to contribution terms + LICENSING_POLICY |
| O-22 | Maths, citations, indexes, audiobooks, comics | Explicit deferral OK | Confirm against PRD |
| O-23 | Whether export of non-publish-ready works is allowed | Before export UI | |
| O-24 | Cover creation in-app vs asset drop | Before Design Studio cover work | |
| O-25 | Preview: model preview vs artefact preview | **Yes** for UX/engine | Journey vs diagram contradiction (vision review V-A1) |
| O-26 | Unify FOSS classes (4 vs 5 / invoke vs incorporate) | Before any USE | Vision dropped EXTERNAL |

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
