// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 3 — cover picture pick port.
 *
 * Same host path as the Writing Studio picker (dialog plugin + the existing
 * asset_read_bytes command); filters are limited to the formats a cover
 * may use. No new Tauri command or permission.
 */
import { open } from "@tauri-apps/plugin-dialog";
import type {
  CoverImagePickPort,
  CoverPickedImage,
} from "../workflow/domain/coverWizardFields.js";
import { readAssetBytesFromPath } from "./createWritingStudioImagePickPort.js";

const COVER_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

export function createTauriCoverImagePickPort(): CoverImagePickPort {
  return {
    async pickImage(): Promise<CoverPickedImage> {
      const selected = await open({
        multiple: false,
        title: "Choose a cover picture",
        filters: [{ name: "JPEG or PNG pictures", extensions: [...COVER_EXTENSIONS] }],
      });
      const path = Array.isArray(selected) ? selected[0] : selected;
      if (!path || typeof path !== "string") {
        return { kind: "cancelled" };
      }
      const content = await readAssetBytesFromPath(path);
      return { kind: "bytes", content, originalFilename: basename(path) || "cover.bin" };
    },
  };
}

/** Browser/dev fallback when Tauri dialogs are unavailable (Vite-only). */
export function createBrowserCoverImagePickPort(): CoverImagePickPort {
  return {
    async pickImage(): Promise<CoverPickedImage> {
      return new Promise((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg";
        let settled = false;
        const finish = (value: CoverPickedImage) => {
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
            (buffer) =>
              finish({
                kind: "bytes",
                content: new Uint8Array(buffer),
                originalFilename: file.name || "cover.bin",
              }),
            () => finish({ kind: "cancelled" }),
          );
        });
        input.addEventListener("cancel", () => finish({ kind: "cancelled" }));
        input.click();
      });
    },
  };
}

export function createCoverImagePickPort(): CoverImagePickPort {
  const hasTauri =
    typeof window !== "undefined" &&
    Boolean(
      (window as Window & { __TAURI_INTERNALS__?: unknown; __TAURI__?: unknown })
        .__TAURI_INTERNALS__ ||
        (window as Window & { __TAURI__?: unknown }).__TAURI__,
    );
  return hasTauri ? createTauriCoverImagePickPort() : createBrowserCoverImagePickPort();
}
