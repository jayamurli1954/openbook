# OpenBook Studio — Project Vision

**Status:** Foundation Draft v1.0  
**Project:** OpenBook Studio  
**Repository:** `jayamurli1954/openbook`  
**Owner / Project Steward:** SanMitra Tech Solutions  
**Document purpose:** Establish the product vision and strategic boundaries before application implementation begins.

---

## 1. Mission

**OpenBook Studio is an open-source desktop and digital publishing studio that enables anyone—from a first-time author to a professional publisher—to write, design, typeset, validate, and publish books from a single source of truth.**

The mission is to remove unnecessary technical complexity from book production without removing professional capability.

A new author should not need to understand EPUB internals, CSS, XML, typography systems, page geometry, metadata standards, or publishing preflight merely to produce a good book. At the same time, professional users must be able to take control of the underlying publishing decisions when they need precision.

OpenBook therefore follows a central principle:

> **Simple for beginners. Powerful for professionals. Open for everyone.**

---

## 2. The Problem We Are Solving

Creating a professional book commonly requires a chain of disconnected tools and specialist knowledge:

- writing software for the manuscript;
- image and cover tools for visual assets;
- desktop publishing software for page layout;
- EPUB editors for ebook packaging;
- conversion tools for moving between formats;
- validation tools for finding technical errors;
- separate preview tools for checking reading experiences;
- metadata and publishing workflows for distribution platforms.

The result is a fragmented workflow in which authors repeatedly export, convert, import, repair, and validate the same content.

For beginners, the bigger problem is not the absence of software. It is **decision overload**.

Users frequently ask:

- What should I do next?
- Which format should I use?
- How should I structure my book?
- What fonts should I choose?
- How should I format chapters?
- What does EPUB actually require?
- Why did validation fail?
- Is my cover suitable?
- Is my book accessible?
- Why did the page count change?
- What do I need before publishing?

OpenBook should answer these questions as part of the workflow rather than expecting the author to become a publishing engineer.

---

## 3. Product Vision

OpenBook is intended to become a **complete book-production environment**, not merely an EPUB editor.

The internal product model is a structured **Book Model** that acts as the single source of truth for the entire project.

Conceptually:

```text
                         OPENBOOK STUDIO
                                |
                         +------v------+
                         |  BOOK MODEL |
                         | Single Truth |
                         +------+------+
                                |
          +----------+----------+----------+----------+----------+
          |          |                     |          |          |
          v          v                     v          v          v
       Writing    Design                  DTP        AI      Book Doctor
       Studio     Studio                Studio     Studio    / Preflight
          |          |                     |          |          |
          +----------+----------+----------+----------+----------+
                                |
                         +------v-------+
                         |  PUBLISHING  |
                         |    ENGINE    |
                         +------+-------+
                                |
                   +------------+------------+
                   |            |            |
                   v            v            v
                 EPUB          PDF          HTML
                   |            |
                   v            v
               EPUBCheck    PDF Preflight
                                |
                         +------v------+
                         |   PREVIEW   |
                         +------+------+
                                |
                            PUBLISH
```

EPUB is therefore one publishing output, not the internal representation of the book.

---

## 4. Target Users

OpenBook should serve a broad publishing community while maintaining a coherent product experience.

### 4.1 First-time authors

People who have a story, knowledge, experience, research, devotional material, educational content, or other manuscript but little or no publishing knowledge.

Their primary need is confidence and guidance.

### 4.2 Independent authors

Authors who already understand writing and publishing but want one integrated environment for producing and maintaining their books.

### 4.3 Professional authors, editors and publishers

Users who require detailed control over typography, styles, page geometry, layout, metadata, validation, accessibility, and production outputs.

### 4.4 Educators and knowledge creators

Teachers, trainers, researchers, consultants, institutions, and subject-matter experts creating books, manuals, guides, course material, and reference works.

### 4.5 Multilingual authors

Authors working in English, Kannada, Hindi, Indian languages, other Unicode languages, and right-to-left scripts.

Multilingual publishing is a core product requirement, not a later add-on.

### 4.6 Designers and production professionals

Users who want deeper DTP and visual controls while retaining a structured book-production workflow.

### 4.7 Developers and FOSS contributors

Developers who want to extend OpenBook through plugins, themes, publishing adapters, validators, integrations, automation, and other open-source contributions.

---

## 5. Beginner Experience

The beginner experience is one of the most important differentiators of OpenBook.

The guiding UX principle is:

> **Never leave the user wondering what to do next.**

A new user should be able to start with an idea rather than a blank technical workspace.

A guided journey may include:

