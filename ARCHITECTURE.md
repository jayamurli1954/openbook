# OpenBook Studio — Technical Architecture

**Status:** Foundation Draft v1.0  
**Depends on:** `PROJECT_VISION.md`, `PRODUCT_REQUIREMENTS.md`  
**Product:** OpenBook Studio  
**Project steward:** SanMitra Tech Solutions

---

## 1. Purpose

This document establishes the technical architecture and engineering boundaries for OpenBook Studio before major application implementation begins.

The architecture is intentionally modular. Individual technologies may evolve, but the architectural contracts in this document should remain stable unless a deliberate architecture review approves a change.

The central architectural rule is:

> **The Book Model is the single source of truth. All authoring, design, DTP, AI, validation, preview, and publishing capabilities must operate around it rather than creating competing representations of the book.**

---

# 2. Architectural Goals

The architecture shall prioritize:

1. Book Model integrity.
2. Local-first operation for core functionality.
3. Cross-platform desktop support.
4. Standards-compliant publishing.
5. Deterministic generation where practical.
6. Progressive complexity for users.
7. AI provider independence.
8. Unicode-first and multilingual support.
9. Accessibility.
10. FOSS-friendly modularity.
11. Testability.
12. Security and privacy.
13. Extensibility through well-defined interfaces.
14. Portability of user projects.

---

# 3. Architectural North Star

```text
                         OPENBOOK STUDIO
                                |
                  +-------------+-------------+
                  |                           |
                  v                           v
             Presentation                Application Core
                  |                           |
       +----------+----------+        +-------+--------+
       |          |          |        |                |
       v          v          v        v                v
    Writing     Design     DTP    Book Services    AI Services
       |          |          |        |                |
       +----------+----------+--------+----------------+
                                |
                         +------v------+
                         |  BOOK MODEL |
                         +------+------+
                                |
          +---------------------+----------------------+
          |                     |                      |
          v                     v                      v
     EPUB Engine           PDF Engine             HTML Engine
          |                     |                      |
          v                     v                      v
     EPUBCheck            PDF Preflight           HTML QA
          |                     |                      |
          +---------------------+----------------------+
                                |
                         +------v------+
                         |   PREVIEW   |
                         +-------------+
```

The diagram represents logical boundaries, not necessarily separate processes.

---

# 4. Recommended Technology Baseline

The initial desktop implementation should use:

- **Tauri** for the cross-platform desktop shell;
- **React + TypeScript** for the application UI;
- **Tiptap / ProseMirror** or an equivalent semantic editor architecture for structured authoring;
- **SQLite** for local project persistence;
- **TypeScript** for the primary application/domain layer;
- **Rust** within Tauri where native integration or performance-sensitive functionality requires it;
- **Ollama** through a provider abstraction for local AI;
- **EPUBCheck** or an appropriate standards validator for EPUB validation;
- standard Git/GitHub workflows for source control and collaboration;
- automated CI for tests, linting, dependency/license checks, and security scanning.

These are the initial recommendations, not immutable commitments. Any substitution must preserve the architectural contracts defined below.

---

# 5. Desktop-First Architecture

OpenBook should initially be a desktop-first application because book production benefits from:

- local filesystem access;
- large workspaces;
- keyboard-heavy editing;
- professional DTP controls;
- local fonts and assets;
- offline operation;
- local AI;
- predictable project storage.

Target platforms should ultimately include:

- Windows;
- macOS;
- Linux.

A future web/cloud experience may reuse domain and publishing packages but should not force the desktop application to depend on cloud infrastructure.

---

# 6. Logical Architecture Layers

OpenBook should be separated into the following logical layers.

## Layer 1 — Presentation

Responsible for:

- UI;
- navigation;
- panels;
- dialogs;
- commands;
- accessibility of the application UI;
- Beginner/Expert modes;
- preview interaction.

Presentation code should not directly manipulate raw database records or EPUB package files.

## Layer 2 — Application Services

Responsible for user-facing workflows such as:

- create book;
- add chapter;
- apply theme;
- run Book Doctor;
- generate EPUB;
- generate PDF;
- run validation;
- invoke AI assistance;
- export project.

