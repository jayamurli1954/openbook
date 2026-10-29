# ADR-0041 Slice 1: Callout Model, Schema Version 2, and Contract — Implementation Proposal

- **Status:** In progress (this PR)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0041 — Lesson Box (Callout Block) Architecture, §2.1–§2.2, §6, §7 Slice 1
- **Scope:** the `callout` block in the Book Model and Semantic Document; validation; `schemaVersion` 2 with an explicit 1 → 2 upgrade on every read path; editor round trip; no chrome
- **Implementation authorization:** Granted for this slice only, with version-1 books rewritten as version 2 at the next Save (maintainer, 2026-10-29)

## 1. Purpose

Make the lesson box a valid, saved, round-tripping part of a book, and move the book format to version 2 as decided in ADR-0041 §6, without any author-visible feature yet. Publishing (Slice 2) and the Write controls (Slices 3–4) build on this.

## 2. What the code does today

- `BOOK_MODEL_SCHEMA_VERSION = 1` (`packages/book-model/src/types.ts`). `createBook`, `parseBook`, and `validateBook` hard-code or require `1`; the importers and Semantic Document use the constant.
- **Package Open** (ADR-0029): `bookPackageMapping.ts` and `manifest.ts` already classify an older `bookModelVersion` as `migration-required` and refuse it. `projectPackageMigration.ts` has one migration (`add-integrity-v1`) and says a Book rewrite migration "is not implemented".
- **SQLite** (`persistence/dto.ts`): rows whose `book_schema_version` is not exactly the current version are rejected. After a bump, existing SQLite projects would stop opening.
- **Block-type switches:** `BLOCK_TYPES` (`packages/authoring/src/types.ts`), word count and plain text (`writingStudioContract.ts`), the Semantic Document `from-book` / `to-book`, and the editor adapter (`apps/desktop/src/domain/editorAdapter.ts`). The engines throw `UnsupportedContentError` on unknown blocks.
- **The editor drops unknown nodes.** TipTap keeps only node types it has registered. If a callout reached the Write step with no registered node, editing that chapter would silently remove it. ADR-0041 placed the node in Slice 3; this proposal moves a display-only node into Slice 1 to close that gap (allowed by ADR-0041 §7: "boundaries may be adjusted").

## 3. Slice 1 objective

1. **Book Model** (`packages/book-model`):
   - add `{ type: "callout"; id: string; title: string; inlines: InlineSpan[] }` to `ContentBlock`
   - `BOOK_MODEL_SCHEMA_VERSION = 2`; `createBook` uses the constant
   - `validateBook`: `schema-version` error unless `2`; callout errors `callout-title-not-text`, `callout-inlines-not-array`, `empty-callout` (no visible text in title and body)
   - new `upgradeBook(value): { book: Book; upgradedFrom?: 1 }`: a version-1 Book becomes version 2 with no other change (identity upgrade); version 2 is returned as is; any other version fails as today
   - `parseBook` accepts versions 1 and 2 and returns a version-2 Book through `upgradeBook`
2. **Package Open** (`apps/desktop/src/persistence`):
   - a package whose manifest and `book.json` say version 1 is read through `upgradeBook`; the result is a version-2 Book in memory
   - **no write at Open.** The package on disk stays version 1 until the author saves; the next Save writes version 2 (manifest, `book.json`, integrity evidence) through the normal atomic Save
   - the open result reports `upgradedFrom: 1`, so later chrome can tell the author; this slice adds no chrome
   - versions newer than 2 still fail with `UNSUPPORTED_FUTURE_VERSION`; mismatched manifest and document versions still fail
   - ADR-0031 recovery opens backups through the same path
3. **SQLite** (`persistence/dto.ts`): rows at version 1 or 2 are read; version-1 rows go through `upgradeBook`; writes use version 2.
4. **Semantic Document** (`packages/semantic-document`): `{ type: "callout"; id; title; inlines }` with one-to-one `from-book` / `to-book` mapping.
5. **Authoring:** `BLOCK_TYPES` gains `callout`; `BookSession` accepts callouts through the existing block operations (`setSectionBlocks`, `insertBlock`, `updateBlock`, `removeBlock`).
6. **Writing Studio contract:** word count and plain text include the callout title and body, so search and word counts see them.
7. **Editor round trip:**
   - the editor adapter maps a callout to an `openbookCallout` TipTap node (attribute `title`, content `inline*`) and back
   - a display-only `openbookCallout` node is registered in the editor (built with `Node.create` from the pinned `@tiptap/core`; no new package). It renders the title and text in a framed `div` so a callout is never dropped while editing. No toolbar button or command yet (Slice 3)