1. Create a new book.
2. Tell OpenBook what the book is about.
3. Select the intended type of book.
4. Optionally ask AI to suggest a structure.
5. Start writing chapter by chapter.
6. Choose a visual direction.
7. Choose a typography personality rather than manually configuring dozens of settings.
8. Add a cover.
9. Review metadata.
10. Run Book Doctor.
11. Preview the book.
12. Generate EPUB/PDF/HTML.
13. Validate the outputs.
14. Complete the publishing checklist.

Where appropriate, the interface should provide three levels of assistance:

- **I'll do it myself** — direct control.
- **Guide me** — contextual instructions and explanations.
- **Do it for me** — safe automation with user approval.

The product should also provide:

- Beginner Mode;
- Expert Mode;
- contextual "I'm Stuck" assistance;
- "Explain this" help for publishing terminology;
- visible progress through the book journey;
- a clear next-best-action recommendation.

---

## 6. Professional Experience

OpenBook must not trap experienced users inside a simplified workflow.

Expert users should be able to access professional controls including:

- semantic styles;
- paragraph and character styles;
- heading hierarchy;
- font management;
- tracking, kerning, leading, indentation and alignment;
- hyphenation and justification controls;
- drop caps;
- widow/orphan control;
- page geometry;
- margins, bleed and gutter;
- facing pages;
- master pages;
- headers and footers;
- page numbering;
- text frames;
- image anchoring and wrapping;
- grids, guides and layout controls;
- table formatting;
- section breaks;
- cross references;
- advanced metadata;
- preflight and validation details;
- advanced PDF output options where technically appropriate.

The professional layer should expose complexity progressively rather than imposing it on every user.

---

## 7. DTP Vision

Desktop publishing is a first-class OpenBook capability.

OpenBook should support professional book layout for print-oriented PDF production while maintaining the same underlying Book Model used for digital publishing.

Core DTP capabilities should ultimately include:

- page size and orientation;
- margins, bleed and gutter;
- single and facing-page layouts;
- columns;
- master pages;
- page numbering;
- running headers and footers;
- section-based layout;
- text frames;
- image frames and placement;
- captions;
- tables;
- professional typography;
- paragraph and character styles;
- baseline and spacing controls;
- hyphenation;
- widow/orphan management;
- grids and guides;
- print-oriented preflight.

OpenBook should learn from established FOSS DTP capabilities but should **not become a clone of an existing desktop publishing application**.

The goal is an author-centric publishing workflow that combines professional power with guided usability.

---

## 8. EPUB, PDF and HTML Vision

The Book Model should support multiple publishing outputs without requiring the author to maintain separate versions of the same book.

### EPUB

EPUB should be a standards-compliant, reflowable digital publishing output.

OpenBook should generate the EPUB package deterministically from the Book Model and validate it through an appropriate EPUB validation workflow, including EPUBCheck where applicable.

The author should not have to manually edit EPUB package internals for ordinary publishing tasks.

### PDF

PDF should support professional fixed-layout publishing, including book/page geometry and production controls appropriate to the selected output.

Print-oriented PDF workflows should include preflight capabilities and, where supported, production profiles suitable for the intended use.

### HTML

HTML should provide a useful web-publishing representation of the book while preserving semantic structure.

### Core principle

> **One Book Model, multiple publishing outputs.**

---

## 9. AI Philosophy

AI is an important part of OpenBook, but AI must not be responsible for technical publishing correctness.

The architectural principle is:

> **AI suggests. The Book Model decides. Deterministic engines publish. Validators verify.**

AI may assist with:

- book ideation;
- outlining;
- chapter organization;
- writing assistance;
- rewriting and editing;
- summaries;
- titles and subtitles;
- metadata suggestions;
- image descriptions and alt-text suggestions;
- typography recommendations;
- cover concepts;
- layout suggestions;
- accessibility checks;
- explaining validation errors;
- recommending the next action;
- helping users understand publishing concepts.

AI should not silently make irreversible publishing changes.

Where AI proposes structural or formatting changes, the user should be able to review and approve them.

AI should be treated as a **publishing assistant, tutor and production advisor**, not merely a text generator.

---

## 10. Local AI and Ollama

OpenBook should support local AI as a first-class option where practical.

Ollama provides a strong foundation for local model execution and is particularly valuable for users who want privacy, offline assistance, or control over their data.

The architecture should therefore allow:

```text
OpenBook AI Layer
       |
       +-- Local provider
       |      +-- Ollama
       |
       +-- Optional cloud providers
       |
       +-- Future provider adapters
```

Provider abstraction is important so that OpenBook is not locked to one AI vendor or model.

Local AI should be especially useful for:

