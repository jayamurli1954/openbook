# ADR-0028: Release & Compliance Architecture

- **Status:** Accepted
- **Date:** 2026-09-16
- **Decision owners:** Project Steward / Maintainer governance
- **Related readiness record:** `docs/FOUNDATION-READINESS-CLOSURE-AND-NEXT-ARCHITECTURE.md`
- **Implementation authorization:** **None**

## Context

OpenBook has completed the Gate 1–8 foundation/desktop engineering sequence and has established the principal contributor-governance policies through ADR-0024–ADR-0027. The Foundation Readiness Evidence Reconciliation identified remaining evidence questions around release provenance, third-party notices, bundled runtime provenance, bundled-font licensing/redistribution, and reproducible release evidence.

These questions are not adequately resolved by application architecture ADRs alone. They require a durable release/compliance boundary that records what is shipped, where it came from, how it is licensed, and what evidence accompanies a release.

The project already has important provenance decisions, including the Apache-2.0 project license, the EPUBCheck 5.3.0 / Eclipse Temurin 21 LTS runtime boundary, and the Typst 0.15.1 PDF renderer decision. ADR-0028 consolidates the release/compliance architecture without replacing those technology decisions.

## Decision

OpenBook will use a **release/compliance evidence layer** that is separate from the canonical Book Model, application domain logic, and publishing engines.

The release/compliance layer will establish authoritative evidence for shipped and release-relevant components while preserving existing architecture boundaries.

### 1. Authoritative provenance inventory

The project will maintain an authoritative release-oriented inventory covering, as applicable:

- direct production dependencies;
- transitive production dependencies where required for attribution/compliance;
- development/build dependencies when legally or operationally relevant;
- bundled EPUBCheck runtime components;
- bundled Eclipse Temurin runtime components;
- Typst runtime components;
- bundled fonts;
- shipped assets/templates where third-party provenance applies; and
- other third-party material included in distributable artifacts.

The inventory must identify the component, version, source/provenance, license or licensing basis, and integrity identifier where available.

### 2. Separation of source, build, and shipped runtime evidence

The release record will distinguish among:

- source/development dependencies;
- build-time tools;
- test-only dependencies; and
- components actually shipped or redistributed to users.

This prevents development-only packages from being incorrectly represented as bundled runtime content while ensuring shipped third-party material is not omitted.

### 3. Runtime provenance

Bundled external runtimes must retain their authoritative version and integrity provenance.

For EPUBCheck/Temurin and Typst, existing ADR decisions and implementation pins remain authoritative. The release/compliance layer records the evidence needed to demonstrate which pinned runtime was used for a release.

It must not silently change runtime versions or replace an accepted runtime architecture.

### 4. Third-party notices

OpenBook will maintain a release-oriented third-party attribution mechanism. The exact generated/static form may be selected during implementation, but it must provide a reviewable record of applicable third-party licenses and notices for shipped material.

A machine-readable inventory may supplement the human-readable notice record where useful.

### 5. Bundled-font policy

Fonts distributed with OpenBook must have an explicit provenance and redistribution disposition before they are treated as release-ready.

For each bundled font, the release evidence should establish, as applicable:

- font family/name;
- version;
- source;
- license;
- redistribution permission/basis;
- attribution/notice requirement;
- integrity identifier; and
- the product artifacts in which the font is distributed.

No font is considered release-ready solely because it is technically usable by the renderer.

### 6. Release reproducibility evidence

A release record should capture enough information to reproduce or independently audit the release inputs within documented environmental limits, including:

- source commit;
- dependency lock state;
- runtime pins and integrity identifiers;
- build environment/toolchain identifiers where material;
- generated artifact manifest;
- relevant test/validation evidence; and
- third-party provenance evidence.

This decision does not require byte-for-byte reproducibility where an existing architecture cannot provide it; any documented environmental limitation must be explicit.

### 7. Artifact manifest

A release should have an artifact manifest identifying distributable outputs and the provenance/compliance evidence associated with them.

The manifest is evidence metadata. It must not become a second application source of truth.

### 8. Compliance boundary

Release/compliance concerns will remain outside the canonical Book Model and publishing-domain semantics.

The layer may inspect build and release inputs, but it must not:

- mutate a Book;
- define EPUB semantics;
- define PDF layout semantics;
- define HTML semantics;
- bypass validation;
- alter authoring behavior; or
- introduce runtime behavior into the application merely for compliance bookkeeping.

### 9. Security relationship

Security provenance and vulnerability-response evidence will align with ADR-0027 and `SECURITY.md`. Release/compliance records may identify affected components and evidence, but vulnerability handling remains governed by the established security disclosure process.

### 10. Implementation sequencing

ADR-0028 is an architecture decision only. Implementation requires a separate explicit authorization and must be split into reviewable slices, for example:

1. inventory/evidence model;
2. third-party notice generation or maintenance mechanism;
3. font provenance policy implementation if required;
4. release artifact manifest/evidence capture; and
5. reproducibility/compliance verification.

The exact slices require implementation planning and explicit authorization.

## Alternatives considered

### Continue with distributed ADR-only provenance

Existing ADRs provide important provenance, but relying exclusively on individual ADRs makes release-level completeness difficult to audit.

### Create a single manually maintained dependency list

A single static list may become stale as dependencies and shipped runtimes evolve. Any implementation should therefore define how the evidence stays synchronized with authoritative manifests and release inputs.

### Solve release/compliance inside each publishing engine

This would duplicate compliance logic and blur architecture boundaries. Release evidence should remain a cross-cutting release concern rather than becoming part of EPUB, PDF, or HTML semantics.

## Consequences

### Positive

- Clear release-level provenance and attribution evidence.
- Explicit treatment of bundled fonts and runtimes.
- Better separation between development dependencies and shipped components.
- A durable basis for future release automation and compliance review.
- Reduced risk of silently losing provenance as new publishing or AI components are introduced.

### Costs / trade-offs

- Additional release documentation/evidence maintenance.
- Some inventory information may need generation from package manifests and lockfiles.
- Font licensing must be reviewed before bundled fonts can be considered release-ready.
- Reproducibility evidence will require defined environmental metadata and retention.

## Acceptance criteria for this ADR

Before this ADR is accepted, review should confirm that:

- the scope does not conflict with ADR-0002, ADR-0003, ADR-0012, ADR-0013, or ADR-0027;
- the canonical Book Model remains unaffected;
- the release/compliance layer is clearly separated from application semantics;
- the bundled-font policy question is explicitly represented;
- third-party notice expectations are explicit; and
- implementation remains separately authorized.

## Explicit non-authorizations

This ADR does **not** authorize:

- dependency installation or upgrades;
- creation or population of a production dependency inventory;
- font acquisition or bundling;
- release signing;
- CI or branch-protection changes;
- publishing-engine changes;
- DTP/page-layout implementation;
- AI/Ollama integration; or
- any implementation PR.

## Status

**ACCEPTED.** This acceptance authorizes the architecture decision only. No implementation follows from this ADR until a separate explicit implementation authorization is provided.
