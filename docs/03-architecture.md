# 03 — Core Architecture

**Status of this document:** **SUPERSEDED at the topology layer** by [`PROJECT_VISION.md`](../PROJECT_VISION.md) §3. See [`07-vision-review.md`](07-vision-review.md). Component internals, persistence, and runtime remain **OPEN**. Do not implement from the old diagram below.

This file is retained as an interim notes dump until the Product Owner `ARCHITECTURE.md` exists. The **current vision topology** is:

```text
                    OPENBOOK STUDIO
                           │
                    ┌──────▼──────┐
                    │  BOOK MODEL │
                    │ Single Truth │
                    └──────┬──────┘
                           │
       ┌───────────┬───────┼────────┬───────────┐
       ▼           ▼       ▼        ▼           ▼
   Writing       Design   DTP      AI       Book Doctor
    Studio       Studio  Studio   Studio     /Preflight
       │           │       │        │           │
       └───────────┴───────┼────────┴───────────┘
                           │
                 ┌─────────▼─────────┐
                 │ Publishing Engine │
                 └─────────┬─────────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
           EPUB           PDF          HTML
             │             │
             ▼             ▼
         EPUBCheck       PDF
         + Accessibility Preflight
                           │
                    ┌──────▼──────┐
                    │   Preview   │
                    └──────┬──────┘
                           │
                       Publish
```

Pipeline-order contradictions (journey vs diagram) are recorded in the vision review. They are **not** resolved here.

## 1. Older topology (do not implement)

```text
                    OPENBOOK STUDIO
                          │
          ┌───────────────┴───────────────┐
          │                               │
    USER EXPERIENCE                  BOOK MODEL
          │                               │
 ┌────────┼─────────┐                     │
 │        │         │                     │
Writing  Design    DTP                    │
Studio   Studio   Studio                  │
 │        │         │                     │
 └────────┴─────────┴──────────────┬──────┘
                                   │
                         SINGLE SOURCE OF TRUTH
                                   │
                 ┌─────────────────┼─────────────────┐
                 │                 │                 │
                EPUB              PDF              HTML
                 │                 │                 │
             EPUBCheck         Preflight          Web
                 │                 │
                 └────────┬────────┘
                          │
                    BOOK DOCTOR
                          │
                    PUBLISH READY
```

**Historical implications of the old diagram (do not implement):**

1. OpenBook Studio contains two pillars: **User Experience** and **Book Model**.
2. Writing, Design, and DTP studios belong to User Experience. They are not independent documents.
3. All three studios write to one Book Model.
4. EPUB, PDF, and HTML are generated from that model.
5. Validators attach to projections (EPUBCheck → EPUB, Preflight → PDF, Web → HTML).
6. Book Doctor sits *after* those validators and *before* publish-ready.
7. AI Studio, Preview, Publishing, Accessibility, and Multilingual support are product surfaces described in requirements. They must attach to this topology without creating a second source of truth.

## 2. Placement of the other product surfaces

The Product Owner named more surfaces than the three editing studios. **PROPOSED** placement (must be confirmed; this is an architectural decision, not an implementation):

| Surface | Pillar | Notes |
| --- | --- | --- |
| AI Studio | User Experience | Reads/proposes against the Book Model; never a parallel document |
| Preview | User Experience | Renders projections; should not own editable state |
| Publishing | After Book Doctor | Packages publish-ready projections; does not restyle the book |
| Accessibility | Book Model + Book Doctor | Semantics live in the model; checks live in the doctor |
| Multilingual | Book Model + all studios | Language/script are model facts; studios must honour them |
| Beginner / Expert | User Experience | Presentation of the same model, not different models |

**OPEN.** Whether Preview is allowed to show *unsaved projection experiments* (e.g. try a theme) without writing the model until apply.

## 3. Book Model (conceptual)

**DECIDED.** The Book Model is the single source of truth.

**PROPOSED conceptual schema** — objects, not file format:

```text
Work
 ├─ Identity        (ids, title, authors, contributors, identifiers)
 ├─ Languages       (primary, additional, direction, scripts in use)
 ├─ Structure       (front matter, body, back matter; parts; chapters; sections)
 ├─ Content         (block tree + inline marks; notes; figures; tables)
 ├─ Semantics       (roles: heading rank, note type, figure type, landmark)
 ├─ Style intent    (semantic styles, theme binding, design tokens)
 ├─ Pagination      (page geometry, masters, breaks, floats)  — may be sparse
 ├─ Assets          (images, fonts*, audio) with licence metadata
 ├─ Accessibility   (alt, longdesc, reading order overrides, abbr expansions)
 ├─ Provenance      (human / AI-proposed / AI-accepted; history)
 ├─ Projection hints (EPUB/PDF/HTML-specific, never allowed to fork identity)
 └─ Quality state   (last doctor report, publish-ready flag)
```

`fonts*` — **OPEN** and legally sensitive. Font files are not ordinary assets; embedding and redistribution have licence terms distinct from the project licence.

