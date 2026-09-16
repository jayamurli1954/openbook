# Conversation Record — Required next product capabilities must not be dropped

- **Conversation ID:** CONV-2026-09-16-001
- **Date:** 2026-09-16
- **Topic:** Export UI, filesystem project package, and autosave are necessary; gating must not mean forgetting
- **Status:** Recorded (planning/backlog only; no implementation authorization)

## Context

After ADR-0029 Slice 1 (manifest contract) merged, the remaining product gaps were described as: no filesystem package, no autosave, no export UI. The maintainer stressed that these are necessary for a usable OpenBook and must not be treated as optional or lost behind later DTP/AI/compliance work.

## Key discussion points

- The engines and coordinator already exist. What is missing is host UX and a durable on-disk project.
- ADR-0029 Slice 1 is types + fail-closed classification by design, not a truncated package implementation.
- Autosave must not create a parallel save path into SQLite or persist Tiptap JSON.
- Export UI does not have to wait for the filesystem package; autosave should wait for atomic package Save/Open.

## Decisions reached

1. Export UI / native Save As, filesystem project package (ADR-0029 Slices 2–6), and autosave & crash recovery are **required next product capabilities**.
2. Recording them on the backlog is not implementation authorization.
3. Cloud sync, AI/Ollama, and DTP must not displace these three.

## Open questions

- Explicit human authorization for Gate 9 ADR vs ADR-0029 Slice 2 vs both in parallel.

## Action items

- Promote the required-three into `docs/IMPLEMENTATION-BACKLOG.md`, `PROJECT-CONTEXT.md`, and the architecture decision index.
- Do not start implementation until separately authorized.

## Related documents

- `docs/IMPLEMENTATION-BACKLOG.md`
- `PROJECT-CONTEXT.md`
- `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`
- ADR-0023, ADR-0029
