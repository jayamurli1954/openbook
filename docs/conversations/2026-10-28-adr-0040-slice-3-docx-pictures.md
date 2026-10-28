# Conversation Record — ADR-0040 Slice 3: DOCX pictures

- **Date:** 2026-10-28
- **Participants:** Maintainer + coding agent
- **Topic:** Implement ADR-0040 Slice 3
- **Related:** `docs/adr-0040-slice-3-docx-pictures.md`; `docs/adr/0040-docx-import-architecture.md`; ADR-0017; ADR-0021

## Context

After Slice 2 merged (PR #168) and its status was reconciled (PR #169), the maintainer wrote “authorize Slice 3.” Work paused once on a usage limit and resumed on the maintainer's “resume from where you paused”.

## Decisions

1. Implement Slice 3 only: picture payloads from the importer; ingestion, substitution, the explicit reference check, and rollback in the coordinator.
2. The coordinator domain accepts `.docx` from this slice (ADR-0040 §8 places ingestion here). The UI follows in Slice 4.
3. Pictures are placed after their paragraph's text; inline pictures do not split paragraphs.
4. New-project imports build a fresh asset runtime and adopt it only on success.
5. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Action items

- Slice 4 (desktop import surface) needs its own authorization.

## Outcomes

- Branch `feat/adr-0040-slice-3-docx-pictures`.
