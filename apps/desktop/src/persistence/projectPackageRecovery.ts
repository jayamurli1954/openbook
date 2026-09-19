// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0029 Slice 6 + ADR-0031 Slice 4: project-package recovery from last
 * known-good backup, plus discovery for explicit open-with-recover policy.
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

/**
 * ADR-0031 Slice 4: discovery snapshot for recover / discard UI and coordinator
 * open-with-recover. Never mutates the filesystem.
 */
export type ProjectPackageRecoveryDiscovery =
  | {
      status: "live-ready";
      projectRoot: string;
      liveExists: true;
      backups: string[];
    }
  | {
      status: "recoverable";
      projectRoot: string;
      liveExists: boolean;
      backupRoot: string;
      backups: string[];
    }
  | {
      status: "ambiguous";
      projectRoot: string;
      liveExists: boolean;
      backups: string[];
    }
  | {
      status: "unavailable";
      projectRoot: string;
      liveExists: boolean;
      backups: [];
      reason: "no-backup";
      message: string;
    };

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

/**
 * List sibling `.openbook-backup-*` directories for a project package root.
 * Sorted for stable presentation; does not recover or open.
 */
export async function listProjectPackageBackups(
  projectRootInput: string,
): Promise<ProjectPackageFsResult<string[]>> {
  const projectRoot = path.resolve(projectRootInput);
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
  matches.sort();
  return { ok: true, value: matches };
}

async function discoverBackup(
  projectRoot: string,
): Promise<ProjectPackageFsResult<string>> {
  const listed = await listProjectPackageBackups(projectRoot);
  if (!listed.ok) return listed;
  const matches = listed.value;
  if (matches.length === 0) {
    return fail(
      "RECOVERY_BACKUP_MISSING",
      "No sibling .openbook-backup-* directory is available to restore.",
    );
  }
  if (matches.length > 1) {
    return fail(
      "RECOVERY_AMBIGUOUS_BACKUP",
      "Multiple sibling backups found; pass backupRoot explicitly.",
      { backups: matches },
    );
  }
  return { ok: true, value: matches[0]! };
}

/**
 * Discover whether a project package can be opened or needs an explicit recover
 * choice. Read-only — does not rename or delete anything.
 */
export async function discoverProjectPackageRecovery(
  projectRootInput: string,
): Promise<ProjectPackageFsResult<ProjectPackageRecoveryDiscovery>> {
  const projectRoot = path.resolve(projectRootInput);
  const liveExists = await pathExists(projectRoot);
  const listed = await listProjectPackageBackups(projectRoot);
  if (!listed.ok) return listed;
  const backups = listed.value;

  if (liveExists) {
    return {
      ok: true,
      value: {
        status: "live-ready",
        projectRoot,
        liveExists: true,
        backups,
      },
    };
  }

  if (backups.length === 1) {
    return {
      ok: true,
      value: {
        status: "recoverable",
        projectRoot,
        liveExists: false,
        backupRoot: backups[0]!,
        backups,
      },
    };
  }

  if (backups.length > 1) {
    return {
      ok: true,
      value: {
        status: "ambiguous",
        projectRoot,
        liveExists: false,
        backups,
      },
    };
  }

  return {
    ok: true,
    value: {
      status: "unavailable",
      projectRoot,
      liveExists: false,
      backups: [],
      reason: "no-backup",
      message: "Live project package is missing and no sibling backup is available.",
    },
  };
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
