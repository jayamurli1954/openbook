# 07 — Review of PROJECT_VISION.md

**Date:** 2026-09-03  
**Reviewer:** Cursor Cloud Agent (engineering executor)  
**Reviewed document:** [`PROJECT_VISION.md`](../PROJECT_VISION.md) (Foundation Draft v1.0, on `main` as of `326b18f`)  
**Implementation:** none. Freeze remains in force.

This review does not rewrite the vision. It identifies what the Product Owner has now decided, where the vision is internally tense, and which engineering decisions remain OPEN.

---

## 1. Verdict

The official vision is a strong product constitution. It is specific enough to stop OpenBook becoming a conventional EPUB editor, and it answers several OPEN items from [`06-engineering-review.md`](06-engineering-review.md).

It is **not** yet an architecture specification. Pipeline order, the meaning of “Publishing Engine”, the Book Doctor / Preflight split, v1 cuts, and the project licence are still missing or contradictory.

**Canonical vision is `PROJECT_VISION.md`.** Agent draft `docs/01-vision.md` is a pointer only.

`PRODUCT_REQUIREMENTS.md` is also on `main`. Reviewed in [`08-prd-review.md`](08-prd-review.md).

---

## 2. What this document decides (binding intent)

These are Product Owner statements. They supersede conflicting **PROPOSED** text in the agent drafts.

