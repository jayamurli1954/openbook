# OpenBook Studio Roadmap

**Project:** OpenBook Studio  
**Maintainer / Project Steward:** SanMitra Tech Solutions  
**Roadmap status:** Foundation roadmap

> **Write. Design. Typeset. Validate. Publish.**

This roadmap defines the intended evolution of OpenBook from a guided MVP into a professional publishing platform and then into an extensible FOSS ecosystem.

The roadmap is capability-driven rather than date-driven. A phase is complete only when its acceptance gate is satisfied.

---

## 1. Roadmap Philosophy

OpenBook will develop in four major product stages:

```text
FOUNDATION
    ↓
MVP — Guided Book Creation
    ↓
PROFESSIONAL PUBLISHING / DTP
    ↓
AI-ASSISTED PUBLISHING
    ↓
OPEN ECOSYSTEM
```

The product must remain usable at every stage.

We will not wait until every professional feature exists before making the basic author journey excellent.

---

# 2. Phase 0 — Foundation

## Objective

Create the architectural, licensing, product and engineering foundation required for safe implementation.

## Deliverables

- `PROJECT_VISION.md`
- `PRODUCT_REQUIREMENTS.md`
- `ARCHITECTURE.md`
- `FOSS_STRATEGY.md`
- `LICENSING_POLICY.md`
- initial repository structure
- development conventions
- CI foundation
- dependency/provenance tracking
- Book Model specification
- ADR process

## Acceptance Gate — Foundation Ready

Phase 0 passes only when:

- product vision is documented;
- requirements are documented;
- architecture is documented;
- FOSS strategy is documented;
- licensing policy is documented;
- Book Model is treated as the canonical source of truth;
- dependency decisions have a documented process;
- automated testing can run in CI;
- the application can be built reproducibly by a new contributor;
- no major architectural contradiction exists between the foundation documents.

**Gate:** `FOUNDATION-READY`

---

# 3. Phase 1 — MVP: Guided Book Creation

## Objective

Enable a first-time author to go from an idea to a validated, readable EPUB without needing prior EPUB knowledge.

This is the most important product milestone.

## 3.1 Book Wizard

Provide a guided start:

- New Book
- Import Existing Book
- Open Recent Book
- Continue Existing Project

For a new book, collect:

- title;
- subtitle;
- author;
- language;
- book type;
- intended audience;
- approximate length;
- writing goal.

The wizard should explain publishing terminology when necessary.

## 3.2 Book Idea and Outline

Allow the author to enter an idea and optionally request an AI-generated outline.

The outline must remain editable by the author.

## 3.3 Writing Studio

MVP writing capabilities:

- chapter/section editor;
- headings;
- paragraphs;
- emphasis;
- lists;
- quotes;
- links;
- basic tables;
- image insertion;
- undo/redo;
- autosave;
- word count;
- chapter navigation;
- document search.

The editor should produce semantic content rather than presentation-heavy markup.

## 3.4 Structure Studio

Support:

- front matter;
- main matter;
- back matter;
- chapter ordering;
- section hierarchy;
- automatic navigation structure.

## 3.5 Basic Design Studio

Provide guided choices for:

- book theme;
- typography;
- heading style;
- paragraph spacing;
- image treatment;
- chapter opening style.

The user should be able to select a design without understanding CSS.

## 3.6 Metadata Wizard

Collect and validate:

- title;
- subtitle;
- author;
- language;
- publisher;
- copyright;
- identifier/ISBN where applicable;
- description;
- subject/category metadata.

## 3.7 Cover Wizard

Allow the author to:

- choose a cover direction;
- import an image;
- use an illustration;
- enter title/author text;
- preview the cover;
- export it as the EPUB cover asset.

## 3.8 EPUB Engine

Generate a standards-compliant EPUB from the Book Model.

Required components include:

- package document;
- manifest;
- spine;
- navigation;
- XHTML content;
- CSS;
- metadata;
- assets;
- cover handling.

## 3.9 Preview

Provide reflowable preview modes representing:

- desktop;
- tablet;
- mobile;
- light/reading themes where practical.

## 3.10 Book Doctor — MVP

Detect at least:

- missing title;
- missing language;
- missing author;
- invalid heading hierarchy;
- broken links;
- missing image alt text where required;
- empty chapters;
- navigation problems;
- EPUB packaging errors;
- validation errors returned by EPUBCheck.

## 3.11 EPUB Validation

Run EPUBCheck against generated EPUB output.

Validation results must be visible to the user.

## MVP Acceptance Gate

A clean test project must be able to:

