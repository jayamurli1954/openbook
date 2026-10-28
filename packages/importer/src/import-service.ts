// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import { importDocx } from "./docx/docx-import.js";
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

const SUPPORTED: readonly SupportedImportFormat[] = ["markdown", "text", "docx"];

/**
 * ImportService (ADR-0015; `.docx` per ADR-0040).
 * Pure transformation: pre-decoded string or `.docx` bytes → canonical Book. No persistence/workflow.
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
            message: `Unsupported import format "${String(source.format)}". Supported: markdown, text, docx.`,
          },
        ],
        stats: emptyStats(),
      };
    }

    if (source.format === "docx") {
      if (!(source.bytes instanceof Uint8Array)) {
        return invalidContent("A .docx ImportSource must carry its file bytes as a Uint8Array.");
      }
      // ADR-0040 §2.1: seed from the bytes, not the filename, so different files never share ids.
      const seedMaterial =
        options?.idSeed ?? `docx\n${createHash("sha256").update(source.bytes).digest("hex")}`;
      return importDocx(source, options, new DeterministicIdFactory(seedMaterial));
    }

    if (typeof source.content !== "string") {
      return invalidContent("ImportSource.content must be a pre-decoded JavaScript Unicode string.");
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

function invalidContent(message: string): ImportResult {
  return {
    success: false,
    issues: [{ code: "INVALID_CONTENT", severity: "fatal", message }],
    stats: emptyStats(),
  };
}
