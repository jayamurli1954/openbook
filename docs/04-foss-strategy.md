# 04 — FOSS Strategy

**Status of this document:** The five-class system is **DECIDED**. Every row in the landscape table is **research**, not adoption. No dependency is approved.

## 1. Why this exists

OpenBook is to be a **serious FOSS project**. The usual failure is to assemble a product by pulling in Sigil, Calibre, Scribus, Chromium, a PDF engine, and an AI SDK until the licence graph and the architecture are both unmaintainable.

Classification happens **before** import, submodule, vendoring, or “temporary” scaffolding.

## 2. The five classes (DECIDED)

| Class | Meaning | Allowed in OpenBook tree? |
| --- | --- | --- |
| **USE** | Library or tool can legally be incorporated (linked, vendored, or shipped as a component we rely on) | Yes, after ADR + licence re-verification |
| **ADAPT** | We may modify upstream where the licence permits, and we can maintain a fork or patch series | Yes, after ADR; record upstream and patch policy |
| **INSPIRE** | We study capability and UX, then implement ourselves against the Book Model | No upstream code. Notes and screenshots in docs only |
| **EXTERNAL** | Runs as an independent tool or service. OpenBook may *invoke* it if the user has it, or document a pipeline | Not incorporated. Integration is a port, not a merge |
| **AVOID** | Unacceptable technical or licensing risk | No. Do not study via copy-paste; do not wrap; do not “just this once” |

**INSPIRE is not a loophole for copying source.** Clean-room discipline: read behaviour, write original code, do not paste.

## 3. Gates (DECIDED)

No candidate moves into USE or ADAPT until all of the following are true:

1. **Project licence is DECIDED** (currently OPEN). USE/ADAPT compatibility is meaningless before that.
2. Upstream licence text is **re-verified** at the version we intend to take (not from memory, not from this table).
3. An ADR records: class, version, SPDX id, link to licence, why alternatives were rejected, maintenance owner.
4. Patent, trademark, and font/licence-special cases are called out.
5. The candidate does not force OpenBook to become a conventional EPUB editor or a second Book Model.

**PROPOSED additional gates:**

- Network-calling SDKs need a data-boundary ADR, not only a licence ADR.
- Copyleft engines (GPL) as USE typically force the project licence toward GPL-compatible copyleft, or force EXTERNAL instead. That is a Product Owner choice, not an engineer’s surprise.

## 4. Project licence (OPEN, blocking)

This repository currently has **no `LICENSE` file**. GitHub reports `licenseInfo: null`.

Until the Product Owner chooses a licence, **nothing may be classified USE or ADAPT except as a hypothetical**.

**PROPOSED decision factors** (not a recommendation disguised as fact):

| Direction | Consequence for OpenBook |
| --- | --- |
| Strong copyleft (GPLv3) | Easier to USE GPL editors/engines; harder for proprietary forks; some app-store friction |
| Weak copyleft (MPL-2.0, LGPLv3 for libraries) | File-level or library-level sharing; more licence graph work |
| Permissive (Apache-2.0, MIT) | Easy downstream; **cannot** incorporate GPL code as USE; GPL tools must stay EXTERNAL or INSPIRE |
| Dual licence | Governance cost; must be explicit |

**Do not add a LICENSE file in an engineering PR unless the Product Owner names the licence.**

## 5. How to classify a candidate

**PROPOSED** questions, in order:

1. Do we need this *capability*, or this *codebase*?
2. If we only need capability/UX → **INSPIRE** (default for peer applications: Sigil, Scribus, InDesign, Vellum).
3. If we need a maintained standard tool as a black box (EPUBCheck CLI) → prefer **EXTERNAL**, promote to USE only if embedding is required and licences allow.
4. If we need a library inside our process → SPDX + project licence compatibility → USE or reject.
5. If we must patch → ADAPT, with a fork policy.
6. Proprietary, licence-incompatible, ethically disallowed, or architecturally toxic → **AVOID**.

## 6. Landscape (research only, 2026-09-03)

Licences below were checked against public project pages and GitHub licence metadata on **2026-09-03**. **Re-verify before any ADR.** This table does not authorize code.

### 6.1 Peer applications (default INSPIRE)

