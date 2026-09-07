# OpenBook Foundation Readiness Report

- **Original audit date:** 2026-09-03
- **Reconciled:** 2026-09-07 (post PRs #6–#17; `main` at `452fda0`)
- **Original scope:** Governance, licensing, architecture, and implementation readiness of `main` (`ec79069` at audit start)
- **Purpose:** Objective picture of foundation readiness; this file records post-audit progress so agents do not treat completed work as “NOT STARTED”
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

Accepted is **not** Frozen. Frozen means implementation must follow unless a new ADR changes it. As of ADR-0007 and ADR-0008, exact **Tauri 2.11.5**, **React / react-dom 19.2.8**, **TypeScript 5.9.3**, **`tauri-plugin-sql` 2.4.1 (`sqlite`)**, and **Tiptap/ProseMirror 3.31.3** OSS pins are Frozen. PDF renderer selection remains **UNDECIDED**. Temurin/`jlink` production packaging remains pending.

---

## Reconciliation summary (PRs #6–#17)

| Item | Status on `main` |
| --- | --- |
| Book Model (`@openbook/book-model`, ADR-0006) | **DONE** (canonical source of truth) |
| CI for foundation package tests (+ desktop frontend build) | **DONE** (`.github/workflows/ci.yml`, 58/58 tests passing) |
| PDF bake-off plan + multilingual fixtures (PR #6) | **DONE**; renderer **selection PENDING / UNDECIDED** |
| EPUBCheck 5.3.0 packaging spike + ValidatorService adapter (PR #7) | **SPIKE DONE / evaluated**; production packaging conditional/future |
| ADR-0007 desktop technology baseline | **Accepted; versions Frozen** |
| Desktop shell Tauri 2.11.5 + React 19.2.8 + TS 5.9.3 + SQL plugin 2.4.1 (PR #9) | **DONE** |
| Semantic Document Model (`@openbook/semantic-document`, PR #11) | **DONE** (editor-independent document contract) |
| Desktop SDM boundary (Desktop → SDM → Book, PR #12) | **DONE** |
| ADR-0008 editor technology decision (Tiptap/ProseMirror) | **Accepted; OSS package pins Frozen** (PR #13) |
| First Tiptap editor surface + EditorAdapter (PR #14) | **DONE** (bidirectional Tiptap JSON ↔ SDM) |
| In-memory book/chapter operations (PR #15) | **DONE** (`EditorBookSession`: select/create/rename/delete) |
| SQLite project persistence architecture (PR #16) | **DONE** (`ProjectPersistence`, DTO boundary, minimal schema, atomic save transactions, foreign keys) |
| Save/Open project workflow (PR #17) | **DONE** (EditorBookSession ↔ ProjectPersistence UI workflow) |
| EPUB / HTML engines; PDF renderer implementation | **NOT STARTED** |
| DTP / page model / layout / typography | **NOT STARTED** |
| AI / Ollama | Not an MVP dependency; **NOT STARTED** |
| `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` | **Not declared** |

---

## Summary table

| Area | Status | Notes |
| --- | --- | --- |
| License | COMPLETE | Apache-2.0 in `LICENSE` and ADR-0003. |
| Contributor governance | ACCEPTED | Protection/attribution policy exists. CLA/DCO still PENDING DECISION. |
| Conversation governance | COMPLETE | Policy + archive + audit record. |
| Architecture documentation | ACCEPTED | Vision/PRD/architecture exist. |
| Book Model | COMPLETE (executable) | `@openbook/book-model` on `main` (ADR-0006). Canonical source of truth; format-neutral. |
| Semantic Document Model | COMPLETE | `@openbook/semantic-document` on `main` (PR #11). Structured editor contract. |
| Tauri / desktop shell | FROZEN baseline + shell DONE | ADR-0007 pins; `apps/desktop` on `main`. |
| SQLite Persistence | DONE (foundation boundary) | Minimal schema (`schema_migrations`, `projects`, `project_documents`), atomic transactions, foreign keys, and DTO boundary on `main` (PR #16). |
| Editor / Tiptap | DONE (authoring surface) | ADR-0008 pins; PR #14 EditorAdapter; PR #15 chapter operations; PR #17 Save/Open workflow. Book Model remains canonical. |
| EPUB architecture | ACCEPTED / NOT STARTED | OpenBook TypeScript EPUB 3.3 engine not implemented. |
| EPUBCheck integration | ACCEPTED + spike DONE | ADR-0005 + PR #7 spike/`@openbook/validator`. Exact Temurin/`jlink` production freeze PENDING. |
| PDF renderer | PENDING DECISION | Bake-off **plan** + fixtures exist (PR #6). Selection **UNDECIDED**. Implementation NOT STARTED. |
| DTP architecture | ACCEPTED / NOT STARTED | Requirements written. No page-model implementation. |
| Typography | ACCEPTED / PENDING DECISION | Indic/Kannada required. HarfBuzz/Pango/fonts not selected. |
| Dependency/license inventory | IN PROGRESS | Scorecard + ADR-0007 desktop scorecard exist. No full machine-readable ship inventory / `THIRD-PARTY-NOTICES.txt` yet. |
| CI/CD | DONE (foundation tests) | `.github/workflows/ci.yml` on `main`. Native Tauri packaging CI still limited (documented in `apps/desktop/README.md`). |
| Security | NOT STARTED | No `SECURITY.md`, no vulnerability process, no bundled-runtime CVE process in code. |
| Testing strategy | COMPLETE (foundation) | 58/58 tests passing across Book Model, Validator, SDM, and Desktop. |
| AI / Ollama | NOT STARTED | Intent only; not an MVP dependency. |

---

## 1. Repository orientation (audit-start snapshot)

Tracked `main` contents **at the 2026-09-03 audit start** were documentation and license only. That snapshot is historical.

**Current `main` (reconciled post PR #17)** includes:
- Monorepo package workspaces:
  - `packages/book-model` (canonical domain model, ADR-0006)
  - `packages/validator` (EPUBCheck subprocess adapter spike, ADR-0005)
  - `packages/semantic-document` (editor-independent document contract, PR #11)
  - `apps/desktop` (Tauri 2 + React 19 shell, Tiptap editor surface, in-memory chapter operations, SQLite project persistence, and Save/Open workflow)
- Established end-to-end authoring and persistence loop:
  `Tiptap → EditorAdapter → SemanticDocument → Desktop Domain → Book Model → ProjectPersistence → SQLite`
- CI test automation: `.github/workflows/ci.yml` running 58 automated tests across all workspaces plus desktop frontend build.
- Architectural records: PDF bake-off plan/fixtures (`docs/PDF_RENDERER_BAKEOFF_PLAN.md`), ADR-0005–0008, persistence architecture (`docs/PROJECT_PERSISTENCE_ARCHITECTURE.md`).

There is still **no** EPUB/HTML/PDF engine implementation, **no** PDF renderer selection, **no** DTP engine, and **no** AI stack.

### Parallel branches (historical note)

| Branch / PR | What it contained | Outcome |
| --- | --- | --- |
| `cursor/openbook-constitution-ae36` (PR #1) | Book Model candidate + non-canonical material | Book Model reused/reconciled as ADR-0006; ADR-0001 remains unissued |
| `cursor/setup-docs-dev-environment-dcd9` (PR #2) | Cursor environment + older constitution tree | Not source of truth for architecture |
| `cursor/ci-testing-vulnscan-1a3d` (PR #5) | Early CI/vulnerability scanning draft | Stale draft PR based on pre-desktop baseline; not merged |

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

PROJECT-CONTEXT matches ADR-0003 (Apache-2.0), ADR-0004 (publishing engines, PDF bake-off pending), Book Model independence from EPUB OPF, ADR-0005 EPUBCheck direction, ADR-0007 desktop baseline pins, and ADR-0008 editor technology decision.

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
- Publishing engine architectures (EPUB 3.3, HTML)
- Foundation governance readiness declaration

Frozen (must follow unless a new ADR changes them):

- Desktop baseline versions in ADR-0007 (Tauri 2.11.5, `@tauri-apps/api` 2.11.1, CLI 2.11.4, React 19.2.8, TypeScript 5.9.3, `tauri-plugin-sql` 2.4.1)
- Editor OSS package pins in ADR-0008 (Tiptap / ProseMirror 3.31.3)

Incorrect if treated as Frozen:

- “Typst is the PDF engine”
- “EPUBCheck WASM is the plan”
- “Tiptap JSON is the document persistence format” (rejected; Book Model is canonical)

### Premature implementation

Authorized slices since the original audit (Book Model, PDF bake-off plan/fixtures, EPUBCheck spike, ADR-0007, desktop shell, SDM contract, SDM desktop boundary, ADR-0008, editor surface, chapter operations, SQLite persistence architecture, and Save/Open workflow) are on `main`.

They do **not** authorize publishing engines, AI, PDF renderer selection, or unvetted dependencies.

---

## 3. Cross-document contradictions and gaps

These do **not** by themselves authorize new implementation. They **do** still matter for declaring foundation gates complete.

| ID | Finding | Why it matters | Reconciliation note |
| --- | --- | --- | --- |
| G-01 | `LICENSING_POLICY.md` contradicted ADR-0003 (fixed in original audit PR) | Agents could refuse SPDX headers or re-open AGPL | Fixed |
| G-02 | `ROADMAP.md` gate is `FOUNDATION-READY`; scorecard gate is `FOUNDATION-GOVERNANCE-READY` | Two names for related gates | Still open |
| G-03 | `ROADMAP.md` `FOUNDATION-READY` requires a reproducible **application** build and CI | Product gate is stricter than docs-only | CI + desktop app build exist; publishing engines still pending |
| G-04 | `PRODUCT_REQUIREMENTS.md` vs `ROADMAP.md` vs ADR-0004 on PDF/HTML MVP cut | Do not stub a PDF renderer to satisfy the PRD | Still open; selection UNDECIDED |
| G-05 | `ARCHITECTURE.md` looser on validators than ADR-0004/0005 | Prefer ADR-0004/0005 | Still open |
| G-06 | `ARCHITECTURE.md` monorepo sketch vs later package names | Layout not fully Frozen | All 4 active packages exist and match ADRs |
| G-07 | No executable Book Model spec on `main` | Schema must be testable | **Closed** by ADR-0006 |
| G-08 | No `SECURITY.md`, no dependency inventory file, no CI on `main` | Release/compliance gaps | **CI closed** (58 tests); SECURITY.md / full notices inventory still open |
| G-09 | `FOSS_STRATEGY.md` still contains research citation tokens (`turn0search…`) | Hygiene | Still open |
| G-10 | Trademark/name policy still deferred | Branding, not engineering | Still open |
| G-11 | README on `main` did not point to PROJECT-CONTEXT or LICENSE | Onboarding | Fixed in original audit PR |

---

## 4. Gate assessment

### `FOUNDATION-GOVERNANCE-READY` (technology scorecard)

**Not declared.** Progress since original audit:
- Book Model executable spec & tests landed (ADR-0006).
- Desktop foundation technology baseline frozen (ADR-0007).
- Editor technology stack evaluated and frozen (ADR-0008).
- PDF renderer bake-off plan and multilingual fixtures published (PR #6).
- EPUBCheck 5.3.0 subprocess spike verified (`@openbook/validator`, PR #7).
- 58/58 automated tests passing across 4 packages.

Still required before full gate declaration:
- CLA/DCO mechanism decision.
- Bundled-font policy.
- Machine-readable release dependency inventory / `THIRD-PARTY-NOTICES.txt` covering all transitives.
- `SECURITY.md` and vulnerability disclosure process.

### `FOUNDATION-READY` (`ROADMAP.md`)

**Not passed / not declared.**
While the editor-to-persistence foundation is established and verified:
`Tiptap → EditorAdapter → SemanticDocument → Desktop Domain → Book Model → ProjectPersistence → SQLite`

The foundation gate cannot be declared complete until:
- Publishing engines (EPUB 3.3, HTML) are defined and implemented.
- PDF renderer bake-off is executed and a selection ADR is accepted.
- Production EPUBCheck packaging (Temurin JRE / `jlink` freeze) is settled.
- Remaining cross-document contradictions (G-02–G-05) and security/inventory items are resolved.

---

## 5. Next architectural decision points

With the editor authoring surface and SQLite project persistence landed on `main`, the next engineering slices must address one of the following distinct architectural decision points:

1. **EPUB 3.3 Engine Architecture & Implementation:**
   - Define the OpenBook TypeScript EPUB 3.3 engine package.
   - Read canonical `Book` and generate compliant EPUB 3.3 packages validated by `ValidatorService`.
   - Never write EPUB fields back into the Book Model.
2. **HTML Engine Architecture & Implementation:**
   - Semantic HTML publishing projection from canonical `Book`.
3. **PDF Renderer Bake-off & Selection Decision:**
   - Execute the bake-off against existing fixtures (`docs/PDF_RENDERER_BAKEOFF_PLAN.md`).
   - Select between Typst, Chromium/Paged.js, and pdf-lib via formal ADR. Renderer remains **UNDECIDED**.
4. **Production EPUBCheck Packaging:**
   - Finalize Temurin JRE / `jlink` bundling and isolation strategy for desktop production distribution.
5. **DTP / Page Model / Typography:**
   - Address pagination, layout primitives, and complex Indic/Kannada text shaping.

**DO NOT implement any of these without a dedicated ADR and authorized slice.** None are authorized by this reconciliation document.