```text
Create book
   ↓
Add chapters
   ↓
Write content
   ↓
Choose design
   ↓
Add metadata
   ↓
Add cover
   ↓
Generate EPUB
   ↓
Validate
   ↓
Preview
```

### Gate requirements

- New user can complete the basic workflow without documentation.
- Book Model persists and reloads correctly.
- Generated EPUB passes the project's defined EPUBCheck quality threshold; release builds must not knowingly ship validation errors.
- Navigation/TOC works.
- Metadata is correctly packaged.
- Images render correctly.
- Unicode content works.
- At least one Indic-script test fixture works.
- Accessibility baseline checks pass.
- Import/export round-trip tests exist for supported formats.
- No data loss occurs during normal save/reload operations.
- Automated unit and integration tests pass.
- Critical-path end-to-end tests pass.

**Gate:** `MVP-READY`

---

# 4. Phase 2 — Professional Publishing / DTP

## Objective

Transform OpenBook from a guided ebook creator into a serious publishing and desktop-publishing environment while preserving Beginner Mode.

OpenBook should serve:

- independent authors;
- professional authors;
- editors;
- publishers;
- educators;
- designers;
- technical writers.

---

## 4.1 Professional Typography

Introduce:

- paragraph styles;
- character styles;
- heading styles;
- font management;
- font pairing;
- line height/leading;
- tracking;
- kerning controls where applicable;
- indentation;
- alignment;
- drop caps;
- hyphenation;
- widow/orphan controls;
- language-aware typography.

---

## 4.2 Page Layout Engine

Introduce print/DTP concepts:

- page size;
- margins;
- gutter;
- bleed;
- facing pages;
- columns;
- text frames;
- image frames;
- master pages;
- section breaks;
- headers;
- footers;
- page numbering;
- running heads;
- chapter openers.

The Book Model must represent these concepts without making EPUB dependent on fixed-page layout.

---

## 4.3 Professional Image Handling

Support:

- crop;
- resize;
- rotate;
- aspect-ratio controls;
- alignment;
- wrapping;
- anchoring;
- captions;
- image styles;
- resolution warnings;
- format conversion;
- asset optimization.

---

## 4.4 Tables

Support:

- table styles;
- header rows;
- captions;
- alignment;
- cell formatting;
- repeating headers for paginated output;
- controlled page breaks;
- accessibility metadata.

---

## 4.5 PDF / Print Publishing

Add a professional PDF engine supporting, as appropriate:

- print page sizes;
- margins and bleed;
- crop marks;
- page numbering;
- fonts;
- image resolution;
- print-oriented typography;
- colour management;
- preflight;
- PDF metadata.

Advanced print standards such as PDF/X should be introduced only after the underlying PDF pipeline is reliable.

---

## 4.6 HTML Publishing

Generate clean HTML/web output from the same Book Model.

Requirements:

- semantic HTML;
- responsive output;
- navigation;
- CSS theme mapping;
- image assets;
- metadata;
- accessible structure.

---

## 4.7 Advanced Book Structure

Add:

- appendices;
- notes;
- references;
- bibliography support;
- glossary;
- index groundwork;
- cross references;
- footnotes/endnotes;
- multi-level navigation.

---

## 4.8 Professional Preflight

Introduce a deeper preflight engine covering:

- missing assets;
- missing fonts;
- overset text where applicable;
- low-resolution images;
- inconsistent styles;
- orphan/widow issues;
- broken references;
- page-layout anomalies;
- metadata completeness;
- output-specific constraints.

---

## Professional DTP Acceptance Gate

A professional sample book must be capable of producing:

1. a high-quality reflowable EPUB;
2. a professionally typeset PDF;
3. a clean HTML version;
4. consistent typography across outputs;
5. correct navigation and metadata;
6. correct page numbering in paginated output;
7. predictable handling of images and tables;
8. repeatable output from the same Book Model.

### Additional quality requirements

- Golden-output tests for representative books.
- Visual regression tests for critical layouts.
- No uncontrolled changes to existing EPUB behavior.
- Beginner Mode remains understandable.
- Expert Mode exposes professional controls without forcing them on new users.

**Gate:** `PRO-DTP-READY`

---

# 5. Phase 3 — AI-Assisted Publishing

## Objective

Make AI a publishing assistant rather than the authority over book correctness.

The architecture must preserve:

```text
AI suggestion
     ↓
Human decision
     ↓
Book Model
     ↓
Deterministic publishing engine
     ↓
Validation
```

AI must never bypass the publishing and validation pipeline.

---

## 5.1 AI Writing Assistant

Capabilities may include:

