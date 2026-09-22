# OpenBook Implementation Backlog

- **Status:** Planning backlog only
- **Date:** 2026-09-22
- **Reconciled to:** `main` at `553ba7c` after Gate 10 Slice 5 merge (#108) and post–Gate 10 readiness closure docs
- **Rule:** Nothing here is authorized merely by appearing on this list. Each major area needs its architecture gate. Do not expand beyond authorized foundation slices without a new authorization.

Related: `docs/FOUNDATION-READINESS-REPORT.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `docs/adr/0014-end-to-end-book-production-workflow-architecture.md`, `docs/adr/0018-book-doctor-validation-coordinator-architecture.md`, `docs/adr/0028-release-compliance-architecture.md`, `docs/adr/0029-project-package-filesystem-persistence-architecture.md`.

```text
FOUNDATION
├── Project scaffolding          [DONE on main: apps/desktop via PR #9 / ADR-0007 freeze-lift]
├── Tauri 2.11.5                 [FROZEN in ADR-0007; shell scaffolded in PR #9]
├── React 19.2.8 + TS 5.9.3      [FROZEN in ADR-0007; shell UI scaffolded in PR #9]
├── SQLite (tauri-plugin-sql 2.4.1) [FROZEN in ADR-0007; connectivity proof in PR #9; ProjectPersistence in PR #16; Save/Open workflow in PR #17]
├── Book Model                   [DONE on main: executable `@openbook/book-model` (ADR-0006)]
├── CI (foundation tests)        [DONE on main: `.github/workflows/ci.yml` runs package tests + desktop frontend build]
├── Semantic Document Model      [DONE on main: `@openbook/semantic-document` (PR #11)]
├── Desktop SDM boundary         [DONE on main: in-memory Desktop → SDM → Book (PR #12)]
│
EDITOR & PERSISTENCE
├── Editor technology decision   [DONE: ADR-0008 — Tiptap/ProseMirror selected; OSS versions Frozen]
├── Tiptap / ProseMirror         [DONE on main: ADR-0008 pins installed in PR #14]
├── EditorAdapter (PM ↔ SDM)     [DONE on main: PR #14 bidirectional TipTap JSON ↔ SDM]
├── First editor surface         [DONE on main: PR #14 minimal Tiptap UI + EN/KN round-trips]
├── Book/chapter operations      [DONE on main: in-memory multi-chapter session (PR #15)]
├── Project persistence arch.    [DONE on main: ProjectPersistence + SQLite DTOs (PR #16)]
├── Save/Open project workflow   [DONE on main: session ↔ ProjectPersistence UI (PR #17)]
├── semantic document model      [DONE (PR #11); maps to Book Model]
│
PUBLISHING ENGINES
├── EPUB 3.3 engine              [DONE on main: `@openbook/epub` (ADR-0009, ADR-0010; PRs #20, #21, #24; Gates 1–3)]
├── HTML engine                  [DONE on main: `@openbook/html` format-neutral HTML projection (ADR-0011; PR #25; Gate 4)]
├── PDF renderer selection       [DONE on main: Typst 0.15.1 selected (ADR-0013; PR #27)]
├── PDF publishing engine        [DONE on main: `@openbook/pdf` (ADR-0013; PR #28; Gate 6)]
│
VALIDATION & RUNTIME PACKAGING
├── EPUBCheck adapter & packaging[DONE on main: official 5.3.0 + Temurin 21 jlink runtime packaging in `@openbook/validator` (ADR-0012; PR #26; Gate 5)]
├── Book Doctor coordinator      [DONE on main: `@openbook/book-doctor` BookValidationReport aggregation (ADR-0018; PR #38; Gate 7 Slice 5)]
│
END-TO-END WORKFLOW & FOUNDATION SLICES (GATE 7)
├── Workflow coordinator         [DONE on main: `@openbook/workflow` 7-stage pipeline (ADR-0014; PR #30; Gate 7 Slice 1)]
├── Importer / ingestion         [DONE on main: `@openbook/importer` Markdown/text ingestion (ADR-0015; PR #32; Gate 7 Slice 2)]
├── Authoring / session          [DONE on main: `@openbook/authoring` BookSession structural ops (ADR-0016; PR #34; Gate 7 Slice 3)]
├── Asset management             [DONE on main: `@openbook/assets` content-addressed asset store (ADR-0017; PR #36; Gate 7 Slice 4)]
├── Book Doctor coordinator      [DONE on main: `@openbook/book-doctor` foundation (ADR-0018; PR #38; Gate 7 Slice 5)]
│
DESKTOP INTEGRATION (GATE 8)
├── Desktop Studio integration   [DONE — Gate 8 Slices 1–5 implemented on main under ADR-0019 / ADR-0020 / ADR-0021 / ADR-0022 / ADR-0023]
│
RELEASE / COMPLIANCE (ADR-0028)
├── Release evidence inventory model       [DONE — ADR-0028 Slice 1 / PR #73]
├── Third-party notice maintenance         [DONE — ADR-0028 Slice 2 / PR #74]
├── Font provenance & redistribution policy [DONE — ADR-0028 Slice 3 / PR #75; font-by-font clearance remains evidence-dependent]
├── Release artifact manifest/evidence      [DONE — ADR-0028 Slice 4 / PR #76]
├── Reproducibility/compliance verification [DONE — ADR-0028 Slice 5 / PR #77]
├── ADR-0028 implementation closure         [DONE — reconciliation record; no production compliance certification]
│
PROJECT PACKAGE (ADR-0029)
├── Project-package architecture           [DONE — ADR-0029 Accepted (#80)]
├── Slice 1 package contract & manifest    [DONE — PR #82; types/validation only, no on-disk package]
├── Canonical Book persistence mapping     [DONE — Slice 2 / PR #93; Book ↔ package payload only]
├── Asset/package relationship             [DONE — Slice 3 / PR #94; id↔SHA-256 index only]
├── Atomic Save/Open integration           [DONE — Slice 4 / PR #95; FS package + CAS layout]
├── Integrity / migration / recovery       [DONE — Slice 5 integrity (#96); Slice 6 migration/recovery (#97)]
│
AUTOSAVE & CRASH RECOVERY (ADR-0031)
├── Autosave & crash recovery architecture [DONE — ADR-0031 Accepted; Slices 1–5 on main]
├── Slice 1 autosave controller            [DONE — PR #98; dirty/debounce/coalesce + Save port]
├── Slice 2 package Save port adapter      [DONE — PR #99; AutosaveSavePort → saveProjectPackage]
├── Slice 3 coordinator dirty hooks        [DONE — PR #100; bound package root + mutation hooks]
├── Slice 4 crash-recovery open path       [DONE — PR #101; discovery + explicit open-with-recover]
├── Slice 5 SQLite/package Save unification [DONE — PR #102; package-first explicit Save when bound]
│
PACKAGING / RELEASE READINESS (GATE 10 / ADR-0032)
├── Desktop packaging architecture         [DONE — ADR-0032 Accepted]
├── Slice 1 packaged resource locator      [DONE — PR #104]
├── Slice 2 Windows resource layout        [DONE — PR #105]
├── Slice 3 desktop host wiring            [DONE — PR #106]
├── Slice 4 Windows distributable + identity [DONE — PR #107]
├── Slice 5 release-readiness verification [DONE — PR #108; foundationReady stays false]
│
REQUIRED NEXT PRODUCT CAPABILITIES (must not be dropped; not authorized by this list)
├── Export UI & native Save As             [DONE on main — Gate 9 / ADR-0030 Slices 1–5]
├── Filesystem project package             [DONE on main — ADR-0029 Slices 1–6]
├── Autosave & crash recovery              [DONE on main — ADR-0031 Slices 1–5]
├── Packaging / release readiness          [DONE on main — Gate 10 / ADR-0032 Slices 1–5]
│
FOUNDATION READINESS DECLARATION
├── Post–Gate 10 closure record            [IN PROGRESS — docs only; FOUNDATION-READY not declared]
│
DTP & TYPOGRAPHY (FUTURE)
├── page model                   [requirements exist; NOT STARTED]
├── typography                   [HarfBuzz/Pango/fonts PENDING; NOT STARTED]
├── layout                       [NOT STARTED]
│
AI (FUTURE)
├── Ollama integration           [intent only; not an MVP dependency; NOT STARTED]
├── AI orchestration             [ADR-level: AI is not the publishing engine; NOT STARTED]
└── guided workflows             [Phase 3 in ROADMAP.md; NOT STARTED]
```

## Ordered foundation engineering

Status against the ordered list:

1. **Book Model spec + tests** on `main` — **DONE** (ADR-0006 / `@openbook/book-model`).
2. **CI** that runs those tests — **DONE** (`.github/workflows/ci.yml`).
3. **PDF bake-off plan + fixtures** (no production renderer) — **DONE** (PR #6).
4. **EPUBCheck packaging spike** behind `ValidatorService` — **DONE as spike** (PR #7 / `docs/EPUBCHECK_PACKAGING_SPIKE.md`).
5. **Desktop shell freeze-lift + empty shell** — **DONE** (ADR-0007 baseline; PR #9 `apps/desktop` with SQLite connectivity proof only).
6. **Semantic Document Model contract** — **DONE** (PR #11 / `@openbook/semantic-document`).
7. **Desktop SDM integration boundary** — **DONE** (PR #12; in-memory Desktop → SDM → Book).
8. **Editor technology evaluation and decision** — **DONE** (ADR-0008).
9. **First Tiptap editor implementation** — **DONE** (PR #14; EditorAdapter + minimal UI).
10. **Editor book/chapter operations** — **DONE** (PR #15; in-memory select/create/rename/delete; no persistence).
11. **SQLite project persistence architecture** — **DONE** (PR #16: `ProjectPersistence` contract, minimal schema, DTOs, atomic save transactions, foreign keys, test driver).
12. **Save/Open project workflow** — **DONE** (PR #17: session ↔ `ProjectPersistence` UI, English & Kannada round-trip coverage, persistence error reporting).
13. **EPUB 3.3 in-memory package generator (Gate 1)** — **DONE** (ADR-0009; PR #20).
14. **EPUB 3.3 deterministic OCF ZIP packaging (Gate 2)** — **DONE** (ADR-0009; PR #21).
15. **EPUB 3.3 asset & resource packaging (Gate 3)** — **DONE** (ADR-0010; PR #24).
16. **HTML publishing engine (Gate 4)** — **DONE** (ADR-0011; PR #25).
17. **Production EPUBCheck runtime packaging (Gate 5)** — **DONE** (ADR-0012; PR #26).
18. **PDF publishing engine & Typst 0.15.1 renderer selection (Gate 6)** — **DONE** (ADR-0013; PR #28).
19. **Workflow coordinator foundation (Gate 7 Slice 1)** — **DONE** (ADR-0014; PR #30).
20. **Import, authoring, assets, and Book Doctor foundations (Gate 7 Slices 2–5)** — **DONE** (ADR-0015–ADR-0018; PRs #32, #34, #36, #38).
21. **Gate 8 Desktop Studio Integration (Slices 1–5)** — **DONE** (ADR-0019–ADR-0023; PRs through #51; final merge `92c38c3e5cb7c64cc4ff3ceea0e0f1bc60993af5`).
22. **ADR-0028 Release & Compliance implementation (Slices 1–5)** — **DONE** (PRs #73–#77; final Slice 5 merge `8de6969068768cdb55029e720aebad53a50a04a1`).
23. **ADR-0029 Project Package architecture** — **Accepted** (#80). Slices 1–6 **DONE** (#82, #93, #94, #95, #96, #97).
24. **ADR-0031 Autosave & Crash Recovery** — **Accepted**. Slices 1–5 **DONE** (#98–#102; Slice 5 merge `d51121d`). Sequencing closed. React recover chrome remains separately gated.
25. **Gate 10 packaging / release readiness** — ADR-0032 **Accepted**. Slices 1–2 done (PR #104, #105). Slice 3 (desktop host wiring) is the current authorized unit.

**Current Test Suite State:**
- **231 / 231 automated tests passing** (0 failures, 0 skipped, 0 cancelled) across all 12 monorepo packages at the Gate 8 Slice 5 merge checkpoint. ADR-0028 is documentation/schema-only and introduced no application test changes.

## Gate 8 closure status

Gate 8 is **implementation-complete and reconciled on main** as of merge `92c38c3e5cb7c64cc4ff3ceea0e0f1bc60993af5`. Slices 1–5 are implemented. This backlog reconciliation does not authorize any new implementation work.

## ADR-0028 closure status

ADR-0028 is **implementation-complete and reconciled on main** through PRs #73–#77. The five release/compliance evidence mechanisms are present, but production evidence population remains deliberately unresolved where authoritative evidence has not been established. See `docs/release-compliance/ADR-0028-CLOSURE-RECONCILIATION.md`.

Open evidence limitations carried forward:

- complete production dependency/third-party provenance inventory not asserted;
- bundled-font redistribution remains evidence-dependent;
- complete branch-protection configuration remains not independently re-verified because of the previously recorded GitHub API 403 limitation;
- byte-for-byte release reproducibility is not claimed where environmental evidence is insufficient.

This reconciliation does not declare `FOUNDATION-READY`, `FOUNDATION-GOVERNANCE-READY`, or project-wide release/compliance certification.

## Contributor Readiness closure

The Contributor Readiness governance set is now reconciled as follows:

- **ADR-0024 — DCO 1.1 contribution sign-off:** **Accepted**; contribution sign-off enforcement is implemented and remains governed by the existing repository CI/branch-protection controls.
- **ADR-0025 — Project Stewardship & Maintainer Governance:** **Accepted**; the documented stewardship and maintainer governance policy is recorded in the repository.
- **ADR-0026 — Code of Conduct Governance:** **Accepted**; the documented Code of Conduct governance policy is recorded in the repository.
- **ADR-0027 — Security Disclosure and Vulnerability Response Governance:** **Accepted**; operational security policy is implemented on `main` through **PR #64**, including root `SECURITY.md` and documented private reporting, triage, remediation, validation, and coordinated disclosure guidance. Merge commit: `2ac1bf5c87e44007de1c10c3e0ef0fa731e0dcae`.

This reconciliation records the current governance state only. It does **not** declare broader `FOUNDATION-GOVERNANCE-READY` or final project-wide Contributor Readiness status, and it authorizes no new implementation scope.

## Required next product capabilities (must not be dropped)

Maintainer direction 2026-09-16: these three are necessary for a usable OpenBook. Gating them is about *how* they are built, not *whether* they remain on the plan. Do not bury them under DTP, AI, or compliance follow-ons.

| Capability | Why it is required | Current state | Next authorized unit |
|---|---|---|---|
| **Export UI & native Save As** | A person must get EPUB/HTML/PDF onto disk. Engines without a host path are not a product. | **Done on `main`:** Gate 9 Slices 1–5 under ADR-0030 (export host, Save-As host, wiring, React UI + Tauri dialog/atomic writes, E2E verification). | Closed. Follow-ups only via new authorization (e.g. packaging Gate 10). |
| **Filesystem project package** | Save/Open must be a versioned on-disk project, not an opaque SQLite-only session. | ADR-0029 Accepted. Slices 1–6 done (#82, #93, #94, #95, #96, #97). | Closed under ADR-0029. Bound Save unification is done under ADR-0031 Slice 5. |
| **Autosave & crash recovery** | Losing work after the app is actually used is unacceptable. | **Done on `main`:** ADR-0031 Slices 1–5 (#98–#102). | Closed under ADR-0031 sequencing. React recover/discard chrome remains separately gated. |
| **Packaging / release readiness** | A developer `.cache/` runtime is not a shippable desktop product. | ADR-0032 **Accepted**. Slices 1–5 done (PRs #104–#108). | No further Gate 10 slice. FOUNDATION-READY remains separately gated. |

These items still require their own ADR/slice authorization before code. Recording them here is not that authorization.

Cloud sync, AI/Ollama, and DTP remain future work. They must not displace the required product capabilities above.

## Next architectural decision points

Gates 1 through 10, ADR-0028's five implementation slices, ADR-0029 Slices 1–6, ADR-0030 Slices 1–5, and ADR-0031 Slices 1–5 are complete on `main`. Gate 10 ADR-0032 Slices 1–5 are done (PRs #104–#108). `FOUNDATION-READY` is **not** declared; see `docs/FOUNDATION-READINESS-POST-GATE-10-CLOSURE.md`. No next engineering slice is authorized by the backlog alone.

Separately gated and not in the required-three: cloud sync; AI/Ollama; DTP/page-layout work.

## Explicitly out of order

- Installing Puppeteer “because HTML-to-PDF is easy”
- Vendoring an unofficial EPUBCheck WASM build
- Embedding Scribus, Sigil, Calibre, or Pandoc AST as the Book Model
- Making Ollama required for MVP
- Declaring `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` because documentation or early scaffolds exist
- Treating the PR #9 SQLite smoke DB as a production persistence schema
- Letting Tiptap/ProseMirror JSON become a parallel canonical document model
- Persisting Tiptap JSON into SQLite instead of the canonical Book Model
- Adding autosave as a second save path, or persisting Tiptap JSON, instead of using the ADR-0029 package boundary
- Implementing the filesystem package or autosave without their own explicit authorization
- Reopening Gate 9 export work without a new ADR/authorization after Gate 9 closure
- Treating DTP, AI/Ollama, or compliance evidence follow-ons as higher priority than the required product capabilities
- Implementing Gate 10 packaging, Tauri bundle wiring, or installer generation without ADR-0032 acceptance and a separately authorized slice
- Falling back to a user-installed JRE or Typst, or downloading runtimes on first launch, to make packaging “easier”
