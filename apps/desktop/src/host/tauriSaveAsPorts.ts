// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 4 — Tauri Save-As port adapters (ADR-0030).
 *
 * Explicit host dependency evaluation:
 * - Official `tauri-plugin-dialog` for native Save As and overwrite confirmation.
 * - Custom Rust commands for exists/atomic write only (no broad filesystem plugin,
 *   no shell execution). Paths come from the dialog or companion joins under it.
 */
import { invoke } from "@tauri-apps/api/core";
import { ask, save } from "@tauri-apps/plugin-dialog";
import {
  SaveAsFileSystemError,
  type OverwriteConfirmationPort,
  type SaveAsDialogPort,
  type SaveAsFileSystemPort,
  type SaveAsFileWrite,
} from "../workflow/domain/saveAsHostAdapter.js";

export interface ExportAtomicWritePayload {
  readonly path: string;
  readonly bytes: number[];
}

export function createTauriSaveAsDialogPort(): SaveAsDialogPort {
  return {
    async chooseDestination(options) {
      const selected = await save({
        defaultPath: options.defaultFileName,
        filters: [
          {
            name: options.extension.toUpperCase(),
            extensions: [options.extension],
          },
        ],
      });
      return selected ?? null;
    },
  };
}

export function createTauriOverwriteConfirmationPort(): OverwriteConfirmationPort {
  return {
    async confirmOverwrite(paths) {
      const listed = paths.join("\n");
      return ask(
        `Overwrite existing file(s)?\n\n${listed}`,
        {
          title: "OpenBook Export",
          kind: "warning",
        },
      );
    },
  };
}

export function createTauriSaveAsFileSystemPort(): SaveAsFileSystemPort {
  return {
    async exists(path) {
      try {
        return await invoke<boolean>("export_path_exists", { path });
      } catch (error) {
        throw new SaveAsFileSystemError(
          "UNWRITABLE",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    async writeAtomically(files: readonly SaveAsFileWrite[]) {
      const payload: ExportAtomicWritePayload[] = files.map((file) => ({
        path: file.path,
        bytes: Array.from(file.bytes),
      }));
      try {
        await invoke("export_write_atomically", { files: payload });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const code = /unwritable|permission|access|readonly/i.test(message)
          ? "UNWRITABLE"
          : "WRITE_FAILED";
        throw new SaveAsFileSystemError(code, message);
      }
    },
  };
}
