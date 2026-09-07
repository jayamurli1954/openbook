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
- `@openbook/semantic-document` is the editor-facing contract; the desktop
  domain boundary projects **Desktop → SDM → Book** in memory only
  (`src/domain/semanticDocumentBoundary.ts`).
- Tiptap JSON is editor transport only (`EditorAdapter` in
  `src/domain/editorAdapter.ts`). Multi-chapter authoring is an in-memory
  session (`src/domain/editorBookSession.ts`: select / create / rename /
  delete chapters) that still projects through the SDM boundary.
- SQLite is wired for **connectivity proof only** (`SELECT 1`). No production schema, migrations, or domain database model.
- No EPUB/HTML/PDF engines, PDF renderer, EPUBCheck changes, AI/Ollama, Save/Open project files, or publishing workflows.

## Commands

From the repository root:

```bash
npm ci
npm run build -w @openbook/book-model
npm run build -w @openbook/semantic-document
npm run build -w @openbook/desktop
npm test -w @openbook/desktop
npm run tauri:build
```

`npm run tauri:build` requires a local Rust toolchain and platform WebView dependencies.

On Windows, use the **MSVC** Rust toolchain (`stable-x86_64-pc-windows-msvc`). The GNU host target may fail without `dlltool.exe` (MinGW).

## CI limits

GitHub Actions currently runs Node package tests and the desktop **frontend** TypeScript/Vite build. Full native Tauri packaging is verified locally (and may be added to CI in a later PR).
