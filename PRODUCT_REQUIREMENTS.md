# OpenBook Studio — Product Requirements

**Status:** Foundation Draft v1.0  
**Depends on:** `PROJECT_VISION.md`  
**Product:** OpenBook Studio  
**Project steward:** SanMitra Tech Solutions

---

## 1. Purpose

This document translates the OpenBook project vision into a functional product specification.

It defines what OpenBook should do, how users should experience it, the major product modules, MVP boundaries, professional capabilities, AI responsibilities, publishing outputs, validation requirements, and future extensibility.

This document is intentionally product-focused. Detailed implementation choices belong in `ARCHITECTURE.md`.

---

## 2. Product Definition

OpenBook Studio is an open-source desktop-first book-production environment for creating professional digital and print-oriented books from a single structured Book Model.

The product shall combine:

- guided book creation;
- manuscript writing and editing;
- book structure management;
- visual design;
- desktop publishing and typesetting;
- cover creation;
- AI-assisted editorial and publishing guidance;
- metadata management;
- accessibility assistance;
- deterministic EPUB/PDF/HTML generation;
- validation and preflight;
- multi-device preview;
- publishing preparation.

The product shall not require beginners to understand publishing technology while allowing professionals to access deeper controls.

---

## 3. Product Goals

### G1 — Make book creation approachable

A first-time author should be able to begin from an idea and be guided toward a finished book.

### G2 — Provide one integrated workflow

The user should not need to maintain disconnected manuscript, design, EPUB and PDF versions for ordinary workflows.

### G3 — Maintain one source of truth

All publishing outputs must originate from the structured Book Model.

### G4 — Support professional publishing

The product must grow from beginner-friendly workflows into professional typography, DTP, validation and production capabilities.

### G5 — Make publishing correctness deterministic

AI must not be the authority for technical EPUB/PDF correctness.

### G6 — Make quality visible

Users should understand the publication health of their book before export or publishing.

### G7 — Support privacy and local AI

Users should have a practical path to local AI through Ollama where supported.

### G8 — Make multilingual publishing first-class

Unicode, Indic scripts and RTL workflows must be considered in the core architecture.

### G9 — Build an extensible FOSS ecosystem

Themes, templates, plugins, validators, publishing profiles and integrations should be extensible.

---

## 4. Non-Goals for Initial Releases

The initial product will not attempt to be:

- a full general-purpose office suite;
- a general-purpose image editor;
- a general-purpose vector design application;
- a general-purpose video editor;
- a social publishing network;
- an unrestricted AI chatbot;
- a full replacement for every professional DTP feature from mature commercial products on day one.

Specialized FOSS tools may be integrated or used as inspiration where appropriate.

---

# 5. User Modes

## 5.1 Beginner Mode

Beginner Mode shall hide unnecessary technical controls and present publishing tasks as guided decisions.

Examples:

- "What kind of book are you creating?"
- "How should your book feel?"
- "Do you want help structuring the chapters?"
- "Would you like OpenBook to check the book?"
- "Your book is almost ready. Here are the remaining steps."

## 5.2 Expert Mode

Expert Mode shall expose advanced controls without requiring users to abandon the OpenBook workflow.

Examples include:

- styles;
- page geometry;
- master pages;
- grids and guides;
- advanced typography;
- text frames;
- image anchoring;
- advanced metadata;
- output profiles;
- detailed validation;
- preflight.

## 5.3 Assistance Levels

Where appropriate, users should be offered:

1. **I'll do it myself**
2. **Guide me**
3. **Do it for me**

"Do it for me" actions must be reviewable and should not silently make destructive changes.

---

# 6. Core Book Model Requirements

The Book Model is the central product requirement.

It shall represent, at minimum:

### 6.1 Book metadata

- title;
- subtitle;
- author(s);
- contributor(s);
- language;
- identifier/ISBN where applicable;
- publisher;
- publication date;
- copyright;
- description;
- subjects/categories;
- rights information;
- cover metadata;
- accessibility metadata where applicable.

### 6.2 Book structure

The model shall support:

- front matter;
- main matter;
- back matter;
- chapters;
- sections;
- subsections;
- appendices;
- notes;
- references;
- bibliography;
- about-the-author material;
- other-books material.

### 6.3 Assets

Assets shall include references and metadata for:

