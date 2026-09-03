# Conversation Record — EPUBCheck, Java Runtime and Tauri

- **Conversation ID:** CONV-2026-09-03-001
- **Date:** 2026-09-03
- **Topic:** EPUBCheck integration, Java runtime bundling, Tauri architecture and licensing/compliance
- **Status:** Recorded

## Context

OpenBook Studio needs authoritative EPUB conformance validation while remaining a desktop-first Tauri application. EPUBCheck is the authoritative W3C/DAISY ecosystem validator but is implemented as a Java application/library. The discussion evaluated how to avoid requiring users to install Java manually.

## Approaches considered

### Approach A — JavaScript/WASM route

Run a TypeScript/JavaScript port or WebAssembly build of EPUBCheck.

**Advantages:** potentially smaller and simpler runtime integration.

**Risks:** a third-party port could diverge from official EPUBCheck releases and therefore should not become OpenBook's authoritative conformance authority without demonstrating equivalence.

### Approach B — Bundled Java runtime

Bundle EPUBCheck with a managed OpenJDK runtime such as Eclipse Temurin and invoke it from the Tauri/Rust layer.

**Advantages:** uses the official EPUBCheck implementation and avoids requiring a system Java installation.

**Costs:** larger installer and additional runtime/license/security-update management.

### Future Approach C — Native/WASM packaging of official implementation

Investigate whether the official EPUBCheck implementation can eventually be packaged in a smaller native/WASM form without changing behavior. This is exploratory only and must not be an MVP dependency.

## Decisions reached

1. **Official EPUBCheck remains the authoritative EPUB conformance validator.**
2. OpenBook should not require the user to install Java manually.
3. The preferred production approach is to bundle a private Java runtime with EPUBCheck and invoke it through an isolated subprocess boundary.
4. The Rust layer should expose a `ValidatorService`/adapter abstraction rather than spreading Java/EPUBCheck implementation details through the application.
5. Java and EPUBCheck are separate distributed components; OpenBook must preserve all applicable licenses and notices.
6. `jlink` should be investigated as a build-time mechanism to minimize the Java runtime image.
7. Runtime size targets must be measured rather than promised in advance.
8. Release governance must include EPUBCheck and Java runtime version review, security/CVE review, license/notice regeneration, checksums, and EPUB regression testing.
9. Do not describe EPUBCheck as providing an absolute certification of retailer/platform acceptance. It validates EPUB conformance; OpenBook can separately perform publishing-quality and accessibility checks.
10. The EPUB validation subsystem should remain replaceable through an adapter boundary.

## Compliance principles

- OpenBook's own code remains Apache-2.0.
- EPUBCheck is distributed under its applicable 3-Clause BSD terms.
- The exact bundled Java distribution/version must be accompanied by its applicable license and notice files.
- The project must maintain an inventory of transitive dependencies and bundled third-party components.
- A subprocess boundary is an architectural isolation mechanism; legal obligations must still be assessed from the exact components and distribution terms.

## Resulting architecture

```text
React + TypeScript
        |
        v
Tauri / Rust
        |
        v
ValidatorService
        |
        v
EPUBCheck Adapter
        |
   subprocess
        v
Bundled Java Runtime + EPUBCheck
        |
        v
Validation Report
        |
        v
Book Doctor
```

## Validation layers

1. **OpenBook structural validation** — validates the canonical Book Model.
2. **OpenBook publishing/accessibility validation** — checks authoring and publication quality, including metadata, navigation, headings, alt text, links and other project rules.
3. **Official EPUBCheck** — validates EPUB conformance against applicable EPUB specifications.

## Follow-up actions

- Create ADR-0005 for the formal EPUBCheck bundling/runtime decision.
- Determine exact EPUBCheck 5.3.0 packaging requirements.
- Evaluate Temurin runtime versions and platform matrix.
- Build a `jlink` proof of concept and measure runtime size.
- Define runtime checksum/reproducibility controls.
- Build Windows/macOS/Linux packaging tests.
- Add EPUB validation regression fixtures, including English, Kannada and mixed-script books.
- Maintain third-party license and notice inventory.

## Related documents

- `docs/adr/0004-publishing-engine-technology-architecture.md`
- `docs/governance/CONVERSATION-TO-KNOWLEDGE-POLICY.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