- brainstorming;
- outlining;
- chapter expansion;
- rewriting;
- summarization;
- tone adjustment;
- consistency checks;
- title suggestions;
- synopsis generation;
- back-cover copy assistance;
- proofreading assistance.

All AI-generated changes must be reviewable.

---

## 5.2 Local AI / Ollama

Provide an AI provider abstraction supporting local models through Ollama.

Potential capabilities:

- local writing assistance;
- local summarization;
- local metadata assistance;
- local style checking;
- privacy-preserving workflows.

Model selection should be configurable rather than hard-coded.

---

## 5.3 AI Book Doctor

AI may explain deterministic errors in plain language.

Example:

```text
EPUBCheck error
      ↓
Book Doctor
      ↓
"This image is referenced by the book but is missing from the EPUB package."
      ↓
Safe fix suggestion
      ↓
User approval
      ↓
Book Model update
      ↓
Regenerate + validate
```

AI should not invent a successful validation result.

---

## 5.4 AI Design Assistant

Capabilities may include:

- theme suggestions;
- typography recommendations;
- chapter-opening concepts;
- cover concepts;
- image placement suggestions;
- visual consistency checks.

The final design must remain deterministic once selected.

---

## 5.5 AI DTP Assistant

Potential capabilities:

- identify poor page breaks;
- detect excessive whitespace;
- identify low-resolution images;
- suggest typography changes;
- estimate page-count effects;
- identify inconsistent styles;
- suggest fixes for repeated layout problems.

---

## 5.6 AI Provenance

AI-assisted content should be traceable where practical:

- provider;
- model;
- task;
- timestamp;
- optional prompt/context metadata;
- user-approved output.

Privacy controls must prevent accidental transmission of book content to cloud providers.

---

## AI Acceptance Gate

AI features pass only when:

- provider abstraction works;
- local AI works where advertised;
- user can disable AI;
- generated changes are reviewable;
- AI cannot directly corrupt publishing output;
- AI cannot bypass validation;
- privacy behavior is documented;
- model/license provenance is tracked where required;
- deterministic tests remain independent of model output;
- prompts and model responses are not treated as authoritative publishing rules.

**Gate:** `AI-ASSISTED-READY`

---

# 6. Phase 4 — Ecosystem

## Objective

Turn OpenBook from a standalone application into an extensible open publishing platform.

---

## 6.1 Plugin Architecture

Introduce controlled extension points for:

- importers;
- exporters;
- validators;
- themes;
- cover templates;
- AI providers;
- metadata providers;
- dictionaries;
- language packs;
- typography engines;
- asset processors;
- publishing profiles.

The initial plugin architecture should define interfaces before introducing an unrestricted plugin marketplace.

---

## 6.2 Community Themes

Allow contributors to create:

- book themes;
- typography presets;
- chapter styles;
- cover templates;
- layout templates.

Each community asset must have explicit licensing/provenance.

---

## 6.3 Language and Localization Ecosystem

Support community contributions for:

- UI translations;
- spell-check dictionaries;
- language-specific typography;
- hyphenation;
- accessibility testing;
- sample books.

Priority should include Indian languages and scripts, including Kannada, Hindi and other Indic languages, together with RTL support where applicable.

---

## 6.4 Publishing Profiles

Create configurable publishing profiles for workflows such as:

- general EPUB;
- accessibility-oriented EPUB;
- web publication;
- print PDF;
- publisher-specific requirements;
- educational books;
- technical books.

Profiles should configure deterministic rules rather than hide arbitrary behavior.

---

## 6.5 CLI / Automation

Provide a command-line interface for advanced users and CI pipelines.

Possible commands:

```text
openbook create
openbook import
openbook validate
openbook build-epub
openbook build-pdf
openbook build-html
openbook doctor
openbook preflight
```

Exact command names are subject to implementation review.

---

## 6.6 API / Automation Layer

Future integrations may support:

- automated publishing;
- content pipelines;
- educational systems;
- publisher workflows;
- document repositories;
- AI agents;
- batch conversion.

The API must never bypass Book Model validation rules.

---

## 6.7 Community Governance

Establish mechanisms for:

- feature proposals;
- roadmap voting;
- RFCs;
- contributor recognition;
- translation coordination;
- accessibility reviews;
- community testing;
- theme/template contributions.

---

## Ecosystem Acceptance Gate

The ecosystem phase passes when:

- documented extension interfaces exist;
- at least one external extension can be built without modifying the core;
- themes/templates can be distributed with clear licenses;
- language contributions have a defined workflow;
- CLI automation is reliable for supported operations;
- dependency/provenance tracking remains auditable;
- community contribution processes are documented;
- compatibility/versioning rules exist.