| Project | Role people will compare us to | Public licence (research) | Proposed class | Why |
| --- | --- | --- | --- | --- |
| Sigil | EPUB editor | GPL-3.0 | **INSPIRE** (not USE) | Using it would make OpenBook an EPUB editor with a shell |
| Calibre | Library + convert + edit | GPL-3.0 | **INSPIRE** / possible **EXTERNAL** convert CLI later | Conversion is a pipeline, not our model |
| Scribus | FOSS DTP | GPL-2.0-or-later (mixed third-party) | **INSPIRE** (not USE) | We need DTP *capability*, not Scribus-as-core |
| LibreOffice Writer | Writing + export | MPL-2.0 preferred for new files; mixed | **INSPIRE** / **EXTERNAL** import | Office documents are import sources |
| Pandoc | Conversion Swiss army knife | GPL-2.0-or-later | **EXTERNAL** candidate | Fine as a user-installed importer; merging it in is a licence+identity risk |
| Thorium Reader | Reading/preview of EPUB | BSD-3-Clause | **INSPIRE** for reading UX; **USE** only if we truly embed Readium and licence allows | Preview must not become “whatever Thorium does” |
| Vellum, Atticus, InDesign, Affinity | Commercial book/DTP | Proprietary | **AVOID** as code; **INSPIRE** for UX study only | No incorporation |

### 6.2 Validators and checkers (named in architecture)

| Project | Role | Public licence (research) | Proposed class | Notes |
| --- | --- | --- | --- | --- |
| EPUBCheck (W3C / DAISY) | EPUB validation | BSD-3-Clause | **EXTERNAL** default; **USE** only after project licence + ADR | Product Owner *named the capability*. Java runtime bundling is a separate decision |
| Ace by DAISY | EPUB accessibility evaluation | MIT (research) | OPEN class | Strong candidate for Book Doctor; still not adopted |
| PDF preflight | Print/PDF-UA/PDF/X | **OPEN** which engine | OPEN | No engine has been named. Do not pick one in code |

### 6.3 Projection-related engines (none adopted)

| Project | Role | Public licence (research) | Proposed class | Notes |
| --- | --- | --- | --- | --- |
| Paged.js | Paginated HTML/CSS | MIT (research) | OPEN | Tempting HTML→PDF path; risks making HTML the real model |
| WeasyPrint | HTML/CSS → PDF | BSD-3-Clause (research) | OPEN | Same risk: HTML as source of truth |
| TeX/LaTeX | Typesetting | Mixed (generally FOSS) | **EXTERNAL** / **INSPIRE** | Different universe; do not become a TeX IDE by accident |
| Chromium/WebView print | Preview/PDF | Complex (BSD-style + bundled) | OPEN, caution | Easy preview; poor DTP; huge surface |

**PROPOSED warning.** Any engine that typesets *HTML/CSS* rather than the Book Model will drag the architecture toward “the web view is the book”. That contradicts the constitution unless an ADR explains how the Book Model remains source of truth.

### 6.4 AVOID classes (PROPOSED list)

| Risk | Examples | Why |
| --- | --- | --- |
| Proprietary SDKs that own the document | Adobe CEP/UXP as core, closed PDF SDKs as the model | Not FOSS-coherent |
| Licence-incompatible incorporation | GPL engine inside a permissive app without EXTERNAL isolation | Legal failure |
| DRM cores | Production LCP stacks with non-open components | Conflicts with user-owned books; Thorium itself documents this split |
| Unlicensed font embedding | Shipping commercial fonts; ignoring SIL OFL vs embedding clauses | Redistribution trap |
| Model-scraping clauses | AI providers whose ToS train on user manuscripts without consent | Conflicts with AI philosophy (once data-boundary is DECIDED) |
| “Temporary” copies of peer app source | Pasting Sigil or Scribus files to “get started” | Launders INSPIRE into illegal/unmaintainable USE |

## 7. Fonts, dictionaries, and data files

**OPEN policy required** before any default theme ships.

These are often forgotten in FOSS app licences:

- Fonts (OFL, proprietary, embedding vs modification).
- Hyphenation patterns (many are under other licences).
- Spell-check dictionaries.
- Emoji and CJK fonts.
- AI model weights (not source; often non-FOSS even when “weights available”).

Classify each **data pack** with the same five classes. A GPL hyphenation pattern in a default install is a project-licence decision.

## 8. Process for a future dependency PR

When the freeze lifts, a dependency PR must include:

```text
Name:
Version:
SPDX:
Upstream URL:
Licence URL retrieved on (date):
Requested class: USE | ADAPT | EXTERNAL
Compatibility with project licence: (project licence must already be DECIDED)
Why not INSPIRE:
Why not AVOID:
Architectural impact on Book Model: (must be none or ADR)
```

PRs that add dependencies without this block are out of constitution.

## 9. What this document does *not* do

- It does not choose the project licence.
- It does not adopt EPUBCheck, Ace, Paged.js, or anything else.
- It does not prefer GPL or Apache.
- It does not authorize vendoring “for evaluation”.
