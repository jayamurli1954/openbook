# ADR-0038 Cover Wizard (Image Cover) — Closure & Reconciliation

- **Status:** Implementation-complete (Slice 6 merged in PR #185, `01c0fbc`); closure/reconciliation record
- **Date:** 2026-10-29
- **Baseline:** `main` after ADR-0038 Slice 5 status reconcile (PR #184, `21d1e73`) plus Slice 6
- **Authority:** ADR-0038 — Phase 1 Cover Wizard Architecture (Image Cover)
- **Implementation authorization:** Completed for the six approved ADR-0038 slices; no further ADR-0038 slice is authorized by this record

## 1. Purpose

Reconcile the ADR-0038 implementation against the accepted architecture and close the Cover Wizard slice sequence.

This record does not authorize generated or text-on-image covers, cover templates, print covers (wrap, spine, back cover, bleed, barcode), image editing, WebP/GIF/SVG covers, AI covers, a "leave the cover out" PDF option, or a Kindle-specific cover change.

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| — | Selection + ADR-0038 | Accepted — PR #153 |
| 1 | Cover model and contract (`publishing.coverAssetId`, validation, `setCover`/`clearCover`, desktop port) | Done — PR #163 (status PR #176) |
| 2 | Image checks (PNG/JPEG size reader with EXIF orientation; size and shape warnings) | Done — PR #177 (status PR #178) |
| 3 | Cover Wizard chrome (Cover step; tidy-up of unused old cover pictures) | Done — PR #179 (status PR #180) |
| 4 | EPUB cover (`cover-image`, EPUB 2 meta, `cover.xhtml`, `cover` landmark); amends ADR-0010 | Done — PR #181 (status PR #182) |
| 5 | HTML and PDF cover | Done — PR #183 (status PR #184) |
| 6 | Hardening, real-book check, PDF language fix, closure | Done — PR #185 (status PR closes the sequence) |

## 3. Architectural invariants (ADR-0038 §4)

1. **Every cover edit yields a valid Book or a structured fail-closed error.** Contract, fields-port, and end-to-end tests; rejected edits leave `serializeBook` output unchanged.
2. **A cover, when set, is an existing JPEG or PNG image asset with non-empty alt text.** `validateBook` errors `cover-asset-missing`, `cover-asset-not-image`, `cover-alt-text-missing`; the checked command also verifies the bytes. Removing the current cover's picture fails (end-to-end tested on a reopened package).
3. **A Book without a cover is valid, and every engine's output for it is unchanged.** EPUB bytes (Slice 4) and HTML, Typst source, and PDF bytes (Slice 5) were compared against builds of the engines on `main` before each slice: identical for every fixture tried.
4. **The cover round-trips through the package as an ordinary asset plus `coverAssetId`; no cover page is stored.** English and Kannada end-to-end tests check `book.json`'s `publishing` keys and that the package holds no HTML, XHTML, PDF, Typst, EPUB, or OPF file; also seen with the real book (31 package files, none of them a cover document).
5. **Generated EPUBs with a cover pass EPUBCheck.** EPUBCheck 5.3.0, zero errors and zero warnings: three unit-test books (English JPEG, Kannada JPEG, English PNG), two fixtures with the real cover, and the full real book (§4). Run locally; the CI `test` job has no EPUBCheck runtime.
6. **Image checks never modify the stored bytes.** Tested in Slice 2 and again end to end here (bytes compared before and after checking and setting the cover, and after reading them back from the store).
7. **Autosave uses package Save when a package is bound.** `setCover`/`clearCover` are session mutators; the end-to-end tests replace the cover on a bound package and find the new cover after Open.
8. **No AI dependency.** None added.

Also confirmed: none of the five cover merges (`aaa214f`, `c6b126f`, `15b041f`, `e8ab38f`, `eb59f2a`) changed an npm dependency or anything under `apps/desktop/src-tauri`. The only dependency and host changes since the pre-ADR-0038 baseline (`af4ca6e`) belong to ADR-0040 (Word import).

## 4. Local check with the maintainer's book

Run locally on 2026-10-29 with the maintainer's KDP Word file (28.8 MB) and its cover picture (841 × 1261 JPEG), through the built desktop modules. The files were only read and nothing from them was committed; the temporary package folder was deleted afterwards.

| Step | Result |
|---|---|
| Word import | 25 chapters, 3 front-matter sections, 27 pictures (0.4 s) |
| Cover checks | 841 × 1261: low-resolution warning only |
| Set cover | Added; 28 pictures (the cover is stored as its own asset, alongside the identical title-page picture the Word import placed in front matter) |
| Package Save → Open | 25 chapters, 28 pictures; cover kept; picture bytes identical; no cover document stored |
| Book check | clean |
| EPUB | 29.0 MB; EPUBCheck 5.3.0 valid, 0 errors, 0 warnings, 0 fatal; 27 `MISSING_ALT_TEXT` engine notes (the Word file has no picture descriptions) |
| HTML | 1 cover figure; 28 picture files |
| PDF | First run failed to compile (§5). After the fix, through the desktop export with the book's own `en-US`: 40.2 MB, 86 pages (85 without the cover); page 1 is the whole cover, page 2 the title page, page 3 the title-page picture from the Word file |

## 5. Found during this slice

**PDF fails for languages with a region (`en-US`, `en-GB`, `kn-IN`).** The PDF engine passes `metadata.language` straight to Typst's `#set text(lang: …)`, which accepts only a two- or three-letter code. The maintainer's Word file sets `en-US`, so its PDF fails with "expected two or three letter language code". This is not cover-specific: any book whose language carries a region fails, with or without a cover. It predates ADR-0038 (ADR-0013 engine); the Word import made it likely. **Fixed in this PR** at the maintainer's request ("Fix in this PR"): `typstLanguage` passes the primary code as `lang` and a two-letter region as `region` (`en-US` → `lang: "en", region: "US"`); scripts, numeric regions, and variants are dropped, and an unusable tag becomes `und`. Books whose language is already a bare code (`en`, `kn`) get the same Typst source as before. Tested with real renders of an `en-US` and a `kn-IN` book.

**The same picture as cover and on the title page.** The Word import keeps the book's title-page picture in front matter, so setting it as the cover shows it twice in a row in EPUB and PDF. This is a content choice; the author can delete the title-page picture in the Write step.

## 6. Kindle Previewer

Not run by the time of closure. The maintainer has the exported EPUB of the real book and the steps. If Kindle shows the cover twice, the fix is a separately authorized change (keep the `cover-image` marking; drop the cover page from the reading order for Kindle-bound files).

## 7. Still deferred

- A "leave the cover out" PDF choice for KDP paperback interiors (print work)
- Choosing a picture already in the book as the cover
- Running EPUBCheck in CI
- Generated covers, cover text, print covers, AI covers (ADR-0038 non-goals)
- The Design Studio autosave gap (recorded in the Slice 1 proposal §6)
- Webview Content Security Policy (`"csp": null`, recorded in the Slice 3 proposal §7)
