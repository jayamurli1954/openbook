# OpenBook Studio — Third-Party Reference Policy

**Status:** Foundation policy
**Project:** OpenBook Studio
**Maintainer / Project Steward:** SanMitra Tech Solutions

## 1. Purpose

OpenBook may refer to established open-source projects, standards, products, tools and organizations when documenting research, interoperability, inspiration, competitive context, or technical choices.

A reference to a third-party project does **not**, by itself, mean that OpenBook incorporates, redistributes, forks, derives from, is affiliated with, or is endorsed by that project.

This policy works together with `FOSS_STRATEGY.md` and `LICENSING_POLICY.md`.

> **Reference openly. Integrate deliberately. Copy only when the applicable rights permit it and the use has been reviewed.**

---

## 2. Naming Third-Party Projects

OpenBook documentation may identify third-party projects by their ordinary project names when doing so is relevant to the documentation.

Examples include:

- Sigil
- Scribus
- Calibre
- EPUBCheck
- Pandoc
- Booktype
- LibreOffice
- Inkscape
- Krita
- ImageMagick
- Tauri
- React
- TypeScript
- Tiptap / ProseMirror
- Ollama

Mentioning a project name for identification or discussion is not the same as incorporating its software.

OpenBook must not imply sponsorship, endorsement, partnership, ownership, or affiliation unless such a relationship actually exists.

---

## 3. Reference Categories

Every third-party reference should be understood as one of the following categories:

| Category | Meaning |
|---|---|
| **REFERENCE** | Named only for research, comparison, explanation or interoperability context. |
| **INSPIRE** | Functionality or workflow is studied and independently implemented. |
| **USE** | An external application, executable or service is used through a defined interface. |
| **EMBED** | Code/library/component is distributed as part of OpenBook. |
| **ADAPT** | Third-party source code is modified and distributed. |
| **ASSET** | Font, artwork, template, model, dataset or other protected material is redistributed. |

`REFERENCE` and `INSPIRE` do not constitute permission to copy source code, assets, documentation, branding or other protected material.

`USE`, `EMBED`, `ADAPT` and `ASSET` require the licensing/provenance review defined by `LICENSING_POLICY.md`.

---

## 4. FOSS Project Reference Map

The following examples are reference relationships, not blanket permissions to use or redistribute the projects:

| Project | OpenBook reference area | Default relationship |
|---|---|---|
| Sigil | EPUB editing and authoring workflows | REFERENCE / INSPIRE |
| Scribus | Professional DTP workflows | REFERENCE / INSPIRE |
| Calibre | Ebook management and conversion workflows | REFERENCE / INSPIRE |
| EPUBCheck | EPUB conformance validation | REFERENCE / USE candidate |
| Pandoc | Document conversion and intermediate representations | REFERENCE / USE candidate / INSPIRE |
| Booktype | Book-production workflows | REFERENCE / INSPIRE |
| LibreOffice | Office-document interoperability | REFERENCE / USE candidate / INSPIRE |
| Inkscape | Vector graphics workflows | REFERENCE / USE candidate |
| Krita | Raster illustration workflows | REFERENCE / USE candidate |
| ImageMagick | Image processing | REFERENCE / USE candidate |

The exact license, version and distribution conditions must be recorded before a project moves from `REFERENCE` or `INSPIRE` to `USE`, `EMBED`, `ADAPT` or `ASSET`.

---

## 5. Safe Documentation Language

Preferred wording:

- "OpenBook studied the workflow used by ..."
- "... is a reference project for OpenBook's ... capability."
- "OpenBook is inspired by established FOSS publishing workflows."
- "OpenBook provides an independent implementation of this capability."
- "OpenBook may use ... as an external tool subject to license review."
- "The project is evaluated for interoperability."

Avoid wording that could falsely imply incorporation or affiliation:

- "OpenBook contains Sigil technology" unless verified and specifically documented;
- "OpenBook is based on Scribus" unless that is factually and legally accurate;
- "OpenBook incorporates Calibre" unless the actual component and license are documented;
- "OpenBook is an official EPUBCheck product" unless an official relationship exists;
- "OpenBook is endorsed by ..." unless documented evidence exists.