- cover images;
- illustrations;
- photographs;
- diagrams;
- audio;
- video where supported;
- fonts;
- other embedded resources.

### 6.4 Design information

The Book Model shall preserve:

- theme;
- typography choices;
- semantic styles;
- image presentation rules;
- chapter presentation rules;
- layout configuration;
- output-specific presentation settings.

### 6.5 Publishing configuration

The model shall retain relevant configuration for:

- EPUB;
- PDF;
- HTML;
- validation;
- preview;
- publishing profiles.

---

# 7. Book Creation Wizard

The first-run experience shall guide a user through creation of a new book.

## Required workflow

1. Create/open project.
2. Enter book title or working title.
3. Select book type.
4. Select primary language.
5. Optionally describe the book idea.
6. Optionally request AI structure suggestions.
7. Select beginner or expert starting mode.
8. Enter the main workspace.

## Book types may include

- novel;
- short stories;
- poetry;
- memoir;
- biography;
- devotional/spiritual;
- educational;
- textbook;
- workbook;
- business/professional;
- technical;
- reference;
- children's/illustrated books where supported;
- custom.

The type should influence recommendations, not lock the user into an inflexible template.

---

# 8. Writing Studio

The Writing Studio shall provide the primary manuscript-authoring experience.

## MVP capabilities

- rich text editing;
- semantic headings;
- paragraphs;
- lists;
- emphasis;
- links;
- block quotations;
- chapter/section management;
- undo/redo;
- search;
- replace;
- word count;
- basic document statistics;
- autosave;
- project save/open;
- keyboard shortcuts;
- basic accessibility semantics.

## Advanced capabilities

- paragraph styles;
- character styles;
- footnotes/endnotes;
- cross references;
- tables;
- structured captions;
- comments/annotations;
- version history where supported;
- advanced search;
- document navigation;
- manuscript import.

The editor should preserve semantic structure instead of reducing the manuscript to arbitrary visual formatting.

---

# 9. Book Structure Studio

Users shall be able to see and manage the complete book structure independently of the text editor.

A structural tree should expose:

```text
Book
├── Front Matter
│   ├── Half Title
│   ├── Title Page
│   ├── Copyright
│   ├── Dedication
│   ├── Preface
│   └── Foreword
├── Main Matter
│   ├── Chapter 1
│   ├── Chapter 2
│   └── Chapter N
└── Back Matter
    ├── Appendix
    ├── Notes
    ├── References
    ├── About the Author
    └── Other Books
```

Users should be able to reorder structural elements without manually editing navigation files.

---

# 10. Design Studio

Design Studio shall allow users to establish the visual identity of a book.

## Beginner workflow

Users select a design direction such as:

- Classic;
- Modern;
- Literary;
- Professional;
- Warm & Personal;
- Academic;
- Minimal;
- Devotional;
- Custom.

The system then maps the selection to a coherent theme.

## Advanced workflow

Users may directly configure:

- fonts;
- type scale;
- colours;
- chapter styles;
- paragraph styles;
- spacing;
- alignment;
- image presentation;
- rules/dividers;
- page elements;
- theme tokens.

Design settings must remain connected to the Book Model and output engines.

---

# 11. Typography Assistant

OpenBook shall provide a guided typography assistant.

The beginner should answer questions about desired character rather than technical typographic parameters.

Example:

> "How should your book feel?"
>
> Classic / Modern / Elegant / Friendly / Academic / Literary / Minimal

The system may then recommend a typography system covering:

- font family;
- heading hierarchy;
- body size;
- line height;
- paragraph spacing;
- indentation;
- chapter title treatment.

Expert users can override these decisions.

Font licensing must always be respected.

---

# 12. DTP / Typesetting Studio

DTP is a first-class capability, especially for PDF and print-oriented workflows.

## Required capability areas

### Page geometry

- page size;
- portrait/landscape;
- margins;
- gutter;
- bleed;
- facing pages;
- section breaks.

### Layout

- columns;
- text frames;
- image frames;
- master pages;
- grids;
- guides;
- page elements;
- running headers/footers;
- page numbering.

### Typography

- paragraph styles;
- character styles;
- leading;
- tracking;
- kerning;
- indentation;
- justification;
- hyphenation;
- widow/orphan control;
- drop caps.

### Images

