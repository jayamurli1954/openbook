# ADR-0034 Slice 4: Image Insertion UI — Implementation Proposal

- **Status:** Implemented on this branch (Draft PR)
- **Date:** 2026-09-26
- **Parent architecture:** ADR-0034 — Phase 1 Writing Studio Architecture
- **Scope:** Native/file pick → existing coordinator asset ingest / `insertImageBlock`; cancel = no mutation; no parallel asset model
- **Implementation authorization:** Granted for this slice only

## 1. Purpose

Expose Writing Studio image insertion as product chrome over the existing desktop asset ingest path, so authors can pick an image and get a Book `image` block without a second asset store or broad filesystem access from React.

## 2. Slice 4 objective

1. `writingStudioImageAdapter` — pick port + coordinator port; advances to `ASSETS` when needed; maps cancel / section / stage / insert failures to structured results
2. Host pick ports — Tauri dialog + dedicated `asset_read_bytes` command (safe dialog path only); browser `<input type="file">` fallback for Vite-only
3. `WritingStudioImageButton` React chrome — Insert image affordance; no Tauri/FS/coordinator imports
4. Wire button into `EditorSurface`; register unit + UI source-shape tests in desktop `npm test`
5. Capability/permission for `allow-asset-read-bytes` only (no broad FS plugin)

## 3. Explicit exclusions

- Empty-state / failure UX polish beyond insert status messages (Slice 5)
- Tables / Book Model schema changes
- Audio/video authoring UI; remote URL assets; image transcoding
- AI outline generation
- Changing Gate 10 packaging `foundationReady`

## 4. Acceptance criteria

- cancelled picks perform no Book/asset mutation
- successful insert uses coordinator `insertImageBlock` (existing asset ingest + Book `image` block)
- image button stays free of Tauri, FS, and coordinator imports
- desktop `npm test` / CI pass
- diff stays within Slice 4 (image adapter + pick host + button + Tauri read command + wire-up + tests + docs)
