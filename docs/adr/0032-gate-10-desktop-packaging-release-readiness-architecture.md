# ADR-0032: Gate 10 — Desktop Packaging & Release Readiness Architecture

- **Status:** Accepted; Slice 5 in progress
- **Date:** 2026-09-22
- **Gate:** Gate 10
- **Area:** Desktop / Packaging / Release Readiness
- **Depends on:** ADR-0005, ADR-0007, ADR-0012, ADR-0013, ADR-0023, ADR-0028, ADR-0030
- **Supersedes:** None
- **Implementation authorization:** Slice 5 (release-readiness verification; no FOUNDATION-READY)

## 1. Context

OpenBook has completed Gates 1–9, ADR-0028’s evidence mechanisms, ADR-0029 project-package persistence, and ADR-0031 autosave/crash-recovery sequencing. The desktop product can author, save a filesystem project, export EPUB/HTML/PDF through native Save As, and invoke Gate 5 EPUBCheck plus Gate 6 Typst **in a developer/CI layout**.

That developer layout is not a shippable product:

```text
resolveProductionRuntime()        → OPENBOOK_VALIDATOR_RUNTIME_ROOT
                                  → <repo>/.cache/validator-runtime

resolveProductionTypstRuntime()   → OPENBOOK_PDF_RUNTIME_ROOT
                                  → <repo>/.cache/pdf-runtime
```

A packaged Tauri application has no repository root and must not require contributors’ `.cache/` trees, a user-installed JRE, a user-installed Typst, or a first-run network download.

Gate 5 (ADR-0012) remains the authoritative EPUBCheck / Temurin 21 / `jlink` architecture. Gate 6 (ADR-0013) remains the authoritative Typst 0.15.1 architecture. ADR-0028 remains the authoritative release/compliance evidence layer. Gate 10 does not replace those decisions. It defines how the **desktop distributable** locates, ships, and reports those already-pinned runtimes.

The ChatGPT master execution outline records Gate 10 as packaging/release readiness after Gate 9, with Windows packaging, private Java, EPUBCheck, checksums, runtime discovery, failure reporting, no network for validation, and no user-installed Java.

## 2. Decision

OpenBook will implement Gate 10 as a **desktop packaging architecture**: the Tauri host ships the application together with the Gate 5 and Gate 6 production runtimes as application-owned resources, discovered fail-closed, with structured failure distinct from EPUB conformance.

```text
Packaged OpenBook Desktop
      │
      ├── Tauri application (ADR-0007)
      ├── native filesystem / Save-As host (ADR-0030)
      ├── bundled EPUBCheck 5.3.0 + Temurin 21 jlink (ADR-0012)
      ├── bundled Typst 0.15.1 + renderer fonts (ADR-0013)
      └── ADR-0028 release evidence associated with the artifact
```

### 2.1 Packaged resource locator (the missing boundary)

Developer/CI lookup through repo `.cache/` remains valid for package tests and Gate 5/6 CI jobs. A **packaged desktop** must resolve runtimes from an application resource root, not from a source-tree cache.

Lookup order for a packaged host:

1. explicit test/CI override (`OPENBOOK_VALIDATOR_RUNTIME_ROOT` / `OPENBOOK_PDF_RUNTIME_ROOT`, or an equivalent injected resource root);
2. the Tauri application resource directory (implementation path is a later slice);
3. nowhere else.

The packaged locator must **not**:

- walk up the filesystem looking for a git repository;
- use a system `java`, `JAVA_HOME`, or system Typst as a default;
- download Temurin, EPUBCheck, Typst, or fonts at runtime;
- treat a missing runtime as an EPUB conformance failure.

Missing or incomplete bundled binaries are a **runtime/process failure** (`missing_runtime` or equivalent), consistent with ADR-0012 §10.

### 2.2 What is bundled

A Gate 10 Windows desktop distributable must include:

| Component | Authority | Notes |
|---|---|---|
| OpenBook Studio application | ADR-0007 | Tauri 2.11.5 shell + React UI |
| EPUBCheck 5.3.0 + `jlink` image | ADR-0012 | Official EPUBCheck; Temurin 21 LTS; isolated subprocess |
| Typst 0.15.1 | ADR-0013 | Isolated subprocess; `--ignore-system-fonts` |
| Renderer fonts used by Gate 6 packaging | ADR-0013 + ADR-0028 | Shipped as renderer resources; **not** thereby release-cleared |

Publishing engines, the Book Model, project-package Save/Open, and autosave stay unchanged. Packaging copies already-built Gate 5/6 layouts into the app resource tree; it does not invent a second validator or PDF engine.

### 2.3 Windows-first production packaging

The first Gate 10 production packaging target is **Windows x64**.

Rationale: the EPUBCheck packaging spike and subsequent Gate 5 inventory already have Windows x64 empirical evidence; the current maintainer host is Windows. ADR-0012 still requires per-platform native images before a platform is “production-supported.”

| Platform | Gate 10 disposition |
|---|---|
| Windows x64 | First packaging implementation target |
| Windows arm64 | Later; requires recorded native evidence |
| macOS x64 / aarch64 | Architecture required; **Packaging Analysis Only** until native CI evidence |
| Linux x64 / aarch64 | Architecture required; **Packaging Analysis Only** until native CI evidence |

Gate 10 must not declare macOS or Linux production-supported by omitting native evidence.

The exact Windows installer family (NSIS, MSI, or another Tauri bundle target) is an implementation-slice evaluation, not frozen by this ADR. The architecture requires a reviewable Windows distributable with recorded identity (name, version, source commit, checksum).

### 2.4 Checksums and identity

Packaging-time assembly must verify ingested Gate 5/6 artifacts against the committed inventories (`packages/validator/packaging/inventory.json`, `packages/pdf/packaging/inventory.json`) before they are copied into a bundle.

Every Gate 10 distributable must be identifiable for ADR-0028:

- source commit;
- application version recorded in the bundle;
- SHA-256 (or equivalent) of the produced installer/package;
- runtime pins actually shipped (EPUBCheck, Temurin/`jlink` image identity, Typst);
- associated third-party notices;
- font-evidence status (confirmed / unresolved / not-applicable — never inferred to confirmed).

Runtime checksum verification of the shipped `jlink` image is required at packaging time. Host-side re-verification on every launch is a later-slice choice and must not become a reason to fall back to a system JRE.

### 2.5 Failure reporting

Packaged validation/PDF must preserve the existing distinction:

| Condition | Treatment |
|---|---|
| EPUBCheck completes with errors | Conformance failure (`isValid: false`) |
| EPUBCheck/Typst binaries missing from the bundle | Runtime failure (`missing_runtime` / equivalent) |
| Subprocess crash, timeout, unreadable report | Process failure, not silent success |
| User-installed Java present but bundle missing | Still a runtime failure; system Java is not a substitute |

The UI/host may surface these as user-visible errors. It must not invite the user to install Java or Typst as the recovery path.

### 2.6 Offline validation

Validation of a generated EPUB must not require network access. Runtime discovery and subprocess invocation are local filesystem operations. First-run or background download of JRE/EPUBCheck/Typst is rejected (ADR-0005, ADR-0012).

### 2.7 Relationship to ADR-0028

Gate 10 **consumes** the ADR-0028 evidence inventory, third-party notices, font policy, artifact manifest, and verification outcomes. It does not replace them and does not populate a complete production inventory by assertion.

Shipping Typst’s OFL renderer fonts in a desktop bundle does **not** by itself make those fonts release-cleared. Font-by-font disposition remains evidence-dependent per ADR-0028 Slice 3. Unresolved font evidence stays unresolved on the release record.

Gate 10 completion does **not** declare `FOUNDATION-READY`, `FOUNDATION-GOVERNANCE-READY`, byte-for-byte reproducibility, or project-wide release/compliance certification.

### 2.8 Host vs domain

Desktop packaging, Tauri bundle configuration, and resource-path discovery belong to `apps/desktop` (and packaging scripts that feed it).

