# ADR-0040 Slice 4: Desktop Word Import Surface — Implementation Record

- **Status:** Implemented in a Draft PR; merge on explicit authorization
- **Date:** 2026-10-28
- **Parent architecture:** ADR-0040 — Word (.docx) Import (§6)
- **Scope:** “Import a Word file” on the start screen; “Add chapters from a Word file” in Write; a host read that checks the file size before reading; the import summary in the Guide panel.
- **Implementation authorization:** Granted for this slice only (maintainer, 2026-10-28: “ok go ahead with -> Slice 4: in the app …”)

## 1. What landed

### Flow (`apps/desktop/src/workflow/domain/wordImport.ts`)

`importWordFile(coordinator, picker, mode)` picks a file through a host port, refuses one over the 200 MB cap, imports it through `DesktopStudioCoordinator.importContent`, and returns a `WordImportSummary`. The summary has a one-line headline (chapters, front-matter sections, words, pictures), a “Please check” list (warnings), and a “Good to know” list (notes). It uses no React, Tauri, or file system.

- **Size cap:** `WORD_IMPORT_MAX_FILE_BYTES` is the importer's own `DEFAULT_DOCX_LIMITS.maxFileBytes`. A host that reports the size first gets a plain message with the file's size and a hint to compress pictures in Word. A host that could not check first is still refused before import.
- **New book only from a fresh book:** a whole new book can be imported only while the open book is still at its start (ADR-0020 INV-6). Otherwise the author is told to start a New blank book first, or to add the chapters from Write. The file chooser does not open, and work in progress is never replaced.
- **Errors:** the reader's own messages (for example “This Word file is damaged and cannot be read.”, or the older-`.doc` hint) are shown when they pass the ADR-0039 author-safe check. Otherwise a plain fallback is shown, and the original text goes to Diagnostics.
- Technical notes such as “Applied default language” are left out of the summary.

### Host

- **Rust command `docx_read_bytes`** (`src-tauri/src/lib.rs`): dialog-selected path only (the same safe-path check as `asset_read_bytes`), `.docx` extension only, size from file metadata checked **before** reading (and re-checked after), bytes returned as a binary `tauri::ipc::Response`, not a JSON number array. An oversized file fails with `DOCX_TOO_LARGE:<bytes>`. `cargo check` passes.
- **Permission:** a new allow-entry `allow-docx-read-bytes` for this one command, in `permissions/export.toml`, added to the default capability. No plugin permission and no new plugin.
- **`host/createWordFilePickPort.ts`:** the Tauri dialog filtered to `.docx`, then `docx_read_bytes`. The browser/dev fallback is an `<input type="file" accept=".docx">` that checks `File.size` before reading.

### Screens

- **Start screen:** an “Import a Word file” button under Continue, with a short line explaining it and a status line for problems. On success the studio opens at Write.
- **Write:** an “Add chapters from a Word file” button next to the picture button. It saves the editor's text into the book first, then appends the Word file's chapters and pictures.
- **Guide panel:** a “Your Word file” section with the headline, “Please check”, and “Good to know”. It opens the Guide if it was hidden and stays until the author presses “Done reading”.
- The existing Markdown/text “Add chapters from a file” panel in Structure is unchanged.

### Tests

- `wordImport.test.ts`: a new book with a summary (the refused EMF picture listed to check); appending from Write (counts only the new chapters); cancel; too large (reported by the host, or caught late); damaged and older-`.doc` files with the reader's messages; a new book refused while work is in progress, with the chooser never opened; picker failure; no internal terms in author text.
- `wordImport.ui.test.ts`: source checks for the start-screen button, the Write button, the Guide summary, the host's `.docx` filter and size check before reading, the Rust size check before `fs::read`, the binary response, the permission and capability entries, and a flow module free of React/Tauri/fs.
- The Word test builder from Slice 3 moved to `src/domain/wordDocxTestFixture.ts` (test-only), so the coordinator and flow tests share it.

## 2. Explicit exclusions

- Real-manuscript checks, package Save/Open and autosave round trips, EPUB/HTML/PDF output checks, the malicious-file corpus re-run (Slice 5)
- Drag-and-drop of files; recent Word files
- Any change to how Markdown/text import works

## 3. For the maintainer to try

In the desktop app: on the start screen choose **Import a Word file** and pick *Little Krishna's Wisdom Stories*. The Guide panel lists what came in and anything to check. Use **Save** to keep the book. This is a local manual check only; the file is not committed (ADR-0040 §8).
