# ADR 0003: Apache-2.0 License and Contributor Protection

- **Status:** Accepted
- **Date:** 2026-09-03
- **Decision:** OpenBook is licensed under the Apache License 2.0.

## Context

OpenBook is intended to be an open-source publishing platform and ecosystem that encourages developers, authors, publishers, designers, translators, accessibility specialists, testers and companies to participate.

The project may later support commercial ecosystem offerings such as a managed cloud service, premium plugins, enterprise capabilities, professional support, training and integrations.

At the same time, OpenBook must respect the substantial time and intellectual effort contributed by individuals and organizations. Commercial reuse should not erase the identity or contribution history of the people who built the project.

The project also expects to use third-party FOSS libraries for areas such as text shaping, rendering, PDF processing, image processing and desktop application infrastructure. Those dependencies will retain their own licenses and will be reviewed individually.

## Decision

OpenBook's original project code and other original works that the project explicitly places under its project license will use **Apache License 2.0**.

Apache-2.0 was selected because it:

1. permits personal, academic, nonprofit and commercial use;
2. permits modification and redistribution;
3. supports commercial products and services built around OpenBook;
4. provides an explicit patent license from contributors, subject to the license terms;
5. does not impose strong copyleft requirements on downstream proprietary additions; and
6. is suitable for building a broad ecosystem around an open-source publishing core.

## Contributor protection principles

OpenBook will complement the Apache-2.0 license with project governance that recognizes contributors.

### Copyright

Contributors should retain copyright in their original contributions unless they explicitly transfer copyright under a separate written agreement.

### Contribution license

Contributions accepted into OpenBook will be made available under the project's applicable contribution terms, with the necessary rights for OpenBook and its maintainers to use, modify, maintain and distribute the contribution.

### Attribution

OpenBook will maintain contributor and attribution records. The project will use appropriate `NOTICE`, contributor and credits mechanisms so that meaningful contributors are recognized.

### Commercial use

Commercial use of OpenBook is permitted. OpenBook will not impose a general requirement for downstream commercial users to pay contributors. Any voluntary sponsorship, rewards, grants or community contribution program will be governed separately from the software license.

### Trademark

The Apache-2.0 license does not grant rights to use the OpenBook or SanMitra trademarks beyond what the license permits. Branding and trademark policy will be documented separately.

## Third-party dependencies

Apache-2.0 applies to OpenBook's own covered works; it does **not** change the licenses of third-party components.

Every dependency must be reviewed for:

- exact version;
- license and copyright notices;
- direct versus transitive dependency;
- static/dynamic linking or process separation where relevant;
- redistribution obligations;
- source-disclosure obligations, if any;
- patent considerations;
- security and maintenance status; and
- compatibility with OpenBook's distribution model.

Strong-copyleft components are not automatically prohibited, but they require an explicit architectural and legal review before adoption.

## Alternatives considered

### AGPL-3.0-or-later

Rejected as the default project license because OpenBook's primary goal is broad ecosystem adoption, including commercial products and managed services. AGPL's strong copyleft and network-use requirements could create additional adoption constraints for downstream commercial users.

AGPL remains a possible license for a separately distributed component if a future architectural or ecosystem decision specifically calls for it and the applicable obligations are understood.

### MIT

Not selected because Apache-2.0 provides more explicit patent-related protections while remaining permissive.

## Consequences

### Positive

- Broad adoption and commercial ecosystem participation are possible.
- Developers and companies can build products around OpenBook.
- Contributor copyright can remain with contributors.
- Contributor attribution can be preserved through project governance.
- Third-party licenses remain clearly separated from the OpenBook license.

### Negative / responsibilities

- Apache-2.0 does not require downstream modifications to remain open source.
- Contributors should understand that accepted contributions are intended for broad reuse.
- The project must maintain accurate copyright, license and attribution records.
- Dependency and notice management become an ongoing project responsibility.

## Follow-up actions

1. Add the official Apache-2.0 license text as `LICENSE`.
2. Create and maintain `NOTICE` as needed.
3. Define `CONTRIBUTOR_PROTECTION_AND_ATTRIBUTION.md`.
4. Define contribution terms/CLA or DCO policy before accepting substantial external contributions.
5. Create the dependency scorecard before adopting major rendering/DTP dependencies.
6. Maintain third-party notices and license inventory as part of release preparation.
