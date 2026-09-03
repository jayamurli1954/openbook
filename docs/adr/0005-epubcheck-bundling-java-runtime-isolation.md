# ADR-0005 — EPUBCheck Bundling, Java Runtime Isolation & Compliance

- **Status:** Accepted
- **Date:** 2026-09-03
- **Decision owner:** SanMitra Tech Solutions
- **Not Frozen:** exact Temurin/runtime version, `jlink` adoption after measurement, platform binary matrix, checksum tooling, and any future WASM/native packaging of official EPUBCheck.

## Context

OpenBook must validate generated EPUB files against the EPUB specifications. EPUBCheck is the official conformance checker for EPUB publications. It is maintained by the DAISY Consortium on behalf of W3C, is distributed as a command-line tool or Java library, and the current production-ready release is **5.3.0**, which checks EPUB 2 and EPUB 3 (including EPUB 3.3). EPUBCheck 5.3.0 requires a Java 8 or greater runtime.

OpenBook is a local-first desktop product whose preferred shell is Tauri 2.x. Requiring authors to install a system JRE would violate the beginner-mode product goal. Replacing official EPUBCheck with an unofficial JavaScript/WASM port would risk silent divergence from the conformance tool the EPUB ecosystem actually uses.

This ADR promotes the decisions recorded in `docs/conversations/2026-09-03-epubcheck-java-tauri.md` into project knowledge. It does **not** authorize implementing the Tauri application, selecting a PDF renderer, or bundling a Java runtime in this repository yet.

## Decision

Official EPUBCheck remains the authoritative EPUB conformance validator. OpenBook will not require a user-installed Java runtime. A private bundled runtime will execute EPUBCheck through an isolated subprocess. Application code talks only to a `ValidatorService` adapter.

```text
Official EPUBCheck 5.3.0
        ↓
bundled / private Java runtime
        ↓
Tauri / Rust subprocess
        ↓
ValidatorService adapter
        ↓
Book Doctor / validation UI
```

Expanded product path:

```text
React + TypeScript
        ↓
Tauri / Rust
        ↓
ValidatorService
        ↓
EPUBCheck Adapter
        ↓
subprocess
        ↓
Bundled Java Runtime + EPUBCheck
        ↓
Validation Report
        ↓
Book Doctor
```

### 1. Official EPUBCheck remains authoritative

- Use **EPUBCheck 5.3.0** (or a later official production-ready release after a recorded version bump).
- SPDX signal for EPUBCheck itself: **BSD-3-Clause**. The distributed archive also contains third-party notices that must be preserved.
- EPUBCheck validates EPUB **conformance**. It does not certify retailer, store, or accessibility acceptance. OpenBook may add separate publishing-quality and accessibility checks.
- An unofficial TypeScript/JS/WASM port **must not** replace official EPUBCheck as the authoritative validator merely to reduce installer size.

### 2. No user-installed Java

Authors and operators of the normal desktop product must not be asked to install Java, configure `JAVA_HOME`, or manage a system JRE.

A developer-only exception may exist for contributors building the validator packaging pipeline. That exception is not a product requirement.

### 3. Bundled / private Java runtime

- Bundle a private Java runtime with the desktop distribution.
- Preferred candidate family: **Eclipse Temurin** (or another OpenJDK distribution whose exact version, notices, and redistribution terms are recorded before first ship).
- Typical OpenJDK/Temurin terms are **GPLv2 with the Classpath Exception**. That is a third-party license. It does **not** change OpenBook's Apache-2.0 project license, and it is not a reason to treat the Java runtime as OpenBook source.
- The runtime is an isolated redistributed component. Do not copy OpenJDK source into OpenBook packages.
- Exact major/minor version, CPU architectures, and vendor choice remain **pending measurement and license inventory**. Do not freeze Temurin 17 vs 21 in this ADR.

### 4. Isolated subprocess, not in-process embedding

Tauri/Rust invokes EPUBCheck through an **isolated subprocess**.

Reasons:

- process crash isolation;
- clearer component boundary for updates;
- simpler mapping of stdin/stdout/files to validation reports;
- architectural (not automatic legal) separation from the Apache-2.0 application.

A subprocess boundary does **not** waive redistribution, notice, or source-disclosure obligations of the bundled components. Those must be assessed from the exact artifacts shipped.

Do not spawn EPUBCheck from renderer/UI JavaScript. Do not download EPUBCheck or a JRE at first run as the production strategy.

### 5. ValidatorService adapter

All product code depends on a `ValidatorService` interface (name may vary; the boundary must exist).

The adapter:

- accepts an EPUB artifact path/bytes produced by the OpenBook EPUB engine;
- returns a structured validation report;
- never writes the Book Model;
- remains replaceable if a later official packaging form (native/WASM of **official** EPUBCheck) is proven equivalent.

OpenBook structural validation of the Book Model is a **separate** layer and must not be conflated with EPUBCheck.

