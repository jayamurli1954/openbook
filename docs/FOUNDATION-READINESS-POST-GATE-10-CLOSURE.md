# OpenBook Foundation Readiness — Post–Gate 10 Closure Record

- **Status:** Historical bridge after Gates 9–10; **Phase 0 gate outcome superseded** by `docs/FOUNDATION-READY-DETERMINATION.md` (2026-09-24)
- **Date:** 2026-09-22 (bridge); determination 2026-09-24
- **Baseline (bridge):** `main` at `553ba7c65566e69ed2d0149948b74abe1250d1c7` (PR #108 merge — Gate 10 Slice 5)
- **Determination baseline:** `main` at `13ba691` (PR #114)
- **Prior closure:** `docs/FOUNDATION-READINESS-CLOSURE-AND-NEXT-ARCHITECTURE.md` (2026-09-16; Gate 8 + ADR-0028 selection)
- **Scope:** Refresh foundation readiness evidence after Gates 9–10 and ADRs 0028–0032; record what remained open at bridge time
- **Implementation authorization:** **None** — documentation and evidence only

> **Current Phase 0 status:** `FOUNDATION-READY` and `FOUNDATION-GOVERNANCE-READY` are **declared** in `docs/FOUNDATION-READY-DETERMINATION.md`. This post–Gate 10 closure remains useful historical context and must not be read as the current gate outcome.

## 1. Purpose

This record updates foundation readiness evidence against current `main` after:

- ADR-0028 Release & Compliance (Slices 1–5) and its closure reconciliation;
- ADR-0029 project package (Slices 1–6);
- ADR-0030 Gate 9 export UI / native Save As (Slices 1–5);
- ADR-0031 autosave & crash recovery (Slices 1–5);
- ADR-0032 Gate 10 desktop packaging / release readiness (Slices 1–5, PRs #104–#108).

It is a governance and evidence artefact. It does **not** authorize implementation, dependency changes, font bundling, signing, publication, or a new engineering slice.

The historical `FOUNDATION-READINESS-REPORT.md` remains an audit record. The 2026-09-16 closure remains the ADR-0028 selection record. **This document is the current post–Gate 10 bridge.**

## 2. Engineering baseline accomplished

| Area | Status on baseline | Evidence |
|---|---|---|
| Gates 1–8 | Done | ADR index; prior readiness records |
| ADR-0028 evidence mechanisms | Done (mechanisms); production population unresolved | PRs #73–#77; `ADR-0028-CLOSURE-RECONCILIATION.md` |
| ADR-0029 project package | Done | PRs #82, #93–#97 |
| Gate 9 export / Save As | Done | ADR-0030 Slices 1–5 |
| ADR-0031 autosave / recovery sequencing | Done | PRs #98–#102; React recover chrome separately gated |
| Gate 10 packaging | Done | PRs #104–#108 (locator, Windows layout, host wiring, NSIS identity, verify) |
| Required product capabilities (four) | Done | Backlog / PROJECT-CONTEXT |

Gate 10 Slice 5 verification keeps `foundationReady: false` by design and tops out at `verified-with-limitations`.

## 3. Verification performed (2026-09-22)

### 3.1 Fresh CI on baseline commit

Observed for `553ba7c` (merge of PR #108) via GitHub Actions:

| Check | Conclusion |
|---|---|
| `test` | success |
| Gate 5 validator runtime (linux-x64) | success |
| Gate 6 PDF Typst runtime (linux-x64) | success |

Workflow run: `35736989337` (merge PR #108).

Local desktop package verification on this branch of work: **277/277** `@openbook/desktop` tests passing (includes Gate 10 Slice 5 tests).

### 3.2 Repository controls

Unlike the 2026-09-16 record (branch-protection API **403**), the protection configuration for `main` was **readable** on 2026-09-22. Observed:

| Control | Observed |
|---|---|
| Branch protected | yes |
| Required status checks | `test` (strict) |
| Dismiss stale reviews | true |
| Required approving review count | 0 |
| Enforce admins | true |
| Allow force pushes | false |
| Allow deletions | false |
| Required signatures | false |
| Required conversation resolution | false |

DCO continues to be enforced via the DCO workflow on pull requests (observed green on Gate 10 Draft PRs).

**Limitation:** This record does not independently re-audit every GitHub Apps/ruleset edge case beyond the protection API payload above.

### 3.3 Dependency / third-party / font evidence

| Item | State |
|---|---|
| ADR-0028 inventory / notices / font **policy** / manifest / verification **schemas** | Established on main |
| Production evidence inventory population | **Populated for current Windows-first ship path** — Gate 5/6 runtimes + fonts + npm + Cargo (Slices 1–5); signing/multi-OS not claimed |
| Third-party notice production population | **Populated** for the same scope; see `THIRD-PARTY-NOTICES.md` |
| Font-by-font redistribution clearance | **Partial** — Gate 6 four Noto fonts **confirmed / conditional** (OFL 1.1); additional fonts still evidence-dependent |
| Gate 10 Windows identity + ADR-0028 manifest linkage | Mechanism done; release status remains `unresolved` |

### 3.4 Packaging / platform evidence

| Item | State |
|---|---|
| Windows x64 packaging architecture + slices | Done (ADR-0032) |
| Code signing / SmartScreen / store submission | Out of scope; not done |
| macOS / Linux production packaging | Packaging Analysis Only (ADR-0032); not production-supported |
| Byte-for-byte reproducibility claim | Not established; not claimed |

### 3.5 Cross-document consistency

Front-door docs (`PROJECT-CONTEXT.md`, ADR index, implementation backlog) must be reconciled to: Gate 10 Slices 1–5 **done**; no authorized next engineering slice; `FOUNDATION-READY` **not** declared. Historical Gate 8–era wording in older readiness files is superseded by this record for current determination.

## 4. ROADMAP Phase 0 criteria assessment

| Criterion | Assessment |
|---|---|
| Product vision documented | Met |
| Requirements documented | Met |
| Architecture documented | Met (through ADR-0032) |
| FOSS strategy documented | Met |
| Licensing policy documented | Met (Apache-2.0 / ADR-0003) |
| Book Model canonical | Met |
| Dependency decisions have a documented process | Met at process/mechanism level (ADR-0028); production population unresolved |
| Automated testing in CI | Met (fresh evidence §3.1) |
| Application buildable reproducibly by a new contributor | **Partially met** — documented contributor/CI path exists; full Gate 10 Windows NSIS + signed release path is not a certified reproducible release |
| No major architectural contradiction | Met for completed Gates 1–10 within documented limits |

## 5. Foundation gate determination

### `FOUNDATION-GOVERNANCE-READY`

**Superseded:** Declared in `docs/FOUNDATION-READY-DETERMINATION.md` (2026-09-24).

Contributor governance (ADR-0024–0027) was already established at bridge time; the determination makes the formal declaration.

### `FOUNDATION-READY`

**Superseded:** Declared in `docs/FOUNDATION-READY-DETERMINATION.md` (2026-09-24).

At bridge time this record did **not** declare the gate. Evidence ops Slices 1–5 and the determination PR closed the remaining items (Cargo inventory; explicit declaration; signing/multi-OS waived for Phase 0).

Gate 10 Slice 5 packaging verification continues to keep `foundationReady: false` by design so packaging artifacts never substitute for the ROADMAP determination.

## 6. Closure outcome

| Activity | Outcome |
|---|---|
| Post–Gate 10 evidence refresh | **Closed** as a reconciliation activity |
| Engineering Gates 1–10 | **Recorded complete** on baseline |
| `FOUNDATION-READY` | **Deferred at bridge time** → later **declared** in `FOUNDATION-READY-DETERMINATION.md` |
| `FOUNDATION-GOVERNANCE-READY` | **Deferred at bridge time** → later **declared** in `FOUNDATION-READY-DETERMINATION.md` |
| Next engineering slice | **Not authorized by this bridge** |

Open items after determination (not Phase 0 blockers):

1. Optional: stronger contributor packaging/signing story (Windows first; other OS later).
2. Optional: Gate 11+ security / determinism ADRs when selected.
3. Optional: React recover/discard chrome (ADR-0031 residual).
4. Future product domains: DTP, AI/Ollama, cloud sync — require normal ADR/slice authorization.

## 7. Next architecture domain — candidates (not selected)

This record **does not select** a next implementation domain. Selection requires a maintainer decision after this closure is merged (or a follow-up selection record).

**Update (2026-09-22):** Maintainer directed the agent to choose. Selected domain: **foundation readiness evidence ops** — see `docs/FOUNDATION-READINESS-EVIDENCE-OPS-SELECTION.md`. Candidates below remain historical context for that choice.

Candidates (descriptive, not ranked as authorized work):

| Candidate | Why it might be next |
|---|---|
| Foundation readiness evidence ops | Close items in §6 without new product ADR |
| Explicit `FOUNDATION-READY` determination PR | Only after evidence items are resolved or formally waived |
| Gate 11 security review architecture | Named in ADR-0032 as later gate |
| React crash-recovery chrome | Residual from ADR-0031 |
| DTP / typography | ROADMAP Phase 2 |
| AI / Ollama | ROADMAP Phase 3; not MVP dependency |
| Packaging hardening (signing / multi-OS) | Extension of Gate 10; needs new auth |

## 8. Controlled sequence from here

1. Review and merge this closure record (Draft PR → CI/DCO → explicit merge authorization).
2. Maintainer chooses **one** next path from §7 (or another ADR).
3. If an ADR is needed: draft → review → accept → **separately** authorize implementation slices.
4. Do **not** treat this document as authorization for DTP, AI, signing, or `FOUNDATION-READY`.

## 9. Non-authorizations

This record does **not** authorize:

- declaring `FOUNDATION-READY` / `FOUNDATION-GOVERNANCE-READY`;
- populating production inventories by assertion;
- font acquisition, bundling, or redistribution;
- code signing, notarization, or publication;
- Gate 11+ implementation;
- DTP, AI/Ollama, cloud sync;
- React recover chrome;
- dependency upgrades;
- repository-control changes; or
- any implementation PR beyond this documentation reconcile.

## 10. Conclusion

OpenBook’s foundation **engineering** sequence through Gate 10 is complete on `main` at `553ba7c`. Fresh CI and (now readable) branch-protection evidence are recorded.

`FOUNDATION-READY` remains **not declared**. The appropriate next step is a **maintainer choice** among evidence closure, an explicit readiness declaration when warranted, or a new architecture domain under the normal ADR → authorization → Draft PR process.
