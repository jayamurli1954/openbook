# 06 — Engineering Review

**Date:** 2026-09-03  
**Reviewer:** Cursor Cloud Agent (engineering executor)  
**Scope:** Constitution drop. No application implementation was performed.  
**Inputs:** This repository (README + empty tree), Product Owner notes establishing vision/requirements/architecture/FOSS sequence, public licence research dated 2026-09-03.

This review does **not** resolve the items it lists.

## 1. What was found in the repository

| Fact | Implication |
| --- | --- |
| Single file `README.md` (“open-source desktop and digital publishing studio…”) | Product one-liner exists; nothing else did |
| Created 2026-09-03, public, `licenseInfo: null` | FOSS *intent* without a FOSS *licence* |
| No issues, no PRs, no code, no `docs/` | There was no constitution to “read first” — this drop creates it |
| No dependencies | Licence gate has not been violated |

The standing order “first read the constitution, product requirements and architecture documents” could not be obeyed against pre-existing files. Those documents are now in `docs/` and are the baseline for the next turn.

## 2. Ambiguities

### A1. “Desktop” vs the architecture diagram

README: *desktop and digital publishing studio*.  
Architecture: process topology with no runtime.

Ambiguity: native desktop OS apps (Windows/macOS/Linux), a desktop *shell* around a web engine, or a studio that also runs in a browser. “Desktop publishing” is also a domain name (DTP), so the word does double duty.

**Risk:** An executor “helpfully” scaffolds Electron or Tauri and calls it architecture.

### A2. Book Model vs EPUB as familiar substrate

The constitution forbids a conventional EPUB editor, but Expert Mode is **PROPOSED** to inspect EPUB internals, and EPUBCheck is named.

Ambiguity: is EPUB a *projection we can inspect*, or will Expert Mode slowly become an EPUB editor with Writing Studio as a skin?

**Risk:** Dual identity. Needs a hard rule that Expert EPUB views are read-only or are projection diffs, not the edit buffer. That rule is not DECIDED.

### A3. Design Studio vs DTP Studio

Named separately (DECIDED) but the boundary is only PROPOSED (reflow-surviving intent vs paginated realisation).

Ambiguity: where do covers, running heads, and figure placement live? Cover art is both design and (for print) DTP.

### A4. Preview vs HTML projection vs Web checks

Three words: Preview, HTML, Web. They might be one engine or three products.

Ambiguity: if Preview is HTML, and HTML is a deliverable, and Web checks validate HTML, the easiest implementation makes **HTML the real book**. That contradicts ADR-004 unless constrained.

### A5. Book Doctor’s authority

DECIDED that it sits before publish-ready. Not decided whether it can **block export**, only **label** the work, or **offer fixes**.

Ambiguity: is “publish ready” a state users can ignore?

### A6. Beginner / Expert

DECIDED that both exist. Mechanism OPEN (toggle, progressive disclosure, per-studio).

Ambiguity: can Expert-authored constructs exist in a file a beginner then opens? The one-model rule says yes; UX of that situation is unspecified.

### A7. AI Studio

DECIDED as a studio; philosophy mostly PROPOSED. Data boundary OPEN.

Ambiguity: is a build without any AI still OpenBook, or is AI mandatory? Can the studio be a disabled pane?

### A8. “Publishing”

DECIDED as an area; destination OPEN.

Ambiguity: store submission, file export, or imprint workflow. These are different products.

### A9. Multilingual

DECIDED first-class; script list OPEN.

Ambiguity: UI translation vs book-content languages vs complex-script typesetting. Claiming all three in v1 without a script list is not a plan.

### A10. Preflight

Named as if it were as concrete as EPUBCheck. EPUBCheck is a specific project. “Preflight” is a class of tools (print shops, PDF/X, veraPDF, vendor engines).

Ambiguity: capability vs implementation. Treat as a port.

## 3. Contradictions and tensions

These are not document bugs; they are product tensions that will leak into code if not decided.

### C1. DTP-quality pages vs reflowable EPUB (structural)

You cannot have one layout tree that is both a perfect spread and a perfect reflow without a conflict policy. The vision **PROPOSES** first-class conflict. Until that is DECIDED, any PDF engine choice will *de facto* pick a winner (usually HTML/CSS pagination or a print-first page tree).

### C2. FOSS seriousness vs unnamed project licence (process)

The FOSS strategy is DECIDED; the licence is OPEN. Those are compatible as *process*, contradictory as *practice*: we cannot legally classify USE today.