**Gate:** `ECOSYSTEM-READY`

---

# 7. Cross-Phase Quality Gates

Regardless of phase, OpenBook must preserve these invariants.

## 7.1 Book Model Integrity

The Book Model remains the single source of truth.

## 7.2 Deterministic Publishing

Given the same Book Model, publishing should produce reproducible results within documented environmental limits.

## 7.3 Validation

Publishing output must pass the relevant validation/preflight pipeline before release.

## 7.4 Accessibility

Accessibility must be designed into the model and publishing pipeline rather than added at the end.

## 7.5 Unicode / Internationalization

No architecture decision may assume English-only content.

## 7.6 Data Ownership

User books remain user-owned. Local-first workflows must not require uploading manuscript content.

## 7.7 Backward Compatibility

Book projects must have explicit schema versions and migrations.

## 7.8 Security

Dependencies, external processes, imported files and plugins must be treated as security boundaries.

## 7.9 Performance

Large books must remain usable without unacceptable editor or preview degradation.

## 7.10 Explainability

When OpenBook reports an error, the user should understand:

- what is wrong;
- why it matters;
- how serious it is;
- what can be done;
- whether OpenBook can safely fix it.

---

# 8. Test Book Suite

The project should maintain representative fixture books covering:

1. short fiction;
2. long novel;
3. poetry;
4. illustrated children's-style content using appropriate test material;
5. technical book;
6. academic/reference book;
7. image-heavy book;
8. table-heavy book;
9. multilingual book;
10. Kannada/Indic-script book;
11. RTL-language sample;
12. accessibility-focused book;
13. intentionally broken book for Book Doctor testing;
14. complex DTP sample.

These books become regression assets rather than disposable demos.

---

# 9. Release Levels

OpenBook should use capability-based release maturity.

### Alpha

Architecture and core workflows under active development.

### Beta

MVP workflow is functional and major regressions are controlled.

### Stable

MVP acceptance gate passed and release-quality validation is established.

### Professional

Professional DTP gate passed with repeatable EPUB/PDF/HTML output.

### Ecosystem

Extension, automation and community contribution infrastructure is mature.

---

# 10. What Is Explicitly Out of Scope Until Later

The following should not distract the MVP:

- full collaborative cloud editing;
- marketplace economics;
- unrestricted third-party plugins;
- complex publisher ERP features;
- advanced print-production automation before core DTP is reliable;
- model-dependent publishing correctness;
- social-network features;
- proprietary lock-in.

---

# 11. Prioritization Rule

When choosing between two features, prefer the feature that improves one or more of:

1. author success rate;
2. publishing correctness;
3. accessibility;
4. interoperability;
5. ease of use;
6. professional publishing quality;
7. extensibility;
8. FOSS community value.

Avoid features that primarily increase complexity without improving these outcomes.

---

# 12. Roadmap Governance

The roadmap is intentionally changeable at the feature level but stable at the architectural level.

Changes require review when they affect:

- Book Model;
- publishing engine contracts;
- licensing strategy;
- security boundaries;
- persistence format;
- plugin architecture;
- public APIs;
- compatibility guarantees.

Such changes should be documented through an ADR or corresponding architecture update.

---

# 13. Roadmap Summary

```text
PHASE 0
Foundation
    │
    ├── Vision
    ├── Requirements
    ├── Architecture
    ├── FOSS strategy
    └── Licensing policy
         │
         ▼
PHASE 1
MVP — Guided Book Creation
    │
    ├── Book Wizard
    ├── Writing
    ├── Structure
    ├── Design
    ├── Cover
    ├── EPUB
    ├── Preview
    ├── Book Doctor
    └── EPUBCheck
         │
         ▼
PHASE 2
Professional Publishing / DTP
    │
    ├── Typography
    ├── Page Layout
    ├── Master Pages
    ├── Images
    ├── Tables
    ├── PDF
    ├── HTML
    └── Preflight
         │
         ▼
PHASE 3
AI-Assisted Publishing
    │
    ├── Writing Assistant
    ├── Ollama
    ├── AI Book Doctor
    ├── AI Design
    ├── AI DTP
    └── Provenance
         │
         ▼
PHASE 4
Ecosystem
    │
    ├── Plugins
    ├── Themes
    ├── Languages
    ├── Publishing Profiles
    ├── CLI
    ├── APIs
    └── Community Governance
```

---

# 14. Final Roadmap Principle

> **Do not build the biggest publishing application first. Build the smallest complete publishing journey first, then deepen it without breaking the foundation.**

OpenBook succeeds when a beginner can finish a book, a professional can control the details, and the community can extend the platform — all using the same underlying Book Model.
