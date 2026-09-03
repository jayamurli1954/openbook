# Contributing to OpenBook Studio

Thank you for considering contributing to **OpenBook Studio**.

OpenBook is an open-source publishing platform intended to help people **write, design, typeset, validate and publish books** from one coherent workflow.

We welcome contributions from developers, authors, editors, designers, publishers, translators, accessibility specialists, testers, educators and AI/open-source enthusiasts.

You do not need to be a professional software developer to contribute.

---

## 1. Our Contribution Philosophy

OpenBook is intended to be built **with the community, not merely for the community**.

Useful contributions include:

- source code;
- bug fixes;
- tests;
- documentation;
- UX research;
- author workflow feedback;
- design systems;
- themes;
- cover templates;
- translations;
- accessibility reviews;
- sample books;
- publishing standards expertise;
- tutorials;
- issue triage;
- FOSS research;
- AI experiments;
- performance improvements.

A good contribution does not have to be large.

---

## 2. Who Can Contribute?

### Developers

Help with:

- TypeScript;
- React;
- Tauri;
- Rust;
- Book Model;
- publishing engines;
- validation;
- testing;
- performance;
- security;
- plugins.

### Authors

Help us understand:

- real writing workflows;
- where new authors get stuck;
- book structure;
- editing needs;
- publishing requirements.

### Editors

Help with:

- editorial workflows;
- proofreading;
- style consistency;
- references;
- manuscript preparation.

### Designers / DTP Specialists

Help with:

- typography;
- page layout;
- master pages;
- covers;
- themes;
- print production;
- visual QA.

### Accessibility Specialists

Help validate:

- semantic structure;
- screen-reader behavior;
- navigation;
- alternative text;
- keyboard operation;
- contrast;
- accessible EPUB/PDF workflows.

### Translators

Help localize OpenBook and test multilingual publishing, especially Indic and RTL workflows.

### Testers

Help discover:

- bugs;
- regression cases;
- unusual book structures;
- Unicode problems;
- import/export failures;
- rendering differences.

### Publishers / Educators

Help us understand real-world production requirements and workflows.

---

## 3. Before You Start

Please read the foundation documents relevant to your contribution:

1. `PROJECT_VISION.md`
2. `PRODUCT_REQUIREMENTS.md`
3. `ARCHITECTURE.md`
4. `FOSS_STRATEGY.md`
5. `LICENSING_POLICY.md`
6. `ROADMAP.md`

These documents explain why OpenBook is being built the way it is.

If a proposed change conflicts with the architecture, raise the issue before implementing it.

---

## 4. Core Architectural Rules

All contributors should understand these principles.

### 4.1 Book Model Is the Source of Truth

The Book Model is the canonical representation of a book.

Do not create a second hidden source of truth inside an editor, exporter or plugin.

### 4.2 EPUB Is an Output

EPUB is a publishing format, not OpenBook's internal authoring model.

### 4.3 AI Is an Assistant

AI may suggest, explain, classify or transform content, but it must not become the authority for publishing correctness.

### 4.4 Publishing Must Be Deterministic

Publishing engines should operate from the Book Model using explicit rules.

### 4.5 Validation Is Mandatory

Generated publishing output must be validated through the appropriate validation pipeline.

### 4.6 Beginner Mode Matters

Professional functionality must not make the beginner workflow unnecessarily complicated.

### 4.7 Internationalization Is Not Optional

Do not assume that text is English-only or left-to-right.

### 4.8 Accessibility Is a Core Requirement

Accessibility should be considered at the data-model, editor and publishing layers.

---

## 5. Ways to Contribute

You can contribute through several paths.

```text
CODE
  │
  ├── features
  ├── bug fixes
  ├── refactoring
  └── performance

CONTENT
  │
  ├── documentation
  ├── tutorials
  └── sample books

DESIGN
  │
  ├── UX
  ├── themes
  ├── covers
  └── typography

QUALITY
  │
  ├── testing
  ├── accessibility
  ├── security
  └── interoperability

COMMUNITY
  │
  ├── translation
  ├── issue triage
  ├── author feedback
  └── standards/FOSS research
```

---

## 6. Finding Something to Work On

Look for GitHub issues labelled, where available:

- `good first issue`
- `help wanted`
- `documentation`
- `translation`
- `design`
- `accessibility`
- `testing`
- `beginner-author`
- `bug`
- `enhancement`

If you want to work on something that is not already an issue, open a proposal first for substantial changes.

