# ADR-0032 Slice 1: Packaged Resource Locator — Implementation Proposal

- **Status:** Implementation authorized by maintainer direction (2026-09-22); implementation in progress
- **Date:** 2026-09-22
- **Parent architecture:** ADR-0032 — Gate 10 Desktop Packaging & Release Readiness Architecture
- **Scope:** Injectable resource-root discovery for EPUBCheck/`jlink` and Typst/fonts; fail-closed; tests with fake roots
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Prove that a packaged desktop can resolve Gate 5/6 runtimes from an injected application resource root without a repository `.cache/` tree, a system JRE, or a system Typst.

## 2. Slice 1 objective

1. `locatePackagedRuntimes` under `apps/desktop/src/host/`
2. layout contract: `<resourceRoot>/validator-runtime` and `<resourceRoot>/pdf-runtime`
3. explicit roots / existing env overrides win; otherwise fail closed
4. `resolveProductionRuntime` / `resolveProductionTypstRuntime` skip repo walk when a runtime root is injected
5. missing/incomplete layouts report `failureKind: "missing_runtime"` (not EPUB conformance)

## 3. Explicit exclusions

- Tauri resource-path wiring (Slice 3)
- copying runtimes into a bundle / installer (Slices 2 and 4)
- packaging-time checksum verification (Slice 2)
- ADR-0028 production inventory population
- React recover chrome, Gate 11+

## 4. Acceptance criteria

- fake resource root locates both runtimes under that root
- missing root / incomplete layouts fail closed
- no PATH / system Java / system Typst fallback
- desktop + validator + pdf tests / CI pass
- diff stays within Slice 1