| Topic | Decision in the vision |
| --- | --- |
| Mission | Desktop + digital publishing studio; beginner → professional; single source of truth |
| Differentiator | Not missing software — **decision overload**. Guided next action. |
| Identity | Complete book-production environment. **EPUB is an output, not the internal representation.** |
| Topology | Book Model at the centre. Writing, Design, DTP, AI, Book Doctor/Preflight as sibling studios. Then **Publishing Engine**. Then EPUB / PDF / HTML. Then EPUBCheck and PDF Preflight. Then Preview. Then Publish. |
| Users | First-time authors, independents, professionals, educators, multilingual (Kannada, Hindi, Indic, Latin, RTL), designers, FOSS contributors |
| Beginner UX | 14-step guided journey; Beginner + Expert modes; **I'll do it myself / Guide me / Do it for me**; “I'm Stuck”; “Explain this”; visible progress; next-best-action |
| Professional UX | Long DTP/typography/metadata list; progressive disclosure |
| DTP | First-class; learn from FOSS DTP; **do not clone** an existing DTP app; not a full InDesign replacement on day one |
| Outputs | One Book Model, multiple outputs. EPUB: standards-compliant **reflowable**. PDF: professional **fixed-layout**. HTML: web representation that preserves semantics |
| AI | **AI suggests. The Book Model decides. Deterministic engines publish. Validators verify.** Review/approve structural and formatting proposals. Assistant, tutor, production advisor |
| Local AI | First-class where practical. **Ollama named** as local provider. Optional cloud. Provider adapters. Not vendor-locked |
| Accessibility | From the beginning; Book Doctor explains fixes; not an end-stage screen |
| i18n | Unicode-first. Indic scripts **tested early**, not bolted on after architecture freeze |
| FOSS | Study widely; borrow ideas; reuse code only when licence permits; build OpenBook’s experience ourselves. Classes: **USE / ADAPT / INSPIRE / AVOID** |
| Stewardship | SanMitra Tech Solutions stewards brand, identity, original code, roadmap, official releases. Community IP under contribution terms. Third-party FOSS keeps its licences. Authors own their manuscripts |
| Non-goals (initial) | General office suite, general graphic/image/video editor, day-one InDesign clone, generic chatbot, proprietary marketplace, closed AI, FOSS-app launcher |
| Ecosystem (long-term) | “FOSS Publishing Operating System for books”; plugins, themes, adapters. Collab, cloud, marketplaces are **future, not MVP commitments** |
| Next docs | `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, `CONTRIBUTING.md` |

---

## 3. Ambiguities

### V-A1. Pipeline order (highest severity)

The **beginner journey** (§5) is:

Book Doctor → **Preview** → Generate EPUB/PDF/HTML → **Validate** → publishing checklist.

The **topology diagram** (§3) is:

Studios (including Book Doctor) → Publishing Engine → Generate → **Validate** → **Preview** → Publish.

If Preview sits after validation, beginners cannot look at a book until it has been generated and checked. That fights “never leave the user wondering what to do next.”

**Need a decision:** Preview of the *model* (always) vs preview of *generated artefacts* (after the engine). Both may exist; they must not share one box.

### V-A2. Book Doctor vs Preflight vs PDF Preflight

The diagram has:

- a studio named **Book Doctor / Preflight**;
- a later node **PDF Preflight** under PDF.

Unclear whether preflight is a live authoring advisor, a post-PDF validator, or both. EPUBCheck is only post-EPUB. Book Doctor’s job relative to validators is unspecified (aggregate? duplicate? replace?).

### V-A3. Publishing Engine

New component, not defined. It might be:

- the set of deterministic projectors (EPUB/PDF/HTML);
- an orchestrator that also runs validators;
- a user-facing “Publish” studio.

Until this is specified, executors will invent a stack here.

### V-A4. HTML has no checker in the diagram

EPUB → EPUBCheck. PDF → PDF Preflight. HTML → (nothing) → Preview.

§8 still wants semantic HTML. §11 wants accessibility checks. Either HTML validation is inside Book Doctor, inside Preview, or omitted. That needs a sentence.

### V-A5. “Do it for me” vs AI guardrails

§5 allows **Do it for me** (safe automation with user approval).  
§9 forbids silent irreversible publishing changes and requires review of structural/formatting AI proposals.

Unclear: may “Do it for me” apply a theme, metadata, or alt-text in one click? Is approval per-action or per-session? Are non-AI automations (generate TOC, pack EPUB) in the same bucket as AI rewrites?

### V-A6. Expert Mode vs three assistance levels vs progressive disclosure

Three axes:

- Beginner Mode / Expert Mode
- I'll do it myself / Guide me / Do it for me
- Progressive complexity of professional controls

A professional in Guide-me, or a beginner who toggles Expert, is unspecified.

### V-A7. Ollama

§10 names Ollama as the local AI foundation. That is product intent, not a licence-cleared dependency.

Ollama the *product* and the *model weights users pull* have different licences. Naming it must not be read as “add the Ollama Go module to the app tomorrow.” Provider abstraction is the architectural decision; Ollama is the first intended adapter.

### V-A8. Plugins as principle vs MVP

Principle 10 and user 4.7 want an open ecosystem. §18 says plugin marketplace is long-term, not MVP. Unclear whether v1 must have a plugin ABI, a theme folder, or only a documented future.

### V-A9. Cover creation

Journey: “Add a cover.” Non-goals: not a general-purpose graphic design platform. Cover = import asset, template-based generator, or in-app designer?

### V-A10. Book types

Journey step 3: “Select the intended type of book.” Types are catalogued in `PRODUCT_REQUIREMENTS.md` §7; the MVP cut is still OPEN.

### V-A11. Community Edition

§14 proposes a future Community Edition of themes/templates/rules. Unclear whether that is a second distribution, a content repo, or a folder in the app.

### V-A12. “No major implementation should be considered final”

§20 is weaker than the standing freeze (“do not begin application implementation”). An executor could start scaffolding and call it non-final. **The freeze in `AGENTS.md` remains stricter and still binds.**

---

## 4. Contradictions and tensions

### V-C1. Guided preview-before-generate vs diagram preview-after-validate

See V-A1. This is a product contradiction, not wording. It will drive UI and engine design.

### V-C2. FOSS classification tables

| Source | Classes |
| --- | --- |
| Original Product Owner note + `docs/04-foss-strategy.md` | USE, ADAPT, INSPIRE, **EXTERNAL**, AVOID |
| `PROJECT_VISION.md` §13 | USE, ADAPT, INSPIRE, AVOID |

Vision’s USE (“use an external tool or service where appropriate”) absorbs EXTERNAL. That is workable, but then EPUBCheck/Ollama/CLI tools need a sub-rule: **invoke vs incorporate**. Without that, “USE Ollama” and “USE a layout library” look the same and are not.

### V-C3. Day-one DTP ambition vs “not InDesign on day one”

§6–7 list text frames, master pages, H&J, bleed, grids — InDesign-class vocabulary — while §16 forbids a complete InDesign replacement on day one. Both can be true if there is a **v1 DTP subset**. The vision does not name that subset.

### V-C4. Reflowable EPUB vs professional DTP on one model

§8 decides EPUB is reflowable and PDF is fixed-layout. That is a direction, not a conflict policy. Page breaks, masters, wrap, and facing pages still have to degrade into reflow. The vision does not say what is dropped, warned, or approximated.

### V-C5. Deterministic publishing vs AI rewriting

AI may assist with writing, rewriting, editing, layout suggestions, and accessibility checks. Deterministic engines remain authoritative for *publishing correctness*. Content edits are not “publishing correctness.” Provenance (human vs AI-accepted) is implied by review/approve, not specified as a Book Model field.

### V-C6. Brand claim vs uncleared name

§15 places “OpenBook brand/trademark” under SanMitra IP. Public name collision with other “OpenBook Studio” organisations is still unaddressed. This is a legal/identity task for `LICENSING_POLICY.md` / trademark policy, not an engineering choice.

### V-C7. Local-first “where practical”

Principle 7 plus optional cloud can become “cloud by default if local is hard.” Default-off cloud, default-local, or user choice at first run is still OPEN.

---

## 5. Missing decisions (still OPEN after this vision)

Still blocking any application code:

| ID | Still missing |
| --- | --- |
| O-01 | Project licence (`LICENSING_POLICY.md` is named, not written) |
| O-03 / O-04 | Runtime / language / UI toolkit |
| O-05 | Book Model on-disk format |
| Freeze-lift | §20 does not lift `ADR-003` |

Shaped by the vision but not closed:

| ID | Vision movement | Still need |
| --- | --- | --- |
| O-06 | EPUB reflowable, PDF fixed | Mapping/degradation rules |
| O-07 | Local first-class, Ollama intended, cloud optional | Default, data leaving device, model-weight licences |
| O-08 | “Type of book” exists | The type list and v1 cut |
| O-09 | Not InDesign on day one; DTP first-class | v1 DTP subset |
| O-10 | Beginner/Expert + 3 assistance levels | How the axes combine |
| O-11 | Publish exists | Files vs stores; engine definition |
| O-12 | HTML is a product output | Checker placement; preview vs site |
| O-13 | PDF Preflight named | Engine/profile |
| O-15 | Kannada, Hindi, Indic early; RTL long-term | v1 script cut and test corpus |
| O-16 | A11y from the start | WCAG / EPUB Accessibility target |
| O-19 | Ecosystem/plugins as principle | v1 ABI or deferral ADR |
| O-20 | Fonts mentioned operationally | Font licence policy |
| O-21 | Contribution terms promised | CLA/DCO, governance |
| O-02 | Brand asserted | Trademark search/posture |

---

## 6. Alignment with the chat topology

The diagram in `PROJECT_VISION.md` §3 matches the Product Owner diagram sent in chat. Treat that topology as **vision-level DECIDED**.

Do **not** treat `docs/03-architecture.md` (older UX-vs-model split, Book Doctor after validators, HTML web checks) as current. It is superseded at the topology layer pending a Product Owner `ARCHITECTURE.md`.

---

## 7. What this agent will not do from this vision

- Will not start application implementation (§20 + freeze).
- Will not add Ollama, EPUBCheck, or any other dependency.
- Will not invent a Publishing Engine design.
- Will not pick a project licence.
- Will not rewrite `ARCHITECTURE.md` as if pipeline order were settled.

---

## 8. Recommended Product Owner responses

Short answers would close the dangerous gaps:

1. **Preview:** model-preview during writing, artefact-preview after generate — confirm or correct.
2. **Book Doctor vs PDF Preflight:** live quality advisor vs post-output validator — one sentence each.
3. **Publishing Engine:** orchestrator of deterministic projectors, yes/no.
4. **FOSS classes:** keep four, and add “invoke vs incorporate” under USE; or restore EXTERNAL.
5. **v1 DTP subset** and **v1 book types**.
6. Confirm the implementation freeze until `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, and `LICENSING_POLICY.md` exist — not only “implementation not final.”

After that, the next review was `PRODUCT_REQUIREMENTS.md` — see [`08-prd-review.md`](08-prd-review.md). The next foundation document to write (not code) is `ARCHITECTURE.md`, after the short Product Owner answers in that review.
