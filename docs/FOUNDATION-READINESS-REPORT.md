# OpenBook Foundation Readiness Report

- **Date:** 2026-09-03
- **Scope:** Governance, licensing, architecture, and implementation readiness of `main` (`ec79069` at audit start)
- **Purpose:** Objective picture before any Tauri/React application implementation
- **Gate under review:** `FOUNDATION-GOVERNANCE-READY` (scorecard) and `FOUNDATION-READY` (`ROADMAP.md`)
- **Verdict:** **Not passed.** Do not start the Tauri application on the basis of this report.

Status vocabulary (this report):

| Status | Meaning |
| --- | --- |
| COMPLETE | Work for this area is sufficient for the governance gate |
| ACCEPTED | Direction is approved; implementation or remaining artefacts may still be open |
| IN PROGRESS | Active, incomplete |
| PENDING DECISION | A choice is still required before implementation in that area |
| BLOCKED | Cannot proceed until another decision or artefact exists |
| NOT STARTED | No repository artefact yet |

Accepted is **not** Frozen. Frozen means implementation must follow unless a new ADR changes it. No technology in this repository is Frozen except the Book Model *principle* and the publishing-chain *principle* as stated in architecture documents. Runtime versions, PDF renderer, editor package set, and Tauri release are not Frozen.

---

## Summary table

| Area | Status | Notes |
| --- | --- | --- |
| License | COMPLETE | Apache-2.0 in `LICENSE` and ADR-0003. `LICENSING_POLICY.md` was stale (said unfrozen); this audit aligns it. |
| Contributor governance | ACCEPTED | Protection/attribution policy exists. CLA/DCO still PENDING DECISION. |
| Conversation governance | COMPLETE | Policy + archive + this audit record. |
| Architecture documentation | ACCEPTED | Vision/PRD/architecture exist. Newer ADRs are ahead of `ARCHITECTURE.md` in places. |
| Book Model | ACCEPTED / NOT STARTED on `main` | Canonical principle is Accepted. No executable schema on `main`. Unmerged PR #1 has a v1 TypeScript model. |
| Tauri architecture | ACCEPTED | Preferred shell in PROJECT-CONTEXT and ADR-0004. No app scaffold. License-scorecard for exact Tauri release still required. |
| EPUB architecture | ACCEPTED | OpenBook TypeScript EPUB 3.3 engine. Not implemented. |
| EPUBCheck integration | ACCEPTED | ADR-0005 records bundling/isolation. Not implemented. Exact Temurin/`jlink` versions PENDING DECISION. |
| PDF renderer | PENDING DECISION | Bake-off required. Typst primary *candidate* only. |
| DTP architecture | ACCEPTED | First-class requirements written. No page-model implementation. |
| Typography | ACCEPTED / PENDING DECISION | Indic/Kannada required. HarfBuzz/Pango/fonts not selected. |
| Dependency/license inventory | IN PROGRESS | Scorecard exists. No machine-readable inventory, no `THIRD-PARTY-NOTICES.txt`. |
| CI/CD | NOT STARTED on `main` | No workflow on `main`. PR #1 has a Node test workflow; not canonical until merged. |
| Security | NOT STARTED | No `SECURITY.md`, no vulnerability process, no bundled-runtime CVE process in code. |
| Testing strategy | ACCEPTED / NOT STARTED | Required in roadmap/architecture. No CI tests on `main`. |

---

## 1. Repository orientation

Tracked `main` contents at audit start were **documentation and license only**:

```text
LICENSE
PROJECT-CONTEXT.md
PROJECT_VISION.md
PRODUCT_REQUIREMENTS.md
ARCHITECTURE.md
FOSS_STRATEGY.md
LICENSING_POLICY.md
CONTRIBUTING.md
CONTRIBUTOR_PROTECTION_AND_ATTRIBUTION.md
THIRD_PARTY_REFERENCE_POLICY.md
ROADMAP.md
README.md
docs/adr/0002, 0003, 0004
docs/decisions/ARCHITECTURE-DECISION-INDEX.md
docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md
docs/conversations/
docs/PUBLISHING_ENGINE_TECHNOLOGY_SCORECARD.md
```

