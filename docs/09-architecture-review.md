# 09 — Review of ARCHITECTURE.md

**Date:** 2026-09-03  
**Reviewer:** Cursor Cloud Agent (engineering executor)  
**Reviewed document:** [`ARCHITECTURE.md`](../ARCHITECTURE.md) (Foundation Draft v1.0, `eff0ac9`)  
**Read against:** `PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`, prior reviews  
**Implementation:** none. Freeze remains in force. `FOSS_STRATEGY.md` is the next Product Owner foundation document.

This review does not rewrite the architecture. It records what is now frozen, what is only a recommended baseline, and what still blocks a freeze-lift.

---

## 1. Verdict

`ARCHITECTURE.md` is a real technical constitution. The Product Owner has now **frozen** the only architectural decision that must never be “fixed later”:

```text
BOOK MODEL  →  EPUB / PDF / HTML  →  EPUBCheck / Preflight / QA  →  PUBLICATION READY
```

with AI **beside** that chain, not above it:

```text
AI → Suggest / Explain → User/Command → Book Model → Deterministic Engine → Validator
```

That is the protection against this agent, or any later agent, turning OpenBook into an AI-written pile of EPUB files.

The document also gives Cursor explicit implementation rules (§51) and a phased sequence (§52). Those rules bind **when** implementation is authorized. They do **not** authorize it now. PRD §39 still requires `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, and `CONTRIBUTING.md`. Architecture §1 still says this file exists *before* major application implementation.

**Canonical architecture is `ARCHITECTURE.md`.** Agent draft `docs/03-architecture.md` is superseded.

---

## 2. What is now frozen (binding)

These are Product Owner architecture decisions. Do not “simplify” them in a scaffold.

| ID | Frozen decision |
| --- | --- |
| A1 | Book Model is the only canonical source of truth (§54). Editor, EPUB, PDF, HTML, preview, and AI must not compete with it. |
| A2 | Presentation and Application Core sit *around* the model; they do not own it (§3). |
| A3 | EPUB, PDF, and HTML are **separate engines** sharing the model (§57). HTML must not be produced by exporting EPUB (§20). |
| A4 | Validators are independent of AI. Levels: domain → structure → output → accessibility → preflight (§21). |
| A5 | Book Doctor is a **rule framework**, not a prompt. AI may explain a finding; the finding should come from rules or validated tools (§22). |
| A6 | AI safety chain is mandatory (§24, §55). AI must not write EPUB packages, bypass validation, or silently mutate the project database. AI content is untrusted until accepted. |
| A7 | Core product is **local-first** (§56). No cloud required for author, publish, or (where supported) validate. |
| A8 | Beginner and Expert share the same domain and services; only presentation differs (§58). |
| A9 | Extension points early; **no plugin marketplace/runtime in MVP** (§31, §59). |
| A10 | Dependencies flow toward the domain. Book Model must not depend on UI, SQLite, Ollama, EPUB, or a PDF renderer (§12). |
| A11 | Semantic content over visual coordinates (§8.1). DTP may hold a generated page model; that page model is not the manuscript (§17). |
| A12 | Generated outputs and preview files must be distinguishable from source; they must not become the source of truth (§10). |
| A13 | External FOSS tools, if used, go through an **adapter / process boundary**; process separation is not a licence waiver (§38–39). |
| A14 | Fonts are a special asset; do not redistribute a font merely because it is on the user’s machine (§27). |
| A15 | Schema is versioned from day one; migrations required (§8.4, §43). |
| A16 | Commands/services are the mutation path (`CreateBook`, `GenerateEPUB`, …) (§13). |
| A17 | Cursor rules in §51. Tests with domain work. Small reviewable changes. No silent scope. No unlicensed copies. |

The user’s simplified frozen diagram and §60 are the same contract. Preview in §3 is a **derived view**, not a fourth original.

---

## 3. Recommended technology baseline (not yet adopted)

§4 **recommends**:

- Tauri desktop shell
- React + TypeScript UI
- Tiptap / ProseMirror (or equivalent) semantic editor
- SQLite + portable `*.openbook/` folder
- TypeScript domain layer; Rust only where profiling shows need
- Ollama as one AI adapter
- EPUBCheck (or equivalent) for EPUB
- GitHub Actions for CI, including **dependency/licence checks**

These close O-03 / O-04 / O-05 as **intent**. They are explicitly **not immutable**. Substitution is allowed if A1–A17 survive.

They are **not** permission to add packages. Licence classification still waits on `FOSS_STRATEGY.md` and `LICENSING_POLICY.md`. Before any `npm create tauri-app`:

- re-verify licences (especially **Tiptap**: open core vs commercial Pro);
- classify each as USE / ADAPT / INSPIRE / AVOID, and whether EPUBCheck/Ollama are **invoked** or **incorporated**;
- record an ADR in `docs/adr/` (architecture §50) **and** this decision log, with a numbering plan so they do not collide.

---

## 4. How this answers earlier reviews

| Earlier issue | Architecture effect |
| --- | --- |
| V-A1 / R-C1 Preview vs validate | **Mostly closed.** Preview consumes engine output (§29). E2E journey is Generate → **Validate** → Preview (§35). Domain validation still runs before publish (§8.5, §21). User-visible PRD order (Preview then Validate) is the remaining product-copy mismatch — see A-C1. |
| V-A2 Book Doctor vs Preflight | **Closed as architecture.** Doctor is rule UX over domain + output validators. Preflight is level 5. |
| V-A3 Publishing Engine | **Closed.** Three engines, not one monolith. |
| V-A4 HTML checker | **Named as a port** (HTML QA). Engine still unspecified. |
| R-A1 Extra studios | **Presentation modules** over shared services; not a second model. Still need a UI map (wizard/structure/cover/metadata as panels). |
| R-A4 Rich text vs semantic | **Closed as intent.** Semantic editor; Tiptap/ProseMirror or equivalent. |
| R-A7 Auto-fix | Doctor rules may mark safe auto-fix; still via commands, not AI writes. |
| O-11 | Closed: three engines. |
| O-18 / O-19 | Cloud/plugins deferred; interfaces first. |
| O-15 fixtures | Kannada/Indic, mixed-language, RTL books in test set (§35). |
| Invoke vs incorporate | §39 is the EXTERNAL idea without using that word. |

---

## 5. Ambiguities

### A-A1. Exact Book Model schema is still “defined separately”

§9 is conceptual. Persistence is SQLite + folder, “exact packaging may change.” Freeze-lift for Phase B still needs a schema spec (types, node IDs, style references). Architecture correctly refuses to pretend JSON-in-the-markdown is the schema.

### A-A2. PDF layout engine / renderer unnamed

Pipeline is decided; implementation is not (Prince, WeasyPrint, Paged.js, custom, print a webview, …). That is the highest-risk licence and quality choice. It belongs in `FOSS_STRATEGY.md`, then an ADR, not in a first scaffold.

### A-A3. HTML QA and PDF Preflight unnamed

EPUBCheck is named. The other two validators are ports. Do not pick veraPDF / Ace / a browser audit in Phase A.

### A-A4. Preview: one renderer or two

§29 specifies EPUB-like preview **and** PDF/page preview. MVP PRD asked for EPUB-oriented preview plus PDF previewable before export. Architecture allows both. Roadmap must say which ships in which phase (sequence puts preview in Phase H, after engines).

### A-A5. UI map for PRD modules

Writing / Design / DTP appear in §3. Wizard, Structure Studio, Typography Assistant, Cover, Metadata, Publication Readiness do not. They fit as presentation over commands — but an agent will otherwise invent a twelfth studio.

### A-A6. “Publishing Engines ↓ Book Model” in §12

Intended meaning: engines **depend on** the model. Easy to misread as engines **write** the model. Spell this as *engines consume the model and write only to exports/previews* in `docs/adr/` when implementation starts.

### A-A7. Phase sequence vs PRD MVP

Engineering order A→I is sound (model before editor before engines before AI). PRD MVP is a **complete guided journey** (wizard, themes, cover, Doctor, preview, one AI workflow). Phase D without Phase E/F/H is not the MVP. `ROADMAP.md` must map phases to the PRD MVP, or an agent will ship a developer demo and call it done.

### A-A8. Tiptap vs ProseMirror

“Or equivalent” is correct. Tiptap’s open-source surface vs paid extensions is a FOSS trap. Prefer classifying **ProseMirror (MIT)** as the contract, Tiptap as optional UI, in the FOSS strategy.

### A-A9. ADR numbering collision

Architecture §50 starts `docs/adr/ADR-001` at desktop framework. This repo’s `docs/05-decision-log.md` already has ADR-001 = source of truth. Unify before the first `docs/adr/` file (e.g. keep the log as index, or namespace `ARCH-001`).

---

## 6. Contradictions and tensions

### A-C1. Preview-then-validate (PRD copy) vs validate-then-preview (architecture tests)

```text
PRD §34:     Doctor → Preview → Validate → Publish
ARCH §35:    Generate EPUB → Validate → Preview
ARCH §3:     Engines → Validators → Preview
User freeze: Engines → Validators → Publication Ready
```

This is now close enough to implement **if** product copy treats Preview as “see the generated book” after a generate+validate pass, and Book Doctor covers both pre-generation domain issues and post-generation validator issues. Confirm once in `ROADMAP.md` / UX copy. Do not build a second live CSS editor as “preview.”

### A-C2. Recommended stack vs licence freeze

§4 says the first desktop implementation “should use” Tauri/React/…. §38 says third-party selection follows licensing policy, which does not exist yet. **Stack recommendation does not override the licence gate.**

### A-C3. Quality gates in §53 are not all green

Still open: exact independent schema; FOSS licensing **process** (`LICENSING_POLICY.md`); several validator engines. Architecture is stable enough to *write* FOSS strategy and licensing; it is not “implementation-ready” on its own checklist.

### A-C4. Git/GitHub for *application* collaboration vs local-first books

§4 names GitHub for **source control of OpenBook**. User books are SQLite projects, not git repos. Keep that distinction. Do not silently git-init every `.openbook` folder.

---

## 7. Cursor implementation rules — adopted as standing orders

§51 is Product Owner instruction to this agent. It is copied into `AGENTS.md` by reference. Summary:

1. Read vision, PRD, architecture first.  
2. Preserve the Book Model. EPUB is not the source of truth. AI is not the publishing engine.  
3. Do not invent major product scope.  
4. Do not introduce unnecessary dependencies; no unlicensed copies.  
5. Add tests with domain functionality.  
6. Protect user content (no manuscript in logs).  
7. Document significant deviations.  
8. Small, reviewable changes.  
9. UI-only is not done.

**Still required before those rules are used for application code:** Product Owner freeze-lift after FOSS strategy + licensing (and, per PRD, roadmap + contributing), or an explicit ADR that Phase A (repo/tooling only) may start.

---

## 8. What this agent will not do now

- Will not scaffold Tauri/React/SQLite.
- Will not add Tiptap, Ollama, EPUBCheck, or a PDF library.
- Will not invent the Book Model JSON/SQL schema beyond what §9 already states.
- Will not write `FOSS_STRATEGY.md` unless asked; the Product Owner named it as the next upload. Agent draft `docs/04-foss-strategy.md` remains a research note, not canonical.
- Will not treat §52 Phase A as authorized work.

---

## 9. Recommended next step

Product Owner: publish **`FOSS_STRATEGY.md`** (USE / ADAPT / INSPIRE / AVOID, invoke vs incorporate, Sigil, Scribus, Calibre, EPUBCheck, Pandoc, Tauri, ProseMirror/Tiptap, PDF engines).

After that: `LICENSING_POLICY.md`, then a freeze-lift ADR that names **Phase A only** (monorepo, Tauri shell, tests, licence CI) if the stack survives the FOSS pass.

Short confirmations still useful:

1. Preview in the product is generated-output preview (architecture), and Book Doctor is the place beginners see problems before they “feel done.”  
2. Wizard / Structure / Cover / Metadata are presentation panels, not additional sources of truth.  
3. ADR numbering: extend `docs/05-decision-log.md` vs new `docs/adr/` series.
