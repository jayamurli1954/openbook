# OpenBook Third-Party Notices

- **Status:** Maintenance mechanism established; Slices 1–5 populate Windows-first production evidence. ROADMAP Phase 0 `FOUNDATION-READY` is declared separately in `docs/FOUNDATION-READY-DETERMINATION.md`.
- **Scope:** Release-oriented attribution and provenance evidence.
- **Authority:** `docs/adr/0028-release-compliance-architecture.md`
- **Inventory:** `docs/release-compliance/evidence-inventory.json` (machine-readable companion)
- **npm closure:** `docs/release-compliance/npm-production-closure-inventory.json`
- **Cargo closure:** `docs/release-compliance/cargo-production-closure-inventory.json`
- **Font dispositions:** `docs/release-compliance/FONT-CLEARANCE-DISPOSITIONS.md`
- **npm Slice 3 method:** `docs/release-compliance/NPM-PRODUCTION-INVENTORY-SLICE-3.md`
- **npm Slice 4 method:** `docs/release-compliance/NPM-TRANSITIVE-PRODUCTION-INVENTORY-SLICE-4.md`
- **Cargo Slice 5 method:** `docs/release-compliance/CARGO-PRODUCTION-INVENTORY-SLICE-5.md`
- **Selection:** `docs/FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`
- **Phase 0 determination:** `docs/FOUNDATION-READY-DETERMINATION.md`

## Purpose

This file is the human-readable third-party notice record for OpenBook release artifacts. It is maintained from authoritative project inputs and reviewed as part of release/compliance work.

It is not a replacement for package manifests, `package-lock.json`, runtime provenance records, or the release evidence inventory. It must not become an application source of truth.

## Maintenance rules

1. Identify candidate third-party material from authoritative manifests, lockfiles, runtime packaging records, and shipped-asset records.
2. Determine whether each candidate is development/build/test material or is actually shipped/redistributed.
3. Record the applicable license or licensing basis and any attribution/notice requirement only when supported by authoritative evidence.
4. Preserve source/provenance and integrity identifiers where available.
5. Keep unresolved licensing or redistribution questions explicitly unresolved; do not infer permission from technical availability.
6. Update this record when a shipped third-party component, runtime, asset, or relevant dependency changes.
7. Review the corresponding release evidence inventory so the human-readable notice and machine-readable evidence do not contradict one another.

## Current evidence status (Slice 5)

| Category | Status |
|---|---|
| Gate 5 EPUBCheck 5.3.0 | Recorded below |
| Gate 5 Temurin 21 windows-x64 pin / jlink image obligations | Recorded below |
| Gate 6 Typst 0.15.1 windows-x64 | Recorded below |
| Gate 6 bundled fonts (4 Noto families) | **Confirmed** / redistribution **conditional** (OFL 1.1) |
| Direct production npm (desktop path) | **Confirmed** — see § npm below |
| npm production closure (transitive) | **Confirmed** — 50 transitive packages in closure inventory |
| Tauri / Cargo crates | **Confirmed** — 550 locked packages; 5× MPL-2.0 **conditional** |
| Desktop build/dev npm toolchain | **Confirmed** as build-only (not redistributed) |
| `FOUNDATION-READY` | **Declared** (see `FOUNDATION-READY-DETERMINATION.md`; this notices file is not the declaration) |

## Shipped runtimes (Gate 5 / Gate 6 — Windows-first)

### Official EPUBCheck 5.3.0

- **Project:** W3C EPUBCheck
- **Version:** 5.3.0
- **SHA-256 (zip):** `6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5`
- **License:** BSD-3-Clause (plus upstream third-party notices inside the distribution)
- **Evidence:** `packages/validator/packaging/inventory.json`, `packages/validator/packaging/THIRD-PARTY-NOTICES.md`
- **Shipping note:** Preserve upstream `LICENSE.txt`, `THIRD-PARTY.txt`, and `licenses/` beside the packaged JAR.

### Eclipse Temurin 21 LTS (windows-x64 pin)

- **Vendor:** Eclipse Adoptium — Eclipse Temurin
- **Pinned release:** `jdk-21.0.12.1+1`
- **Windows x64 SHA-256:** `f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e`
- **License:** GPLv2 with Classpath Exception
- **Evidence:** `packages/validator/packaging/inventory.json`, `packages/validator/packaging/THIRD-PARTY-NOTICES.md`
- **Shipping note:** Private `jlink` image for Gate 10 Windows packaging; preserve Temurin `LICENSE`, `ASSEMBLY_EXCEPTION`, and `legal/` from the built runtime.

### Typst CLI v0.15.1 (windows-x64)