### C3. “Do not choose libraries yet” vs named EPUBCheck

EPUBCheck is both a standard capability and a concrete Java program. Naming it is correct for validation identity; it is **not** an adoption. Executors must not add Maven/npm wrappers in a first scaffold.

### C4. Beginner simplicity vs first-class accessibility and multilingual

True a11y and complex scripts are expert domains. Beginner Mode must still produce semantically sound, language-tagged content by default. Unspecified: how much is automatic vs required fields vs Book Doctor nagging.

### C5. AI helpfulness vs author-owned model

A studio that cannot write to the model is a chatbot. A studio that writes freely violates ADR-007. The propose/accept path is PROPOSED, not DECIDED.

### C6. Single source of truth vs HTML-based typesetting ecosystem

The mature FOSS path to PDF-from-open-tools is often HTML+CSS (Paged.js, WeasyPrint, browsers). That path fights the Book Model unless HTML is clearly a projection. FOSS strategy flags this; architecture does not yet forbid it.

### C7. Public GitHub vs missing governance and licence

The repo is already public. Community contributions could arrive before O-01 and O-21. That is a legal/process contradiction, not a code one.

### C8. Name: OpenBook Studio

Product language uses “OpenBook Studio”. Unrelated organisations already use that name. Not a logical contradiction inside the spec; it is an identity collision waiting for launch.

## 4. Missing decisions (priority)

See also [`05-decision-log.md`](05-decision-log.md). Grouped for Product Owner sessions.

### Must decide before any application code (freeze lift)

1. **O-01** Project licence.  
2. **O-03 / O-04** Runtime shape and (then) language/toolkit — or an ADR that the first code is format/model-only with no UI.  
3. **O-05** Book Model persistence.  
4. **O-06** Pagination/reflow conflict policy (even a v1 subset).  
5. **O-08** v1 book types (even “prose books only”).  
6. **O-09** DTP quality bar for v1 (even “not Scribus-class yet”).  
7. Explicit freeze-lift ADR with a narrow first slice.

### Must decide before the named studio is real

| Studio / area | Missing decisions |
| --- | --- |
| Writing | Import list; note model; whether git/snapshots exist |
| Design | Cover workflow; theme packaging licence |
| DTP | Quality bar; colour management; imposition deferral |
| AI | Data boundary; mandatory vs optional; image generation |
| Book Doctor | Blocking vs advisory; auto-fix policy |
| Preview | Engine; relation to HTML projection |
| Publishing | Files only vs stores/POD |
| Accessibility | Target spec and level; Ace USE/EXTERNAL |
| Multilingual | v1 scripts; UI vs content vs shaping |

### Can defer if written as deferrals

Collaboration, plugins, maths, citations, audiobooks, comics, store APIs, DRM. **Deferral must be an ADR**, not silence — silence will be read as “implied someday in the architecture”.

## 5. What this agent did *not* do (on purpose)

- Did not choose GPL vs Apache vs MIT.  
- Did not choose Electron, Tauri, Qt, or a web framework.  
- Did not add `package.json` / `Cargo.toml` / `pyproject.toml`.  
- Did not adopt EPUBCheck, Ace, Paged.js, WeasyPrint, Sigil, or Scribus.  
- Did not invent a JSON/XML schema file as if O-05 were decided.  
- Did not add a `LICENSE` file.

Licence research in `04-foss-strategy.md` is research. It is not permission to vendor those projects.

## 6. Recommended Product Owner sequence

Not implementation — decision work:

1. Accept, rewrite, or reject **PROPOSED** text in vision (personas, AI principles, non-goals, success).  
2. Choose **O-01** licence.  
3. Decide **O-02** naming or accept the collision risk in writing.  
4. Decide **O-08** and **O-09** (what v1 *is*, how good print must be).  
5. Decide **O-06** (how EPUB and PDF may disagree).  
6. Decide **O-03** only far enough to unblock a later scaffold.  
7. Rank **OPEN** PRD rows into v1 / later / never.  
8. Then, and only then, issue a freeze-lift ADR with a *narrow* first slice (likely: Book Model spec + tests, still no UI).

## 7. Residual uncertainty

The Product Owner’s note is strong on *shape* and silent on *domain examples* (no sample book, no “this novel failed in Sigil because…”). The constitution therefore encodes structure better than taste. A single worked example (one short multilingual chapter through Writing → Design → DTP → Doctor → EPUB/PDF/HTML) would remove more ambiguity than another architecture diagram.
