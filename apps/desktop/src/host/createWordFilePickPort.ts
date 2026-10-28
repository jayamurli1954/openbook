// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0040 Slice 4 — host file picking for Word (.docx) import.
 *
 * Tauri: native dialog filtered to .docx, then `docx_read_bytes`, which checks the
 * file size before reading and returns the bytes as a binary IPC response.
 * Browser/dev fallback: <input type="file">, checking File.size before reading.
 */
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import {
  WORD_IMPORT_MAX_FILE_BYTES,
  type WordFilePick,
  type WordFilePickPort,
} from "../workflow/domain/wordImport.js";

const TOO_LARGE = /^DOCX_TOO_LARGE:(\d+)$/;

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

export function createTauriWordFilePickPort(): WordFilePickPort {
  return {
    async pickWordFile(): Promise<WordFilePick> {
      const selected = await open({
        multiple: false,
        title: "Import a Word file",
        filters: [{ name: "Word documents", extensions: ["docx"] }],
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path || typeof path !== "string") return { kind: "cancelled" };
      try {
        const buffer = await invoke<ArrayBuffer>("docx_read_bytes", { path });
        return { kind: "bytes", content: new Uint8Array(buffer), originalFilename: basename(path) };
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        const tooLarge = TOO_LARGE.exec(detail);
        if (tooLarge) return { kind: "too-large", sizeBytes: Number(tooLarge[1]) };
        return { kind: "failed", detail };
      }
    },
  };
}

export function createBrowserWordFilePickPort(): WordFilePickPort {
  return {
    pickWordFile(): Promise<WordFilePick> {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        let settled = false;
        const finish = (value: WordFilePick) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };
        input.addEventListener("change", () => {
          const file = input.files?.[0];
          if (!file) {
            finish({ kind: "cancelled" });
            return;
          }
          if (file.size > WORD_IMPORT_MAX_FILE_BYTES) {
            finish({ kind: "too-large", sizeBytes: file.size });
            return;
          }
          file
            .arrayBuffer()
            .then((buffer) =>
              finish({ kind: "bytes", content: new Uint8Array(buffer), originalFilename: file.name }),
            )
            .catch((err: unknown) => finish({ kind: "failed", detail: String(err) }));
        });
        input.addEventListener("cancel", () => finish({ kind: "cancelled" }));
        // Some engines never fire "cancel". When the window gets focus back with no file
        // chosen, treat the chooser as closed so the import buttons do not stay busy.
        const onFocus = () => {
          window.removeEventListener("focus", onFocus);
          window.setTimeout(() => {
            if (!input.files || input.files.length === 0) finish({ kind: "cancelled" });
          }, 1000);
        };
        window.addEventListener("focus", onFocus);
        input.click();
      });
    },
  };
}

/** Tauri dialog when available, otherwise the browser file chooser. */
export function createWordFilePickPort(): WordFilePickPort {
  const isTauri =
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown }).__TAURI_INTERNALS__ ||
        (window as Window & { __TAURI__?: unknown }).__TAURI__,
    );
  return isTauri ? createTauriWordFilePickPort() : createBrowserWordFilePickPort();
}
