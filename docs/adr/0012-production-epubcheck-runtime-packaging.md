# ADR-0012: Production EPUBCheck Runtime & Packaging Architecture — Gate 5

* **Status:** Accepted
* **Date:** 2026-09-08
* **Decision owner:** SanMitra Tech Solutions
* **Decision scope:** Production EPUBCheck runtime, distribution, and packaging — Gate 5
* **Depends on:** ADR-0004, ADR-0005, ADR-0009
* **Implementation status:** Not authorized by this ADR

## 1. Context

ADR-0005 accepted that official EPUBCheck remains the authoritative EPUB conformance validator, that users must not install Java, and that production invocation is a bundled private runtime plus an isolated subprocess behind `ValidatorService`. ADR-0005 explicitly did **not** freeze:

* the exact Eclipse Temurin / OpenJDK version;
* whether `jlink` is mandatory;
* the platform binary matrix;
* checksum tooling.

PR #7 landed a packaging **spike**: `@openbook/validator` (`EpubCheckSubprocessAdapter`) plus `docs/EPUBCHECK_PACKAGING_SPIKE.md`. That spike measured a Temurin 21 LTS `jlink` image on Windows x64 and confirmed EPUBCheck 5.3.0 JSON-report subprocess invocation. Production packaging, multi-platform images, and release-governance pins remain open.

ADR-0009 requires `@openbook/epub` to hand off generated publications to `@openbook/validator` / EPUBCheck 5.3.0. Gate 5 must define how that validator runs in a **production** desktop and CI environment without changing EPUB generation, the Book Model, or the HTML engine.

Without this ADR:

* agents might replace official EPUBCheck with an unofficial WASM/JS port;
* a system JRE or first-run download might be introduced;
* `jlink` vs full JRE might be chosen ad hoc per platform;
* runtime/process failures might be indistinguishable from EPUB conformance failures;
* Temurin/EPUBCheck bumps might occur as silent dependency changes.

This ADR records the production architecture. Acceptance does **not** authorize implementation or binary bundling.

## 2. Decision

OpenBook will run **official EPUBCheck 5.3.0** through the existing `ValidatorService` boundary, using a **private Eclipse Temurin 21 LTS** runtime reduced with **`jlink`**, invoked as an **isolated subprocess**, with **per-platform** images and **release-governed** version pins.

```text
Official EPUBCheck 5.3.0 (pinned artifact)
        ↓
Eclipse Temurin 21 LTS → jlink custom runtime image
        ↓
isolated subprocess (argv array, no shell)
        ↓
EpubCheckSubprocessAdapter
        ↓
ValidatorService
        ↓
callers (EPUB engine tests, future desktop/Book Doctor)
```

Application code must not call Java APIs, embed a JVM in the UI process, or download EPUBCheck/JRE at runtime.

## 3. EPUBCheck Version

**Production validator:** official **EPUBCheck 5.3.0**.

* Upstream: W3C EPUBCheck, maintained by the DAISY Consortium.
* Artifact family: official GitHub release zip and/or Maven `org.w3c:epubcheck:5.3.0`.
* License signal: BSD-3-Clause plus upstream third-party notices, which must be preserved at ship.

EPUBCheck validates EPUB **conformance**. It does not certify retailer, store, or accessibility acceptance.

A later official EPUBCheck production release may replace 5.3.0 only as a **recorded version bump** (release-governance event), with checksums, notice regeneration, and fixture re-run. Unofficial forks, TypeScript/WASM ports, or “EPUBCheck-compatible” substitutes must not become the authoritative validator.

## 4. Java Runtime Strategy

**Production strategy:** a **bundled private Java runtime**, not a user-installed JRE and not a runtime downloaded on first launch.

* Authors of the desktop product must not be asked to install Java or set `JAVA_HOME`.
* The runtime is an isolated redistributed component. OpenJDK source is not copied into OpenBook packages.
* Typical Temurin/OpenJDK terms are **GPLv2 with the Classpath Exception**. That does not change OpenBook’s Apache-2.0 license.
* Developer machines used to **build** runtime images may have a JDK; that is a packaging-pipeline exception, not a product requirement.

