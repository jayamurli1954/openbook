# ADR 0007: Desktop Foundation Technology Baseline and Freeze-Lift

- **Status:** Accepted; selected desktop baseline versions are **Frozen**
- **Date:** 2026-09-07
- **Decision owner:** SanMitra Tech Solutions
- **Area:** Desktop shell / Foundation / Governance
- **Decision:** Freeze exact Tauri 2.x, React, TypeScript, and SQLite technology choices (with licenses and platform scope), record desktop and monorepo package boundaries, publish a dependency/license scorecard for this baseline, and authorize a narrowly scoped freeze-lift for the **next** PR only. This ADR is documentation-only and does **not** implement a desktop app.

## Context

ADR-0004 Accepted Tauri 2.x as the preferred desktop shell without freezing a release. ADR-0006 landed the executable Book Model and explicitly deferred Tauri/React/SQLite until a separate freeze-lift ADR. The Implementation Backlog and Foundation Readiness Report both require a license-scorecard and exact versions before any desktop shell work.

Without this ADR:

- agents could invent a Tauri release, React major, or SQLite driver;
- SQLite could be mistaken for the Book Model;
- the next engineering PR could silently expand into EPUB/PDF/AI work;
- ADR-0005’s EPUBCheck subprocess design could be rewritten instead of reused.

This ADR closes the “exact desktop dependency versions” pending item for the shell stack only. It does **not** declare `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY`, does **not** select a PDF renderer, and does **not** change EPUBCheck architecture.

## Decision

### 1. Technology baseline (Frozen)

Exact versions below are Frozen for the desktop foundation stack. Implementation must use these pins unless a later ADR replaces them. Patch bumps within the same recorded major.minor may be proposed in a follow-up ADR only after license/notice re-inventory.

| Layer | Selection | Exact version | SPDX / license signal | Classification (`LICENSING_POLICY.md`) | Platform scope |
| --- | --- | --- | --- | --- | --- |
| Desktop shell (Rust crate) | Tauri | **2.11.5** | Apache-2.0 OR MIT | EMBED | Windows, macOS, Linux **desktop** |
| Desktop JS API | `@tauri-apps/api` | **2.11.1** | Apache-2.0 OR MIT | EMBED | Same as shell |
| Desktop CLI (dev) | `@tauri-apps/cli` | **2.11.4** | Apache-2.0 OR MIT | EMBED (dev tooling) | Contributor machines / CI for desktop builds |
| UI library | React | **19.2.8** | MIT | EMBED | Desktop WebView UI only in this baseline |
| UI DOM bindings | `react-dom` | **19.2.8** | MIT | EMBED | Same as React |
| Product language | TypeScript | **5.9.3** | Apache-2.0 | EMBED (compiler/dev) | Monorepo TypeScript packages and desktop UI |
| Local persistence engine | SQLite via official Tauri SQL plugin | **`tauri-plugin-sql` 2.4.1** with Cargo feature **`sqlite`** | Plugin: MIT OR Apache-2.0; SQLite engine: public domain (blessing) | EMBED (plugin + engine) | Local project DB files on Windows/macOS/Linux |

**Node engines:** remain **Node.js ≥ 22** as already recorded in the root workspace (`package.json` `engines`).

**TypeScript pin rationale:** TypeScript 6.x and 7.x exist on npm as of this ADR date. This baseline freezes **5.9.3** (latest stable 5.x) to stay compatible with the existing workspace pin `typescript@^5.8.2` used by `@openbook/book-model` and `@openbook/validator`, avoiding a monorepo compiler major bump in the same slice as first desktop scaffolding. A later ADR may authorize TypeScript 6/7 after workspace-wide validation.

**Not selected in this ADR (remain OUT OF SCOPE / PENDING):**

- Vite or any frontend bundler exact version (to be recorded when the next PR scaffolds the app, then frozen by follow-up inventory if needed);
- Tiptap / ProseMirror;
- any PDF renderer (ADR-0004 bake-off still PENDING);
- Temurin / `jlink` exact versions (ADR-0005 Not Frozen);
- Ollama or any AI stack;
- mobile (iOS/Android) Tauri targets — desktop only.

