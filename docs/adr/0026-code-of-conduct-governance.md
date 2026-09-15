# ADR-0026: Code of Conduct Governance

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decision area:** Governance / Contributor Readiness
- **Related:** ADR-0003, ADR-0024, ADR-0025

## Context

OpenBook is moving from technical foundation completion toward public contributor readiness. DCO 1.1 contribution sign-off is established by ADR-0024, and project stewardship and maintainer governance are established by ADR-0025. A formal community-conduct decision is still required before the repository can be considered contributor-ready.

The project needs a clear, durable standard for respectful participation, together with a reporting and enforcement model that is compatible with the existing stewardship and repository-governance controls. The decision should establish the governance boundary without prematurely implementing every Contributor Readiness artifact.

## Decision

OpenBook will adopt a formal Code of Conduct as part of its Contributor Readiness governance.

The Code of Conduct will:

1. Apply to contributors, maintainers, reviewers, issue and pull-request participants, and other participants in project spaces designated by the project.
2. Establish expectations for respectful, professional, inclusive, and constructive collaboration.
3. Identify unacceptable conduct including harassment, discrimination, threats, intimidation, targeted abuse, and deliberate disruptive behavior.
4. Provide a defined project reporting path and require reports to be handled seriously, confidentially where appropriate, and with proportionate enforcement.
5. Place stewardship and enforcement responsibility within the governance structure established by ADR-0025 while preserving appropriate separation of technical review and conduct enforcement.
6. Preserve the contributor and repository protections established by ADR-0003 and ADR-0024.

The project will use the **Contributor Covenant 3.0** framework as the reference model for the Code of Conduct, with project-specific reporting and enforcement details determined during the separately authorized implementation step.

## Governance boundaries

This ADR establishes the Code of Conduct governance decision only. Acceptance of this ADR does not by itself authorize:

- creation or modification of `CODE_OF_CONDUCT.md`;
- creation of a reporting mailbox, form, or other external reporting service;
- changes to GitHub branch protection, repository permissions, or maintainer roles;
- changes to DCO 1.1 enforcement;
- `SECURITY.md` or vulnerability-disclosure implementation;
- dependency auditing or SBOM implementation;
- font/typography licensing work;
- trademark or branding policy implementation; or
- any other Contributor Readiness implementation not explicitly authorized separately.

The Code of Conduct does not override technical architecture decisions, the ADR process, required pull requests, CI checks, branch protection, or DCO 1.1 contribution sign-off.

## Reporting and enforcement principles

The implementation should provide a practical reporting route, protect good-faith reporters from retaliation, preserve appropriate confidentiality, and use proportionate responses based on the nature and severity of the conduct.

Enforcement must be applied consistently and must not be used as a mechanism to bypass technical review, alter project history, or weaken repository controls. Maintainers and the project steward remain subject to the same conduct expectations as other participants.

Detailed reporting contacts, response procedures, enforcement actions, and escalation rules are implementation details and must be documented before public contributor onboarding is declared complete.

## Relationship to stewardship

ADR-0025 establishes SanMitra Tech Solutions as project steward and defines maintainer authority within existing governance controls. This ADR does not expand that authority beyond conduct governance and does not transfer contributor intellectual property.

Technical decisions remain governed by the ADR process. Contributor copyright remains protected by the project's Apache-2.0 licensing and contributor-protection framework, and DCO 1.1 remains the contribution sign-off mechanism.

## Acceptance record

**Accepted:** 2026-09-15.

Acceptance confirms that OpenBook adopts formal Code of Conduct governance as a Contributor Readiness requirement, using Contributor Covenant 3.0 as the reference framework. The scope of covered participants, conduct expectations, reporting principles, proportionate enforcement principles, and stewardship boundaries described in this ADR are approved.

Acceptance does **not** authorize implementation of `CODE_OF_CONDUCT.md`, reporting infrastructure, enforcement procedures, or any other Contributor Readiness work. Those activities remain separately authorized and must preserve ADR-0025, DCO 1.1, contributor copyright, PR requirements, CI, branch protection, and ADR governance.

## Acceptance criteria

Acceptance of this ADR requires that:

- a formal Code of Conduct is adopted as a Contributor Readiness governance requirement;
- Contributor Covenant 3.0 is established as the reference framework;
- the intended scope of covered project participants is defined;
- respectful-conduct and unacceptable-conduct expectations are established;
- reporting and proportionate-enforcement principles are established;
- stewardship and maintainer responsibilities remain within ADR-0025 governance boundaries;
- DCO 1.1, contributor copyright, PR requirements, CI, branch protection, and ADR governance remain unaffected; and
- implementation of the Code of Conduct remains separately authorized.

## Consequences

### Positive

- Contributors have a clear behavioral standard before public onboarding expands.
- Maintainers have an explicit governance basis for handling conduct concerns.
- Community-safety expectations become durable project policy rather than informal practice.
- The decision cleanly separates conduct governance from technical and licensing governance.

### Negative

- The project must establish and maintain a real reporting and enforcement process before claiming full Contributor Readiness.
- Conduct enforcement introduces an operational responsibility that must be handled consistently and confidentially where appropriate.

## Out of scope

This ADR does not decide or implement SECURITY.md, SBOM/dependency auditing, trademark policy, font licensing, detailed maintainer appointment/removal procedures, release signing, or the final Contributor Readiness declaration.

## Implementation note

After acceptance, a separate implementation authorization may create `CODE_OF_CONDUCT.md` and the associated reporting/enforcement documentation. That implementation must remain consistent with this ADR and ADR-0025.