- manuscript assistance;
- summarization;
- classification;
- metadata assistance;
- accessibility assistance;
- translation assistance;
- book structure suggestions;
- contextual help.

OpenBook should clearly distinguish between AI-generated suggestions and deterministic publishing results.

---

## 11. Accessibility

Accessibility is a product requirement from the beginning.

OpenBook should help authors create books that are usable by people with different abilities and assistive technologies.

The product should progressively support:

- semantic heading hierarchy;
- meaningful document structure;
- language metadata;
- image alternative text;
- accessible navigation;
- meaningful link text;
- accessible tables;
- appropriate metadata;
- reading-order checks;
- accessibility-oriented validation and reporting;
- accessible preview and authoring UI.

Book Doctor should identify common accessibility problems and explain how to correct them.

Accessibility should be treated as part of publishing quality, not as an optional compliance screen at the end.

---

## 12. Multilingual and Unicode-First Publishing

OpenBook should be designed as a Unicode-first publishing platform.

The architecture should not assume English as the only language or Latin-script typography as the only typography model.

The long-term product should support:

- Kannada;
- Hindi and other Indic languages;
- English and other Latin-script languages;
- right-to-left languages;
- mixed-language books;
- appropriate font selection;
- language metadata;
- script-aware text handling;
- language-specific typography;
- multilingual UI and documentation;
- community translations.

Indic-script support should be tested early rather than added after the core architecture has been fixed.

---

## 13. FOSS Philosophy

OpenBook is intended to be a genuine open-source project and a collaborative publishing platform.

The project should follow this principle:

> **Study widely. Borrow ideas freely. Reuse code only when its licence permits it. Build OpenBook's distinctive experience ourselves.**

OpenBook should prefer integration and independent implementation over indiscriminate merging of unrelated applications.

When evaluating existing FOSS projects, each capability should be classified as:

- **USE** — use an external tool or service where appropriate;
- **ADAPT** — reuse/adapt code when its license permits and the architectural fit is sound;
- **INSPIRE** — study the idea or workflow and implement OpenBook's own solution;
- **AVOID** — reject because of licensing, architecture, maintenance, UX, or other concerns.

The project should maintain clear records of third-party software, dependencies, licenses, fonts, assets, and other external intellectual property.

---

## 14. Community Contribution

OpenBook should be designed so that contribution is not limited to software developers.

Potential contributors include:

- developers;
- authors;
- editors;
- proofreaders;
- designers;
- typographers;
- accessibility specialists;
- translators;
- educators;
- publishers;
- testers;
- documentation writers;
- AI enthusiasts;
- users who can report workflow problems.

Community contributions may include:

- code;
- bug reports;
- feature proposals;
- documentation;
- translations;
- themes;
- templates;
- cover designs;
- publishing profiles;
- Book Doctor rules;
- accessibility guidance;
- tutorials;
- test books and fixtures;
- plugins and integrations.

The project should provide contribution paths for both technical and non-technical participants.

A future community layer may include an **OpenBook Community Edition** containing community-contributed themes, templates, translations, plugins, publishing profiles, rules, prompts, tutorials, and other reusable resources subject to clear licensing.

---

## 15. Ownership and Intellectual Property Model

OpenBook is an open-source project initiated and stewarded by **SanMitra Tech Solutions**.

Open source does not mean that nobody owns the project. It means that the project owner and contributors grant rights to use, study, modify, and redistribute software according to the applicable licenses.

The intended ownership model is:

```text
OPENBOOK
|
+-- SanMitra IP
|     +-- OpenBook brand/trademark
|     +-- product identity
|     +-- original SanMitra code
|     +-- project roadmap
|     +-- official releases and infrastructure
|
+-- Community IP
|     +-- original contributor work
|     +-- submitted under the project's contribution terms
|
+-- Third-party FOSS
      +-- remains subject to its original licenses
```

Contributors should retain appropriate rights in their original contributions while granting the project the permissions required to maintain, distribute, modify, and evolve the project.

The exact contributor agreement, project license, trademark policy, and governance model must be documented separately before the project reaches significant community scale.

OpenBook must never imply that third-party FOSS becomes owned by SanMitra merely because it is integrated into the product.

---

## 16. What OpenBook Will Not Become

Clear boundaries are necessary to prevent uncontrolled scope expansion.

OpenBook will **not** initially attempt to become:

- a general-purpose word processor competing with every office suite;
- a general-purpose graphic design platform;
- a complete Adobe InDesign replacement on day one;
- a general-purpose image editor;
- a general-purpose video editor;
- an unrestricted AI chatbot unrelated to book production;
- a proprietary publishing marketplace;
- a closed vendor-locked AI system;
- a collection of unrelated FOSS applications with a common launcher.

