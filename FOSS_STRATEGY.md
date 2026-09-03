# OpenBook FOSS Strategy

**Status:** Foundation strategy  
**Project:** OpenBook Studio  
**Maintainer / Project Steward:** SanMitra Tech Solutions

## 1. Purpose

OpenBook is intended to be a serious open-source publishing platform, not a collection of copied FOSS applications.

This document defines how OpenBook will study, evaluate, reuse, integrate, adapt and independently implement capabilities found in the wider Free and Open Source Software ecosystem.

The strategy has two objectives:

1. learn from decades of work already done by publishing, document, graphics and ebook communities;
2. build a coherent OpenBook product around a single canonical Book Model rather than combining unrelated applications into one confusing user experience.

This document works together with `LICENSING_POLICY.md`.

---

## 2. Strategic Principle

> **Study broadly. Reuse responsibly. Integrate selectively. Implement independently where that produces a better architecture and user experience.**

OpenBook should learn from existing FOSS projects without assuming that every useful project should become an OpenBook dependency.

The target is:

```text
Existing FOSS capability
        ↓
Study behavior + architecture + UX
        ↓
Classify capability
        ↓
USE / EMBED / ADAPT / INSPIRE / AVOID
        ↓
OpenBook architecture decision
        ↓
Book Model integration
        ↓
Deterministic publishing + validation
```

---

## 3. The Five FOSS Decisions

### 3.1 USE

Use an existing application or command-line tool as an external utility without incorporating its source into OpenBook.

Examples may include validation, conversion or specialist processing.

**Preferred when:**

- the tool is mature;
- the functionality is specialized;
- integration through a stable interface is practical;
- embedding the source would create unnecessary licensing or maintenance complexity.

---

### 3.2 EMBED

Use a library or component inside OpenBook.

**Preferred when:**

- the license is compatible;
- the API is stable;
- the dependency has strong technical value;
- the functionality belongs naturally inside OpenBook;
- maintenance risk is acceptable.

Every embedded dependency must pass the licensing and security review defined in `LICENSING_POLICY.md`.

---

### 3.3 ADAPT

Modify an existing FOSS component and distribute the modified component where its license permits this and the resulting obligations are understood.

Adaptation should be used sparingly.

**Rule:** Do not fork a large application simply because it contains one feature we need.

---

### 3.4 INSPIRE

Study an existing project's behavior, workflow, UX, data model or architectural approach and implement the required capability independently.

This is expected to be one of OpenBook's most important strategies.

Examples:

- studying how professional DTP applications handle master pages;
- studying ebook editors' navigation workflows;
- studying document converters' format mappings;
- studying publishing applications' preflight concepts.

The resulting OpenBook implementation must be original code and must comply with applicable legal requirements.

---

### 3.5 AVOID

Do not use a project or component when there is an unacceptable combination of:

- incompatible licensing;
- unclear provenance;
- unacceptable security risk;
- severe maintenance risk;
- poor architecture fit;
- unacceptable dependency footprint;
- patent or trademark concerns;
- inability to satisfy distribution obligations.

---

## 4. Best-of-FOSS Philosophy

OpenBook will follow a **best-of-FOSS** model.

We will not attempt to merge Sigil + Scribus + Calibre + LibreOffice + Inkscape + other applications into a single codebase.

Instead:

```text
Sigil       → EPUB editing knowledge
Scribus     → professional DTP knowledge
Calibre     → ebook management/conversion knowledge
EPUBCheck   → EPUB conformance validation
Pandoc      → document conversion knowledge
Booktype    → book-production workflow knowledge
LibreOffice → document interoperability knowledge
Inkscape    → vector graphics knowledge
Krita       → raster/illustration workflow knowledge
Image tools → asset processing knowledge

                 ↓

          OpenBook Book Model
                 ↓
       One coherent user experience
```

This distinction is central to the project.

---

## 5. Strategic FOSS Portfolio

The following portfolio is the initial research set. License/status information must be rechecked when a dependency decision is actually made; repositories and licenses can change.

