# ADR-0041: Lesson Box (Callout Block) Architecture

- **Status:** Proposed; implementation not authorized
- **Date:** 2026-10-29
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (§3.3 Writing Studio, §3.5 Basic Design Studio)
- **Area:** Book Model / Semantic Document / Authoring / Writing Studio / Publishing Engines
- **Depends on:** ADR-0006, ADR-0008, ADR-0009, ADR-0011, ADR-0013, ADR-0016, ADR-0019, ADR-0029, ADR-0034, ADR-0036
- **Amends:** None (adds a `ContentBlock` member under ADR-0006)
- **Supersedes:** None
- **Selection record:** `docs/PHASE-1-LESSON-BOX-SELECTION.md`
- **Implementation authorization:** None. This ADR does not authorize a slice.

## 1. Context

Authors of children's, educational, and how-to books set short lessons, tips, and notes apart from the main text in a framed box. The maintainer's 25-story book ends every story with "What We Learned: …". In the KDP file, two stories drew the frame with box-drawing characters and emoji, which break apart when text reflows; the rest used a bold label.

OpenBook has no way to express this. `ContentBlock` is `paragraph | heading | quote | list | image`. The Design step sets theme and typography only. `quote` means a quotation and renders in italics.

The EPUB, HTML, and PDF engines already map each block to semantic markup (`blockquote`, `figure`, Typst `#quote`, `#figure`) and fail closed with `UnsupportedContentError` on an unknown block type. The editor maps Book blocks through the Semantic Document to TipTap nodes (ADR-0008, ADR-0016, ADR-0019).

## 2. Decision

Add one semantic block, `callout`, rendered as a framed **lesson box** in every output.

```ts
type ContentBlock =
  | …existing members…
  | {
      type: "callout";
      id: string;
      /** Plain-text title shown at the top of the box, e.g. "What We Learned". Empty = no title. */
      title: string;
      /** The box's text: one paragraph, with the usual inline formatting. */
      inlines: InlineSpan[];
    };
```

- **Semantic, not positional.** A callout says "this text is a set-apart note with this title". It has no position, size, colour, or page. Its look comes from the publishing engines and, later, a Design Studio choice.
- **One paragraph.** The body is `inlines`, like `quote` and `paragraph`. No nested blocks: lessons and tips are short, and a flat block keeps ids, the editor, and every engine simple. Multi-paragraph boxes can be a later ADR.
- **Plain-text title.** The title is a string, not inline spans. The box styles it (bold, own line); authors don't need formatting inside it, and the editor can show it as a simple field.
- **One kind.** No `variant` (tip / warning / note) in this ADR. The look is the same for every box in a book.

### 2.1 Book Model and validation

- `validateBook` (errors): `callout.title` is a string; `callout.inlines` is an array; a callout with no visible text in both title and body is rejected (`empty-callout`). Ids take part in the existing duplicate-id check.
- Books without callouts are unaffected.
- Schema version: see §6.

### 2.2 Semantic Document and editor

- Semantic Document gains `{ type: "callout"; id; title; inlines }`; `from-book` and `to-book` map it one to one.
- The TipTap adapter adds one custom node (`openbookCallout`, attribute `title`, content `inline*`) built with `@tiptap/core`'s `Node.create` from the already-pinned packages. **No new npm package** (ADR-0008 pins stay).
- Round trip Book → editor → Book is lossless, including Kannada text.

### 2.3 Writing Studio

- **Make lesson box:** turns the current paragraph into a callout. The title defaults to "What We Learned" and can be edited.
- **Back to paragraph:** turns a callout into a paragraph, keeping its text and prefixing the title as bold text, so nothing is lost.
- **Turn matching paragraphs into lesson boxes (book-wide):** the author types a label (e.g. "What We Learned:"); OpenBook shows how many paragraphs start with it, then converts them all at once, moving the label into the box title. One undo step. This is how an imported book's existing lessons become boxes. It is an explicit action, not an import rule.
- All three go through `BookSession` and the coordinator's session mutators, so undo and autosave work.

### 2.4 Publishing projections

All three engines emit callout markup and styles **only when the book contains a callout**, so other books' output stays byte-identical (the rule ADR-0038 Slices 4–5 used).

| Engine | Markup | Style |
|---|---|---|
| EPUB (ADR-0009) | `<div class="ob-callout" role="note"><p class="ob-callout-title">Title</p><p>Body</p></div>` | border, rounded corners, padding; **no background colour or fixed text colour**, so it stays readable in Kindle and Apple Books night modes |
| HTML (ADR-0011) | same markup | same, appended to the inline `<style>` only when needed |
| PDF (ADR-0013) | `#block(width: 100%, inset: …, radius: …, stroke: …, breakable: false)[#strong[Title] \ Body]` | thin rounded frame; no Typst or font pin change |

