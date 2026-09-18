// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 9 Slice 2 — Native Save-As Host Contract/Adapter (ADR-0030).
 *
 * Destination selection, filename policy, overwrite confirmation, and atomic
 * writes live here. Publishing engines, DesktopStudioCoordinator, React, DOM,
 * and Tauri APIs remain outside this adapter; native dialogs and filesystem
 * I/O are injected ports.
 */

export type SaveAsFormat = "epub" | "html" | "pdf";

export const SAVE_AS_EXTENSION_BY_FORMAT: Record<SaveAsFormat, string> = {
  epub: "epub",
  html: "html",
  pdf: "pdf",
};

export const SAVE_AS_FILENAME_MAX_LENGTH = 200;

export type SaveAsHostErrorCode =
  | "EXPORT_CANCELLED"
  | "EXPORT_DESTINATION_INVALID"
  | "EXPORT_DESTINATION_UNWRITABLE"
  | "EXPORT_OVERWRITE_DECLINED"
  | "EXPORT_WRITE_FAILED";

export type SaveAsHostOutcome =
  | {
      readonly ok: true;
      readonly path: string;
      readonly writtenPaths: readonly string[];
    }
  | {
      readonly ok: false;
      readonly code: SaveAsHostErrorCode;
      readonly message: string;
    };

export interface SaveAsCompanionFile {
  readonly relativePath: string;
  readonly bytes: Uint8Array;
}

export interface SaveAsHostRequest {
  readonly suggestedTitle: string;
  readonly format: SaveAsFormat;
  readonly bytes: Uint8Array;
  readonly companionFiles?: readonly SaveAsCompanionFile[];
  readonly signal?: AbortSignal;
}

export interface SaveAsDialogOptions {
  readonly defaultFileName: string;
  readonly extension: string;
}

export interface SaveAsDialogPort {
  chooseDestination(options: SaveAsDialogOptions): Promise<string | null>;
}

export interface OverwriteConfirmationPort {
  confirmOverwrite(paths: readonly string[]): Promise<boolean>;
}

export interface SaveAsFileWrite {
  readonly path: string;
  readonly bytes: Uint8Array;
}

export type SaveAsFileSystemErrorCode = "UNWRITABLE" | "WRITE_FAILED";

export class SaveAsFileSystemError extends Error {
  readonly code: SaveAsFileSystemErrorCode;

  constructor(code: SaveAsFileSystemErrorCode, message: string) {
    super(message);
    this.name = "SaveAsFileSystemError";
    this.code = code;
  }
}

export interface SaveAsFileSystemPort {
  exists(path: string): Promise<boolean>;
  writeAtomically(files: readonly SaveAsFileWrite[]): Promise<void>;
}

export interface ISaveAsHostAdapter {
  save(request: SaveAsHostRequest): Promise<SaveAsHostOutcome>;
}

const WINDOWS_RESERVED_STEM = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function sanitizeSaveAsFileName(rawTitle: string): string {
  let name = rawTitle.replace(UNSAFE_FILENAME_CHARS, "_").trim();
  name = name.replace(/[. ]+$/g, "");
  if (name.length > SAVE_AS_FILENAME_MAX_LENGTH) {
    name = name.slice(0, SAVE_AS_FILENAME_MAX_LENGTH).replace(/[. ]+$/g, "");
  }
  if (!name || name === "." || name === "..") {
    return "untitled";
  }
  const stem = name.split(".")[0] ?? name;
  if (WINDOWS_RESERVED_STEM.test(stem)) {
    name = `_${name}`;
  }
  return name;
}

export function defaultSaveAsFileName(title: string, format: SaveAsFormat): string {
  return `${sanitizeSaveAsFileName(title)}.${SAVE_AS_EXTENSION_BY_FORMAT[format]}`;
}

export function isSafeCompanionRelativePath(relativePath: string): boolean {
  if (!relativePath || relativePath !== relativePath.trim()) {
    return false;
  }
  if (relativePath.includes("\0") || /[\u0000-\u001f]/.test(relativePath)) {
    return false;
  }
  if (relativePath.startsWith("/") || relativePath.startsWith("\\")) {
    return false;
  }
  if (/^[a-zA-Z]:/.test(relativePath)) {
    return false;
  }
  const parts = relativePath.split(/[/\\]/);
  if (parts.length === 0) {
    return false;
  }
  return parts.every((part) => part.length > 0 && part !== "." && part !== "..");
}

