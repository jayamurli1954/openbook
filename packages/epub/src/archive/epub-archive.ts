// SPDX-License-Identifier: Apache-2.0

import { strToU8, zipSync } from "fflate";
import type { EpubArchiveOptions, EpubPackage } from "../types.js";
import { orderArchiveFiles } from "./archive-order.js";
import { normalizeDateForZip } from "./archive-timestamps.js";

/**
 * Packs an in-memory EpubPackage into a compliant, deterministic EPUB 3.3 OCF ZIP archive (.epub).
 *
 * Invariants enforced:
 * 1. Consumes EpubPackage only; never inspects or reconstructs Book.
 * 2. "mimetype" is strictly the first entry in the ZIP archive.
 * 3. "mimetype" is stored/uncompressed (level 0).
 * 4. Other resources are compressed deterministically with DEFLATE (level 6).
 * 5. Deterministic entry ordering: mimetype, container.xml, package.opf, nav.xhtml, css, xhtml...
 * 6. Deterministic timestamps: normalized to UTC components so ZIP MS-DOS bytes are identical across host timezones.
 * 7. Byte-for-byte identical output for identical package and options across machines, platforms, and run times.
 */
export function buildEpubArchive(
  pkg: EpubPackage,
  options?: EpubArchiveOptions,
): Uint8Array {
  const rawDate = options?.archiveDate ?? pkg.metadata?.modified;
  const entryDate = normalizeDateForZip(rawDate);
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
