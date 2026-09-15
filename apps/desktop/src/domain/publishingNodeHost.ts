// SPDX-License-Identifier: Apache-2.0
/**
 * Node-only publishing host adapters (Typst PDF + EPUBCheck).
 * The Vite desktop bundle aliases this module to a browser stub.
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
    options: { assetResolver: AssetResolver; signal?: AbortSignal },
  ): Promise<PdfPublication> {
    throwIfAborted(options.signal);

    const {
      processBookAssets,
      resolveProductionTypstRuntime,
      serializeBookToTypst,
      resolveCreationTimestamp,
      TypstRuntimeError,
    } = await import("@openbook/pdf");

    const assetResult = await processBookAssets(book, options.assetResolver);
    throwIfAborted(options.signal);

    const runtime = resolveProductionTypstRuntime();
    const typstExecutablePath = runtime?.typstExecutablePath;
    const fontPath = runtime?.fontsDirectory;

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
