# ADR-0033: Phase 1 — Book Wizard / Guided Start Architecture

- **Status:** Accepted; implementation requires separate explicit authorization
- **Date:** 2026-09-24
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (§3.1)
- **Area:** Desktop / Product Surface / Guided Start
- **Depends on:** ADR-0006, ADR-0007, ADR-0008, ADR-0014, ADR-0015, ADR-0019, ADR-0020, ADR-0029, ADR-0030, ADR-0031
- **Supersedes:** None
- **Selection record:** `docs/PHASE-1-NEXT-DOMAIN-SELECTION.md`
- **Implementation authorization:** Slice 1 authorized (guided-start contract); Slices 2–5 not authorized

## 1. Context

OpenBook has declared ROADMAP Phase 0 `FOUNDATION-READY`. The desktop product already provides Book Model–canonical authoring, import, validation, export, filesystem project packages, autosave sequencing, and Windows-first packaging.

What is still missing for Phase 1 MVP is a **guided start surface**: a first-time author should not land in a blank editor without a clear path to create, open, continue, or import a book.

ROADMAP §3.1 Book Wizard requires:

- New Book
- Import Existing Book
- Open Recent Book
- Continue Existing Project

For a new book, collect: title, subtitle, author, language, book type, intended audience, approximate length, writing goal — and explain publishing terminology when necessary.

Today `DesktopStudioCoordinator.newProject(name, language?)` and related open/import/package APIs exist, but there is no dedicated guided-start architecture or product wizard bound to those APIs.

## 2. Decision

OpenBook will implement Phase 1 Book Wizard as a **desktop guided-start architecture** that:

1. Presents the four entry paths in §1 as the primary product front door for MVP start flows.
2. Maps each path onto **existing** coordinator / host / package / import boundaries — it must not invent a parallel project model or bypass Book Model.
3. Collects New Book metadata into canonical Book / project identity fields (and documented extensions only where the Book Model already allows metadata), without persisting Tiptap JSON.
4. Remains **AI-optional**: AI outline generation (ROADMAP §3.2) is out of scope for ADR-0033 implementation slices unless a later ADR authorizes it.

```text
React Book Wizard / Guided Start UI
        |
        v
Desktop Guided-Start Host Adapter
        |
        +--> new project  --> DesktopStudioCoordinator.newProject + package Save
        +--> open recent / continue --> package Open + coordinator open binding
        +--> import existing --> existing import host / ADR-0020 surface
        |
        v
Book Model (canonical) + ADR-0029 package + workflow stages
```

### 2.1 Existing coordinators remain authoritative

The wizard must invoke existing desktop studio / workflow / import / package APIs. It must not:

- write EPUB/PDF/HTML itself;
- mutate publishing engines;
- store editor JSON as the project source of truth;
- open arbitrary filesystem paths without the host/package boundary;
- silently create second project roots.

### 2.2 New Book flow

1. Author chooses New Book.
2. Wizard collects the ROADMAP §3.1 fields (required vs optional may be refined at implementation time; title + language are minimum viable).
3. Terminology help is available inline (plain-language explanations; not a separate CMS).
4. Host creates a new project via coordinator + establishes package binding / first Save per ADR-0029 / ADR-0031 rules already on `main`.
5. Author lands in the existing writing/studio surface with a valid empty-or-seeded Book structure (front/main matter seeding policy is an implementation-slice detail and must remain Book Model–valid).

### 2.3 Import Existing Book

Reuses the Gate 8 import surface (ADR-0020 / importer foundation). The wizard is an entry affordance, not a second importer.

### 2.4 Open Recent / Continue

- **Open Recent:** present recent package locations from a host-maintained recent-list (implementation may use OS-appropriate storage); open through the existing package Open path.
- **Continue Existing Project:** resume the last bound package / crash-recovery path already defined by ADR-0031 where applicable — wizard must not invent a second recovery protocol.

Missing or unreadable packages fail closed with structured errors; no silent empty project substitution.

### 2.5 Host vs UI boundary

- React UI: steps, validation of form fields, terminology copy, navigation among the four paths.
- Host adapter: native open-folder/file dialogs where needed, recent-list persistence, package open/save calls, coordinator calls.
- Coordinator/domain: Book/session/workflow authority unchanged.

### 2.6 Explicit non-goals for this ADR

- Full Writing Studio feature parity beyond landing in the existing editor
- Structure Studio / Design Studio / Metadata Wizard expansions (later Phase 1 ADRs)
- AI outline or Ollama
- DTP page layout
- Code signing / multi-OS packaging
- Changing Gate 10 packaging verification semantics

## 3. Implementation sequencing (not authorized here)

When separately authorized, implementation should proceed in small slices, for example:

1. **Slice 1 — Guided-start contract:** types/ports for the four entry paths + New Book field model; tests; no UI chrome required. **(in progress)**
2. **Slice 2 — Host adapter:** wire new/open/import/continue to existing coordinator/package/import APIs; fake host tests.
3. **Slice 3 — React wizard shell:** minimal UI for the four paths + New Book form; terminology stubs.
4. **Slice 4 — Recent list + continue integration:** durable recent entries; continue/recovery handoff.
5. **Slice 5 — Hardening:** failure UX, empty-state copy, round-trip tests with English + Kannada metadata.

Exact slice boundaries may be adjusted in per-slice proposals; each slice still needs explicit authorization.

## 4. Testable architectural invariants

1. Wizard creation results in a Book Model–valid project, never Tiptap-as-canonical storage.
2. Import path reuses existing importer contracts.
3. Open/Continue use ADR-0029 package open (and ADR-0031 recovery where applicable).
4. Cancelled native dialogs perform no project mutation.
5. Failure modes are structured and fail-closed.
6. No AI dependency is introduced by this ADR’s slices.

## 5. Consequences

### Positive

- Gives Phase 1 a clear first product ADR without reopening foundation gates.
- Reuses mature desktop boundaries instead of a parallel start stack.

### Trade-offs

- Recent-list storage and New Book seeding details are deferred to implementation slices.
- AI-assisted outline remains intentionally later.

## 6. Non-authorizations

This ADR does **not** authorize implementation, dependency changes, UI chrome delivery, AI features, or any Phase 1 slice until a maintainer issues an explicit slice authorization.