## Layer 3 — Domain / Book Model

Contains the canonical structured representation of the book.

This is the most important layer.

## Layer 4 — Infrastructure

Provides:

- SQLite persistence;
- filesystem access;
- asset storage;
- process execution;
- configuration;
- logging;
- external integrations.

## Layer 5 — Publishing and Validation Engines

Responsible for deterministic transformation of the Book Model into publishing outputs and validating those outputs.

---

# 7. Book Model

The Book Model is the canonical domain representation.

Conceptually:

```text
Book
├── Metadata
├── Structure
│   ├── FrontMatter
│   ├── MainMatter
│   └── BackMatter
├── Content Nodes
├── Styles / Theme
├── Layout Configuration
├── Assets
├── Publishing Configuration
├── Validation State
└── Project Information
```

The Book Model should be versioned.

A project file must not be dependent on the internal implementation details of the editor UI.

---

# 8. Domain Model Principles

### 8.1 Semantic over visual

The domain should represent semantic meaning such as heading, paragraph, quote, image, caption, note, chapter and section rather than merely storing visual coordinates.

### 8.2 Output-neutral core

The core model must not be designed specifically for EPUB or PDF.

### 8.3 Extensible schema

The model must permit future node types and metadata without invalidating older projects.

### 8.4 Versioned migrations

Schema changes must use explicit migrations.

### 8.5 Validation before publication

Domain validation should happen before output generation where possible.

---

# 9. Conceptual Book Model Schema

The exact schema will be defined separately, but the conceptual structure is:

```text
BookProject
├── projectId
├── schemaVersion
├── book
│   ├── metadata
│   ├── structure
│   ├── content
│   ├── styles
│   ├── layout
│   ├── assets
│   └── publishing
├── settings
└── audit / history metadata
```

Content should use a structured document representation compatible with semantic editing.

---

# 10. Persistence Architecture

The initial application should use local SQLite for project metadata and structured state.

A project should remain portable.

Possible project structure:

```text
MyBook.openbook/
├── project.db
├── assets/
│   ├── images/
│   ├── audio/
│   ├── video/
│   └── fonts/
├── exports/
├── previews/
├── backups/
└── project-manifest.json
```

The exact packaging strategy may change during implementation, but the following requirements are fixed:

- project must be portable;
- assets must be traceable;
- backups must be possible;
- generated outputs should be distinguishable from source project data;
- temporary files must not become the source of truth.

---

# 11. Repository / Package Architecture

The project should begin as a monorepo to reduce unnecessary coordination overhead.

Recommended conceptual structure:

```text
openbook/
├── apps/
│   └── desktop/
├── packages/
│   ├── book-model/
│   ├── editor/
│   ├── themes/
│   ├── assets/
│   ├── epub/
│   ├── pdf/
│   ├── html/
│   ├── validator/
│   ├── previewer/
│   ├── ai-core/
│   ├── accessibility/
│   ├── import-export/
│   └── shared/
├── services/
│   └── ai-providers/
├── tests/
├── fixtures/
├── docs/
└── scripts/
```

The exact directory layout can be adjusted by the implementation agent if package boundaries remain clear.

---

# 12. Dependency Direction

Dependencies should flow toward the domain, not away from it.

Preferred direction:

```text
UI
 ↓
Application Services
 ↓
Domain / Book Model
 ↑
Infrastructure Adapters

Publishing Engines
 ↓
Book Model

AI Services
 ↓
Application Services / Domain Commands
```

The Book Model must not depend on the UI framework, database implementation, Ollama, EPUB package structure, or PDF renderer.

This is a critical architectural constraint.

---

# 13. Command / Service Pattern

User actions should preferably enter the system through application commands/services rather than direct mutation of arbitrary state.

Examples:

```text
CreateBook
AddChapter
MoveChapter
UpdateMetadata
ApplyTheme
InsertImage
GenerateTOC
RunBookDoctor
GenerateEPUB
GeneratePDF
GenerateHTML
ValidateEPUB
ExportProject
```

