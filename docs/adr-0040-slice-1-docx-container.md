# ADR-0040 Slice 1: DOCX Container Reader and Limits — Implementation Record

- **Status:** Implemented in a Draft PR; merge on explicit authorization
- **Date:** 2026-10-28
- **Parent architecture:** ADR-0040 — Word (.docx) Import
- **Scope:** Read a `.docx` package safely: ZIP structure, size and ratio limits, macro/template/encryption rejection, restricted XML reader. No Book mapping, no desktop change.
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-28: “authorize ADR-0040 Slice 1 (reading the zip file safely, with the size limits)”)

## 1. Purpose

Give later slices one safe way to open a Word file and read its XML parts. Every limit in ADR-0040 §5 is enforced here, so Slices 2–3 can map text and images without re-checking the container.

## 2. What landed

All in `packages/importer/src/docx/`:

| Module | Role |
|---|---|
| `limits.ts` | `DEFAULT_DOCX_LIMITS` (ADR-0040 §5 values) and `resolveDocxLimits` for overrides; an `undefined` override keeps the default, and a non-positive or non-finite one is a programming error, so no override can switch a limit off |
| `errors.ts` | `DocxReadError` with codes and plain-language messages; `docxReadErrorToIssue` → fatal `ImportIssue` |
| `zip.ts` | Read-only ZIP layer. Parses the end-of-central-directory record (trailing padding after it is tolerated) and the central directory itself; checks every limit **before** inflating; inflates with `fflate`'s streaming `Inflate` in 4 KB chunks into a buffer of the declared size and stops the moment output passes it; checks CRC-32. Each part counts toward the total once, however often it is read |
| `xml.ts` | Restricted XML reader: no DOCTYPE, only the five predefined entities and valid numeric references, depth ≤ 256, ≤ 64 attributes, UTF-8/UTF-16 only, namespaces resolved |
| `package.ts` | `openDocxPackage(bytes, limits?)`: reads `[Content_Types].xml` and `_rels/.rels`, finds the main document by relationship (targets kept percent-encoded, as ZIP names are), rejects macro-enabled main documents and templates, refuses external or escaping targets, and blocks macro, OLE, ActiveX, and embedded-package parts by content type and by conventional path. Parsed XML parts are cached; XML is recognised by extension or content type and capped at 32 MB either way |

`types.ts` gains `DocxImportSource` (`format: "docx"`, `bytes`, `filename?`). The new API is exported from `@openbook/importer`.

### Checks, in order

1. Empty file; file over 200 MB.
2. Older `.doc` or password-protected file (CFB signature) gets its own message.
3. Not a ZIP.
4. End-of-central-directory found exactly at the end; ZIP64 markers and multi-disk archives rejected.
5. ≤ 2,000 entries.
6. Per entry: not encrypted; method stored or deflate; stored sizes agree; name is valid UTF-8; no duplicate names (case-insensitive, as OPC requires); XML parts ≤ 32 MB, other parts ≤ 50 MB; compression ratio ≤ 1,000 : 1 above 1 MB; running total ≤ 512 MB.
7. Local header matches the central directory; no two entries overlap; no data runs into the central directory.
8. On read: actual inflated bytes never pass the declared size; the inflated total never passes 512 MB; CRC-32 matches.
9. Package: content types present; the main document's content type is not `macroEnabled` (an embedded macro-enabled object does not reject the file; it is simply never read); main document found through the `officeDocument` relationship, internal, inside the package, and of the Word document type (templates get their own message).
10. Macro, OLE, ActiveX, and embedded-package parts can never be read, whether found by content type or by the conventional paths (`vbaProject.bin`, `vbaData.xml`, `word/embeddings/*`, `word/activeX/*`).

## 3. Boundary adjustment (recorded per ADR-0040 §8)

ADR-0040 §8 listed “`ImportSource` byte variant” in Slice 1. This slice defines `DocxImportSource` but does **not** yet add it to `ImportSource` or `SupportedImportFormat`, and does not change `ImportService`. Widening the union now would make every caller handle a format that cannot import yet. Slice 2 widens the union, updates the `ImportService` guard and seed (ADR-0040 §2.1), and turns `canImport("docx")` on. `canImport("docx") === false` still holds and is asserted.

