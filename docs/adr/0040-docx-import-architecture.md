# ADR-0040: Word (.docx) Import Architecture

- **Status:** Accepted (PR #164); Slices 1–5 implemented (PRs #166, #168, #170, #172, #174); sequencing closed — see `docs/adr-0040-closure-reconciliation.md`
- **Date:** 2026-10-28
- **Phase:** ROADMAP Phase 1 — MVP Guided Book Creation (§3.1 “Import Existing Book”)
- **Area:** Import / Assets / Desktop / Security boundary
- **Depends on:** ADR-0006, ADR-0015, ADR-0016, ADR-0017, ADR-0019, ADR-0020, ADR-0021, ADR-0028, ADR-0029, ADR-0031, ADR-0033, ADR-0036, ADR-0039
- **Amends:** ADR-0015 §2.1 item 2 (caller decoding boundary) and §2.3 (binary-format deferral), for `.docx` only; ADR-0020 INV-1 (pre-decoded Unicode boundary) and INV-2 (format firewall), for `.docx` only
- **Supersedes:** None
- **Selection record:** `docs/PHASE-1-DOCX-IMPORT-SELECTION.md`
- **Implementation authorization:** None. This ADR does not authorize a slice.

## 1. Context

OpenBook imports Markdown and plain text (ADR-0015, ADR-0020). Every binary format was deferred, and the format firewall rejects anything else with `UNSUPPORTED_FORMAT`. `importer.test.ts` pins `canImport("docx") === false`, and `DesktopStudioCoordinator.#assertSupportedFormat` accepts only `markdown` and `text`.

The Markdown importer has no image path. A Markdown file that references pictures imports as text only.

Most authors write in Word. The maintainer's book *Little Krishna's Wisdom Stories* (25 stories, 27 embedded images, published on KDP) exists only as a `.docx`. It has untagged front-matter pages (Foreword, Preface, Publisher's Note), a typed table of contents, and pictures inside the story text. OpenBook cannot bring it in today.

What already exists and can be reused:

- `@openbook/assets` (ADR-0017): SHA-256 content-addressed store, magic-byte media-type detection, per-class size limits (default 50 MB), reject-only SVG;
- `DesktopStudioCoordinator` asset ingestion and `image` block insertion (ADR-0021, ADR-0034 Slice 4);
- the desktop host command `asset_read_bytes`, which reads bytes from a dialog-selected path (ADR-0034 Slice 4);
- `fflate` **0.8.3** (MIT), already a shipped-runtime dependency of `@openbook/epub` and already **confirmed** in the npm production closure (`docs/release-compliance/npm-production-closure-inventory.json`, evidence ops Slices 3–4). No ZIP library is a dependency of `packages/importer` or `apps/desktop` today.
- the Book Model already has every block type a manuscript needs: `paragraph`, `heading` (1–6), `quote`, `list`, `image`; inlines `text`, `emphasis`, `strong`, `link`; and section roles `foreword`, `preface`, `introduction`, `dedication`, `copyright`, `custom`.

## 2. Decision

OpenBook will add **Word `.docx` import** to `@openbook/importer` that:

1. Reads the `.docx` package with an **in-house, read-only OOXML reader** over **`fflate` 0.8.3**, the ZIP library already in the shipped closure.
2. Maps WordprocessingML to the **canonical Book Model only**. No Word AST, XML node, or relationship id crosses the importer boundary (ADR-0020 INV-3 holds).
3. Returns embedded images as **raw byte payloads**. The desktop coordinator ingests them through the existing ADR-0017/ADR-0021 asset pipeline before any `image` block is committed.
4. Keeps **structure and meaning**, and drops **appearance**. Design Studio owns the look.
5. Enforces **fixed security limits** before and during decompression, and never executes, fetches, or embeds anything the document points to.
6. Needs **no Book Model change**. `schemaVersion` stays `1`.
7. Remains **AI-optional**. No AI is used to guess structure.

```text
Start screen / Write step: "Import a Word file"
        |
        v
Desktop host: dialog (.docx) -> size check -> asset_read_bytes   (bytes, not text)
        |
        v
DesktopStudioCoordinator.importContent({ format: "docx", bytes, filename })
        |
        v
@openbook/importer  DocxImporter
   1. container checks (magic bytes, size, entry count, ratio)      -- fflate
   2. part reader (restricted XML tokenizer; no DTD, no entities)
   3. styles + numbering + relationships (internal targets only)
   4. structure mapping -> candidate Book
   5. image payloads (bytes + alt text + placeholder id)
        |
        v
Coordinator: each payload -> AssetIngestionPipeline (size -> magic -> SVG reject)
             -> AssetRef ids substituted into image blocks
             -> validateBook -> commit (new-project) or batch-atomic append (ADR-0020 INV-10)
        |
        v
Import summary for the author (kept / dropped / warnings)
```

### 2.1 Boundary amendments

**ADR-0015 §2.1 item 2 and ADR-0020 INV-1 (caller decoding boundary).** For `markdown` and `text`, the caller still decodes bytes and passes a Unicode string. For `docx` the importer receives **bytes**, because a `.docx` is a ZIP of XML parts and its text encoding is declared inside each part. File system access stays with the caller: the importer never opens a path.

```ts
export type SupportedImportFormat = "markdown" | "text" | "docx";

export type ImportSource =
  | { readonly format: "markdown" | "text"; readonly content: string; readonly filename?: string }
  | { readonly format: "docx"; readonly bytes: Uint8Array; readonly filename?: string };
```

**ADR-0015 §2.3 and ADR-0020 INV-2 (format firewall).** The firewall becomes `markdown`, `text`, `docx`. Everything else stays rejected with `UNSUPPORTED_FORMAT`: `.doc`, `.docm`, `.dotx`, `.odt`, `.rtf`, PDF, EPUB, HTML. The `canImport("docx") === false` test assertion is replaced, in the slice that adds the reader, by `true`, and a new assertion keeps `canImport("doc") === false`.

`ImportService.import` changes with the union:

- today it rejects any source whose `content` is not a string (`INVALID_CONTENT`). That guard applies to `markdown` and `text` only; a `docx` source must instead carry a non-empty `Uint8Array` in `bytes`, or it fails with `INVALID_CONTENT`;
- today the default id seed is built from `format`, `filename`, and `content`. For `docx` the seed is built from `format` and the **SHA-256 of `bytes`**, not from the filename, so two different files never share an id sequence and identical bytes always give identical ids (INV-D6). `ImportOptions.idSeed` still wins when given.

The ADR-0015 rejection of external converter subprocesses (Pandoc, LibreOffice, Calibre) is **unchanged**.

### 2.2 Importer result for images

`ImportResult` gains one optional field. Markdown and text imports never set it.

```ts
export interface ImportedImagePayload {
  /** Placeholder id used by image blocks in result.book until the caller ingests the bytes. */
  readonly placeholderId: string;
  readonly bytes: Uint8Array;
  /** File name inside the package, e.g. "image3.png". Informational only. */
  readonly sourceName: string;
  /** From wp:docPr/@descr, then @title; empty when Word has none. */
  readonly altText: string;
}

export interface ImportResult {
  // ...existing fields...
  readonly images?: readonly ImportedImagePayload[];
}
```

- The importer stays free of `@openbook/assets`. It does not hash, store, or type-sniff images. ADR-0015 §2.2 dependency rules hold.
- `result.book` is not committed by the importer. The coordinator ingests every payload, replaces each `placeholderId` with the real `AssetRef.id`, adds the `AssetRef` (with `altText`, and `licence` empty for the author to fill), and only then commits.
- `validateBook` does **not** check that an `image` block's `assetId` names an entry in `Book.assets`; today only package Save catches that (`DANGLING_IMAGE_REFERENCE`). So before commit the coordinator runs an explicit check: every `image` block's `assetId` is in `Book.assets`, and no `placeholderId` remains anywhere in the Book. A failure is a fail-closed import error, not a warning. Placeholder ids use a reserved prefix that `AssetRef` ids never use, so a leftover is unambiguous.
- A payload that the asset pipeline rejects (unsupported type, over the size limit, unsafe SVG) removes its `image` block and adds a warning that names the story or chapter where the picture was. The rest of the book still imports. An author can re-insert the picture with the Writing Studio image button.
- `new-project` mode replaces the in-memory session (ADR-0020 INV-9). `append-sections` mode keeps ADR-0020 INV-10 batch atomicity: if commit fails, assets ingested for this import are not referenced by the Book, and the Book is unchanged. Bytes left in the asset store without an `AssetRef` are not written to the package: package Save builds its asset entries from `Book.assets` only (`mapAssetRefsToPackageEntries`), so they never become orphan package entries, which Open rejects. Slice 3 adds a test for this rollback case.

## 3. Parsing approach — options considered

| Option | What it is | Licence | For | Against | Decision |
|---|---|---|---|---|---|
| **A. In-house OOXML reader over `fflate`** | Our own reader for the small part of WordprocessingML a manuscript uses, over the ZIP library already shipped | `fflate` MIT (already confirmed in closure); our code Apache-2.0 | No new third-party package. We choose exactly which XML is read, so the security limits sit in our code. Direct access to style ids, outline levels, numbering, and image alt text. Output goes straight to the Book Model with no HTML step. Pure JS; runs under `node --test` and in the webview | We own the edge cases (odd style names, nested runs, fields). Needs a restricted XML tokenizer | **Chosen** |
| B. `mammoth` (mammoth.js) | Mature DOCX → HTML/Markdown converter | BSD-2-Clause; pulls in JSZip (dual MIT / GPL-3.0, MIT elected), an XML parser, a promise library, and other helpers | Handles many real-world documents. Style-map support | Produces HTML or Markdown, which we would parse again, losing information on the way (outline level, numbering kind). Adds roughly a dozen packages to the shipped closure, each needing evidence-ops entries. Its default image handling inlines images as data URIs; we would have to override it. Limits on ZIP size and ratio are not ours to set | Not chosen; recorded as the fallback if Option A proves too costly in Slice 2 (would need its own ADR amendment) |
| C. External converter (Pandoc, LibreOffice) | Subprocess converts DOCX to Markdown/HTML | Pandoc GPL-2.0-or-later; LibreOffice MPL-2.0 | Very broad format coverage | Already rejected by ADR-0015. A subprocess and a very large bundled runtime on every platform. GPL binary distribution questions. Same lossy HTML/Markdown step as B | **Rejected** (unchanged) |
| D. Webview `DOMParser` for XML | Use the browser XML parser | n/a | No code to write | Not available under `node --test`, so the importer could not be tested in its own package. Behaviour on DTDs and entities differs by engine | Not chosen |

**XML parsing inside Option A.** WordprocessingML parts are well-formed XML without DTDs. The reader uses a small in-house tokenizer that:

- rejects any `<!DOCTYPE` and any entity reference other than the five predefined ones and numeric character references (no XXE, no entity expansion);
- caps element nesting depth at 256 and attribute count per element at 64;
- decodes UTF-8 and UTF-16 as declared, and fails closed on malformed bytes;
- reads only the elements listed in §4; everything else is skipped, not interpreted.

A third-party XML parser is not added. If one becomes necessary, it goes through §3.1 like any other dependency.

### 3.1 Dependency process

- **Reuse of `fflate`.** Slice 1 adds `"fflate": "0.8.3"` to `packages/importer/package.json`, resolving to the **same** lockfile entry (`fflate-0.8.3.tgz`, integrity already recorded). The closure component, version, licence, and integrity are unchanged. The slice PR updates the “used by” columns in `docs/release-compliance/NPM-PRODUCTION-INVENTORY-SLICE-3.md` and `docs/release-compliance/THIRD-PARTY-NOTICES.md` to add `@openbook/importer`, and re-runs the existing release-readiness verification so `npm-production-closure-inventory.json` still matches the lockfile.
- **Any other new package, or any `fflate` version change,** must, in the same slice PR: pin an exact version in `package-lock.json`; record licence evidence from the published package (licence field and `LICENSE*` file) for the package and its full transitive tree; add `confirmed` entries to `npm-production-closure-inventory.json` with `classification`, `provenance.integrity`, and `licensing`; update `THIRD-PARTY-NOTICES.md`; and be named in the maintainer's slice authorization. Packages that are GPL/AGPL-only, need native bindings, or spawn subprocesses are not acceptable for the importer.
- `apps/desktop` gains **no** direct ZIP dependency. It reaches `fflate` only through `@openbook/importer`, as it already does through `@openbook/epub`.

## 4. DOCX → Book Model mapping

The reader opens `[Content_Types].xml`, `_rels/.rels`, `word/document.xml`, `word/_rels/document.xml.rels`, `word/styles.xml`, `word/numbering.xml`, `docProps/core.xml`, and image parts under `word/media/`. No other part is read.

### 4.1 Metadata

| DOCX source | Book Model | Rule |
|---|---|---|
| `docProps/core.xml` `dc:title` | `metadata.title` | Used if non-empty |
| First paragraph styled **Title** | `metadata.title` | Used when core title is empty or is Word's default (“Document1” etc.); the paragraph is not kept as body text |
| Paragraph styled **Subtitle** before the first heading | `metadata.subtitle` | Not kept as body text |
| `dc:creator` | `metadata.authors` | Split on `;`. Word often fills this with the computer's account name, so the import summary shows the author name for the author to confirm in the Metadata Wizard |
| `dc:language` or `w:lang` of the Normal style | `metadata.language` | Falls back to `ImportOptions.defaultLanguage` |
| `dcterms:created` | — | **Not** used as `publishedAt` (ADR-0015 §2.1 item 4 and ADR-0020 INV-4: no manufactured metadata) |
| `ImportOptions.metadataOverrides` | metadata | Always win, as today |

### 4.2 Structure

Styles are matched by **outline level and built-in style id** (`Heading1`…`Heading6`, `Title`, `Subtitle`, `Quote`, `IntenseQuote`, `Caption`, `ListParagraph`, `TOC1`…`TOC9`), following `w:basedOn` chains, not by the display name. This keeps Kannada and other localized Word installs working, where display names are translated.

| DOCX | Book Model |
|---|---|
| Heading 1 (or outline level 0) | New `main` section, role `chapter`, title from the heading text — same `splitStrategy` default (`heading-1`) as the Markdown importer |
| Heading 2–6 | `heading` block with the same level, inside the current section |
| `splitStrategy: "heading-2"` | Heading 2 also starts a section, as in the Markdown importer |
| Normal / body paragraph | `paragraph` block |
| Quote / Intense Quote | `quote` block |
| Numbered or bulleted paragraphs (`w:numPr`) | consecutive items become one `list` block; `ordered` from the numbering format (`bullet` → false, else true). Nested levels are flattened to one level with a warning, because Book Model lists are flat |
| Empty paragraphs, page breaks, section breaks, column breaks | dropped |
| Tables | each cell's paragraphs become `paragraph` blocks in reading order, with one warning per table (no table block in the Book Model) |

**Chapter titles without heading styles.** Many manuscripts format chapter titles by hand (bold or larger Normal text) and use no heading style at all. If the document has **no** Heading 1 (or outline level 0) paragraph, the importer looks for chapter titles in this order and uses the first that finds at least two:

1. **Typed contents page** (§4.4): each contents line, after removing page numbers and leader dots, that matches the whole text of a later short paragraph marks that paragraph as a chapter title.
2. **Hand-formatted titles:** a short single-line paragraph (≤ 12 words, no ending full stop) whose runs are all bold, or whose size is larger than the Normal style, and which follows a page break or starts a new page section.

Paragraphs found this way are treated as Heading 1. The import summary says chapters were found without heading styles and asks the author to check them in Structure Studio. If neither rule finds two titles, the body becomes one chapter, as plain text import does, with a warning.

### 4.3 Untagged front matter

Many manuscripts type “Foreword” in bold Normal text instead of using a heading style. Content **before the first Heading 1** is split into front-matter sections using a short, single-line paragraph whose whole text matches a known front-matter title (case- and punctuation-insensitive), in English or Kannada:

| Recognised title | Section |
|---|---|
| Foreword · ಮುನ್ನುಡಿ | `front`, role `foreword` |
| Preface · ಪೀಠಿಕೆ | `front`, role `preface` |
| Introduction · ಪ್ರಸ್ತಾವನೆ | `front`, role `introduction` |
| Dedication · ಅರ್ಪಣೆ | `front`, role `dedication` |
| Copyright | `front`, role `copyright` |
| Publisher's Note, Acknowledgements, About this book · ಪ್ರಕಾಶಕರ ಮಾತು, ಕೃತಜ್ಞತೆಗಳು | `front`, role `custom`, title kept |

A short title (at most 6 words, not ending with “.”, “!” or “?”) that **starts with** a title from the table followed by “for”, “to”, “of”, “:” or a spaced dash (“ - ”, “ – ”, “ — ”) also matches and takes that title's role, keeping its own text: “Preface for Parents” is a `preface` section, “Foreword to the Second Edition” a `foreword` section, “Introduction: How to Use This Book” an `introduction` section. Added on 2026-10-29 with maintainer authorization — see `docs/adr-0040-front-matter-title-variants.md`.

The same rule applies to a Heading 1 whose text matches the table, **but only while no chapter has started yet**: it becomes a `front` section with that role. Once the first non-matching Heading 1 has started a chapter, later Heading 1s stay where the author put them. A chapter titled “Introduction” after the front matter stays a chapter, and “Acknowledgements” at the end stays at the end. Moving such sections into back matter is left to the author in Structure Studio. The word list is a constant in one module so later slices can extend it. The maintainer confirmed the Kannada words on 2026-10-28.

Other content before the first heading:

- paragraphs that only repeat the title, subtitle, or author name are consumed into metadata and dropped (engines generate the title page);
- anything else lands in one `front` section, role `custom`, titled from its first line, with a warning asking the author to check it in Structure Studio.

### 4.4 Table of contents

Engines generate navigation (ADR-0009 nav, ADR-0011, ADR-0013). A Word table of contents is dropped:

- a `TOC` field (`w:fldSimple` or `w:instrText` starting with `TOC`) and its result runs;
- a `w:sdt` whose `w:docPartGallery` is “Table of Contents”;
- paragraphs styled `TOC1`…`TOC9`;
- a **typed** contents page: a paragraph whose text is “Contents”, “Table of Contents”, or “ಪರಿವಿಡಿ”, followed by lines most of which (≥ 60 %) match later heading text after removing trailing page numbers and leader dots. The heading and those lines are dropped together.

Each drop adds one `info` issue so the summary can say “Your typed table of contents was removed; OpenBook builds one for you.” A typed contents page is read before it is dropped, because it may supply chapter titles (§4.2).

### 4.5 Inline text

| DOCX run property | Book Model |
|---|---|
| `w:b` (bold), or a character style based on Strong | `strong` |
| `w:i` (italic), or Emphasis | `emphasis` |
| `w:hyperlink` with an **external** relationship whose target is `http:`, `https:`, or `mailto:` | `link` with that `href`. The target string is copied; it is **never fetched** |
| `w:hyperlink` with any other scheme, or an internal `w:anchor` | plain text (no cross-reference model yet) |
| `w:tab`, `w:br` (line break inside a paragraph) | a space; soft line breaks inside poems are kept as separate paragraphs only when the author used paragraph marks |
| `w:sym`, `w:noBreakHyphen`, `w:softHyphen` | the Unicode character, a non-breaking hyphen, or nothing |
| Underline, strike, colour, highlight, font, size, spacing, small caps, superscript/subscript | dropped |

**Fields.** For every field, simple (`w:fldSimple`) or complex (`w:fldChar` begin/separate/end), the instruction text (`w:instrText`, `@w:instr`) is **never** emitted as content. Only the field result, the runs between `separate` and `end`, is read, under these rules:

| Field | Handling |
|---|---|
| `TOC` | result dropped (§4.4) |
| `HYPERLINK "url"` | result text becomes a `link` under the same scheme rules as `w:hyperlink`; `\l` (internal anchor) gives plain text |
| `INCLUDEPICTURE`, `INCLUDETEXT`, `LINK`, `DDE`, `DDEAUTO`, `IMPORT` | result dropped with a warning; the target is **never** fetched or opened (§5) |
| `PAGE`, `NUMPAGES`, `PAGEREF` | result dropped (page numbers belong to the engines) |
| Anything else (`SEQ`, `REF`, `DATE`, `AUTHOR`, …) | cached result text kept as plain text |

Nested fields follow the same rules from the inside out.

Adjacent runs with the same marks are merged. Text is kept exactly as Unicode (Kannada conjuncts, ZWJ/ZWNJ untouched).

**Legacy Kannada fonts.** Some Kannada manuscripts use pre-Unicode fonts (for example Nudi or Baraha ASCII fonts) where Latin code points draw Kannada glyphs. Converting those is out of scope. When runs use a font name on a short known list, the importer adds a warning that the text may be in a legacy encoding and will not display correctly.

### 4.6 Images

| DOCX | Handling |
|---|---|
| `w:drawing` → `wp:inline` or `wp:anchor` → `a:blip/@r:embed` | `image` block at that point in reading order; bytes from the internal relationship target under `word/media/`. Floating (`wp:anchor`) images are placed after the paragraph that anchors them |
| `wp:docPr/@descr` (then `@title`) | `AssetRef.altText`. Empty alt text is allowed at import. *Correction (2026-10-28, Slice 5): Book Doctor does not report missing alt text — ADR-0018 keeps accessibility diagnostics inactive — so the import warns itself (`DOCX_PICTURES_WITHOUT_ALT_TEXT`); see `docs/adr-0040-slice-5-hardening.md` §1.* |
| Next paragraph styled **Caption** | the `image` block's `caption`; the paragraph is not repeated as body text |
| `asvg:svgBlip` (Word's SVG with PNG fallback) | the **PNG fallback** is used; the SVG is not read |
| VML `v:imagedata/@r:id` (older documents) | same as `a:blip` |
| `a:blip/@r:link` (linked, not embedded, picture) | dropped with a warning; the link is never fetched |
| EMF, WMF, TIFF, or any type the asset pipeline rejects | dropped with a warning naming its location |
| The same media part used several times | one payload, several `image` blocks (content addressing deduplicates anyway) |
| Image crop, size, wrapping, position, effects | dropped; engines lay images out |

Media type is decided by `@openbook/assets` magic-byte detection, not by the file extension or `[Content_Types].xml`.

### 4.7 Dropped on purpose

Word fonts, font sizes, colours, line and paragraph spacing, indents, alignment, page size, margins, headers, footers, page numbers, section/column layout, themes, and document grid. Design Studio (ADR-0036) and the engines own all of these. The import summary says so in one line, not per paragraph.

## 5. Security limits

A `.docx` is an untrusted ZIP of XML from outside OpenBook (ROADMAP §“Dependencies, external processes, imported files and plugins must be treated as security boundaries”). All limits are constants in one module; exceeding any of them fails the import with a structured, plain-language error and no Book change.

| Check | Limit / rule |
|---|---|
| File signature | Must start with `PK\x03\x04`. A CFB signature (`D0 CF 11 E0`) gets “This looks like an older .doc file or a password-protected document. Save it as .docx in Word and try again.” |
| Input file size | ≤ 200 MB, checked by the host from file metadata **before** reading bytes, and again by the importer |
| ZIP entry count | ≤ 2,000 |
| Per-entry uncompressed size | XML parts ≤ 32 MB; media entries ≤ the ADR-0017 image size limit (50 MB) |
| Total uncompressed size | ≤ 512 MB |
| Compression ratio | ≤ 1,000 : 1 per entry once it passes 1 MB uncompressed. Real WordprocessingML is usually 5–30 : 1, but long, repetitive documents can pass 100 : 1, so the ceiling stays well above that. Memory is bounded by the absolute size caps above, and the ratio only stops runaway entries early. Slice 1 measures real manuscripts, including the English and Kannada fixtures, and records the observed ratios before this constant is fixed |
| How sizes are enforced | Declared sizes in the central directory are checked first, then **actual** inflated bytes are counted while streaming (`fflate` streaming inflate) and decompression stops the moment a limit is passed. Headers are not trusted |
| ZIP features | Encrypted entries, multi-disk archives, and duplicate entry names are rejected. Entry names are only used as lookup keys in memory; nothing is written to disk from them |
| Macros | `.docm`/`.dotm` content types (`application/vnd.ms-word.document.macroEnabled.main+xml`, template types) are rejected. `vbaProject.bin` and `word/vbaData.xml` are never read |
| External relationships | `TargetMode="External"` targets are **never fetched or opened**. Only hyperlinks use their target, as an `href` string (§4.5). Attached templates, linked images, frames, and remote subdocuments are ignored with a warning. Field instructions that name files or URLs (`INCLUDEPICTURE`, `INCLUDETEXT`, `LINK`, `DDE`) are never resolved (§4.5) |
| Embedded objects | OLE objects (`w:object`, `o:OLEObject`, `word/embeddings/*`), ActiveX controls, and `w:altChunk` (embedded HTML, RTF, or other documents) are **never parsed**. Their placeholder images are dropped; one warning lists them |
| XML | No DTD, no entities beyond the predefined five, depth ≤ 256, attributes ≤ 64 per element (§3) |
| Parts read | Only the parts listed in §4. Custom XML, glossary, web settings, fonts (`word/fonts/*`, obfuscated embedded fonts) are not read |
| Images | Every payload passes `AssetIngestionPipeline` (size → magic bytes → SVG reject) before it can be referenced |

Parsing is synchronous and bounded by these limits. The desktop shows a progress state while importing (ADR-0020 job tracking); moving the importer into a worker is allowed but not required.

**Host transport.** `asset_read_bytes` currently returns bytes as a JSON number array. For files up to the 200 MB cap this is slow. Slice 4 may add a dedicated `docx_read_bytes` command that checks the size first and returns a binary IPC response; it reads only a dialog-selected path, as `asset_read_bytes` does, and needs no new Tauri permission.

## 6. Desktop import surface

- **Start screen (ADR-0039):** “Import a Word file” sits beside the existing import action. It creates a new project from the `.docx` (`new-project` mode).
- **Write step:** “Add chapters from a Word file” uses `append-sections` mode.
- The file dialog filters on `.docx`. The browser/dev fallback accepts `.docx` via `<input type="file">`.
- After import, the Guide panel shows the **import summary**: counts (sections, images, words), what was dropped (formatting, table of contents, unsupported images, comments, tracked changes), and each warning with the chapter it belongs to. Messages use the Phase 1 plain-language terminology.
- The coordinator's `#assertSupportedFormat` accepts `docx`. Workflow stage and job rules (ADR-0020 INV-6–INV-8) are unchanged.

## 7. Non-goals

- **Tracked changes:** the importer reads the document **as if all changes were accepted** and warns once that tracked changes were present. It does not show or preserve revisions. Accepting means: `w:ins` and `w:moveTo` content kept; `w:del`, `w:delText`, and `w:moveFrom` content dropped (so moved text appears once, at its new place); a deleted paragraph mark (`w:pPr/w:rPr/w:del`) joins that paragraph with the next one; formatting changes (`w:rPrChange`, `w:pPrChange`) use the new formatting.
- **Comments** (`word/comments.xml`): not read; one warning.
- **Footnotes and endnotes:** not imported in this ADR. The reference mark is dropped and one warning says how many notes were skipped. A later ADR may add a notes model; mapping trivial endnotes to a `notes` back-matter section is a candidate, not a commitment.
- Text boxes, shapes, WordArt, SmartArt, charts, equations (OMML): text inside text boxes is not imported; one warning per kind.
- Fixed-layout or picture-book page reproduction; any attempt to keep Word's page layout.
- Tables as tables; nested lists as nested lists; cross-references and bookmarks as links.
- `.doc`, `.docm`, `.dotx`, `.odt`, `.rtf`, PDF, EPUB, HTML import.
- Export back to `.docx`.
- Legacy (non-Unicode) Kannada font conversion.
- AI-assisted structure detection.

## 8. Implementation sequencing (not authorized here)

When separately authorized, implementation should proceed in small slices, for example:

1. **Slice 1 — Container reader and limits:** `fflate` reuse in `packages/importer` (§3.1 evidence updates in the same PR); `ImportSource` byte variant; signature, size, entry-count, ratio, and streaming-inflate limits; macro and encryption rejection; restricted XML tokenizer; tests with crafted ZIP bombs, deep XML, DOCTYPE, `.docm`, and CFB files. `canImport("docx")` stays `false` until Slice 2.
2. **Slice 2 — Text and structure mapping:** styles, numbering, metadata, headings and sections, chapter titles without heading styles (§4.2), front-matter detection (§4.3), TOC dropping (§4.4), inline marks, links, and fields (§4.5), tracked changes (including moves), comments, and footnote handling per §7; `canImport("docx") === true`; deterministic ids; `validateBook` passes; English and Kannada fixtures built in tests from XML strings.
3. **Slice 3 — Images:** `ImportedImagePayload`, drawing/VML/SVG-fallback/caption handling (§4.6); coordinator ingestion through `AssetIngestionPipeline`, placeholder substitution with the explicit image-reference check (§2.2), rejection-to-warning, and ADR-0020 INV-10 batch atomicity, including a test that a rolled-back append leaves no orphan package entry.
4. **Slice 4 — Desktop import surface:** start-screen and Write-step actions, `.docx` dialog and browser fallback, host size check before read (and binary transport if needed), import summary in the Guide panel.
5. **Slice 5 — Hardening:** end-to-end English and Kannada `.docx` fixtures with images (including one shaped like *Little Krishna's Wisdom Stories*: untagged Foreword/Preface/Publisher's Note, typed contents page, many inline images) through import → package Save/Open → autosave → EPUB (EPUBCheck), HTML, and PDF; malicious-file corpus re-run; closure reconciliation.

Fixture `.docx` files committed to the repository must be authored for the project (no third-party documents). On 2026-10-28 the maintainer gave permission to use *Little Krishna's Wisdom Stories* as a **local manual check** in Slice 5. The book's file is not committed to the repository, and its text and images do not appear in test fixtures, unless the maintainer decides otherwise.

Exact slice boundaries may be adjusted in per-slice proposals; each slice still needs explicit authorization.

## 9. Testable architectural invariants

1. **INV-D1:** Every `.docx` import yields a `validateBook`-valid Book or a structured fail-closed error; on error the session is unchanged.
2. **INV-D2:** No Word XML node, style id, relationship id, or numbering id appears in the Book or crosses the importer boundary.
3. **INV-D3:** Every `image` block in an imported Book references an `AssetRef` that passed `AssetIngestionPipeline`, checked explicitly by the coordinator before commit (not left to `validateBook`). No placeholder id survives commit. No image bytes are stored in Book JSON.
4. **INV-D4:** No limit in §5 can be exceeded by a crafted file; decompression stops at the limit without allocating the declared size.
5. **INV-D5:** No external relationship target or field instruction target is fetched, opened, or resolved; no macro, OLE, ActiveX, or `altChunk` content is parsed; no field instruction text appears in the Book.
6. **INV-D6:** Identical input bytes and options produce an identical Book (deterministic ids, ADR-0015 §2.1 item 3).
7. **INV-D7:** `publishedAt` is never derived from DOCX dates.
8. **INV-D8:** Markdown and text import behaviour and output are unchanged.
9. **INV-D9:** Kannada text round-trips byte-for-byte (NFC not forced; ZWJ/ZWNJ kept).
10. **INV-D10:** The npm production closure gains no new component for this ADR unless a slice records it under §3.1.
11. **INV-D11:** No AI dependency is introduced.

## 10. Consequences

### Positive

- Authors with a finished Word manuscript can start in OpenBook without retyping, which is the most common real-world starting point.
- Pictures come in with the text, through the same safety checks as the image button.
- No new third-party package; the ZIP library is already shipped and cleared.
- No Book Model change.

### Trade-offs

- OpenBook owns an OOXML reader. Unusual documents will need fixes over time; warnings make the gaps visible instead of silent.
- Front-matter and contents-page detection are heuristics. They can misfire; the author fixes the result in Structure Studio.
- Formatting authors cared about in Word (fonts, spacing, page size) is deliberately lost. Design Studio must be good enough that this feels like a feature.
- Footnotes, tables, and text boxes are flattened or dropped in this ADR.
- The importer's input boundary is no longer strings only; ADR-0015 and ADR-0020 record that amendment here.

## 11. Non-authorizations

This ADR does **not** authorize implementation, dependency changes (including adding `fflate` to `packages/importer`), changes to `SupportedImportFormat`, `ImportSource`, `ImportResult`, or the `canImport` tests, desktop host commands, UI chrome, fixture files, or any DOCX import slice until a maintainer issues an explicit slice authorization.
