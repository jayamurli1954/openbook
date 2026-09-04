# OpenBook — EPUBCheck 5.3.0 Packaging Spike Report

- **Document:** `docs/EPUBCHECK_PACKAGING_SPIKE.md`
- **Status:** Complete / Evaluated
- **Date:** 2026-09-04
- **Governing Decision:** [ADR-0005](file:///d:/MyProjects/openbook/docs/conversations/2026-09-03-epubcheck-java-tauri.md) — EPUBCheck Bundling, Java Runtime Isolation & Compliance
- **Engineering Agent:** Antigravity

---

## 1. Objective

This engineering spike evaluates and documents the technical feasibility, packaging footprints, startup characteristics, licensing/provenance compliance, and architectural integration boundary of packaging **official EPUBCheck 5.3.0** behind an isolated OpenBook `ValidatorService` using a private bundled Java runtime created via `jlink`.

```text
Official EPUBCheck 5.3.0
           ↓
Private bundled Java runtime (jlink)
           ↓
Isolated subprocess execution
           ↓
ValidatorService adapter boundary
```

---

## 2. ADR-0005 Relationship & Governance

[ADR-0005](file:///d:/MyProjects/openbook/docs/conversations/2026-09-03-epubcheck-java-tauri.md) is already Accepted on `main` and establishes:
1. Official EPUBCheck is the authoritative EPUB 3.3 conformance validator (unofficial JavaScript/WASM ports are rejected as authoritative validators).
2. End users must **not** be required to install Java manually on their machines (`JAVA_HOME` dependency rejected).
3. The preferred production strategy is an isolated subprocess invoking a private bundled runtime.
4. `jlink` must be evaluated empirically before freezing the packaging architecture.
5. Exact runtime versions and platform packaging matrices remain open until evidence is produced.

This spike provides empirical evidence for the implementation choices established by ADR-0005 and identifies the remaining items that must be frozen before production packaging.

---

## 3. Upstream Artifact & Provenance

### 3.1 EPUBCheck 5.3.0
- **Upstream Project:** Official W3C EPUBCheck, maintained by the DAISY Consortium on behalf of the World Wide Web Consortium (W3C).
- **Release:** Version `5.3.0` (Production-ready release supporting EPUB 2.0.1, 3.0.1, 3.2, and 3.3).
- **Artifact Source URL:** `https://github.com/w3c/epubcheck/releases/download/v5.3.0/epubcheck-5.3.0.zip`
- **Maven Coordinates:** `org.w3c:epubcheck:5.3.0`
- **Upstream License:** BSD-3-Clause (accompanied by third-party component licenses in distribution).

### 3.2 Evaluated Candidate Java Runtime (Eclipse Temurin 21 LTS)
- **Vendor / Distribution:** Eclipse Adoptium — Eclipse Temurin OpenJDK.
- **Candidate Release Evaluated:** OpenJDK 21 LTS GA (`openjdk version "21.0.12.1" 2026-08-18 LTS`, build `21.0.12.1+1-LTS`, Hotspot).
- **Target Architecture:** Windows x64 (tested); macOS and Linux x64/aarch64 (packaging analysis).
- **Pinned Artifact Source URL:** `https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.12.1%2B1/OpenJDK21U-jdk_x64_windows_hotspot_21.0.12.1_1.zip` (pinned candidate for spike repeatability).
- **License:** GNU General Public License version 2 with Classpath Exception (GPLv2+CE).

---

## 4. Cryptographic Checksums & Verification

All checksums were computed locally from downloaded release artifacts using SHA-256 and compared against authoritative upstream evidence:

| Artifact | Filename | Size (bytes) | Locally Computed SHA-256 | Upstream Verification Status |
|---|---|---|---|---|
| **EPUBCheck 5.3.0 Distribution** | `epubcheck-5.3.0.zip` | 33,071,108 (~31.54 MB) | `6c07e68584b2e2ce2f89fe06e1246dfead3eb36b46b340e7d93524f29dcff6c5` | **Verified Match** (official W3C/DAISY release hash) |
| **Temurin JDK 21 LTS (Windows x64)** | `temurin-21-jdk.zip` | 205,073,461 (~195.57 MB) | `f9d6e191ab098c0d416e7d588a24420a8621cd2f4720dab2459b8b7b2d2d8b4e` | **Verified Match** (Adoptium API metadata hash) |

---

## 5. Licensing & Third-Party Notice Inventory

### 5.1 OpenBook Core
- Licensed under **Apache-2.0**.
- Product code interacts with the validator solely via process execution (`execFile`/subprocess) and structured JSON interchange.

### 5.2 EPUBCheck 5.3.0 Distribution Licenses
EPUBCheck 5.3.0 is licensed under **BSD-3-Clause**. The distribution bundle contains 40 JAR files with the following third-party components:
- **Saxon-HE (Mozilla Public License 2.0):** XML/XSLT processing.
- **Jing / Trang (BSD-3-Clause):** RELAX NG validation.
- **Xerces-J (Apache-2.0):** XML parsing and schema validation.
- **Commons Compress / IO (Apache-2.0):** Zip/container extraction.
- **Guava (Apache-2.0):** Utility libraries.
- **SLF4J (MIT):** Logging abstraction.
- **W3C Schema & DTD files (W3C Software Notice and License):** Standard vocabularies.

### 5.3 Java Runtime (OpenJDK / Eclipse Temurin)
- Distributed under **GPLv2 with Classpath Exception**.
- **Redistribution Compliance:** Because OpenBook ships the private runtime as an independent, isolated binary distribution alongside the application without modifying Java runtime sources, bundling is permitted under standard OpenJDK distribution terms.
- **Redistribution Obligations:** OpenBook release bundles must include:
  1. The Java `LICENSE` and `ASSEMBLY_EXCEPTION` files.
  2. The `THIRD_PARTY_README` / `legal/` notices folder provided by Adoptium.
  3. EPUBCheck's `LICENSE.txt` and third-party notices.

---

## 6. `jdeps` Analysis & `jlink` Module Specification

### 6.1 Complete JAR Dependency Analysis
`jdeps` was executed across all 40 JAR files in the EPUBCheck 5.3.0 distribution:
```powershell
jdeps --multi-release 21 --print-module-deps --ignore-missing-deps epubcheck.jar lib/*.jar
```
Raw detected Java SE module dependencies:
```text
java.base, java.compiler, java.desktop, java.security.jgss, java.sql, jdk.unsupported
```

### 6.2 Complete Runtime Module Selection
To support dynamic XML service providers, Saxon XSLT/XPath engines, RELAX NG schema loading, Schematron compilation, character encodings, and zip processing, the complete module set passed to `jlink` was:
```text
java.base,
java.compiler,
java.desktop,
java.security.jgss,
java.sql,
jdk.unsupported,
java.xml,
java.logging,
java.naming,
java.management,
jdk.xml.dom,
jdk.crypto.ec,
jdk.zipfs,
jdk.localedata
```

### 6.3 `jlink` Optimization Flags
```powershell
jlink `
  --module-path "$JdkHome/jmods" `
  --add-modules "$Modules" `
  --output "$OutputDir" `
  --strip-debug `
  --no-header-files `
  --no-man-pages `
  --compress=zip-6
```

---

## 7. Empirical Measurements Report

Measurements captured on **Windows 11 x64**:

| Metric | Full JDK Baseline | `jlink` Minimal Runtime | Variance / Reduction |
|---|---|---|---|
| **Raw Directory Size** | 343,823,876 bytes (327.90 MB) | **61,936,060 bytes (59.07 MB)** | **-82.0% size reduction** |
| **Unpacked EPUBCheck 5.3.0 Size** | 36,263,890 bytes (34.58 MB) | 36,263,890 bytes (34.58 MB) | N/A |
| **Total Validator Payload (Runtime + App)** | 380,087,766 bytes (362.48 MB) | **98,199,950 bytes (93.65 MB)** | **-74.2% total reduction** |
| **Cold Process Execution Latency (avg 5 runs)** | 6,534 ms | **6,673 ms** | +139 ms (~2.1% difference) |
| **Execution Latency Spread (ms)** | [6536, 6573, 6617, 6540, 6404] | [6963, 6618, 6738, 6530, 6516] | Stable execution |

---

## 8. CLI Protocol & Output Format Evaluation

An empirical investigation of the EPUBCheck 5.3.0 CLI behavior revealed critical findings for designing the adapter:

1. **Stdout & Stderr Behavior in Standard Mode:**
   - On a valid EPUB: writes progress and completion to stdout (`No errors or warnings detected.`), exit code `0`.
   - On an invalid EPUB: writes summary to stdout (`Messages: 0 fatals / 3 errors / 1 warning / 0 infos`), writes error details and `Check finished with errors` to stderr, exit code `1`.
2. **JSON Mode (`-j <output-path>`):**
   - Writing directly to a file via `-j <path>` generates a pristine, complete JSON document conforming to the EPUBCheck schema.
   - Stdout/stderr during `-j` execution receive only high-level status messages (`EPUBCheck completed`, `Check finished with errors`), completely isolating the JSON file from text pollution.
3. **Adapter Strategy:**
   - The adapter generates a temporary file path for `-j <tempFile>`, executes the process, reads the parsed JSON, and deletes the temporary file. This ensures 100% deterministic report generation without fragile regex scraping of console streams.

---

## 9. Validation Smoke Tests

The minimal adapter proof in [`packages/validator`](file:///d:/MyProjects/openbook/packages/validator) was tested against two validation-spike fixtures:

### 9.1 Valid EPUB 3.3 Fixture ([`valid-minimal.epub`](file:///d:/MyProjects/openbook/tests/fixtures/validation-spike/valid-minimal.epub))
- **Structure:** `mimetype`, `META-INF/container.xml`, `EPUB/package.opf`, `EPUB/nav.xhtml`, `EPUB/chapter1.xhtml`.
- **Exit Code:** `0`.
- **Validation Result:** `isValid: true`, `totalErrors: 0`, `totalFatal: 0`, `totalWarnings: 0`.

### 9.2 Deliberately Invalid EPUB Fixture ([`invalid-missing-nav.epub`](file:///d:/MyProjects/openbook/tests/fixtures/validation-spike/invalid-missing-nav.epub))
- **Faults Injected:** Missing nav element declaration in manifest, broken spine itemref `nonexistent-item`, invalid UUID format.
- **Exit Code:** `1`.
- **Validation Result:** `isValid: false`, `totalErrors: 3`, `totalWarnings: 1`.
- **Diagnostics Captured:**
  - `OPF-049` (ERROR): *Item id "nonexistent-item" was not found in the manifest.*
  - `RSC-005` (ERROR): *Exactly one manifest item must declare the "nav" property.*
  - `RSC-005` (ERROR): *itemref element idref attribute does not resolve to a manifest item element.*
  - `OPF-085` (WARNING): *"dc:identifier" value is marked as a UUID, but is an invalid UUID.*

---

## 10. Platform Investigation Matrix

| Platform / OS | Target Architecture | Packaging Strategy | Testing Status | Empirical Evidence |
|---|---|---|---|---|
| **Windows** | `x64` | Bundled `jlink` minimal runtime + `epubcheck.jar` invoked via `java.exe` subprocess | **Verified & Tested** | Full empirical data captured in this report |
| **macOS** | `x64` / `aarch64` | `jlink` cross-built or CI-built Temurin 21 runtime inside app bundle (`Contents/Resources/runtime/bin/java`) | **Packaging Analysis Only** | Native execution unexecuted (running in Windows host environment) |
| **Linux** | `x64` / `aarch64` | `jlink` runtime packaged in `.AppImage` / `.deb` / `.rpm` resources directory | **Packaging Analysis Only** | Native execution unexecuted (running in Windows host environment) |

> [!NOTE]
> Per OpenBook governance, macOS and Linux platforms are marked as **Packaging Analysis Only** and must receive native CI/runner validation before declaring production release readiness.

---

## 11. Security & Supply-Chain Considerations

1. **Offline Operation:** The bundled validator executes purely locally with zero network access required during validation.
2. **Deterministic Inputs:** EPUB artifacts are passed as local filesystem paths; command arguments are passed as discrete array parameters (preventing shell injection).
3. **No Automatic Runtime Downloads:** Runtimes are packaged during release assembly, never downloaded at runtime on end-user machines.
4. **CVE Lifecycle:**
   - Adoptium publishes quarterly CPU (Critical Patch Update) releases for Temurin 21 LTS.
   - Upstream EPUBCheck releases are tracked via GitHub releases.
   - Release CI should regenerate checksums and test fixtures whenever a runtime update is introduced.

---

## 12. Engineering Recommendation & Conclusion

### Outcome: **Proceed with Conditions (Outcome B)**

The empirical evidence confirms that packaging official EPUBCheck 5.3.0 behind an isolated subprocess with a private `jlink` Java runtime is completely feasible, robust, and compliant with OpenBook architecture and licensing policies.

### Satisfied Criteria:
1. `jlink` reduces the runtime footprint from **327.90 MB to 59.07 MB** (an **82.0% reduction**).
2. End users are **not** required to install Java.
3. EPUBCheck 5.3.0 successfully validated the supplied valid and deliberately invalid EPUB 3.3 spike fixtures, with expected exit codes and diagnostics.
4. The `-j <tempFile>` file-based output protocol provides clean, structured diagnostic reporting without stdout stream contamination.
5. All 11 existing Book Model tests and 3 new validator smoke tests pass cleanly (`14 passed, 0 failed`).

### Explicit Conditions for Future Production Implementation:
1. **CI Pipeline Integration:** Establish automated GitHub Actions runners for Windows, macOS (Intel + Apple Silicon), and Linux to build and cache platform-specific `jlink` images.
2. **Installer Compression:** Package the ~93 MB payload using high-ratio compression (e.g. 7-Zip / NSIS / AppImage squashfs), which is expected to compress the distributed validator payload to ~35-40 MB.
3. **Tauri/Rust Subprocess Bridge:** When Tauri is authorized in Phase 1, implement the `ValidatorService` in the Rust background service to execute the bundled binary rather than executing from front-end Node.js.

---

## 13. Next-Step Recommendation

1. Use the empirical evidence in this report to guide future Phase 1 Tauri/Rust validator subprocess implementation.
2. Proceed to the next foundation gate (`FOUNDATION-READY` sign-off and implementation backlog).
