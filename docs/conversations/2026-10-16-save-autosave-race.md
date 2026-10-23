# Conversation Record — Explicit Save vs autosave race

- **Date:** 2026-10-16
- **Participants:** Maintainer + coding agent
- **Topic:** Fix concurrent writes to the project package
- **Related:** `docs/adr/0031-autosave-and-crash-recovery-architecture.md` (Amendment 2026-10-16); `docs/adr-0039-closure-reconciliation.md` §4

## Context

During ADR-0039 Slice 1 a flaky test exposed that explicit Save and autosave could write the same package concurrently. After ADR-0039 closed, the maintainer approved taking the fix ahead of Cover Wizard ("Ok go ahead").

## Decisions

1. Serialize all package writes in the coordinator; each write reads the Book before queueing.
2. Make staging and backup directory names unique with a random suffix.
3. Record as an ADR-0031 amendment; no other autosave behaviour changes.
4. A regression test reproduces the race and fails without the fix.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `fix/save-autosave-race`.
