# Evidence Ops Slice 4 — Transitive npm Production Inventory

- **Status:** Slice 4 — production npm closure (direct + transitive) recorded
- **Date:** 2026-09-23
- **Authority:** ADR-0028; `FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`
- **Baseline:** stacks on evidence ops Slice 3 (`docs/foundation-evidence-ops-slice-3-npm-inventory`)
- **FOUNDATION-READY:** **Not declared**

## 1. Purpose

Enumerate the **full production npm closure** reachable from the desktop shipping-path direct dependencies recorded in Slice 3, using `package-lock.json` and each installed package’s published license text.

This does **not** declare `FOUNDATION-READY`, change dependency versions, inventory Cargo/Rust crates, or claim byte-for-byte release certification.

## 2. Scope (authorized)

| In scope | Out of scope |
|---|---|
| Transitive production deps of the Slice 3 roots | Cargo / Rust crates (still unresolved) |
| Regenerable machine-readable closure inventory | Declaring `FOUNDATION-READY` |
| Summary notice updates | Dependency upgrades |
| Updating the Slice 3 “transitive unresolved” bucket | Full LICENSE text dump concatenation |

## 3. Method

1. Roots = the twelve direct production packages from Slice 3.
2. Walk `package-lock.json` `dependencies` / `optionalDependencies` edges while a `node_modules/<name>` entry exists.
3. For each package: version, npm integrity, SPDX/`license` field, path to `LICENSE*` file.
4. Write `docs/release-compliance/npm-production-closure-inventory.json`.
5. Regenerate with:

```bash
node scripts/release-compliance/generate-npm-production-closure.mjs
```

## 4. Results (this baseline)

| Metric | Count |
|---|---|
| Total packages in closure | 62 |
| Direct (Slice 3 roots) | 12 |
| Transitive | 50 |
| Confirmed with LICENSE file | 62 |
| Unresolved in closure | 0 |

License mix: MIT (57), Apache-2.0 OR MIT (1), MIT OR Apache-2.0 (2), BSD-2-Clause (1), Python-2.0 (1 — `argparse@2.0.1`, redistribution **conditional**).

## 5. Still unresolved (carried forward)

- Tauri / Cargo native crate inventory
- Code signing / multi-OS production packaging
- Explicit `FOUNDATION-READY` declaration

## 6. Inventory linkage

- Closure detail: `npm-production-closure-inventory.json`
- Parent inventory: `evidence-inventory.json` (transitive bucket → confirmed, points here)
- Notices: `THIRD-PARTY-NOTICES.md`
