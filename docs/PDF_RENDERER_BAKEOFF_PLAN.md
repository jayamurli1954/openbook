# OpenBook PDF Renderer Bake-off Plan

- **Status:** Planning artefact only — **no winner selected**
- **Date:** 2026-09-04
- **Authority:** Implements the evaluation procedure required by [ADR-0004](adr/0004-publishing-engine-technology-architecture.md) and the PDF bake-off requirements in [`PUBLISHING_ENGINE_TECHNOLOGY_SCORECARD.md`](PUBLISHING_ENGINE_TECHNOLOGY_SCORECARD.md)
- **Related backlog item:** `IMPLEMENTATION-BACKLOG.md` ordered step 3 — *PDF bake-off plan + fixtures (no production renderer)*
- **Related Book Model:** [ADR-0006](adr/0006-book-model-executable-specification.md)

## 1. Purpose

This document defines a **reproducible evaluation methodology** so OpenBook can eventually choose a PDF publishing technology based on evidence.

It does **not**:

- select Typst, pdf-lib, Chromium, or any other renderer;
- authorize installing or bundling any PDF renderer;
- authorize production PDF engine code or a production renderer adapter;
- advance `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` by itself.

A later **renderer-selection ADR** (new number; not this document) may freeze a winner only after bake-off evidence is recorded and the Product Owner accepts the result.

## 2. Architectural constraints (binding)

1. The **Book Model** remains the single source of truth ([ADR-0004](adr/0004-publishing-engine-technology-architecture.md), [ADR-0006](adr/0006-book-model-executable-specification.md)).
2. PDF is a **projection**, not an authoring format.
3. Fixtures are **semantic Book Model JSON** (`schemaVersion: 1`). They must not contain:
   - PDF layout instructions, page coordinates, or PDF object trees;
   - Typst-specific syntax;
   - HTML/CSS used as a renderer workaround;
   - Chromium-specific print instructions;
   - EPUB packaging concepts (`opf`, `manifest`, `spine`, `ncx`, `container`, navigation docs, etc.).
4. Bake-off implementations (when later authorized) must consume Book Model → produce PDF. They must not push renderer-specific structure back into the Book Model.

## 3. Candidates to evaluate

Documented in ADR-0004 and the publishing scorecard. All remain **Evaluate** until a selection ADR freezes one.

| Candidate | Role in bake-off | Notes |
| --- | --- | --- |
| **Typst** | Primary candidate | Apache-2.0 compiler; third-party notices must be reviewed if redistributed |
| **pdf-lib** | Secondary / supporting | MIT; TypeScript-friendly; pagination/DTP fitness must be proven |
| **Chromium (e.g. via Puppeteer)** | Evaluation candidate | Puppeteer Apache-2.0; Chromium bundle has additional third-party components; footprint and print-layout limits |

No other candidate may be declared the default. Additional candidates require Product Owner approval and scorecard update before evaluation.

**This plan does not install any of the above.**

## 4. Evaluation criteria

Score each candidate on the dimensions below. Use the rating scale in §6.

### 4.1 Output quality (typography & layout)

| ID | Criterion | Pass expectation |
| --- | --- | --- |
| Q-EN | English prose | Readable body text, headings, quotes, lists |
| Q-KN | Kannada prose | Correct Kannada glyphs; no missing/tofu boxes with declared fonts |
| Q-MIX | Mixed English + Kannada | Stable bidirectional/script mixing without corruption |
| Q-CONJ | Indic conjuncts & combining marks | Conjunct clusters and combining marks render correctly (see stress fixture) |
| Q-HEAD | Chapter / heading styles | Distinct hierarchy; chapter-opening style usable |
| Q-LONG | Long chapter pagination | Multi-page flow without catastrophic overflow |
| Q-PAGE | Page geometry | Margins, gutter, facing pages where claimed |
| Q-HF | Headers / footers / page numbers | Present and consistent when enabled |
| Q-ASSET | Images & captions | Correct placement and caption association (when fixture includes assets) |
| Q-TABLE | Tables | Usable table rendering where claimed |
| Q-NOTE | Footnotes | Correct if candidate claims support; otherwise record “unsupported” |
| Q-LINK | Hyperlinks / bookmarks | Correct if claimed; otherwise record “unsupported” |
| Q-HYPH | Hyphenation | Documented behaviour; no broken Indic hyphenation assumptions |
| Q-WIDOW | Widow / orphan behaviour | Documented; acceptable or mitigated |
| Q-FONT | Embedded fonts | Declared fonts embed; license recorded |
| Q-PRINT | Print-oriented quality | Suitable for desktop print / PDF distribution review |

