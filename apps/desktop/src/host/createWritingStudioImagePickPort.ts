// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 4 — Tauri image pick + read ports.
 *
 * Uses official dialog plugin for open; dedicated Rust command to read bytes
 * (no broad filesystem plugin). Cancelled dialogs return cancelled.
 */
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type {
  WritingStudioImagePickPort,
  WritingStudioPickedImage,
} from "../workflow/domain/writingStudioImageAdapter.js";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp"] as const;

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

export async function readAssetBytesFromPath(
  path: string,
): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("asset_read_bytes", { path });
  return Uint8Array.from(bytes);
}

export function createTauriWritingStudioImagePickPort(): WritingStudioImagePickPort {
  return {
    async pickImage(): Promise<WritingStudioPickedImage> {
      const selected = await open({
        multiple: false,
        title: "Insert image",
        filters: [
          {
            name: "Images",
            extensions: [...IMAGE_EXTENSIONS],
          },
        ],
      });
      if (selected === null) {
        return { kind: "cancelled" };
      }
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path || typeof path !== "string") {
        return { kind: "cancelled" };
      }
      const content = await readAssetBytesFromPath(path);
      return {
        kind: "bytes",
        content,
        originalFilename: basename(path) || "image.bin",
      };
    },
  };
}

/**
 * Browser/dev fallback when Tauri dialogs are unavailable (Vite-only).
 * Cancelled file chooser yields cancelled (no Book mutation).
 */
export function createBrowserWritingStudioImagePickPort(): WritingStudioImagePickPort {
  return {
    async pickImage(): Promise<WritingStudioPickedImage> {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/gif,image/webp";
        let settled = false;
        const finish = (value: WritingStudioPickedImage) => {
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
          void file.arrayBuffer().then(
            (buffer) => {
              finish({
                kind: "bytes",
                content: new Uint8Array(buffer),
                originalFilename: file.name || "image.bin",
              });
            },
            () => finish({ kind: "cancelled" }),
          );
        });
        input.addEventListener("cancel", () => {
          finish({ kind: "cancelled" });
        });
        input.click();
      });
    },
  };
}

export function createWritingStudioImagePickPort(): WritingStudioImagePickPort {
  const hasTauri =
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown })
        .__TAURI_INTERNALS__ ||
        (window as Window & { __TAURI__?: unknown }).__TAURI__,
    );
  return hasTauri
    ? createTauriWritingStudioImagePickPort()
    : createBrowserWritingStudioImagePickPort();
}