8. **Engines unchanged:** EPUB, HTML, and PDF still fail closed on a callout (Slice 2). Nothing in this slice can create a callout through the UI or import.

## 4. Explicit exclusions

- EPUB, HTML, PDF callout output (Slice 2)
- Write toolbar actions, title editing UI (Slice 3); book-wide conversion (Slice 4)
- Telling the author about the version upgrade in the UI
- Rewriting packages at Open; deleting or converting version-1 backups
- Word or Markdown import producing callouts
- Any new npm package, Tauri permission, or pin change

## 5. Acceptance criteria

- a valid callout (English and Kannada) passes `validateBook`; each callout error fires for its case; a version-1 Book fails `validateBook` and succeeds through `upgradeBook`
- `parseBook` reads the existing version-1 fixtures (`tests/fixtures/*.json`) and returns version 2 with all other content identical
- a version-1 package opens: the Book is version 2 in memory, `upgradedFrom: 1` is reported, and the files on disk are unchanged until Save; after Save, manifest, `book.json`, and integrity evidence are version 2 and the package reopens cleanly
- a version-3 package is refused with `UNSUPPORTED_FUTURE_VERSION`; a manifest/document version mismatch is still refused
- a version-1 SQLite row opens as version 2; new rows are written at version 2
- Book → Semantic Document → TipTap JSON → Semantic Document → Book is lossless for callouts (ids, title, inlines, Kannada text)
- a section containing a callout survives a Write-step edit of another paragraph in the same section
- callouts count towards word counts and appear in search text
- exporting a Book with a callout still fails closed with `UnsupportedContentError` in each engine
- books without callouts export exactly as before (Typst source, HTML, EPUB bytes compared against `main`); the only output change allowed is none, because `schemaVersion` is not written into any export
- no new npm dependency or Tauri permission
- full repository `npm test` and CI pass; diff stays within Slice 1

## 6. Expected files

- `packages/book-model/src/types.ts`, `create-book.ts`, `validate-book.ts`, `serialize.ts`, new `upgrade-book.ts`, `index.ts`, `book-model.test.ts`
- `packages/semantic-document/src/types.ts`, `from-book.ts`, `to-book.ts`, tests
- `packages/authoring/src/types.ts`, tests
- `apps/desktop/src/persistence/bookPackageMapping.ts`, `manifest.ts`, `projectPackageFs.ts`, `dto.ts`, `types.ts` (comment), tests
- `apps/desktop/src/domain/editorAdapter.ts`, new `apps/desktop/src/domain/calloutNode.ts`, `apps/desktop/src/EditorSurface.tsx` (register the node), tests
- `apps/desktop/src/workflow/domain/writingStudioContract.ts`, tests. (Corrected during implementation: the `schemaVersion: 1` in `createGuidedStartHost.ts` belongs to the recent-books list's own file format, not to Books, and stays.)
- existing tests that pin `schemaVersion: 1` on newly created books are updated to the constant; version-1 fixtures stay as version 1 to exercise the upgrade
- status docs: this proposal, a `docs/conversations/` record, `docs/IMPLEMENTATION-BACKLOG.md`, `docs/PHASE-1-LESSON-BOX-SELECTION.md`, `docs/decisions/ARCHITECTURE-DECISION-INDEX.md`, `PROJECT-CONTEXT.md`, `docs/README.md`

## 7. Decision for the maintainer

**When should a version-1 book be rewritten as version 2?**

- **Recommended: at the next Save.** Opening never changes files; saving does, as it always has. After that save, an older OpenBook build can no longer open the book, which is the point of the bump.
- **Alternative: at Open, through an explicit migration step** like `add-integrity-v1`, writing version 2 immediately. That makes the upgrade visible on disk at once, but opening a book would then change it before the author does anything.

## 8. Found during implementation

While tracing how blocks reach the editor, the agent found that the Write editor turned picture blocks into `[image:…]` text as soon as a chapter was shown. Slice 1 was paused and that was fixed first in PR #194 (`openbookImage` node). The lesson box's `openbookCallout` node follows the same pattern, and editor → Book conversion now carries the Book's assets (from #194).