This makes operations easier to test, log, undo, and expose to future automation/API layers.

---

# 14. Undo / Redo and Change Management

The editor must provide reliable undo/redo.

The architecture should avoid irreversible direct mutations wherever practical.

Future versions may support:

- named revisions;
- snapshots;
- version history;
- collaborative changes.

The Book Model should remain recoverable after failed operations.

---

# 15. Writing Engine

The writing engine should use a semantic document model.

It should support:

- headings;
- paragraphs;
- lists;
- emphasis;
- links;
- quotes;
- images;
- captions;
- tables;
- notes as the architecture evolves.

The writing engine must not encode visual presentation directly into content when a semantic style reference is sufficient.

---

# 16. Design System

Design should be represented using reusable theme and style definitions.

Conceptually:

```text
Theme
├── Typography
├── Colours
├── Spacing
├── Chapter Styles
├── Paragraph Styles
├── Image Styles
├── Table Styles
└── Output Rules
```

Themes should be portable and potentially shareable through the future extension system.

---

# 17. DTP Architecture

DTP should operate as a presentation layer over the structured Book Model.

The architecture must distinguish:

- semantic content;
- logical styles;
- layout rules;
- page-specific geometry;
- output-specific rendering.

The DTP subsystem may maintain layout information necessary for fixed-layout outputs without contaminating the semantic core with renderer-specific implementation details.

Conceptually:

```text
Book Model
    ↓
Style Resolution
    ↓
Layout Engine
    ↓
Page Model
    ↓
PDF / Print Renderer
```

A page-layout representation may be generated from the Book Model rather than becoming the primary manuscript representation.

---

# 18. EPUB Architecture

The EPUB engine shall be a deterministic publisher from the Book Model.

Conceptually:

```text
Book Model
    ↓
Semantic Transformation
    ↓
XHTML + CSS + Resources
    ↓
Package Document
    ↓
Navigation
    ↓
Manifest / Spine
    ↓
EPUB Package
    ↓
EPUB Validator
```

The generated EPUB must never become the source of truth for the project.

---

# 19. PDF Architecture

The PDF pipeline should be:

```text
Book Model
    ↓
Style Resolution
    ↓
Layout Engine
    ↓
Page Model
    ↓
PDF Renderer
    ↓
PDF Preflight / QA
```

The architecture should allow future support for multiple PDF production profiles.

---

# 20. HTML Architecture

HTML should be generated from semantic Book Model structures.

```text
Book Model
    ↓
Semantic HTML Transformer
    ↓
HTML + CSS + Assets
    ↓
HTML QA
```

HTML should not require an EPUB export as an intermediate source.

---

# 21. Validation Architecture

Validation must be independent from AI.

There should be several validation levels:

### Level 1 — Domain validation

Checks Book Model integrity.

### Level 2 — Structural validation

Checks content structure and semantics.

### Level 3 — Output validation

Checks generated EPUB/PDF/HTML outputs.

### Level 4 — Accessibility validation

Checks relevant accessibility requirements.

### Level 5 — Preflight

Checks production-specific requirements.

Conceptually:

```text
                 Book Model
                     |
          +----------+----------+
          |                     |
          v                     v
     Domain Validator      Book Doctor
          |                     |
          +----------+----------+
                     |
               Publishing
                     |
       +-------------+-------------+
       |             |             |
      EPUB          PDF          HTML
       |             |             |
   EPUBCheck     PDF QA        HTML QA
       |             |             |
       +-------------+-------------+
                     |
                Publication
                  Readiness
```

---

# 22. Book Doctor Architecture

Book Doctor should be a rule-driven analysis framework rather than one giant AI prompt.

Conceptually:

```text
Book Doctor
├── Content Rules
├── Structure Rules
├── Metadata Rules
├── Accessibility Rules
├── Typography Rules
├── Asset Rules
├── EPUB Rules
├── PDF Rules
└── Publishing Rules
```

Each rule should ideally provide:

- rule ID;
- severity;
- description;
- affected object;
- evidence;
- suggested remediation;
- safe auto-fix capability where applicable.

