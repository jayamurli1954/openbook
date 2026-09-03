# 00 — Constitution

**Status of this document:** DECIDED in intent (standing orders given by the Product Owner). Supporting procedures below are DECIDED unless marked PROPOSED.

## 1. Purpose

This constitution keeps OpenBook Studio under product control while AI and human engineers execute.

It exists to prevent four failure modes:

1. Premature technology choices.
2. Building a conventional EPUB editor that later cannot evolve into a DTP + EPUB + PDF studio.
3. Accumulating libraries whose licences cannot legally coexist.
4. Silent architectural decisions made in code instead of in the decision log.

## 2. Working relationship

```text
                 ┌──────────────────────────┐
                 │        YOU               │
                 │ Product Owner / Vision   │
                 └────────────┬─────────────┘
                              │
                              ▼
                 ┌──────────────────────────┐
                 │     Cursor Cloud Agent   │
                 │ AI Development / Coding  │
                 └────────────┬─────────────┘
                              │
                              ▼
                 ┌──────────────────────────┐
                 │ GitHub: jayamurli1954/   │
                 │         openbook         │
                 │ Source of Truth          │
                 └──────────────────────────┘
```

| Role | Owns | Does not own |
| --- | --- | --- |
| Product Owner | Vision, requirements, architecture, FOSS policy, naming, licence of *this* project, when implementation may start | Day-to-day mechanical edits once a brief is approved |
| Engineering executor (Cursor Cloud Agent or human) | Execution of an approved brief, tests, documentation of findings, licence checks, proposed decision records | Product architecture, dependency adoption, unlogged design choices |
| GitHub `jayamurli1954/openbook` | Canonical files, history, reviews | Informal chat that never landed in the repo |

Chat, notes, and agent transcripts are not the source of truth. If it is not in this repository, it is not decided.

## 3. Standing orders

These orders apply to every agent turn and every contributor PR until amended here.

1. **Do not begin application implementation yet.** No application source tree, runtime scaffold, UI kit, or package manifest that selects a stack. Constitution, requirements, architecture, FOSS strategy, and decision-log work are allowed.
2. **Read the Product Owner vision, product requirements, and architecture first.** Reading order is in [`AGENTS.md`](../AGENTS.md). Canonical files: `PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`.
3. **Identify ambiguities, contradictions, and missing decisions.** Record them in the numbered reviews under `docs/` (`07`–`09` and successors). Do not resolve them silently.
4. **Do not make architectural decisions without documenting them.** A decision is not made because code compiled. It is made when an entry in [`05-decision-log.md`](05-decision-log.md) is marked **DECIDED** by the Product Owner (or the Product Owner explicitly accepts a proposed ADR in a PR review).
5. **Do not introduce dependencies without checking their licences.** Classify every candidate per the FOSS strategy. Naming Tauri, Tiptap, Ollama, or EPUBCheck in `ARCHITECTURE.md` is a recommendation, not permission to add it to the tree.

## 4. Implementation freeze

**DECIDED.** Application implementation is frozen.

The freeze covers:

- Application source (`src/`, `app/`, `lib/` or equivalent).
- Runtime or UI framework selection (Electron, Tauri, Qt, web app, etc.).
- Language/toolchain selection as a project default.
- Package manifests that pin a stack (`package.json`, `Cargo.toml`, `pyproject.toml`, etc.), except later and only when an ADR authorizes a scaffold.
- Assets that imply a product UI beyond documentary diagrams.

The freeze does **not** cover:

- Product Owner foundation files at repo root (`PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, and later named foundation docs).
- This `docs/` tree, `AGENTS.md`, and the root README.
- Decision records, reviews, and FOSS research.
- Licence *research* (not adoption).

**To lift the freeze:** the Product Owner adds or accepts an ADR in the decision log that states what may be implemented, the bounds of that work, and which OPEN decisions remain out of scope.

## 5. Architectural invariants

These are DECIDED and may not be violated by future implementation:

1. **Single Book Model.** One canonical work. Not three documents (an EPUB, a PDF, and an HTML site) that are edited separately and hoped to stay in sync.
2. **Studios are views, not products.** Writing Studio, Design Studio, and DTP Studio edit the same Book Model. They differ in controls, constraints, and visual language — not in the identity of the book.
3. **Formats are projections.** EPUB, PDF, and HTML are generated from the Book Model. They are not the Book Model.
4. **Quality is a gate, not an export option.** EPUBCheck, PDF preflight, and Book Doctor stand between the model and “publish ready”.
5. **Not a conventional EPUB editor.** OpenBook must not be designed as “a nicer Sigil”. EPUB internals may be inspectable in Expert Mode, but the product is a book studio with digital and print projections.
6. **Beginner → professional is one product.** Beginner Mode and Expert Mode are layers over the same model, not two applications.
7. **AI is a studio, not an author.** The Book Model remains human-owned. **AI suggests. The Book Model decides. Deterministic engines publish. Validators verify.**
8. **FOSS with a classified commons.** Third-party capability enters only through the classified strategy. `PROJECT_VISION.md` names USE / ADAPT / INSPIRE / AVOID. The agent FOSS draft also uses EXTERNAL (invoke without incorporating). Until the Product Owner unifies the tables, treat EXTERNAL as a sub-mode of USE for tools that remain outside the tree. The project must remain a coherent FOSS work, not an accidental aggregation of incompatible projects.

## 6. Document control

### 6.1 Labels

Use **DECIDED**, **PROPOSED**, and **OPEN** on every material statement that could drive implementation.

Unlabelled prose in these documents is explanatory, not a decision.

### 6.2 Changing the constitution

**PROPOSED** procedure:

1. Edit the relevant document on a branch.
2. If the change is architectural, add or update an ADR in [`05-decision-log.md`](05-decision-log.md).
3. Call out status changes (OPEN → PROPOSED → DECIDED) in the PR body.
4. Product Owner review is required for DECIDED changes.

### 6.3 Conflict rule

If two documents disagree:

1. **DECIDED** beats **PROPOSED** beats **OPEN**.
2. Product Owner root files (`PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, `ARCHITECTURE.md`, and later `FOSS_STRATEGY.md` / `LICENSING_POLICY.md`) beat agent drafts under `docs/`.
3. Among remaining constitution files, [`00-constitution.md`](00-constitution.md) (standing orders and freeze) still binds executors even when vision §20 uses weaker “not final” language.
4. Record the conflict in a review document instead of picking a winner in code.

## 7. What “done” means before coding

Implementation must not start until at least the following OPEN items are either DECIDED or explicitly deferred by ADR:

- Project licence (blocks every USE/ADAPT classification).
- Product name / trademark risk (see vision and engineering review).
- Runtime shape (desktop-only vs desktop+web, and what “desktop” means).
- Book Model persistence format (conceptual schema may be refined; on-disk format must be chosen before code).
- Pagination vs reflow conflict policy (the DTP/EPUB tension).
- AI execution and data-boundary policy.
- v1 book-type scope.

The full OPEN list lives in [`05-decision-log.md`](05-decision-log.md) and [`06-engineering-review.md`](06-engineering-review.md).
