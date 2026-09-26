# ADR-0034: Phase 1 — Writing Studio Architecture

- **Status:** Accepted; implementation requires separate explicit authorization
- **Date:** 2026-09-24
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (§3.3)
- **Area:** Desktop / Product Surface / Writing Studio
- **Depends on:** ADR-0006, ADR-0007, ADR-0008, ADR-0014, ADR-0015, ADR-0019, ADR-0020, ADR-0029, ADR-0030, ADR-0031, ADR-0033
- **Supersedes:** None
- **Selection record:** `docs/PHASE-1-WRITING-STUDIO-SELECTION.md`
- **Implementation authorization:** Slices 1–4 authorized (contract + formatting chrome + word count/search + image insertion); further slices require separate explicit authorization

## 1. Context

OpenBook has declared ROADMAP Phase 0 `FOUNDATION-READY` and closed ADR-0033 Book Wizard / Guided Start (Slices 1–5). The desktop already provides:

- TipTap / ProseMirror authoring transport (ADR-0008) via `EditorAdapter` ↔ Semantic Document ↔ Book Model;
- `BookSession` chapter/section mutation;
- `DesktopStudioCoordinator` as the studio authority;
- ADR-0029 package Save/Open and ADR-0031 autosave sequencing;
- a foundation `EditorSurface` with chapter navigation and a minimal formatting toolbar.

ROADMAP §3.3 Writing Studio requires MVP writing capabilities:

- chapter/section editor;
- headings; paragraphs; emphasis; lists; quotes; links;
- basic tables;
- image insertion;
- undo/redo;
- autosave;
- word count;
- chapter navigation;
- document search.

The editor must produce **semantic content** rather than presentation-heavy markup.

**Gap:** today’s `EditorSurface` is a foundation authoring shell, not a product Writing Studio. Several §3.3 capabilities are missing or incomplete as product UX (document search, word count, image insertion UI, fuller formatting chrome). **Basic tables are not representable in the current Book Model / SDM `ContentBlock` union** and therefore cannot be shipped as Writing Studio chrome without a separate model ADR.

## 2. Decision

OpenBook will implement Phase 1 Writing Studio as a **desktop writing-surface architecture** that:

1. Productizes the authoring path after Guided Start into a dedicated Writing Studio surface.
2. Keeps **Book Model + BookSession + DesktopStudioCoordinator** authoritative — TipTap JSON remains editor transport only and must never be persisted as canonical project truth.
3. Extends formatting and navigation chrome only for block/inline kinds the Book Model already supports (or that a separately authorized model ADR adds).
4. Reuses ADR-0031 autosave and ADR-0029 package binding — it must not invent a second save/autosave protocol.
5. Remains **AI-optional**: outline generation and writing assistants are out of scope unless a later ADR authorizes them.

```text
React Writing Studio UI (toolbar, nav, search, counts, image affordances)
        |
        v
Desktop Writing Host / Studio ports (optional thin adapters)
        |
        +--> TipTap commands  --> EditorAdapter --> BookSession / SDM / Book
        +--> chapter nav      --> DesktopStudioCoordinator / BookSession
        +--> image insert     --> existing asset ingest / insert APIs
        +--> autosave         --> ADR-0031 PackageAutosavePort (already on main)
        |
        v
Book Model (canonical) + ADR-0029 package + workflow stages
```

### 2.1 Existing coordinators remain authoritative

Writing Studio must not:

- write EPUB/PDF/HTML itself;
- mutate publishing engines;
- store TipTap/ProseMirror JSON as the project source of truth;
- bypass `BookSession` validation / rollback;
- invent a second autosave or package protocol;
- silently invent Book content when open/import/continue fails.

### 2.2 Capability mapping (MVP)

| ROADMAP §3.3 capability | Architecture position |
|---|---|
| Chapter/section editor | TipTap surface bound to active section via existing adapter/coordinator |
| Headings, paragraphs, emphasis, lists, quotes, links | TipTap commands mapped through EditorAdapter to Book Model blocks/inlines |
| Undo/redo | Editor history (TipTap/ProseMirror); must not create unsaved Book divergence outside coordinator apply paths |
| Autosave | Reuse ADR-0031; dirty marks from BookSession mutations |
| Chapter navigation | Existing chapter list / selectSection path; product chrome may refine UX |
| Image insertion | Reuse coordinator asset ingest / insert-image APIs; UI is Writing Studio chrome |
| Word count | Derived from Book Model / section text — never from TipTap JSON as canonical |
| Document search | Studio feature over Book/section text (or projected plain text); fail closed on empty query |
| Basic tables | **Deferred** — requires Book Model + SDM + adapter extension under a separate authorized ADR |

### 2.3 Host vs UI boundary

- React UI: toolbar, chapter rail, status (word count), search UI, image pick affordances, empty/error copy.
- Host/ports: native file pickers for images when needed; no broad filesystem plugin in React.
- Domain: `EditorAdapter`, `BookSession`, `DesktopStudioCoordinator` remain the mutation authority.

### 2.4 Explicit non-goals for this ADR

- Structure Studio / Design Studio / Metadata Wizard (later Phase 1 ADRs)
- Basic tables (pending model ADR)
- AI outline or writing assistant
- DTP page layout / CSS theme authoring (Design Studio / Phase 2)
- Code signing / multi-OS packaging
- Changing Gate 10 packaging verification semantics
- Replacing TipTap with another editor stack

## 3. Implementation sequencing (not authorized here)

When separately authorized, implementation should proceed in small slices, for example:

1. **Slice 1 — Writing Studio contract:** capability matrix + ports for toolbar commands, word count, search; tests; no full chrome required. **(done — PR #124)**
2. **Slice 2 — Formatting chrome:** complete heading/emphasis/list/quote/link toolbar bound to TipTap → adapter → BookSession; EN/KN smoke. **(done — PR #125)**
3. **Slice 3 — Word count + document search:** Book-derived counts and find-in-book UI/ports; fail-closed empty query. **(done — PR #126)**
4. **Slice 4 — Image insertion UI:** wire native/file pick → existing asset ingest/insert APIs; no parallel asset model. **(authorized — this PR)**
5. **Slice 5 — Hardening:** empty-state/failure UX, EN+KN authoring round-trips, regression guards that TipTap is never persisted.

Exact slice boundaries may be adjusted in per-slice proposals; each slice still needs explicit authorization. A **tables** capability may only be added after a Book Model/SDM extension ADR is accepted and authorized.

## 4. Testable architectural invariants

1. Every Writing Studio edit path results in a Book Model–valid Book (or a structured fail-closed error), never TipTap-as-canonical storage.
2. Autosave continues to use ADR-0031 package Save semantics when a package root is bound.
3. Word count and search are derived from Book/semantic text, not treated as a second document model.
4. Image insertion uses existing asset APIs and Book `image` blocks.
5. Cancelled native dialogs perform no Book/asset mutation.
6. No AI dependency is introduced by this ADR’s slices.
7. Tables are not shipped under this ADR alone.

## 5. Consequences

### Positive

- Gives Phase 1 a clear second product ADR after Guided Start.
- Reuses mature authoring/coordinator/package boundaries instead of a parallel editor stack.

### Trade-offs

- Tables remain deferred until the Book Model grows.
- Some foundation `EditorSurface` panels (import/export smoke) may coexist until later product shell cleanup slices.

## 6. Non-authorizations

This ADR does **not** authorize implementation, dependency changes, UI chrome delivery, Book Model schema changes, AI features, or any Phase 1 Writing Studio slice until a maintainer issues an explicit slice authorization.
