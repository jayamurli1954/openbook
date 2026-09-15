// SPDX-License-Identifier: Apache-2.0
/**
 * Node-only publishing host adapters (Typst PDF + EPUBCheck).
 * The Vite desktop bundle aliases this module to a browser stub.
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Book } from "@openbook/book-model";
import type { AssetResolver } from "@openbook/assets";
import type { PdfPublication } from "@openbook/pdf";
import type { ValidationReport, ValidatorService } from "@openbook/validator";

export const defaultPdfPublisher = {
  async publishPdf(
    book: Readonly<Book>,
    options: { assetResolver: AssetResolver; signal?: AbortSignal },
  ): Promise<PdfPublication> {
    const { buildPdf } = await import("@openbook/pdf");
    return buildPdf(book, { assetResolver: options.assetResolver });
  },
};

export const productionValidatorService: ValidatorService = {
  async validateEpub(epubPath: string): Promise<ValidationReport> {
    const { EpubCheckSubprocessAdapter, resolveProductionRuntime } = await import(
      "@openbook/validator"
    );
    const runtime = resolveProductionRuntime();
    if (runtime === null) {
      return {
        validatorName: "EPUBCheck",
        validatorVersion: "5.3.0",
        targetPath: epubPath,
        isValid: false,
        summary: {
          totalFatal: 1,
          totalErrors: 1,
          totalWarnings: 0,
          totalInfos: 0,
          isValid: false,
        },
        messages: [
          {
            id: "MISSING-RUNTIME",
            severity: "FATAL",
            message: "Production EPUBCheck runtime is not installed.",
            locations: [],
          },
        ],
        rawExitCode: 1,
        failureKind: "missing_runtime",
      };
    }
    const adapter = new EpubCheckSubprocessAdapter({
      javaExecutablePath: runtime.javaExecutablePath,
      epubcheckJarPath: runtime.epubcheckJarPath,
    });
    return adapter.validateEpub(epubPath);
  },
};

export async function writeTempEpubAndValidate(
  bytes: Uint8Array,
  validator: ValidatorService,
): Promise<ValidationReport> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "openbook-export-epub-"));
  const epubPath = path.join(dir, "book.epub");
  try {
    await writeFile(epubPath, bytes);
    return await validator.validateEpub(epubPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
