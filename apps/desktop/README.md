# OpenBook Desktop Shell

Foundation scaffold for OpenBook Studio (`apps/desktop`).

Authorized by **ADR-0007** freeze-lift only.

## Stack (Frozen pins)

| Layer | Version |
| --- | --- |
| Tauri (Rust) | 2.11.5 |
| `@tauri-apps/api` | 2.11.1 |
| `@tauri-apps/cli` | 2.11.4 |
| React / `react-dom` | 19.2.8 |
| TypeScript | 5.9.3 |
| Vite | 8.2.2 |
| `tauri-plugin-sql` | 2.4.1 (`sqlite`) |

## Boundaries

- `@openbook/book-model` is the canonical domain model.
- `@openbook/authoring` `BookSession` is the desktop authoring aggregate
  (`src/domain/desktopStudioCoordinator.ts`). The prototype
  `EditorBookSession` shim is retired (ADR-0019 Gate 8 Slice 1).
- `@openbook/workflow` owns pipeline stage and job status. Workflow state
  never holds canonical Book content.
- `@openbook/semantic-document` is the editor-facing contract; the desktop
  domain boundary projects **Desktop → SDM → Book**
  (`src/domain/semanticDocumentBoundary.ts`).
- Tiptap JSON is editor transport only (`EditorAdapter` in
  `src/domain/editorAdapter.ts`). The coordinator converts the active
  section through EditorAdapter into `ContentBlock[]` for `BookSession`.
- Save/Open uses PR #16 `ProjectPersistence` (`src/persistence/`) via
  `DesktopStudioCoordinator`:

  ```text
  Tiptap → EditorAdapter → BookSession.getBook() → ProjectPersistence → SQLite
  SQLite → ProjectPersistence → Book → BookSession → EditorAdapter → Tiptap
  ```

  Tiptap JSON is **never** written to SQLite. Autosave, cloud sync, and
  filesystem project packages remain out of scope.
- Gate 8 Slices 2–5 (importer, assets, Book Doctor, EPUB/HTML/PDF
  publishing UI) are not implemented in this slice.
- `@openbook/authoring` hashes IDs with `node:crypto`. The desktop Vite
  bundle aliases that module to `src/nodeCryptoShim.ts` so BookSession can
  run in the Tauri webview without changing Gate 7 packages.

## Commands

From the repository root:

```bash
npm ci
npm run build -w @openbook/book-model
npm run build -w @openbook/semantic-document
npm run build -w @openbook/authoring
npm run build -w @openbook/workflow
npm run build -w @openbook/desktop
npm test -w @openbook/desktop
npm run tauri:build
```

`npm run tauri:build` requires a local Rust toolchain and platform WebView dependencies.

On Windows, use the **MSVC** Rust toolchain (`stable-x86_64-pc-windows-msvc`). The GNU host target may fail without `dlltool.exe` (MinGW).

## CI limits

GitHub Actions currently runs Node package tests and the desktop **frontend** TypeScript/Vite build. Full native Tauri packaging is verified locally (and may be added to CI in a later PR).