- insert;
- crop;
- resize;
- rotate;
- wrap;
- anchor;
- caption;
- resolution warning;
- aspect-ratio protection.

### Tables

- table styles;
- captions;
- repeating headers;
- row/column control;
- page-break handling.

Professional DTP capability will be expanded progressively; MVP should establish the Book Model and a sound layout foundation rather than attempt every feature immediately.

---

# 13. Cover Studio

OpenBook shall provide a guided cover workflow.

The user should be able to:

1. select a cover direction;
2. choose or import an image;
3. enter title/subtitle/author;
4. select typography;
5. adjust positioning;
6. preview the cover;
7. export the cover for relevant outputs.

The system should warn about common problems such as poor image quality or insufficient contrast.

Future versions may provide AI-assisted cover concepts and image generation integrations.

---

# 14. Table of Contents and Navigation

OpenBook shall derive the table of contents from the structured Book Model.

It shall support:

- automatic TOC generation;
- configurable inclusion depth;
- navigation hierarchy;
- EPUB navigation document generation;
- PDF bookmarks where supported;
- HTML navigation.

Users should not need to manually maintain multiple versions of the TOC.

---

# 15. Metadata Studio

Metadata shall be managed through a dedicated guided interface.

The system should distinguish:

- required fields;
- recommended fields;
- optional fields;
- output-specific fields.

AI may suggest metadata, but the user remains responsible for approval.

The system should validate metadata consistency before publication.

---

# 16. AI Studio

AI Studio shall centralize AI-assisted publishing functions.

## Editorial assistance

- brainstorm;
- outline;
- expand;
- summarize;
- rewrite;
- simplify;
- proofread assistance;
- tone suggestions;
- chapter continuity assistance.

## Publishing assistance

- metadata suggestions;
- chapter organization;
- typography recommendations;
- accessibility suggestions;
- alt-text suggestions;
- validation explanations;
- cover concepts;
- next-best-action guidance.

## Guardrails

AI must:

- clearly indicate suggested changes;
- avoid silent destructive changes;
- defer technical validity to deterministic engines;
- respect configured privacy/provider settings;
- avoid unnecessary transmission of manuscript content to cloud providers.

---

# 17. Local AI / Ollama Requirements

OpenBook should support an AI provider abstraction.

Minimum conceptual provider categories:

```text
AI Provider Interface
├── Local / Ollama
├── Optional cloud providers
└── Future providers
```

Users should be able to configure an available local model where practical.

The application should communicate clearly when a requested AI function requires a model that is not available locally.

The AI layer must not become a hard dependency for core writing, editing, EPUB generation, PDF generation, validation, or project opening.

---

# 18. Book Doctor

Book Doctor is a signature OpenBook feature.

It shall inspect the book before publication and present actionable findings.

## Areas of inspection

### Content/structure

- missing title;
- malformed hierarchy;
- empty chapters;
- inconsistent headings;
- missing required structural components.

### Typography/design

- inconsistent styles;
- problematic spacing;
- missing fonts;
- font licensing metadata where relevant;
- layout anomalies;
- low-resolution images.

### Accessibility

- missing alt text;
- heading hierarchy problems;
- language metadata;
- navigation issues;
- link problems;
- table accessibility issues.

### Metadata

- missing required metadata;
- inconsistent title/author data;
- identifier problems;
- incomplete publishing information.

### EPUB

- package problems;
- navigation problems;
- manifest/resource issues;
- invalid markup;
- CSS/resource issues;
- validation failures.

### PDF

- page geometry problems;
- missing resources;
- image-resolution warnings;
- layout/preflight issues where supported.

## Finding severity

Findings should be classified as:

- **Error** — must normally be resolved before publication;
- **Warning** — should be reviewed;
- **Suggestion** — quality improvement;
- **Information** — explanation or status.

Where safe, Book Doctor may provide:

- Fix automatically;
- Guide me;
- Show me where;
- Ignore/waive with reason.

---

# 19. Publication Readiness

OpenBook shall provide a visible publication-readiness view.

A conceptual status model is:

```text
Draft
  ↓
Writing Complete
  ↓
Design Complete
  ↓
Preflight
  ↓
Validation
  ↓
Ready to Publish
```

A Book Health Score may be used as a convenience indicator, but it must never replace detailed findings.

A book should not be labelled "publication ready" merely because an AI model believes it is ready.

