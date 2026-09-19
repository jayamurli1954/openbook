// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 6: project-package recovery from last known-good backup.
 *
 * Restores an existing `.openbook-backup-*` sibling tree. Never invents Book
 * content or rewrites digests to match corrupted files.
 */
import { access, readdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import type { ProjectPackageFsResult } from "./projectPackageFs.js";

export type ProjectPackageRecoveryErrorCode =
  | "PACKAGE_IO_ERROR"
  | "RECOVERY_BACKUP_MISSING"
  | "RECOVERY_AMBIGUOUS_BACKUP"
  | "MALFORMED_PACKAGE";

export interface ProjectPackageRecoverInput {
  projectRoot: string;
  /** Explicit backup directory when known. */
  backupRoot?: string;
  /** Discover `<basename>.openbook-backup-*` siblings under the parent directory. */
  discoverSiblingBackup?: boolean;
  /**
   * When true, replace an existing live root with the backup.
   * Default false: only restore when the live root is missing.
   */
  forceReplaceCorruptLive?: boolean;
}

export interface ProjectPackageRecoverSummary {
  projectRoot: string;
  restoredFrom: string;
}

function fail(
  code: ProjectPackageRecoveryErrorCode,
  message: string,
  details?: Record<string, unknown>,
): ProjectPackageFsResult<never> {
  return { ok: false, error: { code, message, details } };
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function discoverBackup(
  projectRoot: string,
): Promise<ProjectPackageFsResult<string>> {
  const parent = path.dirname(projectRoot);
  const base = path.basename(projectRoot);
  const prefix = `${base}.openbook-backup-`;
  let entries: string[];
  try {
    entries = await readdir(parent);
  } catch (err: unknown) {
    return fail("PACKAGE_IO_ERROR", "Failed to list package parent directory for backups.", {
      cause: String(err),
    });
  }

  const matches: string[] = [];
  for (const name of entries) {
    if (!name.startsWith(prefix)) continue;
    const full = path.join(parent, name);
    try {
      const info = await stat(full);
      if (info.isDirectory()) matches.push(full);
    } catch {
      // ignore unreadable entries
    }
  }

  if (matches.length === 0) {
    return fail(
      "RECOVERY_BACKUP_MISSING",
      "No sibling .openbook-backup-* directory is available to restore.",
    );
  }
  if (matches.length > 1) {
    matches.sort();
    return fail(
      "RECOVERY_AMBIGUOUS_BACKUP",
      "Multiple sibling backups found; pass backupRoot explicitly.",
      { backups: matches },
    );
  }
  return { ok: true, value: matches[0]! };
}

/**
 * Restore a project package from a last known-good backup directory.
 * Does not mutate Book JSON; only renames existing trees.
 */
export async function recoverProjectPackage(
  input: ProjectPackageRecoverInput,
): Promise<ProjectPackageFsResult<ProjectPackageRecoverSummary>> {
  const projectRoot = path.resolve(input.projectRoot);
  const liveExists = await pathExists(projectRoot);

  let backupRoot: string;
  if (input.backupRoot) {
    backupRoot = path.resolve(input.backupRoot);
  } else if (input.discoverSiblingBackup) {
    const discovered = await discoverBackup(projectRoot);
    if (!discovered.ok) return discovered;
    backupRoot = discovered.value;
  } else {
    return fail(
      "RECOVERY_BACKUP_MISSING",
      "No backupRoot provided and discoverSiblingBackup was not enabled.",
    );
  }

  if (!(await pathExists(backupRoot))) {
    return fail("RECOVERY_BACKUP_MISSING", "Specified backup directory does not exist.", {
      backupRoot,
    });
  }

  try {
    const info = await stat(backupRoot);
    if (!info.isDirectory()) {
      return fail("MALFORMED_PACKAGE", "Backup path must be a directory.", { backupRoot });
    }
  } catch (err: unknown) {
    return fail("PACKAGE_IO_ERROR", "Failed to stat backup directory.", {
      cause: String(err),
      backupRoot,
    });
  }

  if (liveExists && !input.forceReplaceCorruptLive) {
    return fail(
      "PACKAGE_IO_ERROR",
      "Live project package already exists; pass forceReplaceCorruptLive to replace it from backup.",
      { projectRoot, backupRoot },
    );
  }

  const parent = path.dirname(projectRoot);
  const quarantine = path.join(
    parent,
    `${path.basename(projectRoot)}.openbook-corrupt-${process.pid}-${Date.now()}`,
  );

  try {
    if (liveExists) {
      await rename(projectRoot, quarantine);
    }
    await rename(backupRoot, projectRoot);
    if (liveExists) {
      await rm(quarantine, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch (err: unknown) {
    // Best-effort undo if we moved live aside but failed to bring backup in.
    if (liveExists && (await pathExists(quarantine)) && !(await pathExists(projectRoot))) {
      await rename(quarantine, projectRoot).catch(() => undefined);
    }
    return fail("PACKAGE_IO_ERROR", "Failed to restore project package from backup.", {
      cause: String(err),
      backupRoot,
    });
  }

  return {
    ok: true,
    value: { projectRoot, restoredFrom: backupRoot },
  };
}