AI can explain a finding, but the underlying finding should preferably come from deterministic rules or validated tooling.

---

# 23. AI Architecture

AI must be isolated behind a provider abstraction.

```text
                     AI Service
                         |
                 +-------+-------+
                 | Provider API   |
                 +-------+-------+
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
       Ollama         Cloud A        Cloud B
```

The application should not contain business logic tied directly to a single model provider.

AI functions should be represented as capabilities, for example:

```text
OutlineSuggestion
WritingSuggestion
RewriteText
SummarizeChapter
SuggestMetadata
SuggestAltText
ExplainIssue
SuggestTypography
SuggestNextAction
```

---

# 24. AI Safety Boundary

The following separation is mandatory:

```text
AI
 ↓
Suggestion / Explanation
 ↓
User Approval or Controlled Command
 ↓
Book Model
 ↓
Deterministic Publisher
 ↓
Validator
```

AI must not directly write arbitrary files into a final EPUB package, bypass validation, or silently alter the project database.

AI-generated content should be treated as untrusted input until accepted through the application layer.

---

# 25. Ollama Integration

Ollama should be implemented as one provider adapter.

The adapter should handle:

- model discovery where supported;
- connection status;
- prompt/request execution;
- timeout handling;
- model capability information where available;
- errors;
- privacy status.

The core application should remain functional when Ollama is unavailable.

---

# 26. Asset Architecture

All assets should have managed identities and metadata.

An asset record should conceptually contain:

- asset ID;
- type;
- path/reference;
- MIME type;
- dimensions where applicable;
- resolution where applicable;
- language/description where applicable;
- alt text;
- licensing/provenance information;
- usage references.

The system should prevent accidental orphaning or duplication of assets where practical.

---

# 27. Font Architecture

Fonts are a special asset category because licensing is distinct from ordinary image/content licensing.

The system should track:

- font family;
- font files;
- style/weight;
- source;
- license/provenance;
- permitted usage where known.

OpenBook should not redistribute a font merely because it is available on the user's computer.

---

# 28. Import / Export Architecture

Importers should convert external formats into the Book Model.

```text
DOCX ----\
Markdown ---\
HTML -------> Import Adapter -> Book Model
EPUB ------/
```

Exporters should convert the Book Model into external formats.

```text
Book Model ----> EPUB
           \----> PDF
            \---> HTML
             \--> Project Archive
```

This ensures that import/export formats do not become hidden internal dependencies.

---

# 29. Preview Architecture

Preview should consume output-oriented representations rather than inventing a completely separate rendering model.

For EPUB:

```text
Book Model
   ↓
EPUB Renderer / Preview Representation
   ↓
Reading-System-like Preview
```

For PDF:

```text
Book Model
   ↓
Layout Engine
   ↓
PDF/Page Preview
```

Preview must be as close as practical to the actual generated output.

---

# 30. Publishing Profiles

Publishing profiles should be data/configuration driven rather than hard-coded throughout the application.

A profile may specify:

- output type;
- metadata requirements;
- page dimensions;
- typography defaults;
- validation rules;
- cover requirements;
- accessibility requirements;
- platform-specific constraints.

Future publishing platforms can therefore be added through adapters/profiles without redesigning the Book Model.

---

# 31. Plugin Architecture

OpenBook should eventually support plugins.

Plugins may extend:

- importers;
- exporters;
- themes;
- publishing profiles;
- AI providers;
- validators;
- asset providers;
- UI panels;
- automation.

Plugin APIs must be versioned.

Plugins should not receive unrestricted access to user content or filesystem resources without explicit permission boundaries.

The first MVP should avoid creating an unnecessarily complex plugin runtime; establish extension points first and implement a mature plugin ecosystem later.

---

# 32. Security Architecture

Security requirements include:

- least-privilege filesystem access;
- safe handling of imported files;
- validation of paths;
- prevention of path traversal;
- safe subprocess execution;
- no arbitrary command execution from untrusted book content;
- safe archive extraction;
- secure handling of external AI credentials;
- protection of local project data;
- dependency vulnerability scanning.

EPUB/HTML content should be treated as potentially untrusted when imported or previewed.

