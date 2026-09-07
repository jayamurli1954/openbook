# OpenBook Foundation Readiness Report

- **Original audit date:** 2026-09-03
- **Reconciled:** 2026-09-07 (post PRs #6–#9; `main` at `ffd0b1d`)
- **Original scope:** Governance, licensing, architecture, and implementation readiness of `main` (`ec79069` at audit start)
- **Purpose:** Objective picture of foundation readiness; this file now also records post-audit progress so agents do not treat completed work as “NOT STARTED”
- **Gate under review:** `FOUNDATION-GOVERNANCE-READY` (scorecard) and `FOUNDATION-READY` (`ROADMAP.md`)
- **Verdict:** **Not passed.** Do **not** declare either foundation gate complete from this reconciliation alone.

Status vocabulary (this report):

| Status | Meaning |
| --- | --- |
| COMPLETE | Work for this area is sufficient for the governance gate |
| ACCEPTED | Direction is approved; implementation or remaining artefacts may still be open |
| IN PROGRESS | Active, incomplete |
| PENDING DECISION | A choice is still required before implementation in that area |
| BLOCKED | Cannot proceed until another decision or artefact exists |
| NOT STARTED | No repository artefact yet |
| DONE (partial) | Authorized slice landed; further work in the area remains |

Accepted is **not** Frozen. Frozen means implementation must follow unless a new ADR changes it. As of ADR-0007, exact **Tauri 2.11.5**, **React / react-dom 19.2.8**, **TypeScript 5.9.3**, and **`tauri-plugin-sql` 2.4.1 (`sqlite`)** are Frozen for the desktop baseline. PDF renderer selection remains **UNDECIDED**. Tiptap/editor and Temurin/`jlink` production pins remain not Frozen.

---

## Reconciliation summary (PRs #6–#9)

| Item | Status on `main` |
| --- | --- |
| Book Model (`@openbook/book-model`, ADR-0006) | **DONE** |
| CI for foundation package tests (+ desktop frontend build) | **DONE** |
| PDF bake-off plan + multilingual fixtures (PR #6) | **DONE**; renderer **selection PENDING / UNDECIDED** |
| EPUBCheck 5.3.0 packaging spike + ValidatorService adapter (PR #7) | **SPIKE DONE / evaluated**; production packaging conditional/future |
| ADR-0007 desktop technology baseline | **Accepted; versions Frozen** |
| Desktop shell Tauri 2.11.5 + React 19.2.8 + TS 5.9.3 + SQL plugin 2.4.1 (PR #9) | **DONE** (scaffold + SQLite connectivity proof) |
| SQLite production schema / migrations / domain persistence model | **NOT STARTED** |
| EPUB / HTML engines; PDF renderer implementation | **NOT STARTED** |
| Editor / Tiptap; DTP / page model / layout / typography | **NOT STARTED** |
| AI / Ollama | Not an MVP dependency; **NOT STARTED** |
| `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` | **Not declared** |

---

## Summary table

| Area | Status | Notes |
| --- | --- | --- |
| License | COMPLETE | Apache-2.0 in `LICENSE` and ADR-0003. |
| Contributor governance | ACCEPTED | Protection/attribution policy exists. CLA/DCO still PENDING DECISION. |
| Conversation governance | COMPLETE | Policy + archive + audit record. |
| Architecture documentation | ACCEPTED | Vision/PRD/architecture exist. Newer ADRs remain ahead of `ARCHITECTURE.md` in places. |
| Book Model | COMPLETE (executable) | `@openbook/book-model` on `main` (ADR-0006). Format-neutral; not SQLite. |
| Tauri / desktop shell | FROZEN baseline + shell DONE | ADR-0007 pins; `apps/desktop` on `main` (PR #9). |
| SQLite | FROZEN plugin + connectivity proof; production persistence NOT STARTED | `tauri-plugin-sql` 2.4.1 wired for `SELECT 1` smoke only. |
| EPUB architecture | ACCEPTED / NOT STARTED | OpenBook TypeScript EPUB 3.3 engine not implemented. |
| EPUBCheck integration | ACCEPTED + spike DONE | ADR-0005 + PR #7 spike/`@openbook/validator`. Exact Temurin/`jlink` production freeze PENDING. |
| PDF renderer | PENDING DECISION | Bake-off **plan** + fixtures exist (PR #6). Selection **UNDECIDED**. Implementation NOT STARTED. |
| DTP architecture | ACCEPTED / NOT STARTED | Requirements written. No page-model implementation. |
| Typography | ACCEPTED / PENDING DECISION | Indic/Kannada required. HarfBuzz/Pango/fonts not selected. |
| Dependency/license inventory | IN PROGRESS | Scorecard + ADR-0007 desktop scorecard exist. No full machine-readable ship inventory / `THIRD-PARTY-NOTICES.txt` yet. |
| CI/CD | DONE (foundation tests) | `.github/workflows/ci.yml` on `main`. Native Tauri packaging CI still limited (documented in `apps/desktop/README.md`). |
| Security | NOT STARTED | No `SECURITY.md`, no vulnerability process, no bundled-runtime CVE process in code. |
| Testing strategy | ACCEPTED / IN PROGRESS | Book Model + validator tests run in CI; desktop shell has frontend build in CI. |
| Editor / Tiptap | NOT STARTED | Preferred direction only; not Frozen. |
| AI / Ollama | NOT STARTED | Intent only; not an MVP dependency. |

---

## 1. Repository orientation (audit-start snapshot)

Tracked `main` contents **at the 2026-09-03 audit start** were documentation and license only. That snapshot is historical.

**Current `main` (reconciled)** also includes, among other artefacts: `package.json` workspaces, `@openbook/book-model`, `@openbook/validator`, `apps/desktop`, `.github/workflows/ci.yml`, PDF bake-off plan/fixtures, ADR-0005–0007, and related docs. There is still **no** production SQLite schema, **no** EPUB/HTML/PDF engine implementation, **no** editor, and **no** AI stack.

### Parallel branches (historical note)

| Branch / PR | What it contained | Outcome |
| --- | --- | --- |
| `cursor/openbook-constitution-ae36` (PR #1) | Book Model candidate + non-canonical material | Book Model reused/reconciled as ADR-0006; ADR-0001 remains unissued |
| `cursor/setup-docs-dev-environment-dcd9` (PR #2) | Cursor environment + older constitution tree | Not source of truth for architecture |

---

## 2. Governance consistency audit

### ADR numbering

| Finding | Severity | Action taken / required |
| --- | --- | --- |
| ADR-0001 has **no file on `main`** | Process | Number reserved. Do not reuse 0001 for a new unrelated decision. |
| ADR-0002 exists on disk but was **missing from the decision index** | Consistency | Index updated in the original audit. |
| Index listed ADR-0005 as “Proposed for formal ADR” with **no file** | Gap | ADR-0005 written; status Accepted. |
| PR #1 used `docs/adr/0001-phase-0-…` for Book Model skeleton | Merge hazard | Resolved via ADR-0006 numbering; 0001 stays reserved. |
| Two ADR dialects exist historically: `docs/05-decision-log.md` ADR-001…024 vs `docs/adr/NNNN` | Drift | `main` uses `docs/adr/` + the architecture decision index. |

### Agreement with `PROJECT-CONTEXT.md`

PROJECT-CONTEXT matches ADR-0003 (Apache-2.0), ADR-0004 (publishing engines, PDF bake-off pending), Book Model independence from EPUB OPF, ADR-0005 EPUBCheck direction, and ADR-0007 desktop baseline pins.

### Apache-2.0 documentation consistency

| Artefact | Before original audit | After |
| --- | --- | --- |
| `LICENSE` | Apache-2.0, Copyright 2026 SanMitra Tech Solutions | Unchanged (authoritative) |
| ADR-0003 | Accepted | Unchanged |
| `CONTRIBUTOR_PROTECTION_AND_ATTRIBUTION.md` | Apache-2.0 | Unchanged |
| `LICENSING_POLICY.md` §3 | **Stated the project license was not frozen** | Aligned to ADR-0003 |
| `NOTICE` | Missing | Minimal project NOTICE added |
| `CONTRIBUTING.md` §28 | Did not name Apache-2.0 | Names Apache-2.0 / ADR-0003 |

**Accepted is not Frozen for all time:** changing the project license later would require a new ADR.

### Conversation records vs accepted decisions

`docs/conversations/2026-09-03-epubcheck-java-tauri.md` agrees with PROJECT-CONTEXT and ADR-0004/0005. No conversation record was found that contradicts Apache-2.0 or official EPUBCheck.

### Pending vs accepted vs frozen

Correctly pending (must not be implemented as if chosen):

- Final PDF renderer (**UNDECIDED**)
- Exact Temurin/Java version and `jlink` yes/no for **production** freeze
- Bundled-font policy
- CLA/DCO mechanism
- Exact Tiptap / ProseMirror package versions
- Foundation governance readiness declaration

Frozen (must follow unless a new ADR changes them):

- Desktop baseline versions in ADR-0007 (Tauri 2.11.5, `@tauri-apps/api` 2.11.1, CLI 2.11.4, React 19.2.8, TypeScript 5.9.3, `tauri-plugin-sql` 2.4.1)

Incorrect if treated as Frozen:

- “Typst is the PDF engine”
- “Tiptap is adopted”
- “EPUBCheck WASM is the plan”
- “PR #9 SQLite smoke DB is the OpenBook persistence schema”

### Premature implementation

At audit start, `main` had no application implementation — correct for that date.

Authorized slices since then (Book Model, PDF bake-off plan/fixtures, EPUBCheck spike, ADR-0007, desktop shell) are on `main`. They do **not** authorize engines, editor, AI, PDF renderer selection, or production persistence schema.

---

## 3. Cross-document contradictions and gaps

These do **not** by themselves authorize new implementation. They **do** still matter for declaring foundation gates complete.

| ID | Finding | Why it matters | Reconciliation note |
| --- | --- | --- | --- |
| G-01 | `LICENSING_POLICY.md` contradicted ADR-0003 (fixed in original audit PR) | Agents could refuse SPDX headers or re-open AGPL | Fixed |
| G-02 | `ROADMAP.md` gate is `FOUNDATION-READY`; scorecard gate is `FOUNDATION-GOVERNANCE-READY` | Two names for related gates | Still open |
| G-03 | `ROADMAP.md` `FOUNDATION-READY` requires a reproducible **application** build and CI | Product gate is stricter than docs-only | CI + desktop scaffold exist; full gate still not declared |
| G-04 | `PRODUCT_REQUIREMENTS.md` vs `ROADMAP.md` vs ADR-0004 on PDF/HTML MVP cut | Do not stub a PDF renderer to satisfy the PRD | Still open; selection UNDECIDED |
| G-05 | `ARCHITECTURE.md` looser on validators than ADR-0004/0005 | Prefer ADR-0004/0005 | Still open |
| G-06 | `ARCHITECTURE.md` monorepo sketch vs later package names | Layout not fully Frozen | `apps/desktop`, `packages/book-model`, `packages/validator` now exist |
| G-07 | No executable Book Model spec on `main` | Schema must be testable | **Closed** by ADR-0006 |
| G-08 | No `SECURITY.md`, no dependency inventory file, no CI on `main` | Release/compliance gaps | **CI partial closed**; SECURITY.md / full inventory still open |
| G-09 | `FOSS_STRATEGY.md` still contains research citation tokens (`turn0search…`) | Hygiene | Still open |
| G-10 | Trademark/name policy still deferred | Branding, not engineering | Still open |
| G-11 | README on `main` did not point to PROJECT-CONTEXT or LICENSE | Onboarding | Fixed in original audit PR |

---

## 4. Gate assessment

### `FOUNDATION-GOVERNANCE-READY` (technology scorecard)

**Not declared.** Progress since the original audit: PDF bake-off plan exists; desktop versions Frozen (ADR-0007); Book Model and CI landed. Still open for a full gate declaration include CLA/DCO, fonts, full dependency/notice inventory for ship, SECURITY.md, and any Product Owner gate checklist items not yet closed.

### `FOUNDATION-READY` (`ROADMAP.md`)

**Not passed / not declared.** Book Model + CI + a desktop scaffold now exist, but remaining contradictions (G-02–G-06), security/inventory gaps, and unfinished product-foundation items (engines, persistence schema, editor) mean this reconciliation does **not** declare the gate complete.

---

## 5. Recommended next step

With ordered foundation engineering items 1–5 landed or spiked:

1. Keep PDF renderer **UNDECIDED** until bake-off execution and a selection ADR.
2. Treat EPUBCheck/Temurin production packaging as a later release-governance slice (spike evidence already recorded).
3. Authorize production SQLite persistence schema only via a new ADR/PR — not implied by PR #9 connectivity proof.
4. Do not start EPUB/HTML/PDF engines, editor/Tiptap, DTP, or Ollama without explicit authorization.

Do **not** install Puppeteer, Typst, Tiptap, or a production JRE merely because they appear in the backlog.
