# ADR-0025: Project Stewardship & Maintainer Governance

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decision area:** Governance / Contributor Readiness
- **Supersedes:** None
- **Related:** ADR-0003, ADR-0024

## Context

OpenBook has completed the Gate 8 technical foundation and is transitioning toward public contributor readiness.

ADR-0024 establishes the Developer Certificate of Origin 1.1 as the project's contribution sign-off mechanism. DCO establishes contribution provenance and authorization, but it does not define who stewards the project, who may act as a maintainer, or how project authority is exercised.

A clear stewardship and maintainer model is therefore required before OpenBook is presented as a contributor-ready project.

The governance model must preserve the project's existing principles:

- Apache License 2.0 remains the project's governing open-source license.
- Contributors retain copyright unless they separately transfer it through a written agreement.
- DCO 1.1 provides the contribution sign-off mechanism.
- Architecture decisions are recorded through ADRs.
- Changes enter the repository through pull requests and required checks.
- Existing branch protections remain authoritative.

## Decision

OpenBook will use the following stewardship model.

### 1. Project steward

**SanMitra Tech Solutions** is the project steward for OpenBook.

The steward is responsible for the project's long-term continuity, governance framework, licensing posture, and overall project direction.

Stewardship does not mean ownership of contributor copyrights. Contributor copyright remains governed by the project's existing contributor-protection policy and applicable licenses.

### 2. Maintainer role

Maintainers are trusted project participants authorized to perform repository maintenance and execute changes that have been properly approved under the project's contribution and governance processes.

Maintainer responsibilities include:

- reviewing and coordinating contributions;
- maintaining repository health;
- coordinating releases and project operations;
- preserving architectural and governance consistency;
- helping contributors understand project requirements; and
- escalating material governance or architectural questions to the appropriate decision process.

Maintainer status does not itself create ownership of contributor intellectual property.

### 3. Maintainer authority

Maintainers must operate within the project's existing governance controls.

In particular:

- maintainers must not bypass required pull requests;
- maintainers must not bypass required CI checks;
- maintainers must not weaken branch protection merely to merge a change;
- architectural changes requiring an ADR remain subject to the ADR process;
- contribution sign-off remains governed by ADR-0024 and the DCO enforcement workflow; and
- implementation work requiring explicit project authorization remains subject to that authorization.

Maintainer privileges therefore provide operational authority, not unrestricted authority.

### 4. Stewardship and architecture

The project steward provides overall governance continuity, but individual architectural decisions remain governed by the project's ADR process.

A maintainer cannot unilaterally replace an accepted architectural decision where the project governance process requires a new or superseding ADR.

This preserves separation between:

1. project stewardship;
2. repository maintenance; and
3. durable architectural decisions.

### 5. Contribution and copyright boundary

DCO 1.1 remains the project's contribution sign-off mechanism as established by ADR-0024.

Maintainer status does not:

- assign contributor copyright to the steward;
- convert DCO sign-off into a copyright assignment;
- require a CLA; or
- alter the Apache-2.0 licensing framework.

Any future copyright-transfer arrangement would require a separate explicit written agreement and governance decision.

### 6. Continuity and succession

OpenBook should not depend permanently on a single individual for project continuity.

The stewardship model therefore requires that important project knowledge remain recorded in durable repository documentation, including:

- ADRs;
- governance documentation;
- contributor documentation;
- security procedures;
- release procedures; and
- other authoritative project records.

Changes to project stewardship or senior maintainer responsibility should be recorded through the project's governance documentation so that authority remains understandable to future contributors.

### 7. Separation of governance concerns

This ADR does not itself establish:

- a Code of Conduct;
- a security disclosure process;
- an SBOM or dependency governance policy;
- a trademark policy;
- detailed maintainer appointment or removal procedures;
- release-signing policy; or
- a declaration that OpenBook is `CONTRIBUTOR-READY`.

Those subjects require separate decisions or implementation work.

## Consequences

### Positive

- Establishes a clear project steward.
- Gives contributors a defined understanding of maintainer authority.
- Prevents maintainer privileges from becoming an implicit branch-protection bypass.
- Preserves contributor copyright and the DCO-based contribution model.
- Separates stewardship, maintenance, and architecture decisions.
- Improves long-term project continuity.

### Trade-offs

- A formal governance model introduces additional process.
- Future maintainer appointment and succession procedures will need further definition.
- The steward remains responsible for ensuring that governance documentation stays current.
- Contributor readiness cannot be declared solely on the basis of this ADR.

## Acceptance criteria

Before this ADR is accepted, the project must confirm:

1. SanMitra Tech Solutions is the intended project steward.
2. Maintainer authority is subordinate to repository governance controls.
3. Maintainer status does not transfer contributor copyright.
4. DCO 1.1 remains the contribution mechanism.
5. ADRs remain the authoritative mechanism for durable architectural decisions.
6. Stewardship does not itself authorize implementation work.
7. Continuity and succession are recognized as governance requirements.

## Acceptance record

Accepted on 2026-09-15 following formal project-owner acceptance and review. The accepted decision confirms SanMitra Tech Solutions as project steward, defines maintainer authority within existing governance controls, preserves contributor copyright and DCO 1.1, and recognizes continuity and succession as governance requirements.

This acceptance authorizes the governance decision only. It does not authorize implementation of a Code of Conduct, SECURITY.md, SBOM process, trademark policy, detailed maintainer appointment/removal procedures, release-signing policy, or any other Contributor Readiness work unless separately authorized.

## References

- ADR-0003: Apache-2.0 License and Contributor Protection
- ADR-0024: Developer Certificate of Origin 1.1 Contribution Sign-Off
- Project governance documentation
- Contributor protection and attribution policy
