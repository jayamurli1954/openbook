// SPDX-License-Identifier: Apache-2.0
/**
 * Node-only publishing host adapters (Typst PDF + EPUBCheck).
 * The Vite desktop bundle aliases this module to a browser stub.
 *
 * Gate 10 Slice 3: resolves Gate 5/6 runtimes through
 * `resolveDesktopPublishingRuntimes` (packaged resource tree first, developer
 * `.cache/` fallback only when no packaged root is in effect).
 *
 * PDF cancellation: @openbook/pdf buildPdf/compileTypstToPdf do not accept
 * AbortSignal. This host owns the Typst child process and passes AbortSignal
 * into execFile so abort terminates the subprocess (ADR-0023 INV-13).
 */
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { Book } from "@openbook/book-model";
import type { AssetResolver } from "@openbook/assets";
import type { PdfPublication } from "@openbook/pdf";
import type { ValidationReport, ValidatorService } from "@openbook/validator";

const execFileAsync = promisify(execFile);

function createAbortError(message = "The operation was aborted."): Error {
  const err = new Error(message);
  err.name = "AbortError";
  return err;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw createAbortError();
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

/**
 * Discrete-argv execFile with AbortSignal termination of the child process.
 * Exported for unit coverage of the host cancellation boundary.
 */
export async function execFileWithAbortSignal(
  file: string,
  args: readonly string[],
  options?: {
    signal?: AbortSignal;
    maxBuffer?: number;
  },
): Promise<{ stdout: string | Buffer; stderr: string | Buffer }> {
  throwIfAborted(options?.signal);
  try {
    return await execFileAsync(file, [...args], {
      windowsHide: true,
      maxBuffer: options?.maxBuffer ?? 16 * 1024 * 1024,
      signal: options?.signal,
    });
  } catch (err: unknown) {
    if (options?.signal?.aborted || isAbortError(err)) {
      throw createAbortError(err instanceof Error ? err.message : undefined);
    }
    throw err;
  }
}

interface HostTypstImage {
  readonly relativePath: string;
  readonly content: Uint8Array;
}

/**
 * Host-owned Typst compile: mirrors @openbook/pdf typst-runner argv while
 * propagating AbortSignal into the child process.
 */
export async function invokeTypstCompileWithAbort(
  request: {
    typstExecutablePath: string;
    fontPath: string;
    typstSource: string;
    creationTimestamp: number;
    resolvedImages: ReadonlyMap<string, HostTypstImage>;
    signal?: AbortSignal;
    workDirectory?: string;
  },
): Promise<Uint8Array> {
  throwIfAborted(request.signal);

  let workDirectory = request.workDirectory;
  let createdTemp = false;
  if (!workDirectory) {
    workDirectory = await mkdtemp(path.join(os.tmpdir(), "openbook-pdf-"));
    createdTemp = true;
  } else {
    mkdirSync(workDirectory, { recursive: true });
  }

  try {
    throwIfAborted(request.signal);
    const assetsDir = path.join(workDirectory, "assets");
    mkdirSync(assetsDir, { recursive: true });

    for (const image of request.resolvedImages.values()) {
      writeFileSync(path.join(workDirectory, image.relativePath), image.content);
    }

    const inputPath = path.join(workDirectory, "book.typ");
    const outputPath = path.join(workDirectory, "book.pdf");
    writeFileSync(inputPath, request.typstSource, "utf8");

    const args = [
      "compile",
      "--format",
      "pdf",
      "--creation-timestamp",
      String(request.creationTimestamp),
      "--ignore-system-fonts",
      "--font-path",
      request.fontPath,
      "--root",
      workDirectory,
      inputPath,
      outputPath,
    ];

    try {
      await execFileWithAbortSignal(request.typstExecutablePath, args, {
        signal: request.signal,
      });
    } catch (err: unknown) {
      if (isAbortError(err) || request.signal?.aborted) {
        throw createAbortError(err instanceof Error ? err.message : undefined);
      }
      const stderr =
        err && typeof err === "object" && "stderr" in err
          ? String((err as { stderr?: Buffer | string }).stderr ?? "")
          : "";
      const message = err instanceof Error ? err.message : String(err);
      const runtimeErr = new Error(
        `Typst compile failed: ${message}${stderr ? `\n${stderr}` : ""}`,
      );
      runtimeErr.name = "TypstRuntimeError";
      throw runtimeErr;
    }

    throwIfAborted(request.signal);

    let pdf: Uint8Array;
    try {
      pdf = new Uint8Array(readFileSync(outputPath));
    } catch (err: unknown) {
      const runtimeErr = new Error(
        `Typst did not produce output PDF at ${outputPath}.`,
      );
      runtimeErr.name = "TypstRuntimeError";
      (runtimeErr as Error & { cause?: unknown }).cause = err;
      throw runtimeErr;
    }

    if (pdf.length === 0) {
      const runtimeErr = new Error("Typst produced an empty PDF.");
      runtimeErr.name = "TypstRuntimeError";
      throw runtimeErr;
    }

    return pdf;
  } finally {
    if (createdTemp) {
      try {
        rmSync(workDirectory, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup on success, failure, and abort.
      }
    }
  }
}

export const defaultPdfPublisher = {
  async publishPdf(
    book: Readonly<Book>,
    options: {
      assetResolver: AssetResolver;
      signal?: AbortSignal;
      resourceRoot?: string | null;
      validatorRuntimeRoot?: string;
      pdfRuntimeRoot?: string;
    },
  ): Promise<PdfPublication> {
    throwIfAborted(options.signal);

    const {
      processBookAssets,
      serializeBookToTypst,
      resolveCreationTimestamp,
      TypstRuntimeError,
    } = await import("@openbook/pdf");
    const {
      resolveDesktopPublishingRuntimes,
      packagedMissingRuntimeMessage,
    } = await import("../host/packagedPublishingHost.js");

    const assetResult = await processBookAssets(book, options.assetResolver);
    throwIfAborted(options.signal);

    const resolved = await resolveDesktopPublishingRuntimes({
      resourceRoot: options.resourceRoot,
      validatorRuntimeRoot: options.validatorRuntimeRoot,
      pdfRuntimeRoot: options.pdfRuntimeRoot,
    });

    let typstExecutablePath: string | undefined;
    let fontPath: string | undefined;

    if (resolved.mode === "packaged") {
      typstExecutablePath = resolved.pdf.typstExecutablePath;
      fontPath = resolved.pdf.fontsDirectory;
    } else if (resolved.mode === "developer") {
      typstExecutablePath = resolved.pdf?.typstExecutablePath;
      fontPath = resolved.pdf?.fontsDirectory;
    } else {
      throw new TypstRuntimeError(
        "MISSING_TYPST",
        packagedMissingRuntimeMessage(resolved.error),
      );
    }

    if (!typstExecutablePath) {
      throw new TypstRuntimeError(
        "MISSING_TYPST",
        "Typst executable not found under the packaged resource tree or developer runtime cache. System Typst is not used as a recovery path.",
      );
    }
    if (!fontPath) {
      throw new TypstRuntimeError(
        "MISSING_FONTS",
        "Font directory not found under the packaged resource tree or developer runtime cache. System fonts are not used for Typst packaging.",
      );
    }

    const typstSource = serializeBookToTypst(book, assetResult.resolvedImagesByAssetId);
    const creationTimestamp = resolveCreationTimestamp(book);
    throwIfAborted(options.signal);

    const pdf = await invokeTypstCompileWithAbort({
      typstExecutablePath,
      fontPath,
      typstSource,
      creationTimestamp,
      resolvedImages: assetResult.resolvedImagesByAssetId,
      signal: options.signal,
    });

    return {
      pdf,
      diagnostics: assetResult.diagnostics,
      typstSource,
    };
  },
};

export const productionValidatorService: ValidatorService = {
  async validateEpub(epubPath: string): Promise<ValidationReport> {
    const { EpubCheckSubprocessAdapter } = await import("@openbook/validator");
    const {
      resolveDesktopPublishingRuntimes,
      missingRuntimeValidationReport,
      developerMissingRuntimeValidationReport,
    } = await import("../host/packagedPublishingHost.js");

    const resolved = await resolveDesktopPublishingRuntimes();

    if (resolved.mode === "missing_runtime") {
      return missingRuntimeValidationReport(epubPath, resolved.error);
    }

    const runtime =
      resolved.mode === "packaged" ? resolved.validator : resolved.validator;
    if (runtime === null) {
      return developerMissingRuntimeValidationReport(epubPath);
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