---

# 33. AI and Security Boundary

AI providers must never receive secrets or unrelated project data.

The AI request layer should explicitly control:

- selected content;
- context size;
- provider;
- model;
- permissions;
- whether external transmission is permitted.

Cloud AI should not silently receive an entire manuscript merely because the user asks for help with one paragraph.

---

# 34. Observability and Diagnostics

The application should maintain structured diagnostic logs without unnecessarily recording manuscript content.

Diagnostics should help identify:

- application failures;
- publishing failures;
- validation failures;
- AI provider failures;
- import/export failures;
- performance problems.

Sensitive content must not be included in logs by default.

---

# 35. Testing Architecture

Testing is a core architectural requirement.

## Unit tests

For:

- Book Model;
- commands;
- transformations;
- validation rules;
- style resolution;
- metadata handling.

## Integration tests

For:

- persistence;
- import/export;
- AI provider adapters;
- EPUB generation;
- PDF generation;
- validation.

## End-to-end tests

For complete journeys such as:

```text
Create Book
 → Add Chapters
 → Apply Theme
 → Add Cover
 → Metadata
 → Generate EPUB
 → Validate
 → Preview
```

## Fixture books

The repository should maintain representative test books including:

- simple English book;
- long-form book;
- image-heavy book;
- table-heavy book;
- Kannada/Indic-script book;
- mixed-language book;
- RTL test book;
- accessibility test book;
- malformed/import test books.

---

# 36. Golden Output Testing

Publishing engines should use golden fixtures where practical.

A known Book Model should produce an expected structural/output result.

Tests should detect unintended changes to:

- EPUB package structure;
- XHTML;
- CSS;
- navigation;
- metadata;
- PDF page count/layout characteristics where deterministic;
- HTML structure.

Binary comparison alone should not be the only PDF/EPUB test method; semantic and structural assertions are also required.

---

# 37. Continuous Integration

GitHub Actions should eventually run:

- formatting checks;
- linting;
- unit tests;
- integration tests;
- end-to-end tests;
- build verification;
- dependency/license checks;
- security scanning;
- packaging checks.

Pull requests should not be merged when mandatory quality gates fail.

---

# 38. FOSS Dependency Boundary

Third-party dependencies should be selected according to the project's licensing policy.

The architecture should make it possible to use some GPL/AGPL tools as carefully isolated external components where legally appropriate, while avoiding accidental incorporation of incompatible copyleft code into permissively licensed core modules.

This is an architectural risk-management principle, not a substitute for legal review.

Exact license decisions belong in `LICENSING_POLICY.md`.

---

# 39. External Process Boundary

Where an external FOSS application is used as a command-line or process-level tool, OpenBook should interact through a documented adapter.

Conceptually:

```text
OpenBook
   |
Adapter
   |
External Tool
```

The project must not assume that process separation automatically resolves every licensing obligation. Distribution, linking, communication mechanisms, and the specific license must be reviewed.

---

# 40. Cloud Architecture — Future

Cloud services are not required for the core desktop MVP.

Future cloud capabilities may include:

- account management;
- synchronization;
- collaboration;
- backups;
- publishing automation;
- shared team libraries;
- community resources.

A future architecture may look like:

```text
Desktop OpenBook
      |
 Optional Sync
      |
      v
Cloud API
      |
 +----+----------------+
 |                     |
 v                     v
Project Storage     Community
                    Resources
```

The desktop Book Model must remain portable and should not become dependent on cloud connectivity.

---

# 41. API-Ready Architecture

Even if the first release has no public API, application services should be structured so that future APIs can invoke controlled operations.

For example:

```text
UI -----------\
CLI ------------> Application Services -> Book Model
Future API ----/
```

This avoids forcing a later API to bypass domain rules.

---

# 42. CLI — Future

A future OpenBook CLI may support:

```text
openbook create
openbook validate
openbook doctor
openbook build epub
openbook build pdf
openbook build html
openbook export
```

The CLI should reuse the same domain and publishing packages as the desktop application.

---

# 43. Data Migration Strategy

