# 08 — Review of PRODUCT_REQUIREMENTS.md

**Date:** 2026-09-03  
**Reviewer:** Cursor Cloud Agent (engineering executor)  
**Reviewed document:** [`PRODUCT_REQUIREMENTS.md`](../PRODUCT_REQUIREMENTS.md) (Foundation Draft v1.0, `d8b0642`)  
**Read against:** [`PROJECT_VISION.md`](../PROJECT_VISION.md), [`07-vision-review.md`](07-vision-review.md), constitution and decision log  
**Implementation:** none. Freeze remains in force.

This review does not rewrite the PRD. It records what the PRD decides, where it conflicts with the vision, and which decisions `ARCHITECTURE.md` still owes.

---

## 1. Verdict

`PRODUCT_REQUIREMENTS.md` is a genuine product baseline, not a feature wish-list. It does the important things a PRD must do:

- keeps the **Book Model** as the only source of truth;
- splits **MVP** from **post-MVP**;
- makes **AI optional** for core writing, generation, and validation;
- puts **Book Doctor** and **publication readiness** in front of “ready”;
- forbids inventing major behaviour that conflicts with this spec (§38);
- **does not lift the implementation freeze** — §39 still requires `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, and `CONTRIBUTING.md` first.

It is still not an architecture document. Several vision tensions are improved; a few are sharper. The MVP is a **complete guided product**, not a thin vertical slice. That is a product choice, but it is a large first engineering surface.

**Follow-up:** Canonical architecture is now [`ARCHITECTURE.md`](../ARCHITECTURE.md); review in [`09-architecture-review.md`](09-architecture-review.md).

**Canonical PRD is `PRODUCT_REQUIREMENTS.md`.** Agent draft `docs/02-product-requirements.md` remains non-canonical.

---

## 2. What the PRD decides (binding product intent)

| ID | Decision |
| --- | --- |
| R1 | Desktop-**first** book-production environment (narrower than “desktop and digital” in the README). |
| R2 | Book Model stores metadata, structure, assets, design, and publishing configuration. Outputs originate from it. |
| R3 | Book Wizard is the first-run path (title, type, language, optional idea, optional AI outline, beginner/expert, workspace). |
| R4 | Beginner / Expert modes **and** I'll-do-it / Guide-me / Do-it-for-me. Do-it-for-me is reviewable; no silent destructive changes. |
| R5 | Named product surfaces beyond the vision’s five studios: **Book Structure Studio**, **Typography Assistant**, **Cover Studio**, **Metadata Studio**, plus Wizard and Publication Readiness. |
| R6 | Writing Studio: semantic structure over arbitrary visual formatting. MVP vs advanced capability lists exist. |
| R7 | DTP is first-class for PDF/print, but **MVP is a layout foundation**, not the full §12 list. |
| R8 | Cover workflow is guided: direction, import/choose image, type, position, preview, export. Not a general graphic app. Future AI cover/image gen. |
| R9 | TOC/navigation is derived from the Book Model (EPUB nav, PDF bookmarks, HTML nav). |
| R10 | AI Studio is editorial + publishing assistant with explicit guardrails. Cloud must not get manuscript unless action/config allows it. |
| R11 | AI provider abstraction. Local/Ollama + optional cloud + future. **AI is not a hard dependency** for write/edit/EPUB/PDF/validate/open. |
| R12 | Book Doctor is the findings UX (structure, design, a11y, metadata, EPUB, PDF) with Error / Warning / Suggestion / Information, plus Fix / Guide / Show / Waive. |
| R13 | Publication readiness is a **state sequence**: Draft → Writing Complete → Design Complete → Preflight → Validation → Ready to Publish. Health score cannot replace findings. AI cannot declare ready. |
| R14 | Three deterministic engines: EPUB, PDF (fixed-layout), HTML (semantic). Author does not ordinarily edit EPUB package files. |
| R15 | Preview must reflect the **publishing model**, not an editor approximation. MVP: EPUB-oriented + basic responsive; PDF previewable before final export. |
| R16 | Import converts into the Book Model. Export: EPUB, PDF, HTML, project archive. Core app works offline. |
| R17 | First engineering tests: **English + an Indic language + a mixed-script document**. Unicode throughout. App UI accessibility required. |
| R18 | Authors own content. Project files portable. Components tracked under licensing policy. |
| R19 | Plugins/themes/community in-product paths are **future**; post-MVP list includes advanced DTP, preflight, plugins, collab/cloud, adapters. |
| R20 | Next docs before major implementation: Architecture, FOSS strategy, Licensing policy, Roadmap, Contributing. |
| R21 | Acceptance: Functional + Usability + Professional + Publishing Integrity. Release gates A–G. |

Book types **named** (novel through custom, including educational/textbook/children’s “where supported”). That is a catalogue, not a v1 cut — the wizard still requires a type.

---

## 3. How this PRD answers the vision review

| Vision issue | PRD effect |
| --- | --- |
| V-A1 Preview vs generate vs validate | **Improved, not closed.** User journey (§34) is Doctor → Preview → Validate → Publish (same as vision §5, opposite vision §3 diagram). Preview “must reflect the actual publishing model” and MVP is “EPUB-oriented,” which implies engines run for preview. Still need an architecture sentence: *preview generation* vs *publish export* vs *validation*. |
| V-A2 Book Doctor vs Preflight | **Mostly closed as product UX.** Book Doctor is the findings surface; readiness stages include Preflight then Validation; Doctor already consumes EPUB validation failures and PDF preflight issues. Architecture still must say: model-time checks vs artefact-time checks, one UI. |
| V-A3 Publishing Engine | **Split into three engines** (EPUB/PDF/HTML). Vision’s single “Publishing Engine” box can mean that family. Confirm in `ARCHITECTURE.md`. |
| V-A4 HTML checker | **Still missing.** HTML engine has no validator analogue. Book Doctor does not list HTML. MVP HTML is “where feasible.” |
| V-A5 Do it for me vs AI | **Aligned.** Reviewable; no silent destructive changes; Book Doctor auto-fix is a separate, also-reviewable path. Need: auto-fix is deterministic, not an AI write. |
| V-A7 Ollama | **Clarified.** Abstraction + “integration path” in MVP + **not a hard dependency**. Still not a licence ADR. |
| V-A8 Plugins | **Deferred** to post-MVP / future extension points. G9 still sounds like a current goal — see R-C3. |
| V-A9 Cover | **Closed as product intent:** guided import + type + position. |
| V-A10 Book types | **Catalogue given; v1 cut not given.** |
| V-A12 Freeze vs “not final” | **PRD §39 is strict:** major implementation only after the remaining foundation docs are stable. Matches `AGENTS.md`. |
| O-09 DTP quality bar | **Direction closed:** MVP = foundation; full frames/masters/H&J after MVP. The foundation itself is still undefined (see R-A3). |
| O-15 scripts | **Test policy closed:** EN + Indic + mixed-script. Kannada/Hindi specifically remain vision goals, not PRD test names. |
| O-18 / O-19 | Collab/cloud and plugins: post-MVP. |

---

## 4. Ambiguities

### R-A1. Studio map vs vision topology

Vision studios: Writing, Design, DTP, AI, Book Doctor/Preflight.

PRD modules: those plus Wizard, Structure, Typography Assistant, Cover, Metadata, Publication Readiness, Preview, three engines.

**Need in architecture:** which of these are top-level studios, which are modes/panels of Design or Writing, and how they attach to the Book Model. Otherwise the shell will grow a dozen equal “studios.”

### R-A2. Preview is EPUB-oriented, PDF must also be previewed

MVP preview is “EPUB-oriented” + responsive device frames. PDF “must be visually previewable before final export.”

If EPUB-oriented preview is the only live view, DTP/PDF users will edit blind until export. If both live, there are two preview pipelines in MVP.

**Need:** one or two preview surfaces in MVP; whether preview uses the real engines (costly but honest) or a shared layout approximation (faster but risks a second model).

### R-A3. “PDF at an appropriate initial level”

This is the whole DTP quality bar for MVP, and it is undefined. Candidates:

- paginated PDF of flowing semantic text with page size, margins, running header, page numbers;
- plus cover page;
- plus bleed/facing pages/masters (that is already post-MVP-shaped).

Without this sentence, the PDF engine ADR cannot be written.

### R-A4. “Rich text editing” vs semantic structure

§8 MVP says rich text; the same section says preserve semantics, not arbitrary visual formatting. Those collide in every editor toolkit.

**Need:** the writing surface is a **semantic editor** that *looks* comfortable, not a word-processor with styles painted on later.

### R-A5. “One practical AI workflow” + “Ollama integration path”

MVP could mean:

- next-best-action copy only (no model);
- outline-from-idea in the Wizard;
- Book Doctor explanations;
- a working Ollama call against a user-installed model.

“Integration path” can be a stub adapter. That choice changes architecture and licensing a lot. Recommend: Wizard outline **or** Doctor explain, behind the provider interface, with zero-AI still able to finish the MVP journey.

### R-A6. Who moves publication-readiness states?

Draft → Writing Complete → … → Ready: user checkboxes, Book Doctor, or both? Can a user mark Ready while Errors exist? Doctor says Errors “must normally be resolved”; “Ignore/waive with reason” exists. Export of non-ready books is still OPEN (O-23).

### R-A7. Book Doctor “Fix automatically”

Safe automatic fixes (add language metadata, regenerate TOC) vs content rewrites. Must be deterministic and diffable. Must not call AI unless labelled as AI and approved.

### R-A8. HTML in MVP

§22 specifies an HTML engine. MVP says “HTML generation **where feasible**.” That is a yes/no the roadmap must pin. If HTML slips, vision “three outputs” is an MVP miss.

### R-A9. Audio/video assets and children’s/illustrated types

Assets include audio/video “where supported.” Book types include children’s/illustrated “where supported.” MVP does not mention them. Treat as **out of MVP** unless the type picker is lying.

### R-A10. Requirement identity

Sections are numbered; individual requirements are not (`FR-WR-001`). Governance §38 will be hard to apply in PRs without stable IDs. Proposed for `ROADMAP.md` / a later PRD revision — not invented here.

### R-A11. Deterministic “where practical”

Timestamps, UUIDs, font subsetting, and hyphenation dictionaries make bit-identical EPUB/PDF unlikely. Architecture should define **what must be stable** (structure, CSS, resource names) vs what may vary.

### R-A12. Desktop framework still unnamed

App a11y “where supported by the desktop framework” makes runtime choice an accessibility decision, not only a packaging decision. Still OPEN (O-03/O-04). Do not infer Electron/Qt/Tauri from “desktop-first.”

---

## 5. Contradictions and tensions

### R-C1. Vision diagram vs PRD journey (still)

```text
Vision §3:   Engine → formats → Validate → Preview → Publish
PRD §34:     Book Doctor → Preview → Validate → Publish
PRD §23/32:  Preview uses the publishing model; MVP preview is EPUB-oriented
```

Coherent architecture (PROPOSED, not decided):

```text
Book Model
  → Engines (preview profile) → Preview
  → Engines (publish profile) → EPUBCheck / PDF preflight → Book Doctor findings → Ready → Export