function failed(code: SaveAsHostErrorCode, message: string): SaveAsHostOutcome {
  return { ok: false, code, message };
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

function cancelled(message: string): SaveAsHostOutcome {
  return failed("EXPORT_CANCELLED", message);
}

function splitDestination(path: string): { dir: string; base: string } {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (index === -1) {
    return { dir: "", base: path };
  }
  return { dir: path.slice(0, index), base: path.slice(index + 1) };
}

function destinationSeparator(path: string): "/" | "\\" {
  return path.includes("\\") && !path.includes("/") ? "\\" : "/";
}

function joinDestination(dir: string, relativePath: string, destination: string): string {
  const separator = destinationSeparator(destination);
  const relative = relativePath.split(/[/\\]/).join(separator);
  if (!dir) {
    return relative;
  }
  return `${dir}${separator}${relative}`;
}

function fileExtension(fileName: string): string | undefined {
  const index = fileName.lastIndexOf(".");
  if (index <= 0 || index === fileName.length - 1) {
    return undefined;
  }
  return fileName.slice(index + 1);
}

function isInvalidDestinationPath(path: string): boolean {
  if (!path || path !== path.trim()) {
    return true;
  }
  if (path.includes("\0") || /[\u0000-\u001f]/.test(path)) {
    return true;
  }
  if (path.endsWith("/") || path.endsWith("\\")) {
    return true;
  }
  const { base } = splitDestination(path);
  return !base || base === "." || base === "..";
}

function applyExpectedExtension(destination: string, extension: string): string | undefined {
  if (isInvalidDestinationPath(destination)) {
    return undefined;
  }
  const { dir, base } = splitDestination(destination);
  const current = fileExtension(base);
  if (!current) {
    const nextBase = `${base}.${extension}`;
    return dir ? joinDestination(dir, nextBase, destination) : nextBase;
  }
  if (current.toLowerCase() !== extension.toLowerCase()) {
    return undefined;
  }
  return destination;
}

function mapFileSystemError(error: unknown): SaveAsHostOutcome {
  if (error instanceof SaveAsFileSystemError && error.code === "UNWRITABLE") {
    return failed("EXPORT_DESTINATION_UNWRITABLE", error.message);
  }
  if (error instanceof SaveAsFileSystemError) {
    return failed("EXPORT_WRITE_FAILED", error.message);
  }
  const message = error instanceof Error ? error.message : "Filesystem write failed.";
  return failed("EXPORT_WRITE_FAILED", message);
}

export class SaveAsHostAdapter implements ISaveAsHostAdapter {
  readonly #dialog: SaveAsDialogPort;
  readonly #overwrite: OverwriteConfirmationPort;
  readonly #fileSystem: SaveAsFileSystemPort;

  constructor(
    dialog: SaveAsDialogPort,
    overwrite: OverwriteConfirmationPort,
    fileSystem: SaveAsFileSystemPort,
  ) {
    this.#dialog = dialog;
    this.#overwrite = overwrite;
    this.#fileSystem = fileSystem;
  }

  async save(request: SaveAsHostRequest): Promise<SaveAsHostOutcome> {
    if (isAborted(request.signal)) {
      return cancelled("Save As was cancelled before destination selection.");
    }

    const extension = SAVE_AS_EXTENSION_BY_FORMAT[request.format];
    const defaultFileName = defaultSaveAsFileName(request.suggestedTitle, request.format);
    const selected = await this.#dialog.chooseDestination({
      defaultFileName,
      extension,
    });

    if (selected === null) {
      return cancelled("Save As destination selection was cancelled.");
    }
    if (isAborted(request.signal)) {
      return cancelled("Save As was cancelled after destination selection.");
    }

    const destination = applyExpectedExtension(selected, extension);
    if (!destination) {
      return failed(
        "EXPORT_DESTINATION_INVALID",
        `Destination "${selected}" is not a writable ${extension} file path.`,
      );
    }

    const writes: SaveAsFileWrite[] = [{ path: destination, bytes: request.bytes }];
    const seen = new Set<string>([destination.toLowerCase()]);
    const { dir } = splitDestination(destination);

    for (const companion of request.companionFiles ?? []) {
      if (!isSafeCompanionRelativePath(companion.relativePath)) {
        return failed(
          "EXPORT_DESTINATION_INVALID",
          `Companion path "${companion.relativePath}" is not a safe relative destination.`,
        );
      }
      const companionPath = joinDestination(dir, companion.relativePath, destination);
      const key = companionPath.toLowerCase();
      if (seen.has(key)) {
        return failed(
          "EXPORT_DESTINATION_INVALID",
          `Companion path "${companion.relativePath}" collides with another write target.`,
        );
      }
      seen.add(key);
      writes.push({ path: companionPath, bytes: companion.bytes });
    }

    if (isAborted(request.signal)) {
      return cancelled("Save As was cancelled before the filesystem write.");
    }

    let existing: string[];
    try {
      existing = [];
      for (const write of writes) {
        if (await this.#fileSystem.exists(write.path)) {
          existing.push(write.path);
        }
      }
    } catch (error) {
      return mapFileSystemError(error);
    }

    if (existing.length > 0) {
      const accepted = await this.#overwrite.confirmOverwrite(existing);
      if (!accepted) {
        return failed(
          "EXPORT_OVERWRITE_DECLINED",
          "Existing destination was not overwritten.",
        );
      }
    }

    if (isAborted(request.signal)) {
      return cancelled("Save As was cancelled before the filesystem write.");
    }

    try {
      await this.#fileSystem.writeAtomically(writes);
    } catch (error) {
      return mapFileSystemError(error);
    }

    return {
      ok: true,
      path: destination,
      writtenPaths: writes.map((write) => write.path),
    };
  }
}
