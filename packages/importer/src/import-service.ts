// SPDX-License-Identifier: Apache-2.0
import { DeterministicIdFactory } from "./ids.js";
import { importMarkdown } from "./markdown-import.js";
import { emptyStats } from "./metadata.js";
import { importPlainText } from "./text-import.js";
import type {
  IImportService,
  ImportOptions,
  ImportResult,
  ImportSource,
  SupportedImportFormat,
} from "./types.js";

const SUPPORTED: readonly SupportedImportFormat[] = ["markdown", "text"];

/**
 * Gate 7 Slice 2 ImportService (ADR-0015).
 * Pure transformation: pre-decoded string → canonical Book. No persistence/workflow.
 */
export class ImportService implements IImportService {
  canImport(format: string): boolean {
    return (SUPPORTED as readonly string[]).includes(format);
  }

  async import(
    source: ImportSource,
    options?: ImportOptions,
  ): Promise<ImportResult> {
    if (!this.canImport(source.format)) {
      return {
        success: false,
        issues: [
          {
            code: "UNKNOWN_FORMAT",
            severity: "fatal",
            message: `Unsupported import format "${String(source.format)}". Supported: markdown, text.`,
          },
        ],
        stats: emptyStats(),
      };
    }

    if (typeof source.content !== "string") {
      return {
        success: false,
        issues: [
          {
            code: "INVALID_CONTENT",
            severity: "fatal",
            message:
              "ImportSource.content must be a pre-decoded JavaScript Unicode string.",
          },
        ],
        stats: emptyStats(),
      };
    }

    const seedMaterial =
      options?.idSeed ??
      `${source.format}\n${source.filename ?? ""}\n${source.content}`;
    const ids = new DeterministicIdFactory(seedMaterial);

    if (source.format === "markdown") {
      return importMarkdown(source, options, ids);
    }
    return importPlainText(source, options, ids);
  }
}
