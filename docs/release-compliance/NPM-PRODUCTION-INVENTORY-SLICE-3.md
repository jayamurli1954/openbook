# Evidence Ops Slice 3 — Production npm Dependency Inventory

- **Status:** Slice 3 — direct production npm dependencies recorded
- **Date:** 2026-09-23
- **Authority:** ADR-0028; `FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`
- **Baseline:** `main` at `657fe7b` (post–Slice 2 / PR #111)
- **FOUNDATION-READY:** **Not declared**

## 1. Purpose

Populate the release evidence inventory and third-party notices with **direct production** npm dependencies that are part of the Windows-first desktop shipping path, using `package-lock.json` pins and each package’s published license text.

This does **not** declare `FOUNDATION-READY`, change dependency versions, or assert that the full dependency graph is complete.

## 2. Scope (authorized)

| In scope | Out of scope (deferred) |
|---|---|
| Direct third-party `dependencies` of `@openbook/desktop` | Full transitive npm tree (~136 `node_modules` packages) |
| Direct third-party deps of workspace packages pulled into that path (`fflate`, `markdown-it`) | Cargo / Rust crates shipped with Tauri |
| First-party `@openbook/*` workspace packages (already covered as Apache-2.0 source) | Declaring production inventory “complete” |
| Classification of desktop build/dev toolchain as **not redistributed** | Code signing / multi-OS packaging |

## 3. Evidence method

For each in-scope package:

1. **Version + integrity** — `package-lock.json` (lockfileVersion 3) `node_modules/<name>` entry.
2. **License** — SPDX / license field from the published `package.json`, corroborated by the package’s `LICENSE*` file in the installed tree.
3. **Classification** — `shipped-runtime` for libraries bundled into the desktop webview / Node publishing host path; `build` for toolchain that is not redistributed in the NSIS artifact.
4. **Redistribution** — `permitted` for MIT and Apache-2.0 (and dual MIT OR Apache-2.0) subject to retaining copyright/license notices; `not-applicable` for build-only tools.

## 4. Direct production packages recorded

| Package | Version | License | Role |
|---|---|---|---|
| `react` | 19.2.8 | MIT | UI runtime |
| `react-dom` | 19.2.8 | MIT | UI runtime |
| `@tiptap/core` | 3.31.3 | MIT | Authoring (ADR-0008) |
| `@tiptap/react` | 3.31.3 | MIT | Authoring |
| `@tiptap/pm` | 3.31.3 | MIT | Authoring / ProseMirror bridge |
| `@tiptap/starter-kit` | 3.31.3 | MIT | Authoring |
| `@tiptap/extension-link` | 3.31.3 | MIT | Authoring |
| `@tauri-apps/api` | 2.11.1 | Apache-2.0 OR MIT | Desktop host API |
| `@tauri-apps/plugin-dialog` | 2.4.1 | MIT OR Apache-2.0 | Native dialogs |
| `@tauri-apps/plugin-sql` | 2.4.1 | MIT OR Apache-2.0 | SQLite plugin (ADR-0007) |
| `fflate` | 0.8.3 | MIT | EPUB zip (`@openbook/epub`) |
| `markdown-it` | 14.3.1 | MIT | Markdown import (`@openbook/importer`) |

## 5. Explicitly unresolved / deferred

1. **Transitive npm production dependencies** — not enumerated package-by-package in this slice.
2. **Cargo / Rust crates** bundled with the Tauri host — not inventory-populated here.
3. **Full notice concatenation** of every LICENSE file into a single generated dump — human-readable summary in `THIRD-PARTY-NOTICES.md` references lockfile + package LICENSE files; deeper automation is optional later.

## 6. Inventory linkage

Machine-readable updates: `docs/release-compliance/evidence-inventory.json`.  
Human-readable notices: `docs/release-compliance/THIRD-PARTY-NOTICES.md`.
