// SPDX-License-Identifier: Apache-2.0

import type { EpubPackageFile } from "../types.js";

/**
 * Normalizes a path to POSIX format (forward slashes, no leading slash).
 */
export function normalizeZipPath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

/**
 * Deterministically orders package files according to EPUB OCF specifications:
 * 1. "mimetype" must be the first entry.
 * 2. "META-INF/container.xml"
 * 3. "EPUB/package.opf"
 * 4. "EPUB/nav.xhtml"
 * 5. "EPUB/styles/openbook.css"
 * 6. "EPUB/text/*.xhtml" sorted lexicographically by path.
 * 7. Any remaining files sorted lexicographically by path.
 */
export function orderArchiveFiles(files: EpubPackageFile[]): EpubPackageFile[] {
  const normalized = files.map((file) => ({
    ...file,
    path: normalizeZipPath(file.path),
  }));

  const mimetype = normalized.find((f) => f.path === "mimetype");
  if (!mimetype) {
    throw new Error("Invalid EpubPackage: missing required 'mimetype' file.");
  }
  if (String(mimetype.content) !== "application/epub+zip") {
    throw new Error(
      `Invalid EpubPackage: 'mimetype' content must be 'application/epub+zip', got '${String(mimetype.content)}'`,
    );
  }

  const container = normalized.find((f) => f.path === "META-INF/container.xml");
  const opf = normalized.find((f) => f.path === "EPUB/package.opf");
  const nav = normalized.find((f) => f.path === "EPUB/nav.xhtml");
  const css = normalized.find((f) => f.path === "EPUB/styles/openbook.css");

  const textFiles = normalized
    .filter((f) => f.path.startsWith("EPUB/text/"))
    .sort((a, b) => a.path.localeCompare(b.path));

  const knownPaths = new Set<string>([
    "mimetype",
    "META-INF/container.xml",
    "EPUB/package.opf",
    "EPUB/nav.xhtml",
    "EPUB/styles/openbook.css",
    ...textFiles.map((f) => f.path),
  ]);

  const remainingFiles = normalized
    .filter((f) => !knownPaths.has(f.path))
    .sort((a, b) => a.path.localeCompare(b.path));

  const ordered: EpubPackageFile[] = [mimetype];
  if (container) ordered.push(container);
  if (opf) ordered.push(opf);
  if (nav) ordered.push(nav);
  if (css) ordered.push(css);
  ordered.push(...textFiles);
  ordered.push(...remainingFiles);

  return ordered;
}