Avoid spending significant effort on a feature that conflicts with the roadmap or architecture.

---

## 7. Issue Reports

A useful bug report should include:

- OpenBook version/commit;
- operating system;
- reproduction steps;
- expected behavior;
- actual behavior;
- sample book/project if safe to share;
- relevant logs;
- screenshots where useful;
- whether the issue is reproducible;
- whether it affects EPUB, PDF, HTML or all outputs.

For publishing problems, include the smallest possible reproducible book fixture.

Never upload private manuscripts or confidential material without permission.

---

## 8. Feature Proposals

A useful feature proposal should explain:

1. the user problem;
2. who experiences it;
3. the proposed behavior;
4. alternatives considered;
5. impact on the Book Model;
6. impact on EPUB/PDF/HTML output;
7. accessibility considerations;
8. internationalization considerations;
9. licensing/dependency implications;
10. testing requirements.

For major architectural changes, an ADR may be required.

---

## 9. Development Workflow

The preferred workflow is:

```text
Issue / Proposal
      ↓
Understand requirements
      ↓
Check architecture
      ↓
Create branch
      ↓
Implement
      ↓
Add tests
      ↓
Run validation
      ↓
Update documentation
      ↓
Open Pull Request
      ↓
Review
      ↓
CI
      ↓
Merge
```

Do not bypass tests simply because a change appears small.

---

## 10. Pull Requests

A good pull request should:

- have a focused purpose;
- describe the user problem;
- explain the solution;
- identify affected components;
- include tests;
- update documentation when required;
- identify breaking changes;
- identify dependency/license changes;
- avoid unrelated formatting churn.

### PR checklist

Before submitting:

- [ ] The change addresses a documented requirement or issue.
- [ ] The architecture remains consistent.
- [ ] Book Model implications were considered.
- [ ] Tests were added or updated.
- [ ] Existing tests pass.
- [ ] Accessibility implications were considered.
- [ ] Internationalization implications were considered.
- [ ] Documentation was updated where appropriate.
- [ ] New dependencies were reviewed.
- [ ] Licensing/provenance was checked for new third-party material.
- [ ] No private user content was committed.
- [ ] Generated files are intentional.

---

## 11. Coding Guidelines

The project will establish detailed linting and formatting rules as implementation matures. Until then:

- prefer readable code over clever code;
- keep functions/components focused;
- use meaningful names;
- avoid unnecessary abstractions;
- document non-obvious decisions;
- handle errors explicitly;
- do not silently discard publishing errors;
- keep deterministic publishing logic separate from UI concerns;
- avoid putting business rules directly into React components;
- preserve testability.

For architecture-level behavior, update the relevant documentation or ADR.

---

## 12. Testing Expectations

Tests are part of the contribution, not an optional follow-up.

Depending on the change, use:

- unit tests;
- integration tests;
- end-to-end tests;
- Book Model fixtures;
- publishing golden files;
- EPUB validation;
- visual regression tests;
- accessibility tests;
- import/export round-trip tests;
- performance tests.

### Publishing changes

A change affecting publishing should normally include at least one representative fixture and a regression test.

### Bug fixes

Whenever practical:

```text
Bug
 ↓
Failing regression test
 ↓
Fix
 ↓
Passing test
```

---

## 13. Test Book Fixtures

Do not use real private manuscripts as permanent test data.

Use synthetic or openly licensed fixtures covering:

- fiction;
- poetry;
- technical books;
- image-heavy books;
- table-heavy books;
- multilingual content;
- Kannada/Indic scripts;
- RTL text;
- accessibility cases;
- intentionally broken EPUB structures;
- complex DTP layouts.

Each fixture should have a clear license/provenance record.

---

## 14. FOSS Contributions and Dependencies

Before introducing third-party code, assets or dependencies, consult `FOSS_STRATEGY.md` and `LICENSING_POLICY.md`.

Classify significant FOSS usage as:

- **USE**
- **EMBED**
- **ADAPT**
- **INSPIRE**
- **AVOID**

Do not copy code from another project merely because it solves a similar problem.

If a dependency's license is unclear, stop and ask for review.

---

## 15. Third-Party Code and Provenance

For every significant new third-party dependency, record where it came from and why it is being used.

The project should maintain an auditable dependency inventory.

Do not add:

- copied snippets of unclear origin;
- unlicensed fonts;
- unlicensed cover artwork;
- copied templates without verified rights;
- proprietary assets without permission.

