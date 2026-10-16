# ADR-0039 Slice 6: Start Screen — Implementation Proposal

- **Status:** Implemented on this PR; awaiting merge
- **Date:** 2026-10-15
- **Parent architecture:** ADR-0039 — Phase 1 Studio Shell & Guided UX
- **Depends on:** Slice 5 Guide panel (PR #159)
- **Scope:** Start screen with Guided Start, book types, and saved books; Save and home in the top bar; Write holds only the editor
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-15)

## 1. Purpose

Give authors a welcoming first screen with every way to begin, and leave the Write step with nothing but the page.

## 2. Slice 6 objective

1. **Start screen** (`ui/StudioStartScreen.tsx`); the app now opens on it:
   - “Tell us your story. We’ll guide you to a finished book.” and **Continue: {book}**
   - **What are you writing?** — Novel, Memoir, How-to guide, Poetry, Kannada book (`workflow/domain/studioShellStart.ts`). Picking one opens New book with the book type and language filled in; when the book is created, the matching Design look (Classic, Modern, or Kannada) is applied through the ADR-0036 port
   - the ADR-0033 Guided Start paths as cards with one-line descriptions: New book, Import a manuscript, Open a recent book, Continue a saved book
   - **Books saved in OpenBook**: New blank book, Open a saved book…, and status
2. **Top bar**: **Save** button; **OpenBook** returns to the start screen.
3. **Write** now holds only the editor. Its former panels moved:

   | Panel | Now |
   |---|---|
   | Guided Start | Start screen |
   | New book / Open (saved books) | Start screen |
   | Save | Top bar |
   | Import into the current book | Structure step, “Add chapters from a file” (adds chapters only; importing a new book is Import a manuscript on the start screen) |

4. Plain-language copy for Guided Start messages and labels (no “package”, “importer”, or “recovery discovery”), the saved-books section, and the in-book import.
5. The studio stays mounted (hidden) while the start screen shows, so the editor keeps its state.

## 3. Verification limits

In the browser dev build, creating a book fails because saving uses SQLite, which only exists inside the Tauri app (true before this slice too). So “create a Kannada book → Kannada look applied → Write opens” was not exercised end to end; the look presets are unit-tested and the wiring is source-tested. **Needs one manual check in the Tauri app.** The raw database message the browser shows is addressed by Slice 7.

## 4. Explicit exclusions

- Structure presets per book type (for example one poem per page) — only language and look are set
- A real recent-books list on the start screen beyond Guided Start's Open a recent book
- Plain-language mapping of save and export failure codes (Slice 7)

## 5. Acceptance criteria

- the app opens on the start screen; Continue opens the current book
- a book type pre-fills New book; the look is applied after creation
- every start path, New blank book, and Open remain reachable
- Write contains only the editor; Save is in the top bar; OpenBook goes home
- desktop `npm test` / build / CI pass

## 6. Verification

Browser dev build: opens on the start screen; four start paths and five book types shown; Kannada book pre-fills language `kn` and book type; OpenBook returns home and Continue goes back; Write contains only the editor; Structure shows “Add chapters from a file”; top bar shows Save. Create book blocked by SQLite in the browser (see §3). Screenshots were unavailable.