---

# 20. EPUB Engine

The EPUB engine shall generate EPUB from the Book Model.

Requirements include:

- standards-aware package creation;
- XHTML/content generation;
- CSS generation;
- manifest generation;
- spine generation;
- navigation generation;
- metadata generation;
- asset packaging;
- cover handling;
- font/resource handling;
- deterministic generation where practical.

The author should not ordinarily need to edit package files manually.

EPUB validation shall be integrated into the publication workflow.

---

# 21. PDF Engine

The PDF engine shall generate fixed-layout output from the Book Model.

The product should progressively support:

- page size;
- margins;
- bleed;
- gutter;
- master pages;
- headers/footers;
- page numbering;
- typography;
- image placement;
- tables;
- print-oriented profiles;
- preflight.

PDF output must be visually previewable before final export.

---

# 22. HTML Engine

The HTML engine shall produce a semantic web representation of the Book Model.

It should preserve:

- headings;
- paragraphs;
- lists;
- links;
- images;
- navigation;
- semantic structure;
- language information.

---

# 23. Preview System

OpenBook shall provide an integrated preview experience.

At minimum, preview should support:

- desktop view;
- tablet view;
- mobile view;
- light mode;
- dark mode;
- sepia/readability-oriented mode where practical.

The preview must reflect the actual publishing model rather than merely showing an editor approximation.

Future versions may include reading-system compatibility profiles.

---

# 24. Import and Export

Import/export should be progressively expanded.

Potential import formats include:

- Markdown;
- HTML;
- DOCX;
- EPUB;
- other structured document formats where licensing and technical feasibility permit.

Import should convert external content into the Book Model rather than permanently making an imported format the internal source of truth.

Export targets include:

- EPUB;
- PDF;
- HTML;
- project archive/backup.

---

# 25. Project Management

A book project shall support:

- New;
- Open;
- Save;
- Save As;
- backup;
- autosave;
- project metadata;
- asset management;
- recovery after unexpected shutdown;
- validation state;
- publication history where practical.

The project must remain usable without an internet connection for core non-cloud functionality.

---

# 26. Search and Navigation

The application shall provide:

- full-book search;
- replace;
- chapter navigation;
- heading navigation;
- asset search;
- issue navigation;
- next-best-action navigation.

Future versions may support advanced semantic and AI-assisted search.

---

# 27. Accessibility of the OpenBook Application

The application UI itself should follow accessibility principles.

Requirements include:

- keyboard navigation;
- accessible controls;
- visible focus;
- meaningful labels;
- sensible contrast;
- scalable UI text where practical;
- screen-reader-aware semantics where supported by the desktop framework.

---

# 28. Internationalization

The product architecture shall support:

- Unicode throughout;
- localized UI strings;
- translated documentation;
- multilingual manuscripts;
- Indic scripts;
- RTL scripts;
- language-specific metadata;
- script-appropriate fonts and shaping.

The first engineering tests should include at least English plus an Indic language and a mixed-script document.

---

# 29. Privacy and Data Ownership

OpenBook shall respect user ownership of book content.

Requirements:

- local projects must remain accessible without cloud services;
- AI provider selection must be visible;
- local AI should be supported where practical;
- cloud AI should not receive manuscript content without an action or configuration that permits it;
- user books must not be claimed as OpenBook property;
- project files should remain portable.

---

# 30. FOSS and Extension Requirements

OpenBook should be designed as an extensible platform.

Future extension points may include:

- plugins;
- themes;
- templates;
- publishing profiles;
- validators;
- AI providers;
- import/export adapters;
- cover providers;
- accessibility rules;
- community translations;
- automation/API integrations.

Third-party components must be tracked according to the project's licensing policy.

---

# 31. Community Features

Future community infrastructure should support:

- contribution documentation;
- issue reporting;
- feature requests;
- themes;
- templates;
- translations;
- publishing rules;
- test books;
- tutorials;
- plugins.

The application may eventually provide an in-product "Help improve OpenBook" pathway.

---

# 32. MVP Definition

The first meaningful MVP should focus on a complete guided book journey rather than a large number of isolated features.

## MVP must include

### Foundation

- desktop application shell;
- Book Model;
- project creation/open/save;
- autosave/recovery foundation.

### Writing

