# ADR-0037: Phase 1 — Metadata Wizard Architecture

- **Status:** Accepted; implementation not authorized
- **Date:** 2026-10-03
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (§3.6)
- **Area:** Desktop / Product Surface / Metadata Wizard
- **Depends on:** ADR-0006, ADR-0014, ADR-0019, ADR-0029, ADR-0031, ADR-0033, ADR-0036
- **Supersedes:** None
- **Selection record:** `docs/PHASE-1-METADATA-WIZARD-SELECTION.md`
- **Implementation authorization:** None. This ADR does not authorize a slice.

## 1. Context

OpenBook has closed ADR-0033 Guided Start, ADR-0034 Writing Studio, ADR-0035 Structure Studio, and ADR-0036 Design Studio. The desktop already provides:

- a canonical `Book.metadata` (ADR-0006): title, subtitle, authors, contributors, language, identifier, publisher, publishedAt, copyright, description, subjects, and rights;
- `BookSession.updateMetadata` for a partial update of that object;
- Guided Start, which sets title, subtitle, authors, and language when a book is created;
- `DesktopStudioCoordinator` as the studio authority;
- ADR-0029 package Save/Open and ADR-0031 autosave;
- publishing engines that project Book metadata into EPUB, HTML, and PDF at publish time.

ROADMAP §3.6 Metadata Wizard collects and validates title, subtitle, author, language, publisher, copyright, identifier/ISBN where applicable, description, and subject/category.

**Gap:** those fields exist on the Book. After Guided Start, the studio does not offer a product surface that sets the rest of them.

**Model limit:** the Book has no book type, audience, length, writing goal, cover-metadata object, accessibility-metadata object, or ONIX record. Metadata Wizard must not invent a second metadata file to hold them.

## 2. Decision

OpenBook will implement Phase 1 Metadata Wizard as a **desktop metadata-surface architecture** that:

1. Productizes guided metadata editing after Design Studio.
2. Keeps **Book Model + DesktopStudioCoordinator** authoritative.
3. Writes only `Book.metadata` fields the model already stores.
4. Leaves Guided Start as the create path. The wizard edits the open Book; it does not create a parallel book.
5. Treats EPUB OPF, HTML, and PDF metadata as publishing-engine projections. The wizard does not write a package document.
6. Reuses ADR-0031 autosave and ADR-0029 package binding.
7. Remains **AI-optional**.

```text
React Metadata Wizard (guided fields for Book.metadata)
        |
        v
Metadata port (read / set metadata)
        |
        v
DesktopStudioCoordinator
        |
        v
Book Model (metadata) — canonical
        |
        +--> ADR-0031 autosave / ADR-0029 package
        +--> EPUB / HTML / PDF metadata (publish time; not a stored OPF)
```

### 2.1 Existing coordinators remain authoritative

Metadata Wizard must not:

- write EPUB OPF, ONIX, HTML metadata, or PDF info dictionaries itself;
- store a parallel metadata document beside the Book;
- bypass Book validation;
- change `schemaVersion` or add metadata properties the model does not have;
- replace Guided Start;
- invent a second autosave or package protocol;
- silently keep a blank title or a blank language.

### 2.2 Capability mapping (MVP)

| ROADMAP §3.6 / PRD §6.1 field | Architecture position |
|---|---|
| Title | `metadata.title`. A blank title fails closed |
| Subtitle | `metadata.subtitle` |
| Author | `metadata.authors` (a list) |
| Language | `metadata.language`. A blank language fails closed |
| Publisher | `metadata.publisher` |
| Copyright | `metadata.copyright` |
| Identifier / ISBN | `metadata.identifier`, stored as text. No checksum or agency lookup |
| Description | `metadata.description` |
| Subject / category | `metadata.subjects` (a list) |
| Contributors | `metadata.contributors` (a list). Already on the Book; same wizard |
| Publication date | `metadata.publishedAt`. Already on the Book; same wizard |
| Rights | `metadata.rights`. Already on the Book; same wizard |
| Cover metadata | **Deferred.** Cover Wizard (ROADMAP §3.7) |
| Accessibility metadata | **Deferred.** No Book field beyond `rights` |
| Book type, audience, length, writing goal | **Out of scope.** Guided Start terminology; not Book fields |

### 2.3 Host vs UI boundary

- React UI: labeled fields for the in-scope metadata. No OPF editor.
- Domain: `DesktopStudioCoordinator` remains the mutation authority. A metadata port may update only `Book.metadata`.
- Authors, contributors, and subjects stay arrays on the Book.
- Writing Studio remains the text editor. Structure Studio remains the matter rail. Design Studio remains theme and typography. Metadata Wizard does not replace them.

### 2.4 Explicit non-goals for this ADR

- Cover Wizard
- ONIX, ISBN checksum, or identifier-agency lookup
- Book Model schema changes
- AI metadata generation
- DTP page layout
- Code signing / multi-OS packaging
- Changing Gate 10 packaging verification semantics

## 3. Implementation sequencing (not authorized here)

When separately authorized, implementation should proceed in small slices, for example:

1. **Slice 1 — Metadata contract:** read and set `Book.metadata`; reject a blank title and a blank language; tests; no chrome.
2. **Slice 2 — Guided fields:** labeled fields for the in-scope metadata, including author, contributor, and subject lists.
3. **Slice 3 — Hardening:** English and Kannada metadata through package Save/Open; regression guard that no OPF or ONIX document is persisted.

Exact slice boundaries may be adjusted in per-slice proposals; each slice still needs explicit authorization.

## 4. Testable architectural invariants

1. Every metadata edit yields a Book Model–valid Book, or a structured fail-closed error.
2. Title and language stay non-empty when set through this wizard.
3. Metadata round-trips through the ADR-0029 package. Unicode text is preserved.
4. No OPF, ONIX, or other package-document is stored as the metadata.
5. Autosave continues to use ADR-0031 package Save semantics when a package root is bound.
6. No AI dependency is introduced by this ADR’s slices.
7. Cover metadata and accessibility metadata are not shipped under this ADR alone.

## 5. Consequences

### Positive

- Gives Phase 1 a metadata surface without a new document model.
- Uses the metadata object the Book already stores.
- Keeps Guided Start as the create path.

### Trade-offs

- Identifier text does not prove an ISBN is registered or well-formed.
- Cover and accessibility metadata stay out until a later ADR.

## 6. Non-authorizations

This ADR does **not** authorize implementation, dependency changes, UI chrome delivery, Book Model schema changes, AI features, or any Phase 1 Metadata Wizard slice until a maintainer issues an explicit slice authorization.
