# ADR-0040 Word (.docx) Import — Closure & Reconciliation

- **Status:** Implementation-complete (Slice 5 merged in PR #174); closure/reconciliation record
- **Date:** 2026-10-28
- **Baseline:** `main` after ADR-0040 Slice 4 status reconcile (PR #173, `b456d1d`) plus Slice 5 (PR #174)
- **Authority:** ADR-0040 — Word (.docx) Import Architecture
- **Implementation authorization:** Completed for the five approved ADR-0040 slices; no further ADR-0040 slice is authorized by this record

## 1. Purpose

Reconcile ADR-0040 implementation against the accepted architecture and close the Word import slice sequence.

This record does not authorize footnotes, tables, nested lists, comments, `.doc`/`.odt`/`.rtf`/PDF/EPUB/HTML import, cover handling, or accessibility checks in Book Doctor.

## 2. Slice reconciliation

| Slice | Scope | Result |
|---|---|---|
| — | Selection + ADR-0040 | Accepted — PR #164 (status PR #165) |
| 1 | Container reader and security limits | Done — PR #166 (status PR #167) |
| 2 | Text and structure; `.docx` on in the importer | Done — PR #168 (status PR #169) |
| 3 | Pictures through the asset pipeline; coordinator accepts `.docx` | Done — PR #170 (status PR #171) |
| 4 | Desktop import surface | Done — PR #172 (status PR #173) |
| 5 | Hardening, fixes from the real manuscript, closure | Done — PR #174 (status PR closes the sequence) |

Every slice had a review pass before merge; the findings and their fixes are in each slice record.

## 3. Architectural invariants preserved (ADR-0040 §9)

1. **INV-D1:** every import yields a valid Book or a fail-closed error with the session unchanged (end-to-end and coordinator tests).
2. **INV-D2:** no Word XML, style, relationship, or numbering id reaches the Book (placeholders checked absent from `book.json`).
3. **INV-D3:** every image block names an AssetRef that passed the asset pipeline. This is checked explicitly before commit, because `validateBook` does not.
4. **INV-D4:** limits cannot be exceeded; decompression stops at the declared size, and the host and importer share one 200 MB cap (tested).
5. **INV-D5:** no external target or field target is fetched; macro, OLE, ActiveX, `altChunk`, and embedded packages are never read.
6. **INV-D6:** identical bytes give an identical Book; different files never share ids.
7. **INV-D7:** `publishedAt` is never taken from Word dates.
8. **INV-D8:** Markdown and text import are unchanged (tested in every slice).
9. **INV-D9:** Kannada text is kept code point for code point (ZWJ/ZWNJ, no normalization).
10. **INV-D10:** no new npm package; `fflate` 0.8.3 was reused from the shipped closure. The only host addition is the `docx_read_bytes` command with its own allow-entry.
11. **INV-D11:** no AI dependency.

## 4. Deviations from the ADR text, recorded

- **Coordinator acceptance** moved from Slice 4 to Slice 3, because §8 places coordinator ingestion in Slice 3 (Slice 3 record).
- **Pictures go after their paragraph's text,** not inside it (Slice 3 record).
- **Language:** mostly-Kannada text sets `kn` even when Word declares `en-US` (Slice 2 record).
- **Alt text:** §4.6's “reported by Book Doctor” was wrong (Slice 5 record §1). The import now warns itself.
- **Compression ratio** stays 1,000 : 1; real manuscripts are still to be measured before tuning (Slice 1 record §5).

## 5. Explicitly still open (not ADR-0040 failures)

- **EPUBCheck and Typst** with the maintainer's real book: run once a Java runtime is available locally, or through CI's Gate 5/6 jobs on a published fixture.
- **The desktop app's file dialog** with the real book (pick a copy whose name ends in `.docx`).
- **Accessibility checks in Book Doctor** (alt text and others): a future ADR (ADR-0018 keeps them inactive).
- **Editing a picture's alt text after import:** no UI exists yet.
- Footnotes, comments, tables, nested lists, text boxes, `.doc`/`.odt` import (ADR-0040 §7 non-goals).
- Detecting a title-page tagline as the subtitle when it is not Subtitle-styled.

## 6. Closure determination

**ADR-0040 implementation is closed as a slice sequence** (Slice 5 merged in PR #174). A Word `.docx` manuscript with pictures can be imported from the desktop app's start screen or added from Write, and the maintainer's own book imports cleanly.