- structured editor;
- chapters/sections;
- headings;
- basic formatting;
- search;
- word count.

### Guidance

- Book Wizard;
- Beginner Mode;
- next-best-action guidance;
- contextual help.

### Design

- basic themes;
- typography assistant;
- chapter styling;
- cover basics.

### Structure

- front/main/back matter;
- automatic TOC/navigation.

### Publishing

- metadata wizard;
- EPUB generation;
- PDF generation at an appropriate initial level;
- HTML generation where feasible.

### Quality

- Book Doctor foundation;
- EPUB validation integration;
- publication readiness view.

### Preview

- integrated EPUB-oriented preview;
- basic responsive preview.

### AI

- provider abstraction;
- at least one practical AI workflow;
- Ollama integration path.

### Internationalization

- Unicode-safe architecture;
- multilingual test fixtures.

---

# 33. Post-MVP Professional Expansion

After the MVP, priority areas should include:

1. advanced DTP;
2. professional typography;
3. stronger PDF preflight;
4. richer EPUB capabilities;
5. advanced import/export;
6. accessibility automation;
7. advanced AI editorial assistance;
8. plugins/extensions;
9. collaboration/cloud synchronization;
10. publishing adapters.

Priorities should be validated against real user feedback rather than assumed solely from this document.

---

# 34. User Journey — Target End State

The ideal journey is:

```text
IDEA
 ↓
BOOK WIZARD
 ↓
OUTLINE
 ↓
WRITE
 ↓
STRUCTURE
 ↓
DESIGN
 ↓
TYPESET
 ↓
COVER
 ↓
METADATA
 ↓
BOOK DOCTOR
 ↓
PREVIEW
 ↓
VALIDATE
 ↓
PUBLISH
```

At every stage the system should answer:

> **What should I do next?**

---

# 35. Acceptance Principles

A feature should not be considered complete merely because it technically works.

It should satisfy four dimensions:

### Functional

The feature performs the intended task.

### Usability

A beginner can understand how to use it.

### Professional

An expert has sufficient control or a clear extension path.

### Publishing Integrity

The feature does not compromise the structured Book Model or downstream publishing correctness.

---

# 36. Product Quality Gates

Every major release should pass progressively stronger gates:

### Gate A — Product integrity

Requirements are implemented as specified.

### Gate B — Book Model integrity

No feature creates an incompatible second source of truth.

### Gate C — Publishing integrity

Outputs are generated deterministically where practical and are validated.

### Gate D — Accessibility

Core accessibility checks pass.

### Gate E — Internationalization

Unicode and multilingual fixtures pass.

### Gate F — UX

Beginner workflows can be completed without expert publishing knowledge.

### Gate G — Regression

Existing books and workflows remain functional.

---

# 37. Success Metrics

Initial product metrics should focus on user outcomes rather than raw feature count.

Potential measures include:

- time from new project to first valid EPUB;
- percentage of first-time users completing a book workflow;
- number of unresolved critical Book Doctor findings before export;
- successful EPUB validation rate;
- successful PDF generation rate;
- number of manual technical interventions required;
- multilingual test success rate;
- accessibility issue detection rate;
- user-reported confidence in publishing;
- community contribution activity.

Metrics should be refined after usability testing.

---

# 38. Requirements Governance

This document is the product baseline.

Cursor Cloud Agent, contributors, and future maintainers should not invent major product behaviour that conflicts with this specification without documenting the proposed change.

Changes should be classified as:

- clarification;
- minor enhancement;
- requirement change;
- architectural consequence;
- scope expansion.

Major requirement changes should be reviewed before implementation.

---

# 39. Next Engineering Documents

After approval of this product requirements baseline, the next documents should be:

1. `ARCHITECTURE.md` — technical architecture and component boundaries;
2. `FOSS_STRATEGY.md` — FOSS research, integration and independent implementation strategy;
3. `LICENSING_POLICY.md` — project and third-party licensing rules;
4. `ROADMAP.md` — implementation phases and milestones;
5. `CONTRIBUTING.md` — community contribution process.

Only after these foundation documents are sufficiently stable should Cursor Cloud Agent begin major application implementation.

---

## Product North Star

> **A first-time author should be able to say, “I have a book idea,” and OpenBook should guide that person all the way to a professional, validated, publishable book—without taking away control from an expert.**