The Book Model schema must be versioned from the first implementation.

Every schema change should have:

- version identifier;
- migration procedure;
- rollback/recovery consideration;
- compatibility test;
- fixture coverage.

Old projects should not become unreadable merely because the application is upgraded.

---

# 44. Performance Principles

The application should remain responsive with realistically large books.

Performance-sensitive areas include:

- editor rendering;
- large manuscripts;
- image handling;
- layout calculation;
- EPUB generation;
- PDF generation;
- search;
- validation;
- AI context preparation.

Heavy operations should be asynchronous and provide progress feedback.

Rust should be introduced where profiling demonstrates a real need rather than prematurely moving the whole application into Rust.

---

# 45. Accessibility Architecture

Accessibility should be addressed at two levels:

### OpenBook application accessibility

The desktop UI should support keyboard navigation, accessible labels, focus management and appropriate assistive-technology semantics.

### Published book accessibility

The Book Model must retain the semantic information required to generate accessible outputs.

The distinction is important:

```text
Accessible OpenBook UI
        ≠
Accessible Book Output
```

Both are required.

---

# 46. Internationalization Architecture

All user-facing strings should be externalized for localization.

The domain should store language information explicitly.

Text processing must preserve Unicode correctly.

Rendering and font handling must support complex scripts and shaping.

Test fixtures must include multilingual and mixed-script content from early development.

---

# 47. Error Handling Principles

Errors should be:

- actionable;
- categorized;
- traceable;
- safe;
- understandable to beginners;
- technically detailed in Expert Mode.

Example:

Beginner:

> "One image is too small for good print quality. Replace it with a higher-resolution image."

Expert:

> "Image asset IMG-014 is 1200×800 px and is placed at an effective 180 DPI. Recommended minimum: 300 DPI for the selected print profile."

The same underlying diagnostic should power both experiences.

---

# 48. Configuration Architecture

Configuration should distinguish:

- application settings;
- user preferences;
- project settings;
- publishing profiles;
- AI provider configuration;
- theme configuration.

Secrets should never be stored in ordinary project configuration files in plaintext.

---

# 49. Backup and Recovery

The system should provide:

- autosave;
- crash recovery;
- project backup;
- exportable project archive;
- safe-save mechanisms.

A failed export must never corrupt the source Book Model.

---

# 50. Architecture Decision Records

Important technology or architecture decisions should be recorded as ADRs under a future `docs/adr/` directory.

Examples:

- ADR-001: Desktop framework selection;
- ADR-002: Book Model representation;
- ADR-003: Editor selection;
- ADR-004: PDF rendering strategy;
- ADR-005: EPUB engine strategy;
- ADR-006: AI provider abstraction;
- ADR-007: Plugin security model.

The purpose is to prevent repeated debates and undocumented architectural drift.

---

# 51. Implementation Rules for Cursor Cloud Agent

Cursor Cloud Agent is an implementation assistant, not the product owner.

The agent should:

1. Read `PROJECT_VISION.md` before implementation.
2. Read `PRODUCT_REQUIREMENTS.md` before implementation.
3. Read this architecture document before implementation.
4. Preserve the Book Model as the source of truth.
5. Avoid introducing unnecessary dependencies.
6. Avoid replacing architectural boundaries merely for convenience.
7. Ask for clarification when a requirement is materially ambiguous.
8. Document significant deviations.
9. Add tests with new domain functionality.
10. Never silently add major product scope.
11. Never copy third-party source code unless the license and project policy permit its use.
12. Keep user content and secrets out of logs.
13. Prefer small, reviewable changes.
14. Do not consider a feature complete merely because the UI renders; domain, persistence, publishing and tests must be considered together.

---

# 52. Implementation Sequence

The recommended engineering sequence is:

### Phase A — Repository and application foundation

- desktop shell;
- TypeScript configuration;
- package architecture;
- testing foundation;
- lint/format/build pipeline.

### Phase B — Book Model

- schema;
- persistence;
- migrations;
- commands;
- project lifecycle.

### Phase C — Writing Studio

- semantic editor;
- chapters;
- structure;
- basic styles.

