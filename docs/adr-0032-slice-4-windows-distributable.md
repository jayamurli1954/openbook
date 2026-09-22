# ADR-0032 Slice 4: Windows Distributable + Identity — Implementation Proposal

- **Status:** Implemented on main (PR #107)
- **Date:** 2026-09-22
- **Parent architecture:** ADR-0032 — Gate 10 Desktop Packaging & Release Readiness Architecture
- **Scope:** Reviewable Windows x64 package via Tauri NSIS bundle; record artifact checksums and ADR-0028 manifest linkage; unresolved evidence stays unresolved
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Prove that Gate 10 can produce a **reviewable Windows x64 distributable** with recorded identity (name, version, source commit, SHA-256) and ADR-0028 release-artifact-manifest linkage — without code signing, publication, font clearance, or `FOUNDATION-READY`.

## 2. Installer family evaluation

| Family | Result |
|---|---|
| **NSIS** (Tauri `nsis` bundle) | **Selected** — single reviewable `.exe` setup; native Tauri 2 Windows path; no WiX dependency |
| MSI (WiX) | Deferred — heavier toolchain; not required for first reviewable Windows package |
| Portable / directory archive only | Rejected as sole Gate 10 Slice 4 artifact — ADR-0032 asks for a reviewable installer/package with identity |

`tauri.conf.json` `bundle.targets` is pinned to `["nsis"]` for this Gate 10 Windows-first slice.

## 3. Slice 4 objective

1. Pin Windows NSIS as the Gate 10 Slice 4 installer family
2. Provide `recordWindowsDistributableIdentity` under `apps/desktop/src/host/`
3. Hash the produced installer (SHA-256); record application name/version/identifier + source commit
4. Prefer Slice 2 `assembly-evidence.json` for shipped Gate 5/6 runtime pins
5. Write ADR-0028 `release-artifact-manifest.json` with `status: "unresolved"` (fonts stay unresolved)
6. CLI: `scripts/desktop/record-windows-distributable-identity.mjs` and orchestrator `build-windows-distributable.mjs`
7. Tests with fake installer bytes (no native Tauri build required in CI)

## 4. Explicit exclusions

- Code signing, notarization, SmartScreen, store submission
- Publishing artifacts to a release channel
- ADR-0028 production inventory population as complete / font clearance
- Release-readiness automation claiming FOUNDATION-READY (Slice 5)
- macOS/Linux production packaging claims
- Changing Gate 5/6 pins; committing JDK/EPUBCheck/Typst/font binaries or installers
- React UI / autosave / Gate 11+

## 5. Acceptance criteria

- NSIS is the recorded installer family; MSI remains deferred
- identity recording fails closed without artifact / without runtime pins
- written ADR-0028 manifest keeps `release.status` and artifact `status` as `unresolved`
- font evidence references the ADR-0028 font policy without converting to confirmed
- desktop tests / CI pass; Draft PR only until explicit merge authorization
