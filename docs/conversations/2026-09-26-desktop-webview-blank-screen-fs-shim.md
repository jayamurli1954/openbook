# Conversation Record — Desktop webview blank screen (node:fs shim)

- **Date:** 2026-09-26
- **Participants:** Maintainer + coding agent
- **Topic:** OpenBook Studio showed a blank white window on run
- **Related:** `apps/desktop/vite.config.ts`; `apps/desktop/src/nodeFsPromisesShim.ts`

## Context

After ADR-0034 Slice 3 merged (PR #126), the maintainer reported a blank
OpenBook Studio window and authorized the merge in the same message.

## Root cause

Vite externalized `node:fs/promises` for browser compatibility. Importing
`DirectoryAssetStore` / package FS through `DesktopStudioCoordinator` evaluated
those bindings at module load and crashed the renderer before React mounted.

## Fix

Alias `node:fs/promises`, `node:fs`, and `node:path` to webview shims (same
pattern as existing `node:crypto` / publishing host stubs). Calls fail closed;
the shell UI can load.

## Outcomes

- Branch `fix/desktop-webview-blank-screen-node-fs-shim`.