| Project | Primary capability | Current strategic classification | OpenBook role |
|---|---|---|---|
| **Sigil** | EPUB authoring/editing | INSPIRE / selective USE | Study EPUB editing, structure and authoring workflows |
| **Scribus** | Professional desktop publishing | INSPIRE | Study DTP, master pages, frames, typography and preflight concepts |
| **Calibre** | Ebook management/conversion | INSPIRE / selective USE | Study ebook conversion, metadata and library workflows |
| **EPUBCheck** | EPUB conformance validation | USE / EMBED candidate | Core validation integration |
| **Pandoc** | Document conversion | USE / INSPIRE | Study format conversion and AST-oriented workflows |
| **Booktype** | Collaborative book production | INSPIRE | Study book-production workflow and single-source concepts |
| **LibreOffice** | Office/document interoperability | USE / INSPIRE | Study DOCX/ODT interoperability and document handling |
| **Inkscape** | Vector graphics | USE / INSPIRE | Study/import vector artwork and graphics workflows |
| **Krita** | Raster illustration | USE / INSPIRE | Study/import illustration workflows |
| **ImageMagick** | Image processing | USE / EMBED candidate | Asset conversion, resizing and metadata processing where appropriate |
| **SVG tooling** | SVG editing/rendering | INSPIRE / selective EMBED | Cover and illustration workflows |
| **Graphviz** | Diagram generation | USE / INSPIRE | Optional technical/diagram publishing support |
| **Excalidraw** | Diagram/whiteboard creation | INSPIRE / optional integration | Study simple diagram authoring and export |

The table is a strategy map, not blanket approval to redistribute any project's code.

---

## 6. Sigil — EPUB Expertise

Sigil is particularly valuable as a reference for EPUB authoring. Its repository is GPLv3. citeturn0search2

### What OpenBook should study

- EPUB project structure;
- XHTML/CSS editing;
- navigation workflows;
- table-of-contents handling;
- metadata editing;
- validation-oriented authoring;
- source/code view;
- ebook-specific editing concepts.

### Strategy

**INSPIRE first.**

Use Sigil as a reference application and, where useful and legally appropriate, as an external validation/editing tool during development.

OpenBook should not become a Sigil clone.

The OpenBook author should work primarily against the Book Model rather than raw EPUB internals.

---

## 7. Scribus — Professional DTP Expertise

Scribus is one of the most important reference projects for OpenBook's DTP vision. Its current repository identifies GPL licensing, while also documenting LGPL, BSD, MIT and public-domain components. citeturn0search4

### What OpenBook should study

- page geometry;
- text frames;
- image frames;
- master pages;
- facing pages;
- guides and grids;
- styles;
- typography;
- page numbering;
- headers and footers;
- professional PDF output;
- colour management;
- preflight concepts.

### Strategy

**INSPIRE.**

OpenBook should learn from Scribus rather than embed the Scribus application into the core.

The OpenBook DTP layer should be much more approachable for authors while retaining an Expert Mode for professional users.

---

## 8. Calibre — Ebook Management Expertise

Calibre is GPLv3. citeturn0search1turn0search7

### What OpenBook should study

- ebook metadata;
- format conversion;
- ebook inspection;
- library concepts;
- device/reader considerations;
- publishing workflows.

### Strategy

Primarily **INSPIRE** and potentially **USE** for external workflows where appropriate.

The Calibre codebase should not be treated as a general-purpose library for OpenBook's proprietary/permissively licensed core architecture.

---

## 9. EPUBCheck — Validation Foundation

EPUBCheck is maintained by the DAISY Consortium on behalf of W3C and is the official EPUB conformance checker. The project currently documents a 3-Clause BSD license and supports EPUB 2 and EPUB 3 validation. citeturn0search3turn0search6

### OpenBook strategy

**USE / EMBED CANDIDATE.**

EPUBCheck should be treated as a high-priority validation integration.

The architecture should allow:

```text
Book Model
    ↓
EPUB Engine
    ↓
EPUB package
    ↓
EPUBCheck
    ↓
Validation results
    ↓
Book Doctor
```

OpenBook's own Book Doctor can add user-friendly diagnostics around standards validation, but it must not falsely replace EPUBCheck's conformance role.

---

## 10. Pandoc — Conversion Expertise

Pandoc is GPL-2.0-or-later. Its current project documentation describes broad support for document, ebook, office and markup formats. citeturn1search10turn1search12

