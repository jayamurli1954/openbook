# Conversation Record — Pictures lost when a chapter is shown in Write

- **Date:** 2026-10-29
- **Participants:** Maintainer + coding agent
- **Topic:** The Write step turned picture blocks into "[image:…]" text
- **Related:** `docs/adr/0034-phase-1-writing-studio-architecture.md` (Writing Studio); `docs/adr/0041-lesson-box-callout-block-architecture.md` (found while implementing Slice 1)

## Context

While implementing ADR-0041 Slice 1, the agent traced how blocks reach the Write editor. The editor had no picture node, so `editorAdapter.ts` sent each image block as a paragraph with the text `[image:<assetId>]`. When a chapter is shown, `EditorSurface` immediately writes the editor's content back (`onUpdate`), so the image block became that paragraph, silently; Save or autosave then wrote it to disk. Reproduced with the app's own modules on `main`: `paragraph, image, paragraph` → `paragraph, paragraph("[image:asset-pic]"), paragraph`. Pictures inserted with Write's "Insert image" were lost the next time the chapter was loaded. The maintainer chose to fix this before finishing Slice 1 ("Fix it first").

## Decisions

1. A TipTap node, `openbookImage` (atom; attributes `assetId` and `caption`), built with the pinned `@tiptap/core`; no new package. It draws the picture through the Book's asset resolver (a `blob:` URL, revoked when the node is destroyed) with the caption below.
2. The editor adapter maps image blocks to that node and back, keeping the asset id and caption exactly. A node without an asset id is dropped with an `image-without-asset` warning, never turned into text.
3. Editor → Book conversion now receives the Book's assets, so image blocks coming back from the editor pass the Semantic Document's asset check.
4. Books already saved with `[image:…]` paragraphs are not repaired automatically; that text is the author's now, and a repair would be a separate, explicit action.
5. Process: fix PR, Draft → CI/DCO → merge only on the maintainer's authorization. ADR-0041 Slice 1 resumes afterwards on its own branch.

## Outcomes

- Branch `fix/write-step-pictures`.
- Tests: pictures (including a Kannada caption) survive showing a chapter, repeated round trips, and an edit beside them; a picture node without an asset id is dropped with a warning.
- Checked in the running app (Vite, browser picker with a generated picture): "Insert image" shows the picture in the editor, and it is still a picture after switching to another chapter and back.
