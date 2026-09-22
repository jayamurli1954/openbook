# ADR-0032 Slice 3: Desktop Host Wiring — Implementation Proposal

- **Status:** Implemented on main (PR #106)
- **Date:** 2026-09-22
- **Parent architecture:** ADR-0032 — Gate 10 Desktop Packaging & Release Readiness Architecture
- **Scope:** Packaged OpenBook uses `locatePackagedRuntimes`; missing-runtime reporting through the existing validator/PDF host; no user-Java / system-Typst recovery path
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Wire Gate 5/6 production adapters in the desktop Node publishing host through the Slice 1 locator so a packaged resource tree (Slice 2) is preferred over repository `.cache/`, with fail-closed `missing_runtime` semantics and no system JRE/Typst fallback.

## 2. Slice 3 objective

1. Resolve an effective desktop resource root from:
   - explicit options / `OPENBOOK_DESKTOP_RESOURCE_ROOT`
   - Tauri `resourceDir()` when available and the tree looks assembled
2. Prefer `locatePackagedRuntimes` for EPUBCheck and Typst paths
3. Developer fallback to repo `.cache/` **only** when no packaged resource root is in effect
4. Map locator failures to existing `failureKind: "missing_runtime"` / `TypstRuntimeError` without inviting system Java/Typst installs
5. Keep Vite browser stub behavior unchanged
6. Tests with fake resource roots (no installer)

## 3. Explicit exclusions

- Windows installer / artifact identity (Slice 4)
- Release-readiness automation / FOUNDATION-READY (Slice 5)
- Committing binaries; changing Gate 5/6 pins
- React recover chrome; Gate 11+
- Rewriting EPUBCheck/Typst adapters in `@openbook/validator` / `@openbook/pdf`

## 4. Acceptance criteria

- packaged resource root supplies validator/PDF paths to the host adapters
- incomplete packaged root fails closed as `missing_runtime` (not conformance)
- messages do not recommend installing system Java or Typst
- without a packaged root, developer `.cache/` resolution still works
- desktop tests / CI pass; Draft PR only until explicit merge authorization