### 2. SQLite persistence boundary (Frozen principle)

SQLite is **persistence infrastructure**, not the Book Model.

```text
@openbook/book-model     ← canonical, format-neutral domain model (ADR-0006)
        ↑ serialize / parse / validate
Application services
        ↑
Persistence adapter (Tauri + tauri-plugin-sql / SQLite)
        ↑
project.db (and related project files)
```

Rules:

1. The Book Model remains the format-neutral source of truth (`PROJECT-CONTEXT.md`, ADR-0004, ADR-0006).
2. SQLite may store project metadata, settings, indexes, and serialized Book Model payloads (or projections thereof). It must not redefine authoring semantics.
3. No EPUB packaging fields (`opf`, `manifest`, `spine`, `ncx`, `nav`, …) may be introduced as first-class Book Model fields via schema “convenience.”
4. Presentation/UI code must not treat raw SQL rows as the domain API; it depends on application services that speak Book Model types.
5. Generated exports (EPUB/HTML/PDF) remain distinguishable from source project data (`ARCHITECTURE.md` §10).

### 3. Desktop architecture boundaries

```text
Presentation (React + TypeScript in WebView)
        ↓ invoke / events only through defined commands
Tauri / Rust shell (native window, FS, process, SQLite plugin)
        ↓
Application services (TypeScript packages preferred)
        ↓
Domain: @openbook/book-model
        ↑
Infrastructure adapters (SQLite, filesystem, ValidatorService → EPUBCheck)
```

Boundaries Frozen by this ADR:

1. **Shell vs domain:** Tauri hosts the app; it does not become the Book Model.
2. **UI vs persistence:** React must not open SQLite connections or embed SQL as the product API.
3. **Validator path unchanged:** EPUBCheck remains official EPUBCheck 5.3.0 behind `ValidatorService`, invoked as an isolated subprocess with a bundled/private Java runtime when desktop packaging lands (ADR-0005). This ADR does **not** modify that architecture, does **not** re-decide Temurin/`jlink`, and does **not** authorize bundling Java/EPUBCheck binaries here.
4. **Publishing engines:** EPUB/HTML/PDF engines remain separate packages/adapters (ADR-0004). PDF renderer selection remains **UNDECIDED**.
5. **AI:** Ollama and cloud AI remain optional future providers behind abstractions; not part of this baseline or the next PR.
6. **Rust scope:** Rust is used for Tauri commands, native/system integration, process spawning, and the SQLite plugin boundary — not as the primary product-domain language.

### 4. Monorepo / package boundaries

Existing on `main` (must be preserved):

| Path | Role |
| --- | --- |
| `packages/book-model` | Canonical Book Model (`@openbook/book-model`) |
| `packages/validator` | `ValidatorService` boundary + EPUBCheck adapter proof (ADR-0005 spike) |

Target layout for desktop foundation (authoritative package boundaries; directories may be created only when a freeze-lift PR authorizes them):

```text
openbook/
├── apps/
│   └── desktop/                 # Tauri 2.11.x + React 19.2.8 UI shell (NOT created by this ADR)
├── packages/
│   ├── book-model/              # EXISTS — domain source of truth
│   ├── validator/               # EXISTS — ValidatorService / EPUBCheck adapter
│   ├── persistence/             # OPTIONAL later — SQLite access typed against Book Model (not the model)
│   ├── epub/ | html/ | pdf/     # Publishing engines — NOT authorized by this ADR
│   └── …                        # editor, themes, ai-*, etc. — later ADRs
├── tests/
├── docs/
└── scripts/
```

Dependency direction (Frozen):

```text
apps/desktop → application services → @openbook/book-model
apps/desktop → @openbook/validator (via services; never bypass for conformance)
persistence adapters → serialize/parse Book Model; never own semantics
publishing engines → read Book Model; never write EPUB/PDF structures back into it
```

Root npm `workspaces` may gain `apps/desktop` (and later packages) only in authorized implementation PRs. This ADR does not edit `package.json`.

