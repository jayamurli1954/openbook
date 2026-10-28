# ADR-0040 Slice 2: DOCX Text and Structure — Implementation Record

- **Status:** Implemented on main (PR #168)
- **Date:** 2026-10-28
- **Parent architecture:** ADR-0040 — Word (.docx) Import
- **Scope:** Turn a `.docx` into a Book: metadata, chapters, front matter, contents-page removal, paragraphs, headings, quotes, lists, bold/italic, links, fields, tracked changes. `.docx` import is switched on in `@openbook/importer`. No pictures (Slice 3), no desktop surface (Slice 4).
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-28: “go ahead with ADR-0040 Slice 2: turning the Word file's text into a book … This is when .docx import gets switched on in the importer.”)

## 1. What landed

### Importer boundary (ADR-0040 §2.1)

- `SupportedImportFormat` is `markdown | text | docx`. `ImportSource` is now `TextImportSource | DocxImportSource`.
- `ImportService.canImport("docx") === true`. `.doc`, `.docm`, PDF and the rest stay rejected (`UNKNOWN_FORMAT`).
- A `docx` source must carry a `Uint8Array`, or it fails with `INVALID_CONTENT`. Its id seed is `docx` plus the SHA-256 of the bytes, so identical bytes give identical ids and different files never share them. `ImportOptions.idSeed` still wins.
- Markdown and text imports are unchanged; `assembleBook` gained an optional front-matter argument, defaulting to none.

### New modules (`packages/importer/src/docx/`)

| Module | Role |
|---|---|
| `parts.ts` | Reads styles (with `basedOn` chains, outline levels, run properties), numbering (bullet vs ordered, level overrides), relationships (resolved relative to their part), and core properties. Transitional and Strict namespaces |
| `body.ts` | Walks `w:body` into paragraph records. Handles runs, tabs, breaks, symbols, hyperlinks, simple and complex fields (spanning paragraphs), tracked changes, content controls, tables, and records what it leaves out |
| `structure.ts` | Metadata, contents-page removal, chapter detection, front matter, title-page cleanup, and blocks/inlines |
| `docx-import.ts` | Entry point: open (Slice 1) → read parts → walk → structure → `buildMetadata` → `validateBook`. Adds one plain-language issue per kind of thing left out |

### Mapping as implemented

- **Metadata (§4.1):** `dc:title` unless it is Word's default (`Document1` and the like), else the first **Title** paragraph; **Subtitle** before the first heading; `dc:creator` split on `;`, with an info issue asking the author to confirm it; language from `dc:language` or the style default. `dcterms:created` is never used. Caller overrides always win.
- **Language:** when most letters are Kannada and the declared language is not, the book's language is set to `kn`, with an info issue. Word stores `en-US` as the default even in Kannada documents, so the declared language alone would mislabel them. This rule is not in ADR-0040 §4.1; it is recorded here as a slice decision.
- **Chapters (§4.2):** Heading 1 (or Heading 2 with the `heading-2` strategy) starts a chapter. Styles are matched by built-in name or id through `basedOn`, so a custom or localized style based on Heading 1 counts. Other headings become heading blocks.
- **No heading styles (§4.2):** first the typed contents page names the chapters; else short bold or larger lines at the top of a page; else one chapter. Each case adds a warning.
- **Front matter (§4.3):** a Heading 1 or a short line matching the confirmed English or Kannada titles, only before the first chapter. Content before any section that only repeats the title, subtitle, or author (also “by …”) is dropped; anything else becomes one `custom` front section with a warning.
- **Contents pages (§4.4):** Word's TOC field, TOC content control, and TOC/TOC Heading styles are dropped. A typed contents page is dropped when ≥ 60 % of its lines name later paragraphs; page numbers are stripped (ASCII, Kannada, and Roman digits, with leader dots).
- **Text (§4.5):** bold → strong and italic → emphasis, from direct formatting or the Strong/Emphasis character styles; paragraph-style bold is appearance and is ignored. Heading text is plain. `http`, `https`, and `mailto` links are kept; other schemes and internal anchors become plain text. Field instructions are never emitted; HYPERLINK fields become links; TOC, PAGE, NUMPAGES, PAGEREF, SECTIONPAGES results are dropped; INCLUDEPICTURE, INCLUDETEXT, LINK, DDE, DDEAUTO, IMPORT results are dropped with a warning and never resolved; other field results are kept.
- **Tracked changes (§7):** read as accepted: `w:ins`/`w:moveTo` kept, `w:del`/`w:moveFrom`/`w:delText` dropped, a deleted paragraph mark joins the paragraph to the next.
- **Lists:** consecutive items with the same numbering instance become one list; nested items are flattened with a warning.
- **Field safety:** field boundaries inside deleted text still open and close fields. A field left open is closed at its paragraph's end (or, for a table of contents, at the first non-TOC paragraph), with a warning. A broken field never swallows later text.
- **Hidden text** (`w:vanish`, direct or through a style) is never imported; one info issue.
- **Symbols:** Symbol-font characters map to Greek and maths Unicode; picture-font symbols (Wingdings and the like) are dropped with a warning.
- **Title style used for stories:** a lone Title paragraph is the title page. With several, if the first differs from the file's title, they become chapters, with a warning.
- **Part headings** (Heading 1 with the `heading-2` strategy) open the next chapter as a heading block instead of becoming front matter.
- **Contents tail:** contents lines after the last matched entry that still end in a page number are removed too.
- **Left out, with one issue each:** formatting (info), table of contents (info), pictures (warning, “coming in a later update”), tracked changes, comments, footnotes/endnotes, tables (cell text kept as paragraphs), text boxes, shapes/charts/SmartArt, equations, embedded objects and `altChunk`, outside content, unsafe links, and pre-Unicode Kannada fonts (Nudi / BRH / Baraha ASCII).
- A Caption paragraph right after a picture is held back for Slice 3, which attaches it to the picture.

## 2. Desktop

Two UI files typed their Markdown/text format picker as `ImportSource["format"]`. Now that `ImportSource` includes `docx`, they use `TextImportSource["format"]`. This is a type-only change with no behaviour change. One coordinator test that casts an unsupported format had its cast adjusted the same way.

The coordinator still rejects `docx` at runtime (`UNSUPPORTED_FORMAT`) until Slice 4 adds the desktop import surface. A new coordinator test pins this: the Book and stage are unchanged.

## 3. Tests

`packages/importer/src/docx/docx-import.test.ts` builds every `.docx` in the test (styles, numbering, relationships, core properties) and imports it through `ImportService`:

- An English book with heading styles: title, subtitle, Heading 1 and untagged front matter, chapters, a Heading 2 block, bold/italic runs and character styles, external and internal links, bullet and numbered lists, a quote.
- Determinism, and distinct ids for distinct files.
- Metadata: core title vs Word's default title, authors from properties, overrides, file-name fallback.
- A Kannada book with no heading styles: a typed ಪರಿವಿಡಿ with ASCII and Kannada page numbers, ಮುನ್ನುಡಿ as front matter, chapters from the contents page, language `kn`.
- Title-page cleanup; unrecognised pre-chapter text; chapters from bold/large text after page breaks; the one-chapter fallback; a localized style based on Heading 1; front-matter titles only before the first chapter; the `heading-2` and `single-chapter` strategies.
- Word TOC field, TOC styles, and TOC content control removed.
- Fields: no instruction text leaks; HYPERLINK (complex and simple) and anchors; SEQ kept; PAGE dropped; INCLUDEPICTURE dropped and reported.
- Tracked changes, including moves and a deleted paragraph mark.
- Lists split by numbering instance and flattened nesting; everything left out reported exactly once; the legacy Kannada font warning; a document without a styles part.
- Failures: not a ZIP, no text, bytes of the wrong type. Markdown and text unchanged.

A review pass found 10 issues (field safety, hidden text, title-page lines guessed as chapters, carried text at the end or before a table, Part headings, Title-style story titles, the contents tail, symbols, double spaces, and duplicated code). All were fixed, with regression tests.

The importer runs 90 tests and the desktop 444. The full repository `npm test` (12 packages, 0 failures) and the desktop build pass locally.

## 4. Explicit exclusions

- Pictures, alt text, captions, asset ingestion (Slice 3)
- The desktop dialog, host read, coordinator acceptance, and import summary UI (Slice 4)
- Real-manuscript fixtures, package round trip, EPUB/HTML/PDF checks (Slice 5)
- Footnotes, comments, tables as tables, nested lists, text boxes (ADR-0040 §7 non-goals)

## 5. Known limits for review

- When neither the core properties nor a Title paragraph names the book, a large bold first line is not used as the title. It lands in a `custom` front section for review, and the title falls back to the file name.
- Chapter detection without heading styles is a heuristic. Its warnings tell the author to check Structure.
