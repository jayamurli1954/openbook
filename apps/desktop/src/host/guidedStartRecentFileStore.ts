// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 4 — Node file-backed text store for guided-start recent list.
 * Used in durability tests; Tauri app-data wiring may reuse the same JSON shape.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GuidedStartRecentTextStorePort } from "../workflow/domain/guidedStartRecentStore.js";

export function createFileGuidedStartRecentTextStore(
  filePath: string,
): GuidedStartRecentTextStorePort {
  return {
    async readText() {
      try {
        return await readFile(filePath, "utf8");
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code?: unknown }).code === "ENOENT"
        ) {
          return null;
        }
        throw err;
      }
    },
    async writeText(text) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, text, "utf8");
    },
  };
}