- **Project:** Typst
- **Version:** 0.15.1 (git commit `9dfd3a08` per ADR-0013)
- **Windows x64 SHA-256:** `19ce3551153c2fe7ee9fa2f95208310c8f4d3209fedb699e0333faf8913f6736`
- **License:** Apache-2.0
- **Evidence:** `packages/pdf/packaging/inventory.json`, `packages/pdf/packaging/THIRD-PARTY-NOTICES.md`

## Bundled fonts (Gate 6 — OFL clearance confirmed)

| Font | Role | Release clearance | Redistribution |
|---|---|---|---|
| Noto Serif Kannada | Body (Kannada) | **Confirmed** | **Conditional** (OFL 1.1) |
| Noto Sans Kannada | Headings (Kannada) | **Confirmed** | **Conditional** (OFL 1.1) |
| Noto Serif | Body (Latin fallback) | **Confirmed** | **Conditional** (OFL 1.1) |
| Noto Sans | Headings (Latin fallback) | **Confirmed** | **Conditional** (OFL 1.1) |

See `FONT-CLEARANCE-DISPOSITIONS.md` for OFL shipping conditions and upstream `OFL.txt` URLs.

## Direct production npm (desktop path — Slice 3)

Pinned in `package-lock.json`. License text is the published package `LICENSE*` file. Integrity identifiers are npm `sha512-…` digests from the lockfile (see inventory).

| Package | Version | License | Path |
|---|---|---|---|
| `react` | 19.2.8 | MIT | `@openbook/desktop` |
| `react-dom` | 19.2.8 | MIT | `@openbook/desktop` |
| `@tiptap/core` | 3.31.3 | MIT | `@openbook/desktop` (ADR-0008) |
| `@tiptap/react` | 3.31.3 | MIT | `@openbook/desktop` |
| `@tiptap/pm` | 3.31.3 | MIT | `@openbook/desktop` |
| `@tiptap/starter-kit` | 3.31.3 | MIT | `@openbook/desktop` |
| `@tiptap/extension-link` | 3.31.3 | MIT | `@openbook/desktop` |
| `@tauri-apps/api` | 2.11.1 | Apache-2.0 OR MIT | `@openbook/desktop` |
| `@tauri-apps/plugin-dialog` | 2.4.1 | MIT OR Apache-2.0 | `@openbook/desktop` |
| `@tauri-apps/plugin-sql` | 2.4.1 | MIT OR Apache-2.0 | `@openbook/desktop` (ADR-0007) |
| `fflate` | 0.8.3 | MIT | `@openbook/epub` |
| `markdown-it` | 14.3.1 | MIT | `@openbook/importer` |

**Build/dev toolchain** (Vite, TypeScript, Tauri CLI, `@types/*`, etc.) is **not** redistributed in the Windows NSIS artifact and is recorded as build-only in the inventory.

## npm production closure (Slice 4)

The full production closure from the Slice 3 roots is recorded in `npm-production-closure-inventory.json` (regenerate: `node scripts/release-compliance/generate-npm-production-closure.mjs`).

| Metric | Value |
|---|---|
| Total packages | 62 |
| Direct | 12 |
| Transitive | 50 |
| License mix | MIT (57), Apache-2.0 OR MIT (1), MIT OR Apache-2.0 (2), BSD-2-Clause (1), Python-2.0 (1) |

`argparse@2.0.1` is licensed **Python-2.0** (redistribution **conditional**). Per-package integrity digests and LICENSE paths are in the closure inventory.

## Tauri / Cargo production closure (Slice 5)

The locked Cargo closure for `apps/desktop/src-tauri` is recorded in `cargo-production-closure-inventory.json` (regenerate: `node scripts/release-compliance/generate-cargo-production-closure.mjs`; requires `cargo`).

| Metric | Value |
|---|---|
| Total locked packages | 550 |
| First-party | 1 (`openbook-desktop`, Apache-2.0) |
| Direct runtime | 5 (`tauri`, plugins, `serde`, `serde_json`) |
| Direct build | 1 (`tauri-build`, not redistributed) |
| Transitive | 543 |
| Conditional (MPL-2.0) | 5 (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`) |

License metadata comes from `cargo metadata` for each `Cargo.lock` pin. Method: `CARGO-PRODUCTION-INVENTORY-SLICE-5.md`.

## Relationship to the evidence inventory

`evidence-inventory.json` is the structured companion for this notice file. Slices 1–5 populate Gate 5/6 runtimes, Gate 6 fonts, the desktop-path npm production closure, and the Tauri/Cargo crate closure. ROADMAP Phase 0 `FOUNDATION-READY` is declared in `docs/FOUNDATION-READY-DETERMINATION.md`, not by this notices file.

## Non-actions

No dependency installation, dependency upgrade, runtime pin change, font acquisition, release signing, CI change, publishing-engine change, or `FOUNDATION-READY` declaration is performed by this notice update.
