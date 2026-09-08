// SPDX-License-Identifier: Apache-2.0
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ResolvedImageMetadata } from "./assets/asset-pipeline.js";
import { TypstRuntimeError } from "./types.js";

const execFileAsync = promisify(execFile);

export interface TypstCompileRequest {
  typstExecutablePath: string;
  fontPath: string;
  typstSource: string;
  creationTimestamp: number;
  resolvedImages: ReadonlyMap<string, ResolvedImageMetadata>;
  workDirectory?: string;
}

export interface TypstCompileResult {
  pdf: Uint8Array;
  workDirectory: string;
}

/**
 * Invokes Typst as an isolated child process with discrete argv (no shell).
 */
export async function compileTypstToPdf(
  request: TypstCompileRequest,
): Promise<TypstCompileResult> {
  const { typstExecutablePath, fontPath, typstSource, creationTimestamp } = request;

  let workDirectory = request.workDirectory;
  let createdTemp = false;
  if (!workDirectory) {
    workDirectory = await mkdtemp(path.join(os.tmpdir(), "openbook-pdf-"));
    createdTemp = true;
  } else {
    mkdirSync(workDirectory, { recursive: true });
  }

  let pdf: Uint8Array | undefined;

  try {
    const assetsDir = path.join(workDirectory, "assets");
    mkdirSync(assetsDir, { recursive: true });

    for (const image of request.resolvedImages.values()) {
      writeFileSync(path.join(workDirectory, image.relativePath), image.content);
    }

    const inputPath = path.join(workDirectory, "book.typ");
    const outputPath = path.join(workDirectory, "book.pdf");
    writeFileSync(inputPath, typstSource, "utf8");

    const args = [
      "compile",
      "--format",
      "pdf",
      "--creation-timestamp",
      String(creationTimestamp),
      "--ignore-system-fonts",
      "--font-path",
      fontPath,
      "--root",
      workDirectory,
      inputPath,
      outputPath,
    ];

    try {
      await execFileAsync(typstExecutablePath, args, {
        windowsHide: true,
        maxBuffer: 16 * 1024 * 1024,
      });
    } catch (err: unknown) {
      const stderr =
        err && typeof err === "object" && "stderr" in err
          ? String((err as { stderr?: Buffer | string }).stderr ?? "")
          : "";
      const message = err instanceof Error ? err.message : String(err);
      throw new TypstRuntimeError(
        "TYPST_COMPILE_FAILED",
        `Typst compile failed: ${message}${stderr ? `\n${stderr}` : ""}`,
        { cause: err },
      );
    }

    try {
      pdf = new Uint8Array(readFileSync(outputPath));
    } catch (err: unknown) {
      throw new TypstRuntimeError(
        "TYPST_OUTPUT_MISSING",
        `Typst did not produce output PDF at ${outputPath}.`,
        { cause: err },
      );
    }

    if (pdf.length === 0) {
      throw new TypstRuntimeError("TYPST_OUTPUT_EMPTY", "Typst produced an empty PDF.");
    }

    return { pdf, workDirectory };
  } finally {
    if (createdTemp) {
      try {
        rmSync(workDirectory, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup on success, failure, and timeout.
      }
    }
  }
}
