// SPDX-License-Identifier: Apache-2.0

import type { Book } from "@openbook/book-model";
import { processBookAssets } from "./assets/asset-pipeline.js";
import { resolveProductionTypstRuntime } from "./resolve-typst.js";
import { serializeBookToTypst } from "./typst-serializer.js";
import { compileTypstToPdf } from "./typst-runner.js";
import {
  TypstRuntimeError,
  type PdfBuildOptions,
  type PdfPublication,
} from "./types.js";

/**
 * Parses `Book.metadata.publishedAt` into a Unix timestamp (seconds).
 * Accepts ISO-8601 dates/datetimes. Falls back to `0` for determinism.
 */
export function resolveCreationTimestamp(
  book: Readonly<Book>,
  override?: number,
): number {
  if (typeof override === "number" && Number.isFinite(override) && override >= 0) {
    return Math.trunc(override);
  }

  const raw = book.metadata.publishedAt?.trim();
  if (!raw) {
    return 0;
  }

  // Date-only values are treated as UTC midnight.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw;
  const ms = Date.parse(normalized);
  if (Number.isNaN(ms)) {
    return 0;
  }
  return Math.trunc(ms / 1000);
}

/**
 * Builds an in-memory, deterministic PDF publication from a canonical Book Model.
 *
 * Guarantees (ADR-0013):
 * 1. Consumes the Book Model as strictly read-only.
 * 2. Does not mutate the Book or leak PDF layout into Book Model types.
 * 3. Invokes Typst via discrete argv (no shell interpolation).
 * 4. Uses `--ignore-system-fonts`, `--font-path`, and `--creation-timestamp`.
 * 5. Never downloads Typst or fonts at publication time.
 */
export async function buildPdf(
  book: Readonly<Book>,
  options?: PdfBuildOptions,
): Promise<PdfPublication> {
  const assetResult = await processBookAssets(
    book,
    options?.assetResolver,
    options?.onDiagnostic,
  );

  const runtime = resolveProductionTypstRuntime();
  const typstExecutablePath = options?.typstExecutablePath ?? runtime?.typstExecutablePath;
  const fontPath = options?.fontPath ?? runtime?.fontsDirectory;

  if (!typstExecutablePath) {
    throw new TypstRuntimeError(
      "MISSING_TYPST",
      "Typst executable not found. Run `npm run packaging:build -w @openbook/pdf` or pass typstExecutablePath.",
    );
  }
  if (!fontPath) {
    throw new TypstRuntimeError(
      "MISSING_FONTS",
      "Font directory not found. Run `npm run packaging:build -w @openbook/pdf` or pass fontPath.",
    );
  }

  const typstSource = serializeBookToTypst(book, assetResult.resolvedImagesByAssetId);
  const creationTimestamp = resolveCreationTimestamp(book, options?.creationTimestamp);

  const compiled = await compileTypstToPdf({
    typstExecutablePath,
    fontPath,
    typstSource,
    creationTimestamp,
    resolvedImages: assetResult.resolvedImagesByAssetId,
    workDirectory: options?.workDirectory,
  });

  return {
    pdf: compiled.pdf,
    diagnostics: assetResult.diagnostics,
    typstSource,
  };
}
