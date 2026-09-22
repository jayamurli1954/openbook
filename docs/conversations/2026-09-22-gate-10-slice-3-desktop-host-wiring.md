# Conversation Record — Gate 10 Slice 3 desktop host wiring

- **Date:** 2026-09-22
- **Participants:** Maintainer + coding agent
- **Topic:** Authorize and implement ADR-0032 Slice 3 after Slice 2 merge
- **Related:** ADR-0032, `docs/adr-0032-slice-3-desktop-host-wiring.md`

## Context

ADR-0032 Slices 1–2 are on `main` (PR #104, #105). Maintainer authorized the
next unit: desktop host wiring so packaged OpenBook uses the locator with
fail-closed missing-runtime reporting and no system Java/Typst recovery path.

## Decisions

1. `publishingNodeHost` resolves Gate 5/6 through `resolveDesktopPublishingRuntimes`.
2. Packaged resource roots come from options / `OPENBOOK_DESKTOP_RESOURCE_ROOT` /
   assembled Tauri `resourceDir()`.
3. Developer `.cache/` fallback only when no packaged root is in effect.
4. Incomplete packaged roots map to `failureKind: "missing_runtime"` and never
   recommend installing system Java or Typst.
5. Process unchanged: Draft PR → CI/DCO → merge only on
   `I authorize merge PR #XX`.

## Outcomes

- Implementation on branch `feat/gate-10-slice-3-desktop-host-wiring`.