Validation layers:

1. OpenBook Book Model / domain validation
2. OpenBook publishing-quality and accessibility checks
3. Official EPUBCheck (EPUB conformance)

### 6. `jlink` evaluation

`jlink` **shall be evaluated** as the build-time mechanism to produce a minimized custom runtime image containing only modules EPUBCheck needs.

`jlink` is **not** frozen as mandatory in this ADR. A proof of concept must measure:

- image size vs a full JRE;
- startup time;
- module completeness for EPUBCheck 5.3.0;
- Windows / macOS / Linux reproducibility;
- effect on license/notice files.

If `jlink` fails those tests, a documented full/private JRE remains acceptable.

### 7. Licensing and third-party notices

| Component | Project license relationship | Required artefacts before first ship |
| --- | --- | --- |
| OpenBook application code | Apache-2.0 | `LICENSE`, `NOTICE` |
| EPUBCheck 5.3.0 | BSD-3-Clause plus its third-party notices | upstream LICENSE/NOTICE copied into OpenBook third-party notices |
| Bundled Java runtime | typically GPLv2 + Classpath Exception plus distribution notices | vendor license, NOTICE, and any required source offer recorded |
| Transitive JAR/native libs inside EPUBCheck | various | inventory from the shipped zip/Maven artifact |

Release packaging must include:

- `THIRD-PARTY-NOTICES.txt` (or equivalent) covering EPUBCheck, the runtime, and their transitives;
- per-component license files under `licenses/` when that is the clearest preservation method.

Apache-2.0 for OpenBook does **not** relicense EPUBCheck or the JRE.

### 8. Security updates, versions, checksums

Every official OpenBook release that ships the validator must record:

- EPUBCheck exact version;
- Java runtime vendor, version, OS, and architecture;
- download URLs or Maven coordinates used;
- cryptographic checksums (at least SHA-256) of the ingested artifacts;
- CVE/security review date for EPUBCheck and the runtime;
- license/notice regeneration date;
- EPUB regression fixture results (English, Kannada, mixed-script at minimum).

Runtime and EPUBCheck updates are **release-governance events**, not silent dependency bumps.

### 9. Platforms

The production strategy must be designed for **Windows, macOS, and Linux**. Per-platform runtime images are expected. A platform is not “supported” until its image, checksums, and a smoke test of EPUBCheck 5.3.0 are recorded.

### 10. Future WASM / native investigation

Investigating whether **official** EPUBCheck can later be packaged as a smaller native or WASM build is allowed as research.

It is **not** an MVP dependency. It must not delay the bundled-JRE subprocess path. Equivalence to official EPUBCheck releases must be demonstrated before any replacement is proposed in a new ADR.

## Alternatives considered

| Option | Result |
| --- | --- |
| Require user-installed Java | Rejected for the desktop product |
| Unofficial JS/WASM EPUBCheck as the authority | Rejected |
| In-process JNI / embedded JVM in the UI process | Rejected as the default; subprocess isolation is required |
| Skip EPUBCheck until a native rewrite exists | Rejected |
| Freeze a PDF renderer in this ADR | Out of scope; see ADR-0004 |

## What this ADR does not authorize

- Creating the Tauri application
- Selecting Typst, pdf-lib, Chromium/Puppeteer, or any PDF renderer
- Adding Java, EPUBCheck binaries, or Temurin artifacts to this repository
- Treating Accepted as Frozen for runtime versions

## Acceptance criteria (architecture)

This decision is **Accepted** when all of the following are true in documentation:

1. Official EPUBCheck is the only authoritative EPUB conformance checker.
2. Users are not required to install Java.
3. Production invocation is bundled private runtime + isolated subprocess.
4. Product code depends on `ValidatorService`, not on Java APIs.
5. `jlink` is an evaluation item with measured acceptance, not a silent default.
6. Licenses and notices of EPUBCheck and the runtime will be preserved before ship.
7. Security/CVE review, checksums, and Windows/macOS/Linux packaging are required before ship.
8. WASM/native official-EPUBCheck packaging remains future investigation only.

Implementation and first binary ship are a later engineering gate, not this ADR.

## Follow-up actions

1. Record exact EPUBCheck 5.3.0 artifact coordinates and SHA-256 when packaging work begins.
2. Evaluate Temurin (or alternative) LTS versions against EPUBCheck 5.3.0.
3. Build a `jlink` proof of concept and measure size/startup/completeness.
4. Define checksum and reproducibility controls in the release process.
5. Add English, Kannada, and mixed-script EPUB validation fixtures when an EPUB engine exists.
6. Do not start Tauri/React implementation solely because this ADR exists.

## Related documents

- `docs/conversations/2026-09-03-epubcheck-java-tauri.md`
- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/PUBLISHING_ENGINE_TECHNOLOGY_SCORECARD.md`
- `PROJECT-CONTEXT.md`
- `docs/FOUNDATION-READINESS-REPORT.md`
