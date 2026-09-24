# Evidence Ops Slice 5 — Tauri / Cargo Production Inventory

- **Status:** Slice 5 — Cargo production closure recorded from `Cargo.lock`
- **Date:** 2026-09-24
- **Authority:** ADR-0028; `FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`
- **Baseline:** `main` at `0c10929` (post–Slice 4 / PR #113)
- **FOUNDATION-READY:** Declared separately in `FOUNDATION-READY-DETERMINATION.md`; this Cargo inventory is not that declaration

## 1. Purpose

Enumerate the **Cargo crate closure** locked for the OpenBook desktop Tauri host (`apps/desktop/src-tauri`), attach SPDX license metadata from `cargo metadata`, and record redistribution dispositions.

This does **not** declare `FOUNDATION-READY`, change crate versions, perform code signing, or claim multi-OS production packaging.

## 2. Scope (authorized)

| In scope | Out of scope |
|---|---|
| All packages in `apps/desktop/src-tauri/Cargo.lock` | Declaring `FOUNDATION-READY` |
| Direct runtime deps from `Cargo.toml` + transitive closure | Code signing / SmartScreen / notarization |
| Direct build dep `tauri-build` classified as build-only | macOS / Linux production packaging certification |
| Regenerable machine-readable inventory | Byte-for-byte reproducible signed release claims |

## 3. Method

1. Parse `Cargo.lock` package identities (name, version, source, checksum).
2. Run `cargo metadata --format-version 1` against `apps/desktop/src-tauri/Cargo.toml` and map `license` fields to locked versions.
3. Classify:
   - `openbook-desktop` — first-party Apache-2.0
   - `tauri`, `tauri-plugin-sql`, `tauri-plugin-dialog`, `serde`, `serde_json` — direct runtime
   - `tauri-build` — direct build (`redistribution: not-applicable`)
   - all others — transitive
4. Redistribution: `permitted` for typical permissive dual-licenses; **`conditional`** for standalone **MPL-2.0** crates (weak copyleft / file-level obligations).
5. Write `docs/release-compliance/cargo-production-closure-inventory.json`.
6. Regenerate with:

```bash
node scripts/release-compliance/generate-cargo-production-closure.mjs
```

(Requires a working Rust/`cargo` toolchain.)

## 4. Results (this baseline)

| Metric | Count |
|---|---|
| Total locked packages | 550 |
| First-party | 1 (`openbook-desktop`) |
| Direct runtime | 5 |
| Direct build | 1 (`tauri-build`) |
| Transitive | 543 |
| Confirmed with license metadata | 550 |
| Unresolved licenses | 0 |
| Conditional redistribution (MPL-2.0) | 5 (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`, `selectors`) |

License mix is dominated by MIT / Apache-2.0 dual-licensing, with smaller sets of BSD, Zlib, Unicode-3.0, ISC, MPL-2.0, and similar permissive/weak-copyleft terms (see closure inventory `summary.byLicense`).

## 5. Shipping notes

1. Retain applicable copyright and license notices for redistributed crates (Tauri/desktop binary).
2. For the five MPL-2.0 crates, comply with MPL-2.0 file-level obligations if those files are modified; unmodified binary redistribution with notices remains the baseline disposition here.
3. Changing `Cargo.lock` / pins requires regenerating this inventory.

## 6. Still open after this slice

- Optional code signing / multi-OS production packaging (waived for Phase 0; see determination)
- Gate 10 verification continues to report `foundationReady: false` in packaging artifacts by design

Phase 0 `FOUNDATION-READY` is declared in `docs/FOUNDATION-READY-DETERMINATION.md`.

## 7. Inventory linkage

- Closure detail: `cargo-production-closure-inventory.json`
- Parent inventory: `evidence-inventory.json` (Cargo bucket → confirmed / conditional)
- Notices: `THIRD-PARTY-NOTICES.md`
