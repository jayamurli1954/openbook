# OpenBook Conversation-to-Knowledge Policy

- **Status:** Accepted
- **Date:** 2026-09-03
- **Owner:** SanMitra Tech Solutions

## Purpose

OpenBook uses project conversations as an input to architectural, product, engineering, licensing, security and governance decisions. Important decisions must not remain only in chat history.

## Core rule

> No significant OpenBook architectural, licensing, technology, product, security, publishing or governance decision is considered final until it is recorded in the OpenBook repository.

## Two-level record model

### Level 1 — Conversation Archive

Important conversations are summarized and retained under `docs/conversations/` with:

- date
- topic
- context
- important discussion points
- alternatives considered
- decisions reached
- unresolved questions
- action items
- related ADRs/documents

The archive is a project reference, not the authoritative specification.

### Level 2 — Project Knowledge

Durable conclusions are promoted into the appropriate project record:

- **ADR** — architecture decision
- **Requirement/specification** — product or functional requirement
- **Architecture document** — enduring technical design
- **Governance/policy** — project rule or operating principle
- **Technology register** — selected/evaluated technology
- **Dependency register** — exact dependency/version/license record
- **Decision backlog** — unresolved issue requiring a future decision

## Authority hierarchy

When records conflict, use this order:

1. Accepted/Frozen ADRs and governance policies
2. Current architecture/specification documents
3. Accepted decision register entries
4. Conversation archive
5. Unrecorded chat discussion

A conversation can propose a decision but does not override an accepted repository decision.

## Decision lifecycle

Use these statuses consistently:

- `PROPOSED`
- `UNDER REVIEW`
- `ACCEPTED`
- `FROZEN`
- `SUPERSEDED`
- `REJECTED`
- `DEPRECATED`

## Future AI-agent rule

Before making material changes, an AI coding agent should read:

1. `PROJECT-CONTEXT.md`
2. `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
3. relevant ADRs
4. relevant architecture/governance documents

If an implementation conflicts with a Frozen decision, the agent must stop and request a decision update rather than silently changing architecture.

## Conversation capture trigger

Capture a conversation when it contains any of the following:

- a technology selection or rejection
- architecture or data-model decision
- licensing/IP decision
- security/privacy decision
- publishing/conformance decision
- product requirement with lasting impact
- contributor/governance policy
- major implementation strategy
- important risk or constraint
- explicit approval/rejection of a project direction

Routine troubleshooting and transient implementation details do not need a separate conversation record unless they reveal a durable lesson or decision.

## Principle

**Chat is the workshop. GitHub is the project memory and source of truth.**