## 4. Dependency evidence (ADR-0040 §3.1)

- `packages/importer/package.json` adds `"fflate": "^0.8.3"`, the same range `@openbook/epub` uses. `package-lock.json` gains one line in the importer's dependency list; it still resolves to the same `fflate-0.8.3.tgz` with the same integrity.
- `node scripts/release-compliance/generate-npm-production-closure.mjs` regenerates `npm-production-closure-inventory.json` with **no change** (62 packages, 50 transitive).
- `NPM-PRODUCTION-INVENTORY-SLICE-3.md` and `THIRD-PARTY-NOTICES.md` now list `@openbook/importer` as a user of `fflate`.
- No new package. `apps/desktop` gains no direct ZIP dependency.

## 5. Measurement note: the compression-ratio limit

ADR-0040 §5 asked Slice 1 to measure ratios before fixing the constant. What this slice measured:

- `fflate` compresses 40 MB of zeros at about **1,024 : 1**, close to DEFLATE's maximum. The 1,000 : 1 limit therefore catches only near-maximal bombs.
- The test's synthetic “ordinary” text (words drawn from a small list by a simple generator) compresses at about 39 : 1 and is accepted. It is more repetitive than real prose, so it is a conservative stand-in, not a measurement of real documents.

The ratio check is an early stop. The per-part caps (32 MB XML, 50 MB other) and the 512 MB total are what bound memory, and a test proves a bomb under the ratio is still stopped by the part cap.

No real Word manuscripts were measured in this slice: none are in the repository, and the maintainer's book is cleared only as a local check in Slice 5. **The constant stays at 1,000 : 1.** Lowering it (for example to 200 : 1) is a maintainer decision for after real files have been measured.

## 6. Tests

`packages/importer/src/docx/docx-container.test.ts` (added to the importer `npm test`). All `.docx` inputs are built in the test with `fflate`'s `zipSync` and then byte-patched; no binary fixtures are committed.

- Happy path: minimal `.docx`, stored entries, main document found by relationship, Kannada text kept code point for code point (ZWJ/ZWNJ, no normalization).
- Signature/size: empty, not a ZIP, CFB (`.doc` / password-protected), over the file cap, truncated.
- ZIP: too many entries, case-only duplicate names, encrypted flag, unsupported method, ZIP64 and multi-disk markers, an entry pointing at another entry's data, CRC mismatch.
- Bombs: 40 MB of zeros rejected by ratio before inflating; a bomb under the ratio rejected by the part cap; a lying size header stopped during inflation; per-part and total caps; ordinary prose accepted.
- Package: `.docm`, `.dotx`, non-Word ZIPs, missing parts, external and `file:` main-document targets, `../` escapes, blocked macro/OLE/ActiveX parts.
- XML: billion-laughs DOCTYPE, undefined and invalid entities, a bare `&`, depth 256 vs 257, 64 vs 65 attributes, namespace resolution with unusual prefixes, unbound prefixes, malformed documents, CDATA/comments/PIs, UTF-16 with BOM, `windows-1252` refused, malformed UTF-8 refused.
- `canImport("docx")` is still `false`.

## 7. Explicit exclusions

- Any mapping to the Book Model (Slice 2)
- Images and asset ingestion (Slice 3)
- `ImportSource` union, `ImportService`, `canImport("docx") === true` (Slice 2)
- Desktop dialog, host command, coordinator, or UI (Slice 4)
- Real-manuscript fixtures (Slice 5)

## 8. Acceptance criteria

- Every ADR-0040 §5 limit has a test that a crafted file cannot pass.
- Decompression writes into a buffer of the entry's declared size, which is itself capped. Inside `fflate`, one 4 KB push can expand to at most about 4 MB (4 KB × DEFLATE's ~1,032 : 1 maximum) before the size check rejects it, so peak memory per read is the declared size plus about 4 MB.
- No macro, OLE, or ActiveX part can be read, and no external target is followed.
- Importer, full repository `npm test`, and desktop build pass; CI and DCO pass.
- Closure inventory unchanged.
