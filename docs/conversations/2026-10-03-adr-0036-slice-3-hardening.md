# Conversation Record — ADR-0036 Slice 3 hardening

- **Date:** 2026-10-03
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0036 Slice 3 (hardening)
- **Related:** `docs/adr/0036-phase-1-design-studio-architecture.md`; `docs/adr-0036-slice-3-hardening.md`

## Context

After PR #141 reconciled Slices 1–2, the maintainer authorized Slice 3 with
“OK Go ahead with Slice 3”.

## Decisions

1. Implement Slice 3 only: EN/KN theme and font names through package Save/Open, and a stylesheet firewall.
2. Publishing stylesheets stay in the engines. The package does not gain a CSS or Typst file.
3. Closure, Metadata Wizard, Cover Wizard, and Book Model fields for paragraph spacing, image treatment, chapter opening, and style properties stay unauthorized.
4. Process: Draft PR → CI/DCO → merge only on `I authorize merge PR #XX`.

## Outcomes

- Branch `feat/adr-0036-slice-3-hardening`.
- Package Save/Open round-trip for English and Kannada theme and font names.