There is **no** Tauri app, **no** `package.json` on `main`, **no** SQLite schema, **no** EPUB/PDF engine, **no** editor.

Untracked leftover `packages/` and `node_modules/` may exist in a cloud workspace from another branch; they are **not** on `main` and must not be committed from this audit branch.

### Parallel branches (not canonical)

| Branch / PR | What it contains | Risk |
| --- | --- | --- |
| `cursor/openbook-constitution-ae36` (PR #1) | Earlier constitution reviews plus Phase 0 npm skeleton and `@openbook/book-model` | File `docs/adr/0001-phase-0-skeleton-and-book-model.md` **collides** with the unused 0001 number on `main`. Must be rebased/renumbered before merge. |
| `cursor/setup-docs-dev-environment-dcd9` (PR #2) | Cursor environment + older `docs/00-constitution.md` tree | Parallel constitution numbering; do not treat as source of truth. |

---

## 2. Governance consistency audit

### ADR numbering

| Finding | Severity | Action taken / required |
| --- | --- | --- |
| ADR-0001 has **no file on `main`** | Process | Number reserved. Do not reuse 0001 for a new unrelated decision. |
| ADR-0002 exists on disk but was **missing from the decision index** | Consistency | Index updated in this audit. |
| Index listed ADR-0005 as “Proposed for formal ADR” with **no file** | Gap | ADR-0005 written; status Accepted. |
| PR #1 uses `docs/adr/0001-phase-0-…` for Book Model skeleton | Merge hazard | Renumber that file if/when merging (suggested: later ID, not 0001). |
| Two ADR dialects exist historically: `docs/05-decision-log.md` ADR-001…024 vs `docs/adr/NNNN` | Drift | `main` uses `docs/adr/` + the architecture decision index. The old decision-log file is **not** on `main`. |

### Agreement with `PROJECT-CONTEXT.md`

PROJECT-CONTEXT matches ADR-0003 (Apache-2.0), ADR-0004 (publishing engines, PDF bake-off pending), Book Model independence from EPUB OPF, and the EPUBCheck bundled-JRE direction now in ADR-0005.

### Apache-2.0 documentation consistency

| Artefact | Before this audit | After |
| --- | --- | --- |
| `LICENSE` | Apache-2.0, Copyright 2026 SanMitra Tech Solutions | Unchanged (authoritative) |
| ADR-0003 | Accepted | Unchanged |
| `CONTRIBUTOR_PROTECTION_AND_ATTRIBUTION.md` | Apache-2.0 | Unchanged |
| `LICENSING_POLICY.md` §3 | **Stated the project license was not frozen** and described Apache vs AGPL as open options | Aligned to ADR-0003: Apache-2.0 accepted; AGPL rejected as default |
| `NOTICE` | Missing | Minimal project NOTICE added |
| `CONTRIBUTING.md` §28 | Pointed at policy + license files without naming Apache-2.0 | Names Apache-2.0 / ADR-0003 |

**Accepted is not Frozen for all time:** changing the project license later would require a new ADR. Until then, agents must not assume AGPL or omit `LICENSE`.

### Conversation records vs accepted decisions

`docs/conversations/2026-09-03-epubcheck-java-tauri.md` agrees with PROJECT-CONTEXT and ADR-0004. Its follow-up “Create ADR-0005” is completed by this audit. No conversation record was found that contradicts Apache-2.0 or official EPUBCheck.

### Pending vs accepted vs frozen

Correctly pending (must not be implemented as if chosen):

- Final PDF renderer
- Exact Temurin/Java version and `jlink` yes/no after measurement
- Bundled-font policy
- CLA/DCO mechanism
- Exact Tauri / Tiptap / ProseMirror package versions
- Foundation governance readiness declaration

Incorrect if treated as Frozen:

- “Typst is the PDF engine”
- “Tiptap is adopted”
- “Tauri 2.x is the shipping shell”
- “EPUBCheck WASM is the plan”

Those are **Accepted directions or candidates**, not Frozen implementations.

### Premature implementation

On `main`: **none.** This is correct.

Do not interpret PR #1’s Book Model TypeScript as permission to start Tauri.

---

## 3. Cross-document contradictions and gaps

These do **not** block writing ADRs. They **do** block declaring the foundation gate complete.

| ID | Finding | Why it matters |
| --- | --- | --- |
| G-01 | `LICENSING_POLICY.md` contradicted ADR-0003 (fixed in this PR) | Agents could refuse SPDX headers or re-open AGPL |
| G-02 | `ROADMAP.md` gate is `FOUNDATION-READY`; scorecard gate is `FOUNDATION-GOVERNANCE-READY` | Two names for related gates |
| G-03 | `ROADMAP.md` `FOUNDATION-READY` requires a reproducible **application** build and CI | Governance docs-only `main` cannot pass that product gate |
| G-04 | `PRODUCT_REQUIREMENTS.md` still lists initial PDF/HTML in MVP; `ROADMAP.md` Phase 1 is guided EPUB; ADR-0004 still plans HTML/PDF engines | Product cut vs architecture breadth. Do not stub a PDF renderer to satisfy the PRD |
| G-05 | `ARCHITECTURE.md` allows “EPUBCheck **or an appropriate standards validator**”; later docs require **official EPUBCheck** | Older architecture text is looser than ADR-0004/0005 |
| G-06 | `ARCHITECTURE.md` monorepo sketch differs from later package names (`book-doctor`, `publishing`, etc.) | Layout not Frozen; do not invent a second structure |
| G-07 | No executable Book Model spec on `main` | Architecture says schema is “defined separately” |
| G-08 | No `SECURITY.md`, no dependency inventory file, no CI on `main` | Release/compliance gaps |
| G-09 | `FOSS_STRATEGY.md` still contains research citation tokens (`turn0search…`) | Hygiene; not an architecture change |
| G-10 | Trademark/name policy still deferred | Branding, not engineering |
| G-11 | README on `main` did not point to PROJECT-CONTEXT or LICENSE | Onboarding gap (README updated in this PR) |

---

## 4. Gate assessment

### `FOUNDATION-GOVERNANCE-READY` (technology scorecard)

Should not be declared complete until:

- remaining technology/license decisions are reviewed **or explicitly deferred**;
- PDF bake-off **plan** is approved (not the winner);
- ADR index, license docs, and PROJECT-CONTEXT agree (this PR addresses the EPUBCheck and license-doc gaps).

Still open after this PR: PDF bake-off plan approval by Product Owner, CLA/DCO, fonts, exact desktop dependency versions, Book Model spec on `main`, CI.

### `FOUNDATION-READY` (`ROADMAP.md`)

**Not passed.** Missing: Book Model specification in-tree, CI, reproducible application build, contradiction-free foundation set (G-02–G-07).

---

## 5. Recommended next step

Product Owner reviews this report and ADR-0005.

Then, in order:

1. Confirm Apache-2.0 alignment edits and ADR-0005 status (Accepted, not Frozen).
2. Decide whether to land a **Book Model specification + tests only** (rebase PR #1, renumber its ADR, no UI).
3. Approve a **PDF bake-off plan** (fixtures listed in ADR-0004) without picking a winner.
4. Only after those, consider a freeze-lift ADR that names **empty Tauri/React shell + SQLite** as the next implementation slice.

Do **not** install Puppeteer, Typst, Tiptap, Tauri, or a JRE because they appear in the backlog.
