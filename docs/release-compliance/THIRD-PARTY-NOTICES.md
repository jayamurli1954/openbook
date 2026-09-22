# OpenBook Third-Party Notices

- **Status:** Maintenance mechanism established; **Slice 1 population** records Gate 5/6 shipped-runtime notices from packaging inventories. Bundled-font release clearance remains **unresolved**.
- **Scope:** Release-oriented attribution and provenance evidence.
- **Authority:** `docs/adr/0028-release-compliance-architecture.md`
- **Inventory:** `docs/release-compliance/evidence-inventory.json` (machine-readable companion)
- **Selection:** `docs/FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`

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

## Current evidence status (Slice 1)

| Category | Status |
|---|---|
| Gate 5 EPUBCheck 5.3.0 | Recorded below from packaging inventory/notices |
| Gate 5 Temurin 21 windows-x64 pin / jlink image obligations | Recorded below |
| Gate 6 Typst 0.15.1 windows-x64 | Recorded below |
| Gate 6 bundled fonts | Listed as **unresolved** for release clearance |
| Full npm production dependency tree | Not populated in Slice 1 |
| `FOUNDATION-READY` | **Not declared** |

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

## Bundled fonts (release clearance unresolved)

Gate 6 packaging pins the following OFL-1.1 fonts with SHA-256 digests in `packages/pdf/packaging/inventory.json`:

| Font | Role | Inventory status for release clearance |
|---|---|---|
| Noto Serif Kannada | Body (Kannada) | **Unresolved** |
| Noto Sans Kannada | Headings (Kannada) | **Unresolved** |
| Noto Serif | Body (Latin fallback) | **Unresolved** |
| Noto Sans | Headings (Latin fallback) | **Unresolved** |

Packaging pins and OFL claims from Gate 6 are recorded in the evidence inventory as `status: unresolved` with `redistribution: unresolved`. Per `FONT-PROVENANCE-POLICY.md`, technical usability and packaging success do **not** equal release clearance. A later evidence-ops slice must complete font-by-font disposition (or an explicit waiver) before these can be treated as confirmed for `FOUNDATION-READY`.

## Relationship to the evidence inventory

`evidence-inventory.json` is the structured companion for this notice file. Slice 1 populates Gate 5/6 runtime entries as `confirmed` and font entries as `unresolved`. Broader npm dependency population is deferred.

## Non-actions

No dependency installation, dependency upgrade, runtime pin change, font acquisition, release signing, CI change, publishing-engine change, or `FOUNDATION-READY` declaration is performed by this notice update.
