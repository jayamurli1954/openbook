# Security Policy

## Supported Security Reporting

OpenBook is an open-source desktop and digital publishing studio. Security vulnerabilities should be reported privately so that they can be assessed and, where necessary, remediated before exploitable details are made public.

Do **not** report suspected security vulnerabilities through public GitHub Issues, pull requests, discussions, or other public channels.

## How to Report a Vulnerability

### Primary channel — private email

Send a report to **contact@sanmitratech.in** with a subject beginning with **`OpenBook Security Report:`**.

The reporting email should contain enough information for the maintainers to reproduce and assess the issue. If the material is sensitive, describe the issue first and coordinate any sensitive attachments or evidence privately rather than posting them publicly.

### GitHub Security Advisories

Where GitHub's private vulnerability reporting / Security Advisory facilities are enabled for the repository, reporters may use that private mechanism instead of email. GitHub Security Advisories are the preferred repository-native mechanism for confidential vulnerability coordination when available and appropriate.

If the private GitHub mechanism is unavailable, email remains the primary reporting channel.

### Escalation

If a report sent to the primary channel cannot be acknowledged or handled, retain the original report and follow up using the same channel, clearly marking it as an escalation. Maintainers should escalate internally to the project steward when required for severity, disclosure, conflict-of-interest, or release decisions.

## What to Include

Please provide, where available:

- a concise description of the vulnerability;
- affected OpenBook component(s);
- affected version(s), commit(s), or release(s);
- reproduction steps or a minimal proof of concept;
- expected and actual behavior;
- security impact;
- exploitability information;
- relevant operating-system or runtime information;
- dependency or upstream component information;
- known mitigations or workarounds; and
- any disclosure deadline, embargo, or other coordination constraint.

Please do not include secrets, credentials, personal data, or unrelated confidential information unless it is necessary to demonstrate the vulnerability. If sensitive evidence is necessary, coordinate its secure handling privately.

## Response and Triage Process

Security reports follow this operational workflow:

**Report → Acknowledge → Triage → Classify → Remediate → Validate → Coordinate Disclosure → Close**

The maintainers should acknowledge a report when practical and record, at minimum, the following triage information as applicable:

- affected component;
- reproducibility;
- affected versions;
- severity;
- exploitability;
- upstream involvement;
- disclosure constraints; and
- remediation and validation status.

A report may be reclassified during investigation as additional facts become available.

Severity is assessed using security impact, exploitability, affected surface, affected versions, likelihood of exploitation, available mitigations, and upstream context. A severity classification is a triage aid and does not by itself determine disclosure timing or release decisions.

## Responsible Disclosure

Reporters are asked to allow reasonable time for investigation, remediation, testing, and coordinated disclosure before publishing technical details that could enable exploitation.

Maintainers will make reasonable efforts to:

1. keep vulnerability reports confidential during investigation;
2. coordinate with affected upstream projects where the issue originates in a dependency or bundled third-party component;
3. prepare and validate an appropriate fix or mitigation;
4. determine whether a security release is required;
5. coordinate disclosure timing with affected parties and the reporter where practical; and
6. document the final outcome after disclosure.

Security-sensitive details, exploit code, credentials, or other material that could materially increase exploitation risk should not be published prematurely.

## GitHub Security Advisories and CVEs

OpenBook may use GitHub Security Advisories when a vulnerability is appropriate for repository-level confidential coordination and disclosure.

A security issue does **not** automatically require a CVE. A CVE may be requested or assigned when warranted by the impact, affected distribution, ecosystem expectations, or coordinated disclosure process.

For vulnerabilities originating in third-party dependencies or bundled runtimes, OpenBook will coordinate with the relevant upstream project as appropriate. OpenBook will not claim an upstream vulnerability as an OpenBook-specific defect without establishing the applicable impact and affected versions.

## Dependencies and Bundled Components

Security review and remediation may include:

- npm dependencies;
- the bundled EPUBCheck runtime;
- bundled Eclipse Temurin/JRE components;
- Typst and PDF runtime components;
- fonts and other third-party assets; and
- build and packaging tooling.

When a third-party security advisory is identified, maintainers should determine whether OpenBook is affected, which versions are affected, whether the vulnerable component is reachable or used, whether an upgrade or mitigation is required, and whether a security release or upstream coordination is appropriate.

The project may rely on upstream security advisories and release information when assessing these components. This policy does not itself introduce a vulnerability scanner, SBOM generator, automated remediation system, or security-monitoring platform.

## Scope and Exclusions

This policy covers security vulnerabilities in OpenBook's source code, packaging, supported runtime behavior, dependencies, bundled runtimes, and other third-party components to the extent that they affect OpenBook users or contributors.

The following are generally outside the security-reporting process unless they create a demonstrable security impact:

- ordinary bugs without a security consequence;
- feature requests and enhancement requests;
- general support questions;
- documentation corrections;
- public-only reliability or usability issues; and
- vulnerabilities that are solely in an unrelated third-party service and do not affect OpenBook.

Reports that are out of scope may be redirected to the appropriate public project channel.

## Disclosure and Release Decisions

Security fixes remain subject to the normal OpenBook engineering controls, including pull requests, CI, DCO requirements, branch protection, and review. Security urgency does not by itself authorize bypassing those controls.

Where a confidential fix is required, maintainers should minimize unnecessary exposure of exploit details while preparing and validating the change. Disclosure should be coordinated with the reporter and affected upstream parties where appropriate.

A post-disclosure record should capture the affected versions, remediation, validation result, disclosure decision, and any relevant upstream coordination.

## Conflicts of Interest

A maintainer who has a conflict of interest in a security report should disclose the conflict and escalate the matter to the project steward so that triage, remediation, and disclosure decisions can be independently handled where practical.

## Reporter Credit

OpenBook may acknowledge security reporters in a coordinated disclosure when the reporter agrees and when doing so does not create additional security, privacy, or legal risk.

## Policy Changes

Changes to this security policy are governed by the project's documented architecture and governance process. Changes that would alter repository permissions, branch protection, DCO enforcement, release signing, maintainer appointments, or other governance controls require separate authorization rather than being made through this policy alone.

Signed-off-by: jayamurli1954 <9816286+jayamurli1954@users.noreply.github.com>