### What OpenBook should study

- intermediate representation / AST concepts;
- readers and writers;
- document conversion pipelines;
- format mapping;
- filters;
- import/export architecture.

### Strategy

**USE selectively / INSPIRE.**

Pandoc can be valuable as an external conversion engine where its license and distribution model are compatible with the specific OpenBook release.

OpenBook should not make Pandoc's AST the canonical Book Model.

The OpenBook Book Model must remain optimized for publishing semantics, DTP and EPUB/PDF/HTML output.

---

## 11. Booktype — Book Production Workflow

Booktype demonstrates a book-production workflow based around editing and publishing books, including DOCX/EPUB import, single-source HTML and output for print/web/ebook. The referenced project is AGPL-licensed. citeturn1search5

### What OpenBook should study

- book-centric workflow;
- collaborative editing concepts;
- single-source publishing;
- import/export;
- multilingual contribution;
- publishing-oriented user experience.

### Strategy

**INSPIRE.**

Because of the AGPL context and because OpenBook is pursuing a desktop-first architecture, Booktype should primarily be a source of workflow ideas rather than a core dependency.

---

## 12. LibreOffice — Interoperability Expertise

LibreOffice source files commonly use the Mozilla Public License 2.0, with some files incorporating Apache-licensed material. citeturn1search0turn1search1

### What OpenBook should study

- DOCX/ODT interoperability;
- document import/export;
- style handling;
- office-document semantics;
- conversion workflows;
- complex document structures.

### Strategy

**USE selectively / INSPIRE.**

For MVP, OpenBook should avoid depending on the entire LibreOffice application stack.

Where conversion through an external process is useful, it should be isolated behind a well-defined adapter.

---

## 13. Inkscape — Vector Graphics

Inkscape is a major FOSS vector-graphics reference project. Its official GitHub organization identifies the Inkscape repository and its open-source development model. citeturn1search11

### What OpenBook should study

- SVG workflows;
- vector editing concepts;
- paths and shapes;
- diagram/illustration export;
- SVG interoperability.

### Strategy

**INSPIRE / optional USE.**

OpenBook does not need to become a general-purpose vector graphics editor.

Instead, the Cover Studio and illustration workflows should provide author-friendly capabilities and support import of professionally created SVG assets.

---

## 14. Krita and Image Processing Tools

Krita is useful as a reference for raster illustration workflows; image-processing utilities can provide specialist processing capabilities.

### Strategy

Study:

- image resizing;
- crop/rotate;
- resolution management;
- format conversion;
- colour/profile handling;
- image metadata;
- asset optimization.

OpenBook should provide a simple author-facing asset workflow while allowing specialist external tools where appropriate.

---

## 15. What We Should NOT Do

OpenBook should not become:

### A. A Sigil fork with a new UI

Because OpenBook's mission is broader than EPUB editing.

### B. A Scribus fork with an ebook panel

Because OpenBook needs a beginner-first authoring workflow and a canonical Book Model.

### C. A Calibre clone

Because ebook library management is not the central product.

### D. A LibreOffice clone

Because OpenBook is not a general office suite.

### E. A Pandoc wrapper

Because conversion is only one part of publishing.

### F. A collection of disconnected FOSS applications

The user should not have to understand which underlying tool is being used.

---

## 16. The OpenBook Integration Principle

Underlying tools should disappear behind OpenBook's user experience.

For example:

```text
User
 ↓
"Check my book"
 ↓
OpenBook Book Doctor
 ↓
Validation adapter
 ↓
EPUBCheck
 ↓
OpenBook diagnostics
 ↓
"3 errors found — Fix safely"
```

The user should not need to know what command-line utility executed underneath.

---

## 17. Book Model as the Integration Firewall

All major capabilities must connect to the canonical Book Model.

```text
                BOOK MODEL
                    │
      ┌─────────────┼─────────────┐
      ↓             ↓             ↓
   Writing        Design         DTP
      │             │             │
      └─────────────┼─────────────┘
                    ↓
            Publishing Engines
          ┌─────────┼─────────┐
          ↓         ↓         ↓
        EPUB       PDF       HTML
          ↓
       EPUBCheck
          ↓
      Book Doctor
```