### 5. Dependency / license scorecard (desktop baseline)

| Component | Version | SPDX | Link/process | Redistribution notes | Status |
| --- | --- | --- | --- | --- | --- |
| `tauri` (crates.io) | 2.11.5 | Apache-2.0 OR MIT | Static link into desktop binary | Preserve dual-license notices; inventory transitives at first ship | **Frozen baseline** |
| `@tauri-apps/api` | 2.11.1 | Apache-2.0 OR MIT | Bundled into frontend assets | Same family as Tauri | **Frozen baseline** |
| `@tauri-apps/cli` | 2.11.4 | Apache-2.0 OR MIT | Dev/CI only | Not a runtime ship requirement for end users | **Frozen baseline** |
| `react` / `react-dom` | 19.2.8 | MIT | Bundled into frontend assets | Preserve copyright notices | **Frozen baseline** |
| `typescript` | 5.9.3 | Apache-2.0 | Compile-time | Dev dependency; not a runtime redistributable | **Frozen baseline** |
| `tauri-plugin-sql` | 2.4.1 (`sqlite`) | MIT OR Apache-2.0 | Linked into desktop binary | Record sqlx/SQLite transitive notices at first ship | **Frozen baseline** |
| SQLite engine | as pulled by plugin/sqlx | Public domain (blessing) | Embedded native | Keep upstream blessing/notice text when required | **Frozen technology** |
| EPUBCheck | 5.3.0 | BSD-3-Clause + third-party notices | Isolated **subprocess** (ADR-0005) | Unchanged; not re-selected here | Accepted (ADR-0005) |
| Bundled JRE / Temurin | TBD | typically GPLv2 + Classpath Exception | Isolated redistributed runtime | Still **Not Frozen** (ADR-0005) | Pending measurement |
| PDF renderer | — | — | — | Bake-off pending | **UNDECIDED** |
| Tiptap / ProseMirror | — | — | — | Preferred direction only | Not Frozen |
| Ollama / AI SDKs | — | — | — | Intent only | Not authorized |

Before first desktop binary ship, release packaging must still produce machine-readable inventory / `THIRD-PARTY-NOTICES.txt` covering Tauri, React, the SQL plugin, SQLite, and all transitives (existing scorecard gate).

### 6. Explicit freeze-lift scope for the **NEXT** PR

This ADR **lifts the freeze** for exactly one subsequent engineering PR, with this maximum scope:

**Authorized in the next PR (only):**

1. Scaffold `apps/desktop` as an empty Tauri **2.11.5** + React **19.2.8** + TypeScript **5.9.3** shell that builds on Windows, macOS, and Linux desktop targets (or documents interim CI limits honestly).
2. Wire `@tauri-apps/api` **2.11.1** and `@tauri-apps/cli` **2.11.4** as declared dependencies matching this baseline.
3. Add a minimal SQLite proof via `tauri-plugin-sql` **2.4.1** (`sqlite`) that stores **non-domain** smoke data (e.g. app settings / health row) and/or a round-trip of a **serialized** Book Model fixture without inventing a competing schema language.
4. Keep `@openbook/book-model` and `@openbook/validator` as workspace dependencies where needed; do not fork or dilute them.
5. Update root workspaces/CI only as required to build/test the empty shell.

**Hard stop — not authorized in the next PR:**

- PDF renderer selection or any Typst/pdf-lib/Chromium/Puppeteer production dependency;
- implementing EPUB, HTML, or PDF publishing engines;
- modifying ADR-0005 EPUBCheck architecture or shipping Temurin/EPUBCheck production binaries beyond what already exists for the packaging spike;
- Tiptap/ProseMirror editor product UI;
- Ollama or any AI integration;
- production installer branding, code signing, or release binaries as a “shipping” product;
- declaring `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY`;
- replacing SQLite with another database;
- treating SQLite tables as the Book Model.

**This PR (ADR-0007) authorizes documentation only.** It must not create the Tauri app, React UI, or SQLite implementation.

## Consistency with ADR-0005 and ADR-0006