- `<div role="note">` is used rather than `<aside>`, because some reading systems turn `aside` into pop-up footnotes.
- An empty title emits no title line.
- Generated EPUBs with callouts must pass EPUBCheck 5.3.0 with zero errors and warnings.

### 2.5 Import

- **Word and Markdown import are unchanged.** No paragraph becomes a callout automatically. The book-wide action in §2.3 covers imported lessons explicitly.
- A later ADR may map Markdown alert syntax (`> [!NOTE]`) or a Word style; not here.

### 2.6 Design Studio

- One default lesson-box look in this ADR.
- A "lesson box look" choice (frame style, title position) is a later slice or ADR and must not add a stylesheet to the project package (ADR-0036 rule).

## 3. Capability mapping

| Need | Position |
|---|---|
| A framed lesson / tip / note with a title | In scope |
| Same box in EPUB (Kindle), HTML, PDF | In scope |
| Make, edit, and remove boxes in Write | In scope |
| Convert existing "Label:" paragraphs book-wide | In scope |
| Box look chosen in Design | Later |
| Multi-paragraph boxes, lists inside boxes | Later ADR |
| Tip / warning / note kinds, icons, colours | Later ADR |
| Floating text boxes, sidebars, text over pictures | Out of scope — Phase 2 page model |
| Fixed-layout / picture-book pages | Out of scope — Phase 2 |
| Automatic detection on import | Out of scope |

## 4. Testable invariants

1. Every callout edit yields a valid Book or a structured fail-closed error with the Book unchanged.
2. A Book without callouts produces byte-identical EPUB, HTML, Typst source, and PDF before and after this ADR's slices.
3. Book → Semantic Document → editor → Book is lossless for callouts (title, inlines, ids), English and Kannada.
4. Callouts survive package Save → Open and autosave unchanged.
5. EPUBs with callouts pass EPUBCheck 5.3.0 with zero errors and warnings.
6. The book-wide conversion changes only paragraphs that start with the label, is one undo step, and reports the count before it runs.
7. No new npm dependency, Tauri permission, or frozen pin change.
8. No AI dependency.

## 5. Consequences

### Positive

- Authors get a real lesson box that survives every screen size and format, replacing drawn characters and emoji.
- The maintainer's 25 lessons can be converted in one action.
- Small, semantic change; no page model needed.

### Trade-offs

- Every layer that switches on block type changes: Book Model, validation, Semantic Document, authoring, editor adapter, Writing Studio, three engines.
- One look for all boxes until a Design choice exists.
- Single-paragraph body only.

## 6. Open decision: schema version

ADR-0006 says schema evolution needs an explicit `schemaVersion` bump. ADR-0038 added an *optional field* without a bump. A new *block type* is different: an OpenBook build from before this ADR would open a book with a callout and then fail at export (`UnsupportedContentError`).

- **Option A — bump to `schemaVersion: 2`** with an identity migration 1 → 2 through the ADR-0029 migration path. Older builds refuse version-2 packages cleanly at Open. Costs: `parseBook`, `validateBook`, `createBook`, package compatibility checks, and test fixtures that pin version 1 all change.
- **Option B — stay at 1.** Follows the ADR-0038 precedent and costs nothing now. Acceptable only while no OpenBook build has been released to authors; older builds would fail at export, not at Open.

**Recommendation: A**, because ADR-0006 asks for it and the desktop app is already packaged for Windows (ADR-0032), so older builds may exist. The maintainer decides before Slice 1.

## 7. Implementation sequencing (not authorized here)

1. **Slice 1 — Model and contract:** `callout` in the Book Model and Semantic Document; validation; schema-version decision applied; `BookSession` accepts callouts; editor-adapter round trip; tests. No chrome. Engines still fail closed on callouts.
2. **Slice 2 — Publishing:** EPUB, HTML, and PDF callouts with conditional styles; EPUBCheck; no-callout byte-identity checked against `main`.
3. **Slice 3 — Writing Studio:** the TipTap node, "Make lesson box" and "Back to paragraph", title editing.
4. **Slice 4 — Book-wide conversion:** "Turn matching paragraphs into lesson boxes" with count preview and one undo step.
5. **Slice 5 — Hardening and closure:** English and Kannada end to end (Save/Open, autosave, all exports); the maintainer's cleaned book with its 25 lessons converted; Kindle Previewer check; closure record.

Each slice needs explicit authorization; boundaries may be adjusted in per-slice proposals.

## 8. Non-authorizations

This ADR does not authorize implementation, Book Model changes, engine changes, editor changes, dependency changes, or any slice until a maintainer issues an explicit slice authorization.