### Phase D — Publishing foundation

- EPUB engine;
- validation;
- HTML;
- initial PDF pipeline.

### Phase E — Design and DTP

- themes;
- typography;
- page model;
- layout engine;
- advanced PDF.

### Phase F — Book Doctor

- rule framework;
- diagnostics;
- accessibility checks;
- safe fixes.

### Phase G — AI

- provider abstraction;
- Ollama;
- guided AI workflows.

### Phase H — Preview and polish

- integrated preview;
- responsive preview;
- publication readiness;
- UX refinement.

### Phase I — Extensions and integrations

- plugins;
- import/export expansion;
- publishing adapters;
- CLI/API.

---

# 53. Architecture Quality Gates

Before declaring the architecture implementation-ready:

- [ ] Book Model is defined independently of UI/database/output formats.
- [ ] Domain schema versioning is defined.
- [ ] Persistence boundaries are defined.
- [ ] Editor cannot become the source of truth.
- [ ] EPUB cannot become the source of truth.
- [ ] PDF cannot become the source of truth.
- [ ] AI cannot bypass domain/publishing rules.
- [ ] Publishing engines consume the Book Model.
- [ ] Validators are independent of AI.
- [ ] Asset and font provenance can be tracked.
- [ ] Unicode/multilingual requirements are testable.
- [ ] Security boundaries are documented.
- [ ] Testing strategy includes fixture books.
- [ ] FOSS licensing decisions have a documented process.
- [ ] Future plugin boundaries are identifiable.

---

# 54. Architecture Decision: Source of Truth

**Decision:** The Book Model is the only canonical source of truth for a project.

**Consequences:**

- editor state must synchronize into the model;
- EPUB is generated from the model;
- PDF is generated from the model;
- HTML is generated from the model;
- preview is derived from the model/output pipeline;
- AI changes are applied through controlled domain operations;
- imported formats are converted into the model.

This decision is fundamental and should not be casually changed.

---

# 55. Architecture Decision: AI Is Not the Publishing Engine

**Decision:** AI is an advisory/assistance layer, not the authoritative publishing engine.

**Consequences:**

- AI may suggest;
- users or controlled commands accept changes;
- deterministic engines generate outputs;
- validators verify outputs;
- AI may explain validation findings but cannot override them.

---

# 56. Architecture Decision: Local-First Core

**Decision:** Core authoring and publishing functionality must work without cloud AI or cloud infrastructure.

**Consequences:**

- local project storage;
- offline authoring;
- local publishing;
- local validation where supported;
- optional local AI;
- optional cloud services.

---

# 57. Architecture Decision: Modular Publishing Engines

**Decision:** EPUB, PDF and HTML are separate publishing engines sharing the Book Model.

This avoids creating a single monolithic renderer with output-specific assumptions throughout the application.

---

# 58. Architecture Decision: Progressive Complexity

**Decision:** Beginner and Expert experiences share the same domain and application services.

Only presentation and exposed controls differ.

This prevents the common failure mode where "Beginner Mode" becomes a separate simplified product with a dead-end upgrade path.

---

# 59. Architecture Decision: Build for Extension, Not Plugin Complexity

**Decision:** Establish clean extension interfaces early, but defer a full plugin marketplace/runtime until the core product is stable.

This keeps the MVP manageable while protecting the long-term open ecosystem vision.

---

# 60. Final Architectural Principle

OpenBook should be engineered as a **book-production platform**, not as a collection of independent tools.

The architecture should preserve this chain:

```text
                    USER
                     |
                     v
                OPENBOOK UI
                     |
                     v
             APPLICATION SERVICES
                     |
                     v
                BOOK MODEL
                     |
       +-------------+-------------+
       |             |             |
       v             v             v
      EPUB          PDF          HTML
       |             |             |
       v             v             v
   VALIDATION      PREFLIGHT      QA
       |             |             |
       +-------------+-------------+
                     |
                     v
              PUBLICATION READY
```

> **Build the Book Model first. Build every major capability around it. Let AI assist it, let deterministic engines publish it, and let validators verify the result.**
