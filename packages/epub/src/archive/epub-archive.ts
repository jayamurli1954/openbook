// SPDX-License-Identifier: Apache-2.0

import { strToU8, zipSync } from "fflate";
import type { EpubPackage } from "../types.js";
import { orderArchiveFiles } from "./archive-order.js";

const FALLBACK_DETERMINISTIC_DATE = new Date("2026-01-01T00:00:00Z");

export interface EpubArchiveOptions {
  /**
   * Deterministic entry timestamp for the ZIP archive.
   * If not provided, derived from pkg.metadata.modified.
   * Never calls the system clock / new Date().
   */
  archiveDate?: string | Date;
}

/**
 * Resolves a deterministic Date object from options or package metadata.
 * Never calls new Date() with system time.
 */
function resolveArchiveDate(
  pkg: EpubPackage,
  options?: EpubArchiveOptions,
): Date {
  if (options?.archiveDate) {
    if (options.archiveDate instanceof Date) {
      return options.archiveDate;
    }
    const parsed = new Date(options.archiveDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (pkg.metadata?.modified) {
    const parsed = new Date(pkg.metadata.modified);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return FALLBACK_DETERMINISTIC_DATE;
}

/**
 * Packs an in-memory EpubPackage into a compliant, deterministic EPUB 3.3 OCF ZIP archive (.epub).
 *
 * Invariants enforced:
 * 1. Consumes EpubPackage only; never inspects or reconstructs Book.
 * 2. "mimetype" is strictly the first entry in the ZIP archive.
 * 3. "mimetype" is stored/uncompressed (level 0).
 * 4. Other resources are compressed deterministically with DEFLATE (level 6).
 * 5. Deterministic entry ordering: mimetype, container.xml, package.opf, nav.xhtml, css, xhtml...
 * 6. Deterministic timestamps: all entries share the exact same canonical timestamp; no system clock.
 * 7. Byte-for-byte identical output for identical package and options.
 */
export function buildEpubArchive(
  pkg: EpubPackage,
  options?: EpubArchiveOptions,
): Uint8Array {
  const entryDate = resolveArchiveDate(pkg, options);
  const orderedFiles = orderArchiveFiles(pkg.files);

  const archiveData: Record<
    string,
    [Uint8Array, { level: 0 | 6; mtime: Date }]
  > = {};

  for (const file of orderedFiles) {
    const isMimetype = file.path === "mimetype";
    const bytes =
      typeof file.content === "string"
        ? strToU8(file.content)
        : file.content instanceof Uint8Array
          ? file.content
          : strToU8(String(file.content));

    archiveData[file.path] = [
      bytes,
      {
        level: isMimetype ? 0 : 6,
        mtime: entryDate,
      },
    ];
  }

  return zipSync(archiveData);
}
