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

### ADR-006 — Studio topology

- **Status:** DECIDED
- **Decision:** Writing Studio, Design Studio, and DTP Studio are the three named editing surfaces. AI Studio, Book Doctor, Preview, and Publishing exist as product areas. EPUBCheck validates EPUB; Preflight validates PDF; web checks attach to HTML; Book Doctor precedes publish-ready.
- **Consequences:** New surfaces must attach to this topology without a second source of truth.

### ADR-007 — Modes and first-class concerns

- **Status:** DECIDED
- **Decision:** Beginner Mode and Expert Mode exist. Accessibility and multilingual support are first-class. FOSS strategy uses USE / ADAPT / INSPIRE / EXTERNAL / AVOID. AI is a studio and is not the source of truth.
- **Consequences:** These are not v2 stickers; they constrain v1 design even if v1 depth is still OPEN.

### ADR-008 — Dependency licence gate

- **Status:** DECIDED
- **Decision:** No dependency without licence verification and FOSS classification recorded in an ADR.
- **Consequences:** No starter templates that drag in a stack “for convenience”.

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
| O-06 | Pagination vs reflow conflict policy | **Yes** for honest DTP+EPUB | Which projection wins; FXL or not |
| O-07 | AI data boundary (local / cloud / BYOK; default on/off) | Before AI Studio code | Also provider ToS |
| O-08 | v1 book types | Before templates/themes | Novel vs textbook vs poetry vs children’s |
| O-09 | DTP quality bar | Before DTP Studio / PDF engine | Word-processor PDF vs Scribus-class |
| O-10 | Beginner/Expert mechanism | Before UI shell | Global toggle vs progressive disclosure vs per-studio |
| O-11 | Publishing destinations beyond files | Before Publishing integrations | Stores, POD, web host |
| O-12 | HTML: product vs preview substrate | Before HTML projector | |
| O-13 | PDF preflight engine and profiles (PDF/X, PDF/UA, …) | Before preflight implementation | Capability named; engine not |
| O-14 | EPUB profile (3.3 reflow default?) and FXL | Before EPUB projector | |
| O-15 | Script coverage for v1 multilingual | Before typography claims | Indic / CJK / RTL |
| O-16 | Accessibility standard and level | Before Book Doctor a11y | WCAG / EPUB Accessibility |
| O-17 | Import formats and fidelity | Before importers | DOCX, ODT, MD, EPUB |
| O-18 | Collaboration / sync / accounts | Explicit deferral OK | Default PROPOSED: out of v1 |
| O-19 | Plugin/script API | Explicit deferral OK | |
| O-20 | Font and dictionary licence policy | Before default themes | |
| O-21 | Governance (DCO/CLA, committers, CoC) | Before community push | Public repo already exists |
| O-22 | Maths, citations, indexes, audiobooks, comics | Explicit deferral OK | Listed as unscoped in PRD |
| O-23 | Whether export of non-publish-ready works is allowed | Before export UI | |
| O-24 | Cover creation in-app vs asset drop | Before Design Studio cover work | |
| O-25 | Placement of Preview and AI Studio in the process diagram | Soft | PROPOSED table in architecture |

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