---

## 16. Fonts, Themes, Templates and Artwork

Contributors may submit fonts, themes, templates, illustrations and other assets only when they have the right to distribute them under the proposed project terms.

Every community asset should have:

- creator/source;
- license;
- attribution requirement;
- modification permission;
- redistribution permission;
- provenance record.

When uncertain, do not submit the asset until the rights are clarified.

---

## 17. AI-Generated Contributions

AI tools may be used to assist development, documentation, testing or design.

However, the contributor remains responsible for the contribution.

Contributors must:

- review AI-generated code before submission;
- ensure it does not knowingly contain incompatible third-party code;
- verify dependencies and licenses;
- verify technical correctness;
- run the appropriate tests;
- disclose material AI assistance when project policy or a contribution workflow requires it.

AI-generated output must not be treated as automatically free of copyright, licensing or security concerns.

---

## 18. AI Features Inside OpenBook

Contributions involving AI should preserve the project's AI architecture.

AI output should generally follow:

```text
AI suggestion
      ↓
User review / deterministic rule
      ↓
Book Model
      ↓
Publishing engine
      ↓
Validation
```

AI must not directly write arbitrary publishing packages and declare them valid.

For local AI integrations, document:

- model/provider;
- model license where relevant;
- expected hardware/resource requirements;
- privacy behavior;
- fallback behavior.

---

## 19. Accessibility Contributions

Accessibility is a first-class contribution area.

Reviewers should consider:

- keyboard navigation;
- focus management;
- semantic HTML;
- heading structure;
- alternative text;
- link purpose;
- colour contrast;
- screen-reader behavior;
- accessible navigation;
- language metadata;
- table semantics;
- EPUB accessibility requirements.

If you identify an accessibility problem, please report it even when you cannot implement the fix yourself.

---

## 20. Internationalization and Translation

OpenBook aims to support a global author community.

Contributors should avoid:

- hard-coded English strings;
- assumptions about word boundaries;
- assumptions about text direction;
- fixed character widths;
- ASCII-only processing;
- English-only typography rules.

Translation contributions should preserve meaning rather than translate technical terms blindly.

Priority language work may include Kannada, Hindi and other Indian languages, as well as RTL languages.

---

## 21. Documentation Contributions

Documentation contributions are highly valuable.

You can improve:

- installation guides;
- user guides;
- tutorials;
- FAQ material;
- troubleshooting;
- publishing terminology explanations;
- developer documentation;
- architecture documentation;
- accessibility guidance;
- translation documentation.

A documentation contribution does not require programming skills.

---

## 22. Author and User Testing

Authors can contribute by testing real workflows and reporting where they become confused.

Useful feedback includes:

- "I don't know what to do next."
- "I don't understand this publishing term."
- "I expected this chapter to behave differently."
- "The EPUB looks different from the preview."
- "The PDF page break is wrong."
- "This language does not render correctly."
- "I cannot understand this validation error."

These observations are valuable product requirements.

---

## 23. Design Contributions

Designers can contribute:

- interface improvements;
- design-system components;
- typography systems;
- book themes;
- cover templates;
- onboarding flows;
- empty states;
- error states;
- accessibility improvements.

Design submissions should explain:

- target user;
- intended workflow;
- interaction behavior;
- accessibility considerations;
- responsive behavior where applicable.

---

## 24. Beginner Mode and Expert Mode

When adding a feature, ask:

> Does this need to be visible to a first-time author?

If not, consider placing it behind Expert Mode or an advanced panel.

OpenBook should progressively expose complexity rather than present professional publishing terminology immediately.

---

## 25. Safe Automation

Automation is welcome, but automated actions must be reversible or clearly communicated when they alter user content.

Examples:

- automatic backups;
- safe formatting fixes;
- metadata suggestions;
- image optimization;
- validation;
- deterministic conversion.

AI or automated tools should not silently rewrite a manuscript or alter publishing-critical data.

---

## 26. Security

Please report security vulnerabilities privately rather than publishing exploit details in a public issue.

Do not include:

- credentials;
- API keys;
- private manuscripts;
- personal data;
- proprietary documents;
- secrets;

in issues, pull requests or test fixtures.

The project will maintain a dedicated security reporting process as the repository matures.

---

## 27. Community Conduct

Contributors are expected to:

- be respectful;
- assume good faith;
- focus criticism on ideas and implementations;
- welcome beginners;
- explain technical decisions clearly;
- avoid harassment or discrimination;
- respect different levels of technical expertise;
- help maintain a constructive community.

A formal `CODE_OF_CONDUCT.md` should be added before the community grows significantly.

---

## 28. Contribution Rights and Licensing

OpenBook is an open-source project maintained/stewarded by SanMitra Tech Solutions.

The project's own source-code license is governed by the decision recorded in `LICENSING_POLICY.md` and the license files present in the repository.

Unless a future contribution agreement states otherwise, contributors should retain ownership of their original contributions while granting the project the rights necessary to use, modify, reproduce and distribute those contributions under the project's applicable licensing model.

The project may introduce a formal Contributor License Agreement (CLA) or Developer Certificate of Origin (DCO) after community and legal review.

No contributor should assume that submitting a pull request automatically transfers copyright ownership.

---

## 29. Copyright and Attribution

Contributors are responsible for ensuring that they have the right to submit their contributions.

Do not submit material copied from proprietary software, paid templates, copyrighted books, commercial fonts or other sources unless the rights clearly permit the contribution.

When attribution is required, include it in the appropriate project notice or asset metadata.

---

## 30. Ownership of the OpenBook Project

OpenBook is initiated and stewarded by **SanMitra Tech Solutions**.

This includes responsibility for:

- project direction;
- official releases;
- project infrastructure;
- official branding;
- trademark/brand decisions;
- roadmap stewardship;
- release management.

Open-source participation does not mean that the project has no owner or steward.

Contributors remain important members of the community and retain their rights according to the project's contribution and licensing terms.

---

## 31. Community Themes and Extensions

Community-created themes, templates and extensions should clearly identify:

- creator;
- version;
- license;
- compatibility version;
- dependencies;
- limitations;
- provenance.

The project should eventually provide a formal extension manifest format.

Do not assume that a community extension is automatically part of the official OpenBook distribution.

---

## 32. Roadmap Alignment

Before implementing a large feature, check `ROADMAP.md`.

The preferred order is:

```text
MVP
  ↓
Professional Publishing / DTP
  ↓
AI-Assisted Publishing
  ↓
Ecosystem
```

A technically interesting feature may still be postponed if it distracts from the current milestone.

---

## 33. When an ADR Is Needed

An Architecture Decision Record should normally be considered when a proposal changes:

- Book Model structure;
- persistence format;
- publishing engine contracts;
- dependency architecture;
- licensing strategy;
- plugin interfaces;
- public APIs;
- security boundaries;
- import/export architecture;
- AI provider architecture.

Small implementation choices do not necessarily require an ADR.

---

## 34. Review Principles

Reviewers should ask:

1. Does this solve a real user problem?
2. Is the implementation consistent with the architecture?
3. Does it preserve Book Model integrity?
4. Does it preserve deterministic publishing?
5. Does it introduce unnecessary dependencies?
6. Are licensing/provenance requirements satisfied?
7. Is it accessible?
8. Does it work with international text?
9. Are tests sufficient?
10. Is the user experience clearer after the change?

---

## 35. Recognition

OpenBook should recognize contributions across all disciplines.

Future community recognition may include:

- founding contributors;
- code contributors;
- documentation contributors;
- accessibility contributors;
- translators;
- author testers;
- design contributors;
- FOSS contributors;
- release testers;
- community mentors.

Contribution is not measured only by lines of code.

---

## 36. First Author Program

A future **First Author Program** will invite new authors to create books with OpenBook and report their experience.

Participants can contribute by documenting:

- where they became confused;
- what terminology was unclear;
- which workflow was difficult;
- what they expected to happen;
- where publishing failed;
- which features they wished existed.

This feedback will directly inform product requirements and usability improvements.

---

## 37. Help Improve OpenBook

OpenBook should eventually provide an in-app contribution path such as:

> **Help improve OpenBook**

Possible actions:

- Report a problem
- Suggest a feature
- Submit a translation
- Share author feedback
- Review accessibility
- Contribute a theme
- Contribute a sample book
- Help documentation

The objective is to make community participation possible without requiring contributors to understand Git first.

---

## 38. Final Principle

> **If you can help make book creation easier, publishing safer, accessibility better, or the FOSS ecosystem stronger, you can contribute to OpenBook.**

OpenBook should be a place where a professional developer, a first-time author, a designer, a translator and an accessibility expert can all make meaningful contributions.