**OPEN.** On-disk representation (directory of XML, SQLite, CBOR, custom package, git-friendly text, etc.). Do not encode a format in a scaffold “just to start”.

**OPEN.** In-memory vs persisted identity of IDs; merge/collaboration model (unscoped).

### 3.1 What the Book Model is not

- Not EPUB XHTML.
- Not a PDF tree.
- Not a CSS stylesheet with HTML attached.
- Not a DOCX document.
- Not a chat log of AI output.

Those may be **imports** or **projections**.

## 4. User Experience studios

**DECIDED.** Writing, Design, and DTP are the three named editing studios.

**PROPOSED interaction rule:** every edit is a transaction against the Book Model. Studios must not keep a private document that can diverge.

| Studio | Reads | Writes (typical) | Must not |
| --- | --- | --- | --- |
| Writing | Structure, content, notes | Content, structure, basic semantics | Bake page coordinates into prose |
| Design | Style intent, assets, cover | Themes, styles, visual tokens, figure intent | Own a separate “design file” |
| DTP | Pagination + style intent + content | Page geometry, masters, breaks, hyphenation, floats | Fork a print-only copy of the text |
| AI | Authorized slices of the model | Proposals / provenance | Commit without user accept |
| Preview | Projections of current model | Nothing (or “apply previewed theme” as an explicit command) | Become an editor with hidden state |

**OPEN.** How DTP pagination data is stored when the user never opens DTP Studio (empty pagination, inferred defaults, theme-provided masters).

## 5. Projection pipeline

**DECIDED.** Three projections: EPUB, PDF, HTML.

**PROPOSED pipeline** (capability, not libraries):

```text
Book Model
    │
    ├─► Projector: EPUB  ─► artefact ─► EPUBCheck  ─► report ─┐
    ├─► Projector: PDF   ─► artefact ─► Preflight  ─► report ─┼─► Book Doctor ─► Publish-ready state
    └─► Projector: HTML  ─► artefact ─► Web checks ─► report ─┘
```

**PROPOSED rules:**

1. Projectors are **pure-ish functions** of (Book Model + projection profile). They do not edit the model.
2. A failed projection is a first-class result, not an exception swallowed by the UI.
3. Round-trip **into** OpenBook from a projection is import, not identity. Import must be loss-aware.

**OPEN.**

- Shared intermediate representation vs three independent projectors.
- Whether HTML is the substrate used to *preview* EPUB (common, but it can accidentally make EPUB “whatever the HTML engine did”).
- PDF engine class (layout engine we own vs EXTERNAL typesetter).
- Default EPUB profile (reflowable 3.3 vs others).

## 6. Book Doctor and publish-ready

**DECIDED.** Book Doctor consumes validator output and produces publish-ready.

**PROPOSED architecture:**

```text
Reports (EPUBCheck, Preflight, Web, model lints)
        │
        ▼
Issue graph  (id, severity, projection, model pointer, beginner text, expert text)
        │
        ▼
Publish-ready policy  (which severities block)
        │
        ▼
Work.quality_state
```

Issues should point at **model locations** where possible, not only at generated XHTML line numbers. EPUBCheck lines are for Expert Mode; beginners need a chapter/paragraph pointer.

**OPEN.** Policy table for what blocks publish-ready. Mapping from EPUBCheck codes to model pointers. Whether auto-remediation exists.

## 7. Validation tools as architecture, not dependencies

**DECIDED.** EPUBCheck is the EPUB validator in the topology. Preflight is the PDF validator. Web checks attach to HTML.

That does **not** decide:

- in-process library vs EXTERNAL CLI vs network service;
- bundling vs user-installed;
- which PDF preflight profile or engine;
- which HTML “web” checker.

Those are FOSS classifications plus ADRs. Until then, treat validators as **ports**.

## 8. Explicitly not decided (do not infer from this document)

The following will *feel* like architecture to an implementer. They are **OPEN**. Choosing them in a README badge or a hello-world app violates the constitution.

| Topic | Why it is still open |
| --- | --- |
| Language / runtime | Desktop README word is not a stack |
| UI toolkit | Must follow accessibility and script support, not fashion |
| Process model | Monolith vs studio processes vs WASM validators |
| Persistence format | See §3 |
| Undo architecture | Command bus vs text CRDT vs snapshots |
| Plugin ABI | May never exist |
| Threading / incremental layout | Depends on DTP quality bar |
| Cloud/AI providers | Data-boundary policy first |
| Project licence | FOSS strategy first |

## 9. Architectural test (for future PRs)

A future implementation PR is misaligned if any of these become true:

1. The user is primarily editing EPUB XHTML or a PDF page tree.
2. Changing a chapter title requires separate edits for EPUB and PDF.
3. DTP “Save as” creates a file that Writing Studio cannot open as the same work.
4. Book Doctor is a CSS linter on export only, with no model pointers.
5. An AI call writes prose into the model without a proposal/accept step.
6. A dependency appears without a FOSS classification and licence verification note.