```

Book Doctor also runs **model-time** checks before any engine (empty chapters, metadata). That dual-phase Doctor matches §18 better than the vision’s single “Doctor/Preflight” studio box.

**Do not implement the vision §3 arrow as literal UI order.** Confirm this reading in `ARCHITECTURE.md`.

### R-C2. Overlapping style owners

Fonts, paragraph styles, spacing, and chapter treatment appear in Design Studio, Typography Assistant, DTP Studio, and Expert Mode. Cover has its own typography.

**Need a single style authority in the Book Model** (semantic styles + theme tokens + pagination overrides). Otherwise four UIs will fork the design.

### R-C3. G9 extensible ecosystem vs §30/§33 future plugins

Goal G9 reads as a current product goal. MVP has no plugin ABI. Say: **architecture should not preclude extension; MVP ships none.**

### R-C4. Using EPUB as the preview substrate

“EPUB-oriented preview” is the fastest honest preview and the fastest way to accidentally make EPUB the real model (vision Principle 2). Preview must be a **projection**, discarded or cached, never the file the Writing Studio edits.

### R-C5. Wizard type list vs MVP writing/DTP

Textbook, workbook, children’s/illustrated, and poetry have structural and layout needs the MVP writing/PDF foundation will not meet. If the wizard offers those types, it must say “limited in this version” or the type list must be cut for MVP.

### R-C6. Book Doctor EPUB checks require generation

§18 inspects package/manifest/invalid markup. Those artefacts do not exist until the EPUB engine runs. Doctor-as-pre-publish-studio (vision) and Doctor-as-post-engine-report (PRD) are both required. The name is one; the phases are two.

### R-C7. Licence still absent

Typography, fonts, Ollama, EPUBCheck, import (DOCX), and “third-party components must be tracked according to the licensing policy” all assume `LICENSING_POLICY.md`. It does not exist. **No USE/ADAPT in code until it does.**

---

## 6. Missing decisions (updated)

Still blocking any application code:

| ID | Status after PRD |
| --- | --- |
| O-01 | Project licence — **still blocking** |
| O-03 / O-04 | Runtime / language / UI toolkit — **still blocking**; now also an a11y choice |
| O-05 | Book Model on-disk format — **still blocking** |
| Foundation docs | `ARCHITECTURE.md`, `FOSS_STRATEGY.md`, `LICENSING_POLICY.md`, `ROADMAP.md`, `CONTRIBUTING.md` — **PRD forbids major implementation until these are stable** |

Must decide inside `ARCHITECTURE.md` / `ROADMAP.md` before a freeze-lift:

| Topic | Why |
| --- | --- |
| Studio vs panel map | R-A1 |
| Preview pipelines (EPUB vs PDF vs live) | R-A2, R-C1, R-C4 |
| MVP PDF meaning | R-A3 |
| Semantic vs rich-text editor | R-A4 |
| Which one AI workflow | R-A5 |
| Readiness state machine owner + export-if-errors | R-A6, O-23 |
| HTML in or out of MVP | R-A8 |
| MVP book-type cut | R-C5 |
| Invoke vs incorporate (EPUBCheck, Ollama) | V-C2, R-C7 |
| Pagination → reflow mapping even for “foundation” PDF | O-06, still open |
| WCAG / EPUB Accessibility target | O-16, still open |
| Font pack licence policy | O-20, still open |

Explicitly deferrable (PRD post-MVP): collaboration/cloud, plugins, advanced DTP, strong PDF preflight, publishing-store adapters, AI image generation, in-product community hub.

---

## 7. What this agent will not do from this PRD

- Will not start the desktop shell, Book Model code, or engines.
- Will not choose Electron/Tauri/Qt/web because the PRD says desktop-first.
- Will not add Ollama, EPUBCheck, DOCX libraries, or fonts.
- Will not invent `ARCHITECTURE.md` internals that the PRD left open (on-disk format, PDF engine class, preview toolkit).
- Will not cut the MVP type list or HTML-in-MVP without Product Owner confirmation.

---

## 8. Recommended Product Owner responses

Short answers would let architecture start as a document (still not as an app):

1. **Confirm dual-phase Book Doctor** (model checks anytime; artefact checks after engine) and **Preview-then-Validate** as the user-visible order, even if validation nodes sit under the engines in the diagram.
2. **MVP PDF:** one sentence (e.g. “flowing pages, chosen page size, margins, header/footer, page numbers, cover; no facing-page masters in MVP”).
3. **MVP book types:** which of the §7 list are first-class vs “coming later.”
4. **HTML in MVP:** yes or slip to post-MVP.
5. **The one AI workflow** for MVP (recommend: Wizard outline + Doctor explain; both optional).
6. **Export with Errors:** blocked, or allowed with waiver (O-23).
7. Then authorize writing **`ARCHITECTURE.md` only** — not application code.