| Prior ADR | Potential tension | Resolution in ADR-0007 |
| --- | --- | --- |
| ADR-0005 | Diagrams assume Tauri/React exist; ADR forbids creating the Tauri app in that slice | Versions are now Frozen; app creation waits for the **next** PR freeze-lift. EPUBCheck subprocess + `ValidatorService` architecture is **unchanged**. |
| ADR-0005 | Temurin/`jlink` Not Frozen | Remains Not Frozen; out of scope here. |
| ADR-0006 | Defers Tauri/React/SQLite to a freeze-lift ADR | This is that ADR. Book Model stays canonical and format-neutral. |
| ADR-0006 | No persistence engine authorized | Persistence **technology** is Frozen here; persistence **implementation** waits for the next PR. |
| ADR-0004 | PDF bake-off pending; Tauri preferred without exact version | PDF remains UNDECIDED; Tauri exact version now Frozen. |

No supersession of ADR-0004, ADR-0005, or ADR-0006 is intended.

## Alternatives considered

| Option | Result |
| --- | --- |
| Electron instead of Tauri | Rejected for this baseline; contradicts ADR-0004 preferred shell and local-first footprint goals |
| Freeze Tauri 2.x major only (no exact version) | Rejected; readiness report and backlog require exact version + license scorecard |
| TypeScript 7.0.2 as baseline | Deferred; avoids monorepo compiler skew with existing `^5.8.2` packages |
| `better-sqlite3` in Node as primary desktop DB | Rejected as primary path; desktop persistence belongs behind Tauri/Rust (`tauri-plugin-sql`), not a Node native addon in the UI process |
| Community `tauri-plugin-rusqlite2` | Rejected as default; prefer official `tauri-plugin-sql` unless a later ADR proves a gap |
| Authorize full editor + engines in the next PR | Rejected; contradicts ordered foundation engineering and stop conditions |

## What this ADR does not authorize

- Creating `apps/desktop` or any Tauri/React/SQLite code in **this** PR
- Selecting or installing a PDF renderer
- Changing EPUBCheck / ValidatorService architecture
- Adding Ollama/AI
- Shipping production desktop binaries
- Declaring foundation readiness gates complete

## Acceptance criteria (governance)

This decision is Accepted / versions Frozen when all of the following are true in documentation:

1. Exact Tauri, React, TypeScript, and SQLite plugin versions and licenses are recorded.
2. Desktop platform scope is Windows/macOS/Linux desktop only.
3. SQLite is explicitly not the Book Model.
4. Monorepo package boundaries preserve `@openbook/book-model` and `@openbook/validator`.
5. Dependency/license scorecard for this baseline exists.
6. Next-PR freeze-lift scope and hard stops are explicit.
7. PDF renderer remains UNDECIDED; ADR-0005 is unmodified in substance.

## Follow-up actions

1. Open the next engineering PR only within §6 freeze-lift scope.
2. On first desktop dependency install, regenerate third-party notices and checksum records.
3. Record exact Vite (or chosen bundler) version in that PR’s inventory if introduced.
4. Keep ADR-0005 follow-ups (Temurin/`jlink`/checksums) on their own track.
5. Do not start PDF bake-off execution or AI work from this baseline alone.

## Related documents

- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/adr/0005-epubcheck-bundling-java-runtime-isolation.md`
- `docs/adr/0006-book-model-executable-specification.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- `docs/PUBLISHING_ENGINE_TECHNOLOGY_SCORECARD.md`
- `docs/IMPLEMENTATION-BACKLOG.md`
- `docs/FOUNDATION-READINESS-REPORT.md`
- `PROJECT-CONTEXT.md`
- `ARCHITECTURE.md`
- `LICENSING_POLICY.md`

## References

- Tauri 2.11.5 (crates.io): https://crates.io/crates/tauri/2.11.5
- Tauri releases: https://v2.tauri.app/release/tauri/
- `@tauri-apps/api` / `@tauri-apps/cli` (npm)
- React: https://www.npmjs.com/package/react
- TypeScript: https://www.npmjs.com/package/typescript
- Tauri SQL plugin: https://v2.tauri.app/plugin/sql/
