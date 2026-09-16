# Reproducibility & Compliance Verification

## Purpose

This document defines the Slice 5 verification mechanism for determining whether release evidence is sufficiently complete, authoritative, and internally consistent to support reproducibility and compliance review within documented environmental limits.

The verification layer evaluates release evidence. It is not an application source of truth, a publishing-domain model, or a substitute for the underlying provenance records.

## Verification inputs

A verification record should evaluate, as applicable:

- release source commit;
- dependency-lock state;
- material build/toolchain identifiers;
- shipped runtime pins and integrity identifiers;
- release artifact manifest;
- release evidence inventory;
- third-party notice evidence;
- bundled-font provenance and redistribution evidence;
- relevant automated test evidence; and
- relevant publishing/validation evidence.

## Verification statuses

The verification result uses the following statuses:

- `verified` — required applicable evidence is authoritative and internally consistent;
- `verified-with-limitations` — evidence is sufficient for the documented purpose, but environmental or architectural limitations are explicitly recorded;
- `unresolved` — one or more required evidence items remain incomplete or non-authoritative;
- `failed` — evidence is contradictory, invalid, or fails a required verification condition.

A verification process must not convert missing or unresolved evidence into `verified` by inference.

## Verification rules

1. The source commit must be identified for the release record.
2. The dependency-lock state must be identified when dependency inputs affect the release.
3. Material build/toolchain information must be recorded where it affects release provenance.
4. Shipped EPUBCheck/Temurin and Typst provenance must remain consistent with their accepted architecture decisions and recorded pins.
5. Each distributable artifact must be traceable to its release artifact manifest entry.
6. Applicable third-party notice evidence must be traceable to the notice mechanism and evidence inventory.
7. Bundled-font evidence must remain consistent with the accepted font provenance policy; unresolved redistribution evidence remains unresolved.
8. Relevant test and validation evidence must be traceable to the release record.
9. Conflicting provenance, integrity, licensing, or artifact evidence must not be silently reconciled; the verification result must be `failed` or `unresolved` as appropriate.
10. Environmental limitations must be recorded explicitly rather than represented as byte-for-byte reproducibility claims.

## Cross-slice evidence relationships

Verification consumes the evidence established by the previous slices:

- **Slice 1:** release evidence inventory;
- **Slice 2:** third-party notice maintenance mechanism;
- **Slice 3:** font provenance and redistribution policy;
- **Slice 4:** release artifact manifest and evidence capture.

Slice 5 verifies relationships among these records rather than creating competing copies of their authoritative data.

## Reproducibility boundary

This mechanism supports reproducibility and independent audit within documented environmental limits. It does not require a byte-for-byte reproducibility claim when the existing architecture cannot establish one.

Where exact reproduction is not established, the verification record must identify the relevant limitation and use `verified-with-limitations` or `unresolved` rather than implying stronger evidence.

## Release decision boundary

This verification mechanism provides evidence status only. It does not itself authorize publication, release signing, artifact distribution, dependency changes, runtime changes, or changes to project architecture.

## Explicit non-actions

This slice does not authorize:

- release signing or publication;
- dependency installation or upgrades;
- font acquisition, bundling, or redistribution;
- publishing-engine changes;
- DTP/page-layout implementation;
- AI/Ollama integration;
- CI or branch-protection changes; or
- application runtime behavior solely for compliance bookkeeping.