### 4.2 Multilingual / Indic requirements (mandatory)

Indic-language acceptance is mandatory for publishing-engine selection (ADR-0004 §7).

Minimum fixture coverage (this repository):

| Fixture | Path | Purpose |
| --- | --- | --- |
| English-only | `tests/fixtures/pdf-bakeoff/english-prose.json` | Baseline Latin prose |
| Kannada-only | `tests/fixtures/pdf-bakeoff/kannada-prose.json` | Kannada prose, punctuation, numerals |
| Mixed | `tests/fixtures/pdf-bakeoff/mixed-english-kannada.json` | Mixed-script paragraphs and headings |
| Conjunct stress | `tests/fixtures/pdf-bakeoff/indic-conjunct-shaping.json` | Conjuncts, clusters, combining marks, NFC-sensitive text |

Additional ADR-0004 items (facing pages, tables, images, etc.) may use future fixtures; absence of a fixture in this slice means that criterion is **deferred**, not waived.

### 4.3 Operational properties

| ID | Criterion | What to measure |
| --- | --- | --- |
| O-PERF | Performance | Cold start, per-book render time, memory for long-chapter fixture |
| O-SIZE | Binary / runtime footprint | Installed size of renderer + required runtime |
| O-DET | Determinism | Bit-identical or structurally stable output across two runs on same machine |
| O-WIN | Windows desktop packaging | Feasibility with preferred Tauri 2.x direction (ADR-0004 §9); no assumption that Tauri is already implemented |
| O-MAC | macOS packaging | Same evidence class as Windows |
| O-LIN | Linux packaging | Same evidence class as Windows |
| O-SEC | Security / update surface | CVE process, update channel, sandbox needs |

### 4.4 Licensing & dependency considerations

| ID | Criterion | Gate |
| --- | --- | --- |
| L-SPDX | Exact version SPDX recorded | Required before any EMBED/USE classification |
| L-TRANS | Transitive licenses inventoried | Required ([LICENSING_POLICY.md](../LICENSING_POLICY.md), ADR-0003) |
| L-NOTICE | NOTICE / third-party notices preserved | Required if redistributed |
| L-FONT | Font redistribution / embedding rights | Required for any bundled font ([LICENSING_POLICY.md](../LICENSING_POLICY.md) §8) |
| L-COPY | Copyleft / LGPL boundary review | Required before bundling (e.g. Pango if later considered) |
| L-APACHE | Compatibility with OpenBook Apache-2.0 | Project license unchanged; deps retain own licenses |

## 5. Test methodology

### 5.1 Inputs

1. Book Model fixtures under `tests/fixtures/pdf-bakeoff/` (semantic JSON, `schemaVersion: 1`).
2. Optional future fixtures for images/tables/footnotes — not required to publish this plan.

### 5.2 Procedure (when a bake-off execution is later authorized)

For **each** candidate:

1. Record candidate name, exact version, platform (OS/arch), and invocation method.
2. Confirm fixture parses and validates with `@openbook/book-model` (`parseBook` + `validateBook`, zero errors).
3. Transform Book Model → candidate input **outside** the Book Model (adapter scratch space only).
4. Produce PDF artefacts into a dated evidence directory (see §7).
5. Score each criterion in §4 (or mark deferred / unsupported).
6. Capture screenshots or page extracts for Q-KN, Q-MIX, Q-CONJ (human visual review required for shaping).
7. Run performance and footprint measurements (§4.3).
8. Complete license inventory (§4.4).
9. Do **not** commit binaries or large PDFs to `main` unless Product Owner later authorizes an evidence archive policy.

### 5.3 What this slice does *not* authorize

- Installing Typst, pdf-lib, Puppeteer, Chromium, or fonts.
- Running the bake-off itself.
- Selecting a winner.

## 6. Scoring / rating method

Use a 0–3 ordinal per criterion:

| Score | Meaning |
| --- | --- |
| 0 | Fail / broken / missing glyphs / unusable |
| 1 | Poor / major defects; not shippable |
| 2 | Acceptable with documented limitations |
| 3 | Strong / meets OpenBook quality bar for that criterion |
| N/A | Unsupported or deferred (must not be treated as 3) |

