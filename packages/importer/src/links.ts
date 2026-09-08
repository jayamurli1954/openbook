// SPDX-License-Identifier: Apache-2.0
import type { ImportIssue } from "./types.js";

const DANGEROUS_SCHEMES = /^(javascript|vbscript|data):/i;

/**
 * Returns a safe href, or `null` if the scheme must be stripped.
 */
export function sanitizeImportHref(
  href: string,
  issues: ImportIssue[],
): string | null {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }
  if (DANGEROUS_SCHEMES.test(trimmed)) {
    issues.push({
      code: "UNSAFE_LINK_SCHEME",
      severity: "warning",
      message: `Stripped unsafe link scheme from href "${trimmed}".`,
      snippet: trimmed.slice(0, 120),
    });
    return null;
  }
  return trimmed;
}
