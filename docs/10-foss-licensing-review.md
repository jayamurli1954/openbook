# 10 — Review of FOSS_STRATEGY.md and LICENSING_POLICY.md

**Date:** 2026-09-03  
**Reviewer:** Cursor Cloud Agent (engineering executor)  
**Reviewed:** [`FOSS_STRATEGY.md`](../FOSS_STRATEGY.md) (`6e419c0`), [`LICENSING_POLICY.md`](../LICENSING_POLICY.md) (`d4f2507`)  
**Implementation:** none. No `LICENSE` file added. No dependencies added.

---

## 1. Verdict

These two documents close the FOSS hole that would have turned OpenBook into Sigil + Scribus + Calibre behind a launcher.

**Canonical classification is now five classes:**

```text
USE → EMBED → ADAPT → INSPIRE → AVOID
```

That replaces both the agent draft (USE / ADAPT / INSPIRE / EXTERNAL / AVOID) and the vision’s four-class table. **USE** is invoke-without-incorporating (the old EXTERNAL). **EMBED** is incorporate-a-library. That is the invoke-vs-incorporate rule we needed.

**The project’s own licence is deliberately not frozen.** Candidates are Apache-2.0 vs AGPL-3.0-or-later. Until a `LICENSE` file exists, no agent may assume either. Preferred *embedded* licences (MIT / BSD / Apache-2.0) are frozen as preference, not as OpenBook’s licence.

The anti-Frankenstein diagram is binding and matches the architecture:

```text
FOSS ECOSYSTEM → study/reuse/learn → OPENBOOK DESIGN → BOOK MODEL
  → Writing / Design / DTP → Publishing Engines (EPUB / PDF / HTML)
  → EPUBCheck → Book Doctor
```

Cursor rules in `FOSS_STRATEGY.md` §27 bind this agent. They do **not** lift the implementation freeze. Official `ROADMAP.md` and `CONTRIBUTING.md` are reviewed in [`11-roadmap-contributing-review.md`](11-roadmap-contributing-review.md).

---

## 2. What is now decided

| Topic | Decision |
| --- | --- |
| Product shape | Independent OpenBook around the Book Model. Not a merge of peer apps. |
| Classes | USE / EMBED / ADAPT / INSPIRE / AVOID |
| Sigil, Scribus | INSPIRE (not embed, not fork) |
| Calibre | INSPIRE / selective external USE. Not a library for the core. |
| EPUBCheck | USE / EMBED **candidate**. Primary EPUB conformance. Book Doctor must not fake-replace it. |
| Pandoc | Selective USE / INSPIRE. Pandoc AST is **not** the Book Model. |
| Booktype | INSPIRE (AGPL + desktop-first) |
| LibreOffice | Selective USE / INSPIRE; no full stack in MVP |
| Inkscape / Krita / Graphviz / Excalidraw | INSPIRE or optional USE; OpenBook is not a graphics suite |
| ImageMagick | USE / EMBED candidate |
| Strong copyleft application code | Do not embed casually |
| Standards | Standards beat copying Sigil/Scribus behaviour |
| Tools in the UI | Invisible behind OpenBook (Book Doctor → adapter → EPUBCheck) |
| Research records + inventory + scorecard | Required before significant dependencies |
| Contribute upstream | Yes, when we find real bugs/docs/tests |
| OpenBook licence | **Unfrozen.** Apache-2.0 vs AGPL-3.0-or-later |
| File headers | No contradictory licence headers until `LICENSE` exists |
| User content | Users own manuscripts and imports |
| Fonts / themes / artwork | Provenance required; no “it’s on the web” bundling |
| AI output | Not OpenBook IP; not claimed safe to publish; model licences tracked separately |
| CLA/DCO | Deferred to `CONTRIBUTING.md`; no automatic copyright assignment to SanMitra |
| SPDX + THIRD-PARTY-NOTICES.txt | Required as the project ships code |
| CI licence checks | Required eventually |
| Trademark | Separate from software licence |
| Legal posture | These files are policy, not legal advice |

---

## 3. Alignment with architecture and PRD