No external FOSS application should become the hidden canonical data model for OpenBook.

---

## 18. Independent Implementation / Clean Functional Specifications

When OpenBook decides to independently implement a capability inspired by another project, the preferred workflow is:

### Step 1 — Research

Study public documentation, user-visible behavior, architecture descriptions and standards.

### Step 2 — Functional specification

Write down what the feature must do, without copying implementation details.

### Step 3 — OpenBook design

Design the capability around the Book Model and OpenBook UX.

### Step 4 — Independent implementation

Implement new code in the OpenBook repository.

### Step 5 — Test

Create tests from the OpenBook requirements and standards.

This approach reduces accidental source-code copying and encourages a better product architecture.

It is not a guarantee against every legal issue; patent, trademark, copyright and other rights must still be considered where relevant.

---

## 19. FOSS Research Record

For every significant FOSS project studied, maintain a research record containing:

```text
Project:
Repository:
Website:
Version/revision studied:
Primary capability:
License:
Copyright/provenance notes:
Architecture observations:
UX observations:
Features worth adopting:
Features to avoid:
OpenBook decision:
USE / EMBED / ADAPT / INSPIRE / AVOID:
Reason:
Dependencies:
Security concerns:
Maintenance status:
Legal review required:
Date reviewed:
Reviewer:
```

This prevents decisions from being based on memory or assumptions.

---

## 20. Dependency Inventory

OpenBook should maintain a machine-readable dependency inventory as implementation progresses.

Recommended fields:

| Field | Purpose |
|---|---|
| Name | Dependency identifier |
| Version | Exact tested version |
| Source | Repository/package source |
| License | License expression |
| Copyright | Rights holder |
| Direct/Transitive | Dependency relationship |
| Embedded/External | Integration model |
| Purpose | Why it exists |
| Notice required | Attribution requirement |
| Security status | Vulnerability review |
| Approval | Maintainer decision |
| Last review | Audit date |

---

## 21. FOSS Evaluation Scorecard

Before accepting a significant dependency, evaluate:

| Criterion | Question |
|---|---|
| Functionality | Does it solve a real OpenBook requirement? |
| Quality | Is the implementation mature? |
| License | Can we legally distribute it as intended? |
| Architecture | Does it fit the Book Model? |
| Maintenance | Is the project maintained? |
| Security | Is supply-chain risk acceptable? |
| Performance | Does it meet desktop requirements? |
| Size | Is the dependency footprint reasonable? |
| UX | Does it improve the user experience? |
| Extensibility | Can OpenBook control the integration? |
| Replacement | Could we implement it ourselves more cleanly? |
| Long-term risk | Could it constrain future architecture? |

A dependency that scores poorly on several dimensions should generally become **INSPIRE** rather than **EMBED**.

---

## 22. License Strategy by Architectural Layer

### OpenBook Core

Prefer permissively licensed embedded dependencies.

### Publishing engines

Prefer standards-based independent implementations plus permissively licensed libraries where available.

### Validation

Use trusted standards validators such as EPUBCheck through a controlled adapter.

### Conversion

Use external FOSS converters selectively where they provide substantial value.

### Graphics

Prefer standard formats such as SVG, PNG, JPEG and WebP and integrate specialist tools only when necessary.

### AI

Provider/model licenses are tracked separately from OpenBook source-code licenses.

### Templates/fonts/assets

Maintain independent provenance records.

---

## 23. Security and Supply Chain

OpenBook will not assume that FOSS means secure.

Dependencies must be evaluated for:

- known vulnerabilities;
- abandoned maintenance;
- compromised packages;
- suspicious release behavior;
- dependency confusion;
- typosquatting;
- unsigned or unverified artifacts where relevant;
- excessive transitive dependencies.

CI should eventually include dependency and supply-chain scanning.

---

## 24. Standards Before Libraries

Where a publishing standard already defines the required behavior, OpenBook should implement against the standard rather than against a particular application's behavior.

Examples:

```text
EPUB standard
      ↓
OpenBook EPUB Model
      ↓
EPUB Engine
      ↓
EPUBCheck
```

not:

```text
Sigil behavior
      ↓
copy behavior
      ↓
OpenBook
```