---

## 6. Independent Implementation

When OpenBook independently implements a capability after studying a third-party project:

1. identify the user-visible capability or standards requirement;
2. document the functional requirement;
3. prefer published standards as the technical authority;
4. design the capability around the OpenBook Book Model;
5. implement original OpenBook code;
6. test against requirements and standards;
7. record any remaining legal review items.

Independent implementation is not a universal legal safe harbor. Copyright, patents, trademarks, database rights, trade secrets and other rights may still be relevant depending on the facts.

---

## 7. Documentation and Copyright

OpenBook contributors must not copy substantial portions of third-party documentation into OpenBook documentation unless the applicable license or permission allows it.

Short factual descriptions, project names, links, compatibility information and properly attributed references may be used where appropriate.

When reproducing third-party documentation, code, screenshots, diagrams, examples, logos or other material, verify the applicable rights first.

---

## 8. Trademarks and Branding

Third-party project names and logos may be trademarks or otherwise protected branding.

OpenBook should use names only as reasonably necessary to identify the referenced project and should not imitate third-party branding.

Do not place a third-party logo in OpenBook's own branding, splash screen, marketing identity or product badge unless the applicable permission or trademark policy allows the use.

---

## 9. Screenshots, Images and Examples

A project name may be freely useful for identification while a screenshot, logo, icon, illustration, template or other visual asset may have separate rights.

Therefore:

- do not assume that a publicly accessible image is freely reusable;
- do not copy screenshots into product documentation without checking rights;
- prefer OpenBook-created diagrams for architecture documentation;
- prefer links to upstream project pages for detailed third-party visuals;
- record provenance for any third-party visual asset actually redistributed.

---

## 10. Source-Code Provenance

No third-party source code should enter OpenBook merely because:

- it is publicly visible;
- it is available on GitHub;
- it is labelled open source;
- an AI coding tool can retrieve it;
- it solves the required problem.

Before incorporating third-party code, record at minimum:

```text
Project
Repository
Version/commit
File/component
License
Copyright notices
Integration method
Distribution model
Required notices/source obligations
Compatibility assessment
Approval
```

---

## 11. AI-Assisted Development

AI-generated code is subject to the same provenance requirements as human-written code.

If an AI tool proposes code that appears to originate from a third-party project, the contributor must stop and perform provenance/license review before submitting it.

A statement such as "the AI generated it" is not sufficient evidence that the code is free of third-party rights.

---

## 12. Standards Versus Implementations

Where a capability is defined by an open technical standard, OpenBook should target the standard rather than reproduce the implementation of a particular application.

For example:

```text
Publishing standard
        ↓
Functional requirements
        ↓
OpenBook design
        ↓
Independent implementation
        ↓
Conformance testing
```

A third-party application may be an important reference implementation, but its source code is not thereby incorporated into OpenBook.

---

## 13. Review Trigger

Escalate a third-party reference for licensing/legal review when OpenBook intends to:

- copy or adapt source code;
- bundle an executable or library;
- distribute a modified fork;
- redistribute a font, image, logo, template or artwork;
- reproduce substantial documentation;
- distribute model weights or datasets;
- use third-party branding in a way that could imply affiliation;
- rely on a license whose scope or compatibility is unclear.

---

## 14. Relationship to Other Policies

This policy does not replace:

- `LICENSING_POLICY.md` for software and asset licensing;
- `FOSS_STRATEGY.md` for strategic classification of FOSS projects;
- `CONTRIBUTING.md` for contributor obligations;
- `ARCHITECTURE.md` for technical integration boundaries.

If documents conflict, the more restrictive licensing/provenance control should be followed until the conflict is resolved.

---

## 15. Final Rule

> **OpenBook may openly identify, discuss, study and learn from third-party projects. That does not grant OpenBook permission to copy, modify, redistribute or brand itself with those projects. Any actual incorporation or redistribution must pass a separate license, provenance and—where appropriate—trademark review.**
