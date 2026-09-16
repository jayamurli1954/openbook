# OpenBook Third-Party Notices

- **Status:** Maintenance mechanism established; production notice population pending authoritative evidence review.
- **Scope:** Release-oriented attribution and provenance evidence.
- **Authority:** `docs/adr/0028-release-compliance-architecture.md`
- **Inventory contract:** `docs/release-compliance/evidence-inventory.schema.json`

## Purpose

This file is the human-readable third-party notice record for OpenBook release artifacts. It is maintained from authoritative project inputs and reviewed as part of release/compliance work.

It is not a replacement for package manifests, `package-lock.json`, runtime provenance records, or the release evidence inventory. It must not become an application source of truth.

## Maintenance rules

1. Identify candidate third-party material from authoritative manifests, lockfiles, runtime packaging records, and shipped-asset records.
2. Determine whether each candidate is development/build/test material or is actually shipped/redistributed.
3. Record the applicable license or licensing basis and any attribution/notice requirement only when supported by authoritative evidence.
4. Preserve source/provenance and integrity identifiers where available.
5. Keep unresolved licensing or redistribution questions explicitly unresolved; do not infer permission from technical availability.
6. Update this record when a shipped third-party component, runtime, asset, or relevant dependency changes.
7. Review the corresponding release evidence inventory so the human-readable notice and machine-readable evidence do not contradict one another.

## Current evidence status

The production third-party notice population is intentionally not asserted by this slice. The project previously identified completeness of release-oriented dependency/third-party provenance as an open evidence item. This slice establishes the maintenance mechanism without inventing licensing or redistribution facts.

The following categories are therefore tracked as evidence targets rather than asserted as complete notices:

- direct production dependencies;
- applicable transitive production dependencies;
- development/build/test dependencies where attribution is legally or operationally relevant;
- bundled EPUBCheck runtime components;
- bundled Eclipse Temurin runtime components;
- Typst runtime components;
- bundled fonts; and
- other third-party material included in distributable artifacts.

Bundled-font licensing and redistribution remains a separate policy concern and must not be treated as resolved by this notice mechanism.

## Relationship to the evidence inventory

The machine-readable contract at `evidence-inventory.schema.json` provides structured fields for component classification, status, provenance, licensing, redistribution disposition, artifacts, and notes. A populated inventory should be the evidence source used to maintain this notice record, while the notice record remains the human-readable attribution surface.

No dependency installation, dependency upgrade, runtime change, font acquisition, release signing, CI change, or publishing-engine change is performed by this maintenance mechanism.