- Architecture §38–39 (process boundary, not a licence waiver) is now policy in licensing §7 and FOSS §16.
- Architecture recommended stack (Tauri, React, ProseMirror/Tiptap, SQLite) is **not** in the FOSS portfolio table. Those need scorecards **before Phase A**, not assumed approved because §4 of architecture named them.
- EPUBCheck as primary validator matches architecture and the frozen chain.
- Font policy matches architecture §27.
- “Standards before libraries” prevents EPUB-as-Sigil-behaviour.
- Pandoc must not become the Book Model — matches architecture A10.

---

## 4. Ambiguities and tensions

### F-A1. Project licence still gates EMBED

Until Apache vs AGPL is chosen, **EMBED of GPL-family code cannot be fully classified**. USE-via-adapter is the safe default (Pandoc, Calibre CLI, LibreOffice). EPUBCheck (BSD-3-Clause) is compatible with either candidate — still re-verify at the chosen version.

### F-A2. USE / EMBED candidate for EPUBCheck and ImageMagick

“Candidate” is not a decision. Architecture wants an adapter. Prefer **USE (process)** first; promote to EMBED only with a licence ADR after the project licence exists.

### F-A3. Calibre wording

FOSS §8 says the Calibre codebase must not be a library for OpenBook’s “proprietary/permissively licensed core.” OpenBook is not proprietary. Treat as: *do not EMBED Calibre into the core, whatever OpenBook’s eventual licence is.*

### F-A4. Citation tokens in `FOSS_STRATEGY.md`

The uploaded file contains leaked chat-citation markers such as `cite turn0search2` next to licence claims (Sigil, Scribus, Calibre, EPUBCheck, Pandoc, Booktype, LibreOffice, Inkscape). They should be stripped on `main`. Licence claims remain “re-verify at decision time,” which is correct.

### F-A5. Tiptap / Tauri / ProseMirror missing from the portfolio

Highest near-term EMBED risk is the **desktop stack**, not Scribus. FOSS strategy should grow research records for Tauri, React, ProseMirror, SQLite, and Tiptap (open core vs Pro) before any scaffold. This review does not add those records as if they were approved.

### F-A6. PDF engine still unnamed

Correct. FOSS §29 lists print preflight / colour management as future evaluation. The PDF renderer remains the largest licence-and-architecture choice. Do not pick Paged.js / WeasyPrint / a WebView printer in a first PR.

### F-A7. “Selective USE” of GPL CLIs while distributing OpenBook

Shipping EPUBCheck vs expecting the user to install it are different distributions. Licensing policy requires documenting invocation, distribution, and attribution per tool. Roadmap must not “bundle Pandoc” casually.

### F-A8. Independent implementation is not a magic shield

FOSS §18 and licensing §18 say this. Agents must not paste Sigil/Scribus files into “inspired” modules.

---

## 5. Cursor rules adopted (FOSS §27)

In addition to `ARCHITECTURE.md` §51:

1. No third-party source without licence review.  
2. No convenience dependencies.  
3. Classify USE / EMBED / ADAPT / INSPIRE / AVOID first.  
4. Check licence **and** transitives.  
5. Prefer standards-based independent publishing core.  
6. Book Model remains source of truth.  
7. AI is not publishing correctness.  
8. External tools behind adapters.  
9. Record FOSS decisions.  
10. Update inventory when deps change.  
11. Never copy fonts/templates/art without rights.  
12. If licence is unclear, **stop**.

---

## 6. What this agent will not do

- Will not add `LICENSE` (Apache vs AGPL is a Product Owner decision).
- Will not scaffold Tauri or add EPUBCheck/Pandoc/Ollama.
- Will not fork or vendor Sigil, Scribus, Calibre, or LibreOffice.
- Will not treat architecture’s recommended stack as EMBED-approved.
- Will not strip the Product Owner’s citation tokens on `main` in this turn (flagged for them).

---

## 7. Next

`ROADMAP.md` is the remaining product-sequence document (then `CONTRIBUTING.md`). Implementation still requires a freeze-lift ADR after the Product Owner accepts the roadmap.
