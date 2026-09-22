# ADR-0032 Slice 2: Windows Resource Layout — Implementation Proposal

- **Status:** Implemented on main (PR #105)
- **Date:** 2026-09-22
- **Parent architecture:** ADR-0032 — Gate 10 Desktop Packaging & Release Readiness Architecture
- **Scope:** Copy Gate 5/6 runtime layouts into the Tauri resource tree; packaging-time inventory checksum verification
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Prove that a **Windows x64** desktop packaging step can assemble Gate 5 EPUBCheck/`jlink` and Gate 6 Typst/fonts into the Tauri application resource tree only after inventory-backed checksum verification — without wiring the desktop host locator (Slice 3) or producing an installer (Slice 4).

## 2. Slice 2 objective

1. Define the Tauri resource-root layout matching Slice 1:
   - `<resourceRoot>/validator-runtime/` (Gate 5 layout)
   - `<resourceRoot>/pdf-runtime/` (Gate 6 layout)
2. Packaging-time verification against committed inventories:
   - `packages/validator/packaging/inventory.json`
   - `packages/pdf/packaging/inventory.json`
3. Fail closed on missing evidence, inventory pin mismatch, missing layout files, or font SHA-256 mismatch
4. Record jlink `java` image identity (SHA-256) at packaging time
5. Copy only shippable runtime trees (no JDK downloads / extract scratch)
6. CLI assembler under `scripts/desktop/`; testable TypeScript under `apps/desktop/src/host/`
7. Default production platform pin: **windows-x64** (host override only for tests)

## 3. Explicit exclusions

- Desktop host wiring of `locatePackagedRuntimes` (Slice 3)
- Installer / Tauri bundle identity / ADR-0028 production inventory population (Slice 4)
- Release-readiness automation claiming FOUNDATION-READY (Slice 5)
- Committing JDK, EPUBCheck, Typst, or font binaries
- Changing EPUBCheck / Temurin / Typst version pins
- System Java/Typst fallback or runtime download
- macOS/Linux production packaging claims
- React UI / autosave / Gate 11+

## 4. Acceptance criteria

- assemble fails when inventories disagree with `build-evidence.json` or on-disk hashes
- assemble succeeds for a complete fake windows-x64 layout and writes destination trees + assembly evidence
- destination layout is discoverable by Slice 1 `locatePackagedRuntimes({ resourceRoot })`
- binaries remain gitignored under `src-tauri/resources/`
- desktop tests / CI pass; Draft PR only until explicit merge authorization
