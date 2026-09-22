# OpenBook Font Provenance & Redistribution Policy

**Status:** Policy mechanism established. Gate 6 bundled-font dispositions are recorded in `FONT-CLEARANCE-DISPOSITIONS.md` (evidence ops Slice 2); any additional fonts still require the same evidence process.

**Authority:** ADR-0028 — Release & Compliance Architecture

## Purpose

This document establishes the release/compliance evidence policy for any font that OpenBook bundles, redistributes, or otherwise ships as part of a product artifact.

It is a release-evidence policy. It is not a source of truth for typography, rendering, publishing engines, or application behavior.

## Release-readiness rule

A font is not considered release-ready solely because it is technically usable by a renderer or development environment.

A bundled or redistributed font requires sufficient authoritative evidence for its provenance and redistribution disposition. Where required evidence is unavailable, the font remains explicitly unresolved and must not be treated as release-cleared by this policy.

## Required evidence

For each font intended for a shipped artifact, the evidence record should establish, as applicable:

1. **Font family/name** — the identifiable font family or font resource name.
2. **Version** — the authoritative version or release identifier, where available.
3. **Source** — the authoritative upstream or distribution source.
4. **License** — the applicable license or licensing terms.
5. **Licensing basis** — the evidence supporting the license determination.
6. **Redistribution disposition** — whether redistribution is permitted, conditional, not permitted, or unresolved.
7. **Attribution/notice obligations** — whether attribution or a third-party notice is required and what evidence establishes that obligation.
8. **Integrity identifier** — a checksum or equivalent integrity identifier for the exact font artifact where practical and available.
9. **Product artifact scope** — the product/distributable artifacts in which the font is actually distributed.

## Evidence status

Font evidence should use the status vocabulary established by the release evidence inventory:

- `confirmed` — required evidence is established and supports the recorded disposition.
- `unresolved` — one or more material evidence items remain unverified or incomplete.
- `not-applicable` — the evidence category does not apply to the particular record.

Redistribution disposition should use the inventory vocabulary:

- `permitted`
- `conditional`
- `not-permitted`
- `unresolved`
- `not-applicable`

An unresolved disposition must remain explicitly unresolved; it must not be converted into permission by inference.

## Authoritative evidence hierarchy

Font provenance should be established from authoritative evidence in the following order of preference:

1. The font author's or rights holder's published license and distribution terms.
2. The authoritative upstream project or official distribution source.
3. The exact artifact's accompanying license, notice, or metadata supplied by the authoritative source.
4. Other reliable documentation that directly establishes the applicable rights and obligations.

Search results, informal commentary, technical compatibility, or assumptions based on a commonly associated license are not sufficient by themselves to establish redistribution permission.

## Inventory integration

Font records belong in the ADR-0028 release evidence inventory as `shipped-asset` entries when the font is distributed in a product artifact.

The inventory record should use:

- `component` for the font family/resource identity;
- `version` when authoritative version information exists;
- `classification: shipped-asset` for distributed fonts;
- `status` according to the evidence state;
- `provenance` for source and integrity evidence;
- `licensing` for license, basis, notice, and redistribution disposition;
- `artifacts` for the product artifacts containing the font;
- `notes` for material limitations or unresolved evidence.

Development-only fonts must not be represented as shipped assets merely because they are available in a developer environment. Their classification must reflect their actual release role.

## Third-party notice relationship

Where a font requires attribution or notice, the applicable evidence must be reflected consistently in `docs/release-compliance/THIRD-PARTY-NOTICES.md` and the machine-readable evidence inventory.

The human-readable notice file does not replace the underlying provenance and licensing evidence.

## Maintenance triggers

Font provenance evidence must be reviewed when any of the following occurs:

- a font is newly acquired for potential distribution;
- the exact font artifact changes;
- the font version changes;
- the authoritative source or license terms change;
- the redistribution basis changes;
- the product artifacts containing the font change;
- attribution or notice requirements change;
- a release process begins distributing a font that was previously development-only.

Integrity identifiers should be refreshed whenever the exact distributed font artifact changes.

## Explicit non-actions for Slice 3

This policy slice does **not** authorize:

- acquisition or download of fonts;
- addition or bundling of font files;
- redistribution of any font;
- selection of a font for product use;
- changes to Typst or any publishing engine;
- changes to EPUB, PDF, HTML, or rendering behavior;
- dependency installation or upgrades;
- release signing or release automation changes;
- declaration that any currently unresolved font is legally cleared for redistribution.

Actual font-by-font disposition remains dependent on authoritative evidence. For the four Gate 6 Noto fonts currently pinned for PDF packaging, dispositions are recorded in `docs/release-compliance/FONT-CLEARANCE-DISPOSITIONS.md` and mirrored in the release evidence inventory / third-party notices. That disposition record does not declare `FOUNDATION-READY`.