FOSS applications are valuable references; published standards remain the authoritative technical target where applicable.

---

## 25. Community Contribution to FOSS

OpenBook should not only consume FOSS.

Where OpenBook discovers:

- bugs in upstream dependencies;
- missing documentation;
- interoperability problems;
- standards issues;
- reproducible test cases;
- accessibility improvements;
- translations;

we should contribute improvements upstream whenever practical.

This creates a healthy relationship with the FOSS ecosystem.

---

## 26. FOSS Contribution Loop

```text
Study upstream project
        ↓
Build OpenBook integration
        ↓
Find bug / limitation
        ↓
Create reproducible case
        ↓
Contribute upstream where appropriate
        ↓
Improve OpenBook
        ↓
Improve ecosystem
```

OpenBook should be a participant in the ecosystem, not merely a consumer of free software.

---

## 27. Cursor Cloud Agent Rules

Cursor Cloud Agent must follow these rules when implementing OpenBook:

1. Do not copy source code from third-party projects unless an explicit license review has approved the use.
2. Do not introduce a dependency simply because it provides a convenient implementation.
3. Before adding a significant FOSS dependency, classify it as USE / EMBED / ADAPT / INSPIRE / AVOID.
4. Check the dependency license and transitive dependencies.
5. Prefer standards-based independent implementations for OpenBook's core publishing model.
6. Preserve the Book Model as the source of truth.
7. Do not make AI responsible for publishing correctness.
8. Keep external FOSS tools behind explicit adapters.
9. Record important FOSS decisions in documentation or ADRs.
10. Update the dependency/license inventory when dependencies change.
11. Never copy third-party fonts, templates, images or artwork without verified rights.
12. If licensing is unclear, stop and flag the issue instead of guessing.

---

## 28. Initial Strategic Decisions

The following decisions are frozen for the foundation phase:

| Area | Decision |
|---|---|
| Product architecture | Build OpenBook independently around the Book Model |
| FOSS approach | Best-of-FOSS, not application merging |
| EPUB validation | EPUBCheck is a primary validation integration |
| Sigil | Primarily INSPIRE |
| Scribus | Primarily INSPIRE |
| Calibre | Primarily INSPIRE / selective external USE |
| Pandoc | Selective USE / INSPIRE |
| Booktype | Primarily INSPIRE |
| LibreOffice | Selective USE / INSPIRE |
| Strong-copyleft application code | Do not embed casually |
| Standards | Standards take precedence over copying application behavior |
| Dependencies | Every significant dependency requires provenance/license review |
| User experience | Underlying FOSS tools should be invisible to normal users |

---

## 29. Future FOSS Expansion Areas

As OpenBook matures, additional FOSS projects may be evaluated for:

- EPUB accessibility;
- screen-reader testing;
- PDF accessibility;
- hyphenation;
- spell checking;
- grammar checking;
- dictionaries;
- bibliography management;
- citation processing;
- LaTeX/Typst integration;
- print preflight;
- colour management;
- OCR;
- speech-to-text;
- text-to-speech;
- translation;
- diagramming;
- equation rendering;
- font inspection;
- metadata extraction;
- archive/container handling;
- document diffing;
- version comparison.

Each addition follows the same evaluation framework.

---

## 30. Success Criteria

The FOSS strategy is successful when:

- OpenBook benefits from mature FOSS technology without becoming architecturally fragmented;
- users experience one coherent publishing workflow;
- licensing obligations are documented;
- dependency provenance is auditable;
- important upstream projects receive contributions where appropriate;
- OpenBook can replace or upgrade individual dependencies without redesigning the Book Model;
- Cursor Cloud Agent can make dependency decisions without guessing;
- the community can understand where FOSS projects influenced OpenBook;
- OpenBook's own original engineering remains clearly distinguishable from third-party software.

---

## 31. Final Principle

> **OpenBook should stand on the shoulders of the FOSS community without standing on its toes.**

We will learn from existing publishing tools, reuse mature components when their licenses and architecture fit, contribute improvements upstream, and independently implement the parts that make OpenBook unique.

The end result should be a genuinely open publishing platform whose strength comes from both **its own engineering and the wider FOSS ecosystem**.