`@openbook/validator` and `@openbook/pdf` remain the subprocess/runtime adapters. They may accept an injected resource root so tests stay independent of Tauri. They must not import React, DOM, or Tauri APIs.

`@openbook/epub`, `@openbook/html`, `@openbook/book-model`, and DesktopStudioCoordinator publishing policy are unchanged.

## 3. Explicit non-authorizations

This ADR does **not** authorize (Slices 1–5 are separately authorized when granted):

- code signing, notarization, SmartScreen, or store submission;
- committing JDK, EPUBCheck, Typst, font binaries, or installers;
- changing EPUBCheck, Temurin, or Typst version pins;
- using a system JRE or system Typst as a production fallback;
- first-run or auto-update download of runtimes;
- declaring macOS/Linux production-supported;
- populating ADR-0028 production inventory as complete;
- declaring fonts release-cleared;
- declaring `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY` (Slice 5 verification must keep these false);
- Gate 11 security review, Gate 12 determinism, Gates 13–16;
- React crash-recovery dialog chrome;
- cloud sync, DTP, or AI/Ollama;
- Book Model, publishing-engine, project-package, or autosave redesign;
- removing SQLite.

## 4. Alternatives considered

| Alternative | Result |
|---|---|
| Keep resolving runtimes only from `<repo>/.cache/` | Rejected; a shipped app has no repo root. |
| Require the user to install Java and/or Typst | Rejected (ADR-0005 / beginner-mode desktop). |
| Download runtimes on first launch | Rejected (ADR-0012). |
| Unofficial WASM EPUBCheck to avoid bundling Java | Rejected (ADR-0005 / ADR-0012). |
| Treat Gate 10 as a rewrite of ADR-0028 | Rejected; evidence layer already exists. |
| Ship all desktop OS/arch in the first slice | Rejected; ADR-0012 requires native evidence per platform. Windows x64 is first. |
| Freeze NSIS vs MSI in this ADR | Rejected; installer family is an implementation evaluation. |

## 5. Acceptance criteria

Architecture acceptance confirms that this ADR:

1. keeps ADR-0012 and ADR-0013 authoritative for how runtimes are built;
2. defines a packaged-resource locator distinct from the developer `.cache/` layout;
3. forbids system Java/Typst fallback and runtime downloads;
4. preserves conformance vs runtime/process failure reporting;
5. requires packaging-time checksum verification against committed inventories;
6. takes Windows x64 as the first production packaging target without claiming other OS production support;
7. consumes ADR-0028 evidence without asserting production certification or font clearance;
8. leaves implementation sliced and separately authorized.

## 6. Implementation sequencing after acceptance

Following acceptance, implementation must be separately authorized, one slice at a time:

1. **Packaged resource locator contract** — injectable resource-root discovery for EPUBCheck/`jlink` and Typst/fonts, fail-closed, no system fallback, tests with fake roots (no installer). **Slice 1 (done).**
2. **Windows resource layout** — copy Gate 5/6 runtime layouts into the Tauri resource tree; packaging-time inventory checksum verification. **Slice 2 (done).**
3. **Desktop host wiring** — packaged OpenBook uses the locator; missing-runtime reporting through the existing validator/PDF host; no user-Java recovery path. **Slice 3 (done).**
4. **Windows distributable + identity** — produce a reviewable Windows package via Tauri NSIS bundle; record artifact checksums and ADR-0028 manifest linkage (unresolved evidence stays unresolved). **Slice 4 (done).**
5. **Release-readiness verification** — automated checks that the package contains runtimes, validation does not require network, and failure kinds remain distinct. No `FOUNDATION-READY` declaration. **Slice 5 (authorized).**

## 7. Governance

Normal branch → Draft PR → CI/DCO → review → explicit Ready → explicit merge authorization (`I authorize merge PR #XX`).

This ADR records the accepted architecture. Slice 5 is separately authorized. Passing Slice 5 does not declare FOUNDATION-READY.
