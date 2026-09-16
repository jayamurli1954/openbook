# Release Artifact Manifest & Evidence Capture

## Purpose

This document defines the Slice 4 release/compliance evidence mechanism for identifying distributable release artifacts and associating each artifact with the provenance, integrity, runtime, notice, font, and validation evidence relevant to that artifact.

The manifest is release evidence metadata. It is not an application source of truth, a publishing-domain model, or a replacement for the canonical Book Model.

## Release-readiness rule

A release artifact is not treated as fully evidenced merely because it was produced successfully. The manifest records the evidence available for the artifact and preserves `unresolved` status where authoritative evidence is missing.

## Required artifact evidence

Each manifest artifact should identify, as applicable:

- artifact name;
- artifact type/classification;
- release identifier;
- source commit;
- integrity identifier;
- build/toolchain evidence where material;
- relevant test/validation evidence;
- associated release-evidence inventory entries;
- applicable third-party notice evidence;
- applicable bundled-font evidence; and
- notes describing documented environmental limitations or unresolved evidence.

## Artifact classifications

The manifest uses the following release-oriented classifications where applicable:

- `application` — primary distributable application/package;
- `installer` — installable distribution package;
- `archive` — distributable archive;
- `runtime` — separately identifiable shipped runtime package/component;
- `asset` — separately identifiable shipped asset or template;
- `documentation` — distributable documentation artifact;
- `other` — another explicitly identified distributable artifact.

Classification is evidence metadata and does not redefine application or publishing semantics.

## Evidence status

Manifest evidence uses the same status vocabulary established by the Slice 1 evidence inventory:

- `confirmed` — supported by authoritative evidence;
- `unresolved` — expected or relevant evidence is not yet authoritative or complete;
- `not-applicable` — the evidence category does not apply to the artifact.

An unresolved item must not be converted to confirmed by inference from technical success alone.

## Provenance and integrity

The manifest should preserve the source commit and relevant authoritative provenance for each release artifact. Where an artifact has a cryptographic integrity identifier, the algorithm and value should be recorded.

For shipped EPUBCheck/Temurin and Typst components, existing accepted runtime decisions and pins remain authoritative. Slice 4 records their release evidence; it does not select or change runtime versions.

## Relationship to existing evidence

The manifest references, rather than duplicates as competing truth sources:

- the Slice 1 release evidence inventory;
- the Slice 2 third-party notice mechanism;
- the Slice 3 font provenance policy;
- accepted runtime provenance decisions; and
- relevant test/validation evidence.

A manifest entry may identify the artifact paths or evidence identifiers needed to locate the supporting record.

## Reproducibility boundary

Slice 4 captures the release inputs needed for later reproducibility/compliance verification, including source commit, dependency-lock state, material environment/toolchain identifiers, runtime pins, integrity identifiers, and validation evidence.

This slice does not claim byte-for-byte reproducibility where the architecture cannot establish it. Any documented limitation remains explicit evidence.

## Maintenance triggers

Manifest evidence must be reconsidered when:

- a release artifact is added, removed, renamed, or materially changed;
- source or dependency-lock state changes;
- a shipped runtime changes;
- an artifact's integrity identifier changes;
- build/toolchain inputs material to the artifact change;
- third-party notice obligations change;
- bundled-font scope or provenance changes; or
- validation evidence changes materially.

## Explicit non-actions

This slice does not authorize:

- release signing;
- artifact publication;
- CI or branch-protection changes;
- dependency installation or upgrades;
- font acquisition, bundling, or redistribution;
- publishing-engine changes;
- DTP/page-layout implementation;
- AI/Ollama integration; or
- application runtime behavior solely for compliance bookkeeping.