OpenBook may integrate specialized tools or capabilities when they materially improve book production, but the product must remain centered on the **book as the primary object**.

---

## 17. Product Principles

The following principles should guide product and engineering decisions.

### Principle 1 — Book Model First

The Book Model is the central source of truth.

### Principle 2 — EPUB Is an Output

Do not design the internal authoring architecture around EPUB package internals.

### Principle 3 — Progressive Complexity

Beginners see guidance. Experts can expose deeper controls.

### Principle 4 — Deterministic Publishing

Technical publishing engines must produce predictable outputs.

### Principle 5 — Validate Everything

Generated outputs must be checked before being considered publication-ready.

### Principle 6 — AI With Guardrails

AI can recommend, explain, and assist; deterministic systems remain authoritative for structure and publishing correctness.

### Principle 7 — Local-First Where Practical

Users should have meaningful privacy-preserving local AI options.

### Principle 8 — Accessibility by Design

Accessibility is built into the authoring and publishing workflow.

### Principle 9 — Unicode First

International and multilingual publishing must be architectural requirements.

### Principle 10 — Open Ecosystem

OpenBook should support extensions, plugins, themes, templates, publishing adapters, and community contributions.

### Principle 11 — Licence Discipline

Every reused component, dependency, font, asset, and contribution must have clear licensing provenance.

### Principle 12 — User Ownership of Content

Authors retain ownership of their manuscripts and original content. OpenBook must not claim ownership of user books merely because they are created or processed by the software.

---

## 18. Long-Term Vision

The long-term ambition is to make OpenBook a **FOSS Publishing Operating System for books**.

The envisioned ecosystem is:

```text
                       OPENBOOK ECOSYSTEM
                              |
          +-------------------+-------------------+
          |                   |                   |
      Core Platform       Community           Extensions
          |                   |                   |
      Book Model         Themes              Plugins
      Writing            Templates            AI Providers
      Design             Languages            Import/Export
      DTP                Rules                Publishing
      EPUB               Tutorials            Integrations
      PDF                Test Books           Automation
      HTML
      Validation
```

Over time, OpenBook could become a common open platform through which authors and publishers create books once and publish them in multiple forms.

Potential future capabilities include:

- advanced import from existing document formats;
- professional print production;
- rich ebook capabilities;
- publishing-platform adapters;
- collaborative editing;
- cloud synchronization;
- plugin marketplace/repository models that remain compatible with the project's FOSS principles;
- AI-assisted editorial workflows;
- automated accessibility improvement;
- multilingual publishing workflows;
- publishing automation;
- command-line and API access;
- educational publishing workflows;
- institutional publishing workflows.

These are long-term possibilities, not commitments for the initial MVP.

---

## 19. Success Criteria

OpenBook should be considered successful when the following outcomes are demonstrably achievable.

### Beginner success

A first-time author can create a complete small book without needing to learn EPUB, CSS, XML, or professional DTP terminology.

### Professional success

An experienced user can obtain meaningful control over typography, layout, metadata, validation, and production outputs without leaving OpenBook for routine publishing work.

### Technical success

The same Book Model can produce valid, predictable EPUB, PDF, and HTML outputs.

### Quality success

Book Doctor and validation workflows catch common structural, accessibility, metadata, and publishing problems before publication.

### AI success

AI reduces cognitive and production burden without becoming a hidden source of publishing errors or vendor lock-in.

### FOSS success

The project has a healthy contribution pathway for developers and non-developers and maintains disciplined third-party licensing.

### Internationalization success

Books using non-Latin and multilingual scripts are treated as first-class publishing projects.

### Community success

Authors, designers, translators, developers, editors, educators, accessibility specialists, and publishers can contribute useful resources to the ecosystem.

### Strategic success

OpenBook becomes recognized as a cohesive open-source book-production environment rather than simply another EPUB editor.

---

## 20. Foundation Decision

This document establishes the strategic direction for the project before implementation.

The next foundation documents should translate this vision into progressively more precise engineering constraints:

1. `PRODUCT_REQUIREMENTS.md`
2. `ARCHITECTURE.md`
3. `FOSS_STRATEGY.md`
4. `LICENSING_POLICY.md`
5. `ROADMAP.md`
6. `CONTRIBUTING.md`

No major application implementation should be considered final until these foundations have been reviewed against the project vision.

---

## 21. Guiding Statement

> **OpenBook Studio: Tell us your story. We'll guide you to a finished book.**

And for the open-source community:

> **Write once. Design once. Publish everywhere. Keep control.**