In-process JNI / embedded JVM in the UI or renderer process is rejected as the production default (ADR-0005).

## 5. Eclipse Temurin Distribution Strategy

**Production distribution family:** **Eclipse Temurin** (Eclipse Adoptium), **21 LTS**.

Rationale:

* ADR-0005 named Temurin as the preferred candidate family.
* The packaging spike evaluated Temurin 21 LTS against EPUBCheck 5.3.0 and obtained a working `jlink` image and smoke tests.

**Pinning rule:**

* Gate 5 freezes the **vendor + major LTS line** (Eclipse Temurin 21).
* The exact Adoptium build (for example `21.0.x+y`), OS, architecture, download URL/Maven coordinate, and SHA-256 are **recorded at the first authorized packaging implementation** and on every subsequent runtime update.
* CPU/security patch updates stay on Temurin 21 LTS unless a new ADR changes the major line.
* Alternate OpenJDK vendors are out of scope unless Temurin cannot meet a recorded platform/license need.

Spike measurements (Windows x64 Temurin 21.0.12.1) are **evidence**, not a Frozen patch pin. Exact build and SHA-256 are recorded when implementation is authorized.

## 6. jlink / Minimized-Runtime Strategy

**Production strategy:** build a **`jlink` custom runtime image** containing only the modules EPUBCheck 5.3.0 requires.

ADR-0005 required empirical evaluation before making `jlink` mandatory. The spike reported:

* full JDK baseline ≈ 328 MB vs `jlink` image ≈ 59 MB (≈ 82% reduction);
* EPUBCheck 5.3.0 executed successfully against valid and invalid fixtures;
* cold-start latency comparable to the full JDK.

**Production rules:**

* `jlink` is the default production packaging path for each supported OS/architecture.
* Module set is derived from `jdeps` on the shipped EPUBCheck 5.3.0 JARs, then documented. Silent module omission that causes runtime failure is a packaging defect.
* If a platform cannot produce a complete `jlink` image, a documented private full JRE remains the fallback (ADR-0005), and that exception must be recorded per platform.
* `jlink` flags (`--strip-debug`, compression, and similar) are implementation details; they must be deterministic per platform image and recorded in the packaging inventory.

This ADR does **not** implement `jlink` CI or commit runtime binaries.

## 7. Runtime Isolation and Reproducibility

**Isolation:**

* EPUBCheck runs in a **child process**.
* Arguments are a discrete argv array (no shell concatenation).
* The renderer/UI must not spawn Java.
* The process needs no network for validation.
* Temporary report files are adapter-owned and cleaned up.

**Reproducibility:**

Every OpenBook release that ships the validator must record:

* EPUBCheck exact version and SHA-256 of the ingested artifact;
* Temurin vendor, version, OS, architecture, and SHA-256 of the ingested JDK used to `jlink`;
* `jlink` module list and image checksum (or equivalent image identity);
* license/notice regeneration date;
* CVE/security review date;
* English, Kannada, and mixed-script EPUB fixture results where the EPUB engine is present.

Identical pinned artifacts + identical `jlink` inputs must produce equivalent runtime images per OS/arch. Host filesystem enumeration and developer JDK leftovers must not leak into the image.

## 8. Windows / macOS / Linux Architectural Boundaries

The production strategy is **three desktop operating systems**, with **per-platform runtime images**.

| Platform | Architectures | Boundary |
| --- | --- | --- |
| Windows | x64 (arm64 later if separately recorded) | Bundled `jlink` image + `epubcheck.jar`; invoke `java.exe` via subprocess |
| macOS | x64 and aarch64 | Same layout inside the app bundle resources; native image per arch |
| Linux | x64 and aarch64 | Same layout inside the Linux package resources; native image per arch |

A platform is **not** “production-supported” until:

1. a platform-specific `jlink` (or recorded fallback JRE) image exists;
2. checksums are recorded;
3. EPUBCheck 5.3.0 smoke tests pass on that platform (valid + invalid fixtures at minimum).

The spike verified Windows x64 empirically. macOS and Linux remain **required architecture**, with native evidence required before ship — not optional product editions by omission.

Cross-compilation vs CI-native `jlink` is an implementation choice. Each image must be built from the Temurin JDK matching that OS/arch.

