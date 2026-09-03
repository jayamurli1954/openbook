# OpenBook Licensing Policy

**Status:** Foundation policy — draft for legal review where required  
**Project:** OpenBook Studio  
**Maintainer / Project Steward:** SanMitra Tech Solutions

## 1. Purpose

This document defines how OpenBook handles software licenses, third-party dependencies, fonts, templates, artwork, documentation, community contributions, generated content, and the project's own license.

The objective is to keep OpenBook genuinely open-source while making its legal and technical boundaries understandable to contributors and users.

This policy is an engineering and project-governance policy, not legal advice. Material licensing questions should be reviewed by qualified counsel before distribution.

---

## 2. Core Principles

1. **Know what we ship.** Every distributed component must have an identified provenance and license.
2. **Prefer permissive dependencies for the core.** MIT, BSD, and Apache-2.0 are preferred where technically appropriate.
3. **Respect copyleft.** GPL, LGPL, AGPL and similar licenses are not to be bypassed or silently incorporated.
4. **Separate where appropriate.** Strong-copyleft tools may be used as external programs/processes when the architecture and distribution model genuinely support that separation.
5. **Never copy code merely because it is open source.** Open source grants rights subject to its license; it does not eliminate attribution or license obligations.
6. **Fonts and creative assets receive the same scrutiny as source code.**
7. **User content remains the user's content.** OpenBook does not claim ownership of books, manuscripts, covers, images, or other content created/imported by users.
8. **Community contributions need clear IP provenance.**
9. **Automate compliance checks.** License inventories and notices should be generated and checked in CI where practical.
10. **When uncertain, stop and review before distributing.**

---

## 3. OpenBook's Own License

**Status:** Accepted (ADR-0003). The authoritative project license text is `LICENSE`.

OpenBook's original project code and other original works that the project explicitly places under its project license use the **Apache License 2.0**.

Apache-2.0 was selected for ecosystem and commercial adoption, an explicit patent license from contributors (subject to the license terms), and compatibility with a broad plugin/service ecosystem. AGPL-3.0-or-later was considered and **rejected as the default project license** (ADR-0003). AGPL remains possible only for a separately distributed component if a future ADR specifically calls for it.

Accepted is not an eternal freeze: changing the project license later requires a new ADR and maintainer approval. Until then:

- contributors and agents must not assume AGPL (or any other license) for OpenBook's own code;
- new original source files must not embed contradictory license headers;
- third-party components retain their own licenses; Apache-2.0 does not relicense them;
- `NOTICE` and, when shipping third-party artefacts, `THIRD-PARTY-NOTICES.txt` must be maintained.

See `CONTRIBUTOR_PROTECTION_AND_ATTRIBUTION.md` for copyright retention and attribution. CLA/DCO remains a pending contributor-agreement decision and does not alter Apache-2.0.

---

## 4. Third-Party Software Classification

Every external project considered for OpenBook should be classified as one of:

| Classification | Meaning | Default treatment |
|---|---|---|
| **USE** | External application/tool used without incorporating its source | Preferred for strong-copyleft tools where practical |
| **EMBED** | Library/code incorporated into OpenBook | Requires license compatibility review |
| **ADAPT** | Source code modified and distributed as part of OpenBook | Requires full license and attribution review |
| **INSPIRE** | Functionality/UX studied and independently implemented | Preferred when we only need the idea/behavior |
| **AVOID** | License, provenance, patent, security, maintenance or architecture risk is unacceptable | Do not use |

The FOSS strategy document is the primary reference for project-specific classification.

---

## 5. Preferred Embedded Licenses

For new dependencies, the default preference is:

1. MIT
2. BSD-2-Clause
3. BSD-3-Clause
4. Apache-2.0
5. Other permissive licenses after review

This is a preference, not an absolute prohibition on copyleft dependencies.

A dependency may be accepted when its license is compatible and the dependency provides substantial technical value that cannot reasonably be replaced.

---

## 6. Copyleft Dependencies

OpenBook will explicitly track GPL-family dependencies.

### GPL

If GPL-licensed source is embedded or linked into a distributed OpenBook component, the resulting licensing obligations must be evaluated before distribution.

### LGPL

LGPL dependencies may be considered for embedding when the applicable version and integration mechanism permit it, but the exact obligations must be documented.

### AGPL

AGPL dependencies receive additional scrutiny because of their network-use provisions.

Where an AGPL application can provide the required functionality as a genuinely separate external process, an adapter/process architecture may be considered. This is **not** an automatic legal exemption; the actual integration, distribution and licensing facts must be reviewed.

### Policy rule

**No contributor may add a GPL/AGPL dependency to the core merely because “it is open source.”**

Before acceptance, record:

- project and version;
- license;
- exact use;
- static/dynamic/process relationship;
- distribution model;
- source-code obligations;
- attribution requirements;
- compatibility assessment;
- maintainer approval where required.

---

