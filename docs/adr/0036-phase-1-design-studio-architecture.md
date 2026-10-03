# ADR-0036: Phase 1 — Design Studio Architecture

- **Status:** Accepted; Slices 1–2 done (PRs #139–#140); Slice 3 authorized on this PR
- **Date:** 2026-09-28
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (§3.5)
- **Area:** Desktop / Product Surface / Design Studio
- **Depends on:** ADR-0006, ADR-0014, ADR-0019, ADR-0029, ADR-0031, ADR-0033, ADR-0034, ADR-0035
- **Supersedes:** None
- **Selection record:** `docs/PHASE-1-DESIGN-STUDIO-SELECTION.md`
- **Implementation authorization:** Slices 1–2 complete (PRs #139–#140). Slice 3 is authorized on this PR (`docs/adr-0036-slice-3-hardening.md`). Closure and later work still require separate explicit authorization.

## 1. Context

OpenBook has closed ADR-0033 Guided Start, ADR-0034 Writing Studio, and ADR-0035 Structure Studio. The desktop already provides:

- a canonical Book with `theme` (`id`, `name`), `typography` (`bodyFontFamily`, `headingFontFamily`, `bodySizePt`, `lineHeight`), and `styles` (named paragraph and character styles with `id` and `name` only) (ADR-0006);
- `DesktopStudioCoordinator` as the studio authority;
- ADR-0029 package Save/Open and ADR-0031 autosave;
- publishing engines that project the Book at publish time (EPUB, HTML, Typst PDF).

`BookSession` does not yet expose design operations. A new book starts with theme `default` / `Default`, empty font-family strings, body size 11pt, and line height 1.4.

ROADMAP §3.5 Basic Design Studio requires guided choices for:

- book theme;
- typography;
- heading style;
- paragraph spacing;
- image treatment;
- chapter opening style.

The author should select a design without understanding CSS.

**Gap:** those fields exist on the Book, and the studio does not yet offer a product surface that sets them.

**Model limit:** `TypographySettings` has no paragraph spacing before/after, no per-level heading style, and no image or chapter-opening treatment. `NamedStyle` has no properties. Those choices are not representable without a separate Book Model ADR. Design Studio must not invent a CSS document or a second theme file to hold them.

## 2. Decision

OpenBook will implement Phase 1 Design Studio as a **desktop design-surface architecture** that:

1. Productizes guided design choices after Structure Studio.
2. Keeps **Book Model + DesktopStudioCoordinator** authoritative.
3. Writes only `Book.theme` and `Book.typography` fields the model already stores.
4. Treats EPUB, HTML, and Typst presentation as publishing-engine projections. Design Studio does not write stylesheets.
5. Reuses ADR-0031 autosave and ADR-0029 package binding.
6. Remains **AI-optional**.

```text
React Design Studio UI (theme, typeface, size, line height)
        |
        v
Design port (read / set theme / set typography)
        |
        v
DesktopStudioCoordinator
        |
        v
Book Model (theme, typography) — canonical
        |
        +--> ADR-0031 autosave / ADR-0029 package
        +--> EPUB / HTML / Typst (publish time; not a stored stylesheet)
```

### 2.1 Existing coordinators remain authoritative

Design Studio must not:

- write EPUB/PDF/HTML, CSS, or Typst theme files itself;
- store a parallel stylesheet, theme pack, or TipTap document;
- bypass Book validation;
- change `schemaVersion` or add design properties the model does not have;
- invent a second autosave or package protocol;
- change Gate 6 bundled-font pins or frozen desktop pins;
- silently keep an invalid size or line height.

### 2.2 Capability mapping (MVP)

| ROADMAP §3.5 capability | Architecture position |
|---|---|
| Book theme | `book.theme.id` and `book.theme.name` |
| Typography | `book.typography` body family, heading family, body size, and line height |
| Heading style | Heading typeface via `headingFontFamily`. Per-level heading styles are **deferred** pending a Book Model ADR |
| Paragraph spacing | Line height via `lineHeight`. Space before/after a paragraph is **deferred** pending a Book Model ADR |
| Image treatment | **Deferred.** No Book field stores it |
| Chapter opening style | **Deferred.** No Book field stores it |
| Named styles | `book.styles` stays id and name only. A property-bearing style editor is **deferred** |

### 2.3 Host vs UI boundary

- React UI: guided choices for theme name, body typeface, heading typeface, body size, and line height. No CSS editor.
- Domain: `DesktopStudioCoordinator` remains the mutation authority. A design port may update only `theme` and `typography`.
- Writing Studio remains the text editor. Structure Studio remains the matter rail. Design Studio does not replace either.

### 2.4 Explicit non-goals for this ADR

- Metadata Wizard / Cover Wizard (later Phase 1 ADRs)
- Paragraph spacing, image treatment, chapter opening, and style properties (pending a Book Model ADR)
- CSS or Typst authoring
- DTP page layout
- AI theme generation
- New font binaries or Gate 6 pin changes
- Code signing / multi-OS packaging
- Changing Gate 10 packaging verification semantics

## 3. Implementation sequencing (not authorized here)

When separately authorized, implementation should proceed in small slices, for example:

1. **Slice 1 — Design contract:** capability matrix; read and set theme and typography; reject non-positive body size and line height; tests; no chrome. **(done — PR #139)**
2. **Slice 2 — Guided choices:** theme, body typeface, heading typeface, body size, and line height. **(done — PR #140)**
3. **Slice 3 — Hardening:** English and Kannada theme and font names through package Save/Open; regression guard that no stylesheet is persisted. **(authorized — this PR)**

Exact slice boundaries may be adjusted in per-slice proposals; each slice still needs explicit authorization.

## 4. Testable architectural invariants

1. Every design edit yields a Book Model–valid Book, or a structured fail-closed error.
2. Body size and line height must be finite and greater than zero when set.
3. Theme and typography round-trip through the ADR-0029 package. Unicode names are preserved.
4. No CSS, Typst theme, or TipTap document is stored as the design.
5. Autosave continues to use ADR-0031 package Save semantics when a package root is bound.
6. No AI dependency is introduced by this ADR’s slices.
7. Paragraph spacing, image treatment, chapter opening, and style properties are not shipped under this ADR alone.

## 5. Consequences

### Positive

- Gives Phase 1 a design surface without a new document model.
- Uses theme and typography fields the Book already stores.

### Trade-offs

- ROADMAP heading style, paragraph spacing, image treatment, and chapter opening are only partly representable until a model ADR exists.
- Font-family strings do not by themselves guarantee a bundled font is present at publish time.

## 6. Non-authorizations

This ADR does **not** authorize implementation, dependency changes, UI chrome delivery, Book Model schema changes, AI features, or any Phase 1 Design Studio slice until a maintainer issues an explicit slice authorization.