Desktop file I/O and Tauri command wiring belong to application adapters, not to `@openbook/epub` or `@openbook/html`. `@openbook/validator` remains the TypeScript `ValidatorService` boundary; a future Tauri/Rust host may invoke the same bundled binaries without replacing EPUBCheck or the Book Model.

## 9. ValidatorService Boundary and Subprocess Isolation

**Preserved abstraction:** `ValidatorService` in `@openbook/validator`.

```ts
interface ValidatorService {
  validateEpub(epubPath: string): Promise<ValidationReport>;
}
```

**Rules:**

* Callers depend on `ValidatorService` / `ValidationReport`, not on Java, `jlink`, or EPUBCheck CLI flags.
* The existing `EpubCheckSubprocessAdapter` remains the official-EPUBCheck adapter. Gate 5 may harden options (paths, timeout) under a later implementation authorization; it must not delete the boundary.
* The adapter accepts an EPUB artifact path produced by the OpenBook EPUB engine (or test fixtures).
* It never writes the Book Model, SemanticDocument, SQLite, or HTML publications.
* OpenBook domain validation of `Book` remains a separate layer from EPUBCheck.

JSON report protocol (`epubcheck -j <path>`) remains the structured diagnostic channel identified by the spike. Stdout/stderr are not the primary parse surface.

## 10. Deterministic Handling of Validation, Runtime, and Process Failures

Gate 5 must distinguish **conformance results** from **runtime/process failures**. Both must be deterministic and structured. The application process must not crash because EPUBCheck failed.

| Condition | Treatment |
| --- | --- |
| EPUBCheck completes; 0 fatal/error | `isValid: true`; messages may include warnings/info |
| EPUBCheck completes; fatal or error diagnostics | `isValid: false`; messages mapped from the JSON report |
| Non-zero process exit with JSON report | Map report; `rawExitCode` preserved; `isValid` follows fatals/errors |
| Missing Java executable or missing EPUBCheck JAR | Deterministic adapter/runtime failure (structured report or typed error); not a hang |
| Timeout | Deterministic timeout failure; process aborted |
| Process crash / no JSON / unreadable JSON | Deterministic process-failure diagnostic (for example `PROCESS-ERROR` / FATAL); `isValid: false` |
| Invalid caller path | Deterministic rejection; no shell interpolation |

Callers must be able to tell “this EPUB is non-conformant” from “the validator did not run.” Implementation may use `ValidationReport` fields, typed errors, or both, as long as the policy is documented and tested when implementation is authorized.

Timeouts, max buffer, and temp-directory cleanup remain adapter concerns. They must not depend on wall-clock timestamps embedded in reports for pass/fail identity beyond EPUBCheck’s own elapsed-time field.

## 11. Versioning and Upgrade Policy

| Component | Gate 5 policy |
| --- | --- |
| EPUBCheck | **5.3.0** for this production architecture. Later official releases require a recorded bump, checksums, notices, and fixture re-validation. |
| Temurin | **21 LTS** line. Patch/CPU updates are release-governance events, not silent CI floats. |
| `jlink` image | Regenerated when EPUBCheck or Temurin pins change; image identity recorded. |
| `ValidatorService` | Stable TypeScript contract; breaking report-shape changes need a validator architecture review. |

Runtime and EPUBCheck updates must not be buried in unrelated PRs (Book Model, HTML, editor, SQLite).

First-run or background auto-update of the JRE/EPUBCheck on user machines is **not** the production strategy.

## 12. What This ADR Preserves

* Official EPUBCheck as the authoritative EPUB conformance checker.
* Existing `ValidatorService` / `EpubCheckSubprocessAdapter` abstraction.
* Existing EPUB engine architecture (ADR-0009, ADR-0010) and Gate 1–3 implementation.
* Existing HTML engine architecture (ADR-0011) and Gate 4 implementation.
* Canonical Book Model and SemanticDocument contracts — **no changes**.
* No SQLite, Tiptap/ProseMirror, EPUB packaging, or HTML publishing changes.

## 13. Explicit Non-Goals

This ADR does **not** authorize or decide:

* PDF renderer selection;
* PDF implementation;
* DTP / page layout / pagination;
* typography / HarfBuzz / bundled fonts;
* AI / Ollama;
* unofficial EPUBCheck or WASM replacement of official EPUBCheck;
* **implementation** of runtime packaging, `jlink` CI, or committing JDK/EPUBCheck binaries;
* Tauri command surface beyond restating the existing subprocess boundary;
* changes to Book Model, SemanticDocument, SQLite, Tiptap, EPUB architecture, or HTML architecture.

## 14. Relationship to Existing ADRs

### ADR-0005

ADR-0005 remains the parent decision (official EPUBCheck, no user JRE, subprocess, `ValidatorService`, notices, checksums). ADR-0012 records the **production architecture** ADR-0005 left open: Temurin 21 LTS family, `jlink` as default minimized runtime, EPUBCheck 5.3.0 as the Gate 5 pin, and per-platform support rules.

This ADR does **not** supersede ADR-0005. Exact Temurin patch/build and SHA-256 remain unfrozen until packaging implementation records them.

### ADR-0009 / ADR-0010

EPUB generation stays a downstream Book projection. Gate 5 is how generated EPUBs are **checked**, not how they are built.

### ADR-0011

HTML publishing is a sibling projection and is out of scope for this runtime.

## 15. Alternatives Considered

| Option | Result |
| --- | --- |
| Require a user-installed JRE | Rejected (ADR-0005; beginner-mode desktop) |
| Unofficial JS/WASM EPUBCheck as authority | Rejected |
| In-process JNI / embedded JVM in the UI | Rejected as production default |
| Full private JRE with no `jlink` as the default | Rejected as default after spike size evidence; remains documented fallback |
| Temurin 17 LTS as the production line | Rejected as the Gate 5 proposal; spike and current adapter evidence used 21 |
| Download Temurin/EPUBCheck at first run | Rejected |
| Skip EPUBCheck until a native rewrite exists | Rejected |
| Replace `ValidatorService` with direct Java calls from EPUB/HTML packages | Rejected |
| Fold validator packaging into `@openbook/epub` or `@openbook/html` | Rejected |
| Select a PDF renderer or start DTP in this ADR | Out of scope |

## 16. Implementation Authorization

This ADR is an architecture decision only.

Acceptance of ADR-0012 does **not** by itself authorize implementation.

After ADR-0012 is accepted, a separate implementation instruction may authorize production EPUBCheck runtime packaging. That instruction has **not** been given.

* It does **not** authorize adding binaries, changing `package.json` dependencies, or modifying validator/EPUB/HTML/desktop source.

Any implementation that appears to require changing Book Model, SemanticDocument, EPUB architecture, HTML architecture, SQLite, or Tiptap must **stop**.

## 17. Acceptance Criteria for ADR-0012

ADR-0012 may be marked **Accepted** when the Product Owner approves:

* [x] EPUBCheck 5.3.0 remains the official production validator pin.
* [x] Bundled private Java runtime; no user-installed JRE; no first-run download.
* [x] Eclipse Temurin 21 LTS is the distribution family; exact builds checksummed at packaging time.
* [x] `jlink` is the default minimized-runtime path, with full JRE only as a recorded fallback.
* [x] Subprocess isolation behind existing `ValidatorService`.
* [x] Windows / macOS / Linux per-platform images; unsupported until smoke-tested.
* [x] Deterministic structured handling of validation vs runtime/process failure.
* [x] Version bumps are release-governance events.
* [x] No Book Model / SDM / SQLite / Tiptap / EPUB / HTML architecture changes.
* [x] Implementation of packaging still requires a later explicit authorization.

**Decision:** Accepted. Implementation remains gated and requires a separate explicit implementation instruction. Gate 5 is **not** complete until that implementation is authorized, audited, and merged.

## Related Documents

- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/adr/0005-epubcheck-bundling-java-runtime-isolation.md`
- `docs/adr/0009-epub-3-3-engine-architecture-and-publishing-boundary.md`
- `docs/EPUBCHECK_PACKAGING_SPIKE.md`
- `docs/conversations/2026-09-03-epubcheck-java-tauri.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