## 7. External Tools and Process Boundaries

OpenBook may use external FOSS tools through explicit adapters or subprocesses when this is architecturally appropriate.

Examples may include:

- EPUB validation;
- document conversion;
- image processing;
- PDF preflight;
- rendering;
- optional import/export utilities.

The OpenBook application must not falsely represent an external project as part of OpenBook's own codebase.

For each external tool, document:

```text
Tool
Version
License
Purpose
Invocation method
Input/output contract
Distribution requirement
Attribution requirement
Security considerations
``` 

Process separation must never be treated as a blanket way to avoid license obligations.

---

## 8. Fonts

Fonts are a separate IP category and require explicit provenance tracking.

For every bundled font, record:

- font family;
- version;
- designer/foundry;
- source URL or repository;
- license;
- redistribution permission;
- modification permission;
- embedding permission;
- attribution requirement;
- reserved font name restrictions, if applicable.

### Font policy

- Prefer fonts with licenses permitting redistribution and embedding.
- Do not bundle a font merely because it is freely downloadable.
- Do not assume that a font's source code license or repository license covers the font files.
- Do not modify a font unless its license permits modification.
- Preserve required notices.

Indic, CJK, RTL and accessibility-oriented fonts must receive the same provenance review.

---

## 9. Templates, Themes and Artwork

OpenBook may distribute:

- book templates;
- cover templates;
- typography themes;
- icons;
- illustrations;
- sample books;
- UI artwork;
- publishing profiles.

Each asset must have a recorded license/provenance.

### Community assets

Community contributors must confirm that they have the rights necessary to submit the asset and that the proposed contribution is compatible with the OpenBook project's distribution model.

Do not accept:

- copied commercial templates;
- unlicensed stock images;
- trademarked artwork without permission;
- fonts without redistribution rights;
- assets whose provenance cannot be established.

---

## 10. User Content and Intellectual Property

OpenBook is a publishing tool. Users retain ownership of content they create or import, subject to rights they may separately grant to third parties.

Examples include:

- manuscripts;
- stories;
- poetry;
- research;
- photographs;
- illustrations;
- cover artwork;
- metadata supplied by the user;
- audio/video content;
- user-created templates.

OpenBook's software license does not transfer ownership of user content to SanMitra Tech Solutions or the OpenBook community.

Users remain responsible for ensuring that imported or published content does not infringe third-party rights.

---

## 11. AI-Generated Content

OpenBook may support local and cloud AI providers.

AI output must not automatically be treated as OpenBook-owned IP.

The application should preserve provenance where practical, especially for:

- generated text;
- generated images;
- AI-assisted edits;
- generated metadata;
- AI-created themes or templates.

Users remain responsible for reviewing AI output and determining whether they have sufficient rights to publish it.

OpenBook should never claim that AI output is automatically copyrightable, royalty-free, or safe for commercial publication.

### Local AI

Ollama and other local providers may be used without sending manuscript content to a remote provider, subject to the user's selected models and their individual licenses.

Model licenses must therefore be tracked independently from OpenBook's software license.

---

## 12. Community Contributions

OpenBook intends to welcome contributions from:

- developers;
- authors;
- editors;
- designers;
- translators;
- accessibility specialists;
- publishers;
- testers;
- educators;
- documentation contributors;
- AI practitioners.

A contributor must have the right to submit the contribution.

The contribution must not knowingly include third-party material whose license is incompatible with the project requirements.

The exact contributor mechanism — CLA, DCO, or another documented approach — will be finalized in `CONTRIBUTING.md` before the community contribution program becomes significant.

### Important principle

OpenBook does **not** automatically require contributors to assign copyright to SanMitra Tech Solutions unless a future contributor agreement explicitly says so and is accepted by the contributor.

The preferred direction is to obtain sufficient project rights to maintain, modify, redistribute and relicense the contribution consistently with the project's governance model, while allowing contributors to retain their underlying authorship rights where practical.

---

## 13. Copyright Notices and Attribution

Required attribution must be preserved.

OpenBook should maintain:

```text
THIRD-PARTY-NOTICES.txt
```

and, where appropriate:

```text
licenses/
  component-name.txt
```

Attributions may also appear in an in-app About / Licenses screen when appropriate.

---

## 14. SPDX and Machine-Readable License Data

Dependencies should be represented using SPDX identifiers wherever possible.

Examples:

```text
MIT
Apache-2.0
BSD-3-Clause
GPL-3.0-only
AGPL-3.0-or-later
```

For multiple licenses, use valid SPDX expressions where applicable rather than informal descriptions.

The project should eventually maintain a machine-readable dependency inventory containing:

- package name;
- version;
- source repository;
- license expression;
- copyright holder;
- direct/transitive status;
- distribution status;
- notice requirement;
- review status.

---

## 15. Automated License Compliance

CI should eventually include automated checks for:

- dependency license discovery;
- incompatible-license detection;
- missing attribution;
- changed dependency versions;
- duplicate/conflicting licenses;
- bundled font provenance;
- third-party notices;
- SPDX metadata consistency.

Automation is a control, not a substitute for human legal review.

---

## 16. Dependency Change Policy

Before adding a new dependency, the contributor should answer:

1. Why is it needed?
2. Could OpenBook implement the required behavior independently?
3. What is the license?
4. Is the license compatible with the proposed OpenBook architecture?
5. Is it actively maintained?
6. Does it introduce significant security or supply-chain risk?
7. Does it bring transitive dependencies with different licenses?
8. Does it require attribution?
9. Does it affect redistribution?
10. Is there a suitable lower-risk alternative?

Dependencies that cannot answer these questions should not enter the production build until reviewed.

---

## 17. Forks and Modified FOSS Projects

If OpenBook decides to fork a FOSS project, the project must preserve the original project's applicable requirements, including where relevant:

- license notices;
- copyright notices;
- source availability requirements;
- modification notices;
- attribution;
- accompanying license text;
- trademark restrictions;
- required distribution terms.

A fork must remain clearly distinguishable from the upstream project unless trademark permissions say otherwise.

---

## 18. Independent Reimplementation

OpenBook may independently implement functionality observed in other FOSS applications without copying their source code, subject to applicable legal considerations.

For important components, maintainers may use a clean functional specification:

```text
Observed capability
↓
Behavioral requirements
↓
OpenBook design
↓
Independent implementation
↓
OpenBook tests
```

Do not copy:

- source code;
- distinctive protected assets;
- proprietary templates;
- documentation beyond permitted use;
- trademarks/branding;
- restricted fonts or artwork.

Patent considerations must still be evaluated where relevant.

---

## 19. License Firewall

OpenBook's architecture should maintain deliberate boundaries between:

```text
OpenBook Core
    ↓
Permissively licensed embedded dependencies

External FOSS Tools
    ↓
Adapters / process interfaces where appropriate

Community Extensions
    ↓
Explicit extension license + provenance

User Content
    ↓
User-owned content and assets
```

This architecture reduces accidental license contamination and makes the system easier to audit.

It does not replace a legal compatibility analysis.

---

## 20. Trademark and Brand

Software licensing and trademark rights are separate.

The name **OpenBook**, the OpenBook Studio identity, logos, visual identity and related marks must be handled separately from the software license.

The project should establish a trademark policy before accepting widespread third-party redistributions that use the OpenBook name.

Forks may be allowed to reuse source code according to the software license while being required to use a different name and branding.

---

## 21. License Review Triggers

Mandatory review should occur when:

- adding a GPL/AGPL dependency;
- changing a major dependency license;
- bundling a new font;
- bundling third-party artwork;
- adding a new commercial/cloud AI provider;
- distributing model weights;
- forking an external project;
- accepting a substantial third-party code contribution;
- changing OpenBook's own license;
- creating a commercial distribution;
- introducing hosted/network functionality with copyleft components;
- redistributing user-provided or community-provided templates/assets.

---

## 22. Release Compliance Gate

Before an official release, the release checklist should confirm:

- [ ] OpenBook license is present and correct.
- [ ] Dependency inventory is current.
- [ ] SPDX identifiers are valid where applicable.
- [ ] Third-party notices are generated and reviewed.
- [ ] Font licenses are verified.
- [ ] Bundled assets have provenance records.
- [ ] AI models/providers are documented.
- [ ] Copyleft dependencies have been reviewed.
- [ ] Required source/notices accompany applicable components.
- [ ] No known unlicensed copied assets are included.
- [ ] Trademark/branding requirements are respected.
- [ ] User-content ownership language is consistent with product documentation.

---

## 23. Recommended Repository Files

As the project matures, the repository should contain:

```text
LICENSE
NOTICE
THIRD-PARTY-NOTICES.txt
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
FOSS_STRATEGY.md
LICENSING_POLICY.md
```

Potential future machine-readable files:

```text
licenses/dependencies.spdx.json
licenses/fonts.json
licenses/assets.json
```

---

## 24. Policy Governance

This policy should evolve as OpenBook moves from prototype to public release.

Changes to the following require explicit maintainer approval:

- OpenBook's own license;
- contributor IP terms;
- dependency license policy;
- trademark policy;
- commercial redistribution policy.

The policy must remain aligned with:

- `PROJECT_VISION.md`;
- `PRODUCT_REQUIREMENTS.md`;
- `ARCHITECTURE.md`;
- `FOSS_STRATEGY.md`;
- `CONTRIBUTING.md`.

---

## 25. Final Principle

> **Open source is a permission system, not a permission-free system.**

OpenBook will build on the work of the FOSS community responsibly: study openly, reuse lawfully, attribute correctly, isolate where appropriate, implement independently when useful, and document what we distribute.

The goal is a publishing platform that is open not only in source code, but also in engineering discipline, provenance and community trust.