**Aggregate:**

- **Hard gate (must not select winner if any fail):** Q-EN, Q-KN, Q-MIX, Q-CONJ, L-SPDX, L-TRANS, L-APACHE.
- **Weighted sum** for remaining Q-* and O-* criteria (equal weight unless Product Owner adjusts before execution).
- **N/A does not inflate the score.** A candidate that marks many DTP criteria N/A must be compared honestly against DTP requirements in the PRD/architecture.

Record scores in a bake-off evidence matrix (CSV or Markdown table) with one row per candidate × criterion.

## 7. Evidence that must be collected

For each candidate run:

```text
evidence/pdf-bakeoff/<YYYY-MM-DD>/<candidate>-<version>/
  MANIFEST.md          # versions, OS, commands, commit SHA of OpenBook
  scores.md            # criterion scores + notes
  license-inventory.md # SPDX, notices, fonts
  perf.md              # timings, memory, footprint
  packaging.md         # Windows/macOS/Linux notes
  pdf/                 # generated PDFs (local/CI artefact; not necessarily committed)
  visual/              # screenshots of Kannada / mixed / conjunct pages
```

`MANIFEST.md` must include the OpenBook git commit SHA and fixture file hashes (e.g. SHA-256 of each JSON fixture).

## 8. Reproducibility requirements

1. Same OpenBook commit + same fixture hashes + same candidate version + same platform → documented expectation of deterministic or near-deterministic PDF (note any known non-determinism).
2. Commands recorded verbatim; no undocumented machine state.
3. Fonts used must be identified by family, version, and license; “system default” is insufficient for a winning claim.
4. Two independent runs on the same machine recorded for O-DET.

## 9. Performance considerations

Minimum measurements:

- Time to first PDF for `english-prose.json` and `kannada-prose.json`.
- Time for a concatenated or extended long-chapter variant (may be synthetic during execution; not required in this planning slice).
- Peak RSS / working set during render.
- Cold-start cost of the renderer process or embedded library.

Targets are comparative (rank candidates), not absolute SLOs, until Product Owner sets numeric budgets.

## 10. Windows desktop packaging considerations

OpenBook’s preferred shell is Tauri 2.x (ADR-0004; **Accepted direction, not Frozen**). Bake-off packaging notes must answer:

1. Can the candidate be invoked from a future Tauri/Rust sidecar or native dependency without requiring end-user installs?
2. Windows installer size impact (renderer + runtime + fonts).
3. Code-signing / SmartScreen implications for bundled native binaries (qualitative note).
4. Whether a JRE or browser runtime is required (Chromium path) and how that interacts with ADR-0005’s isolation lessons (process isolation preferred for heavy runtimes).

This plan does **not** implement Tauri or packaging.

## 11. Decision threshold / process for the eventual selection ADR

A renderer may be proposed for **Frozen** status in a **new ADR** only when all of the following are true:

1. Hard gates in §6 pass for the proposed winner.
2. Evidence package (§7) is complete for the winner and at least one alternative was evaluated with the same fixtures.
3. License inventory reviewed under `LICENSING_POLICY.md` / ADR-0002 / ADR-0003.
4. Product Owner marks the selection ADR **Accepted** (later **Frozen** if implementation must follow it).
5. ADR-0004 is updated or superseded only via that formal ADR process — not by editing this plan alone.

**Rejection / deferral:** If no candidate passes Indic hard gates, do not select a temporary English-only PDF engine as the product default without an explicit Product Owner ADR.

## 12. Relationship to foundation gates

| Gate | Effect of this plan |
| --- | --- |
| `FOUNDATION-GOVERNANCE-READY` | Unblocks *plan approval* work; does **not** auto-pass the gate |
| `FOUNDATION-READY` (`ROADMAP.md`) | Unchanged — still requires broader foundation criteria |
| PDF renderer PENDING DECISION | Remains pending until selection ADR |

## 13. Out of scope for this document

- Production `@openbook/pdf` package
- Renderer adapter interfaces in application code
- Font bundling policy (separate pending decision)
- EPUBCheck / Java runtime work (ADR-0005)
- Tauri / React / SQLite shell

## 14. Revision history

| Date | Change |
| --- | --- |
| 2026-09-04 | Initial bake-off plan + multilingual Book Model fixtures (planning slice only) |
