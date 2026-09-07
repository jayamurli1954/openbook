// SPDX-License-Identifier: Apache-2.0
import { UnsafeUrlError } from "./types.js";

/**
 * HTML publishing URL policy (Gate 4).
 *
 * Allowed:
 * - `http:` and `https:` URLs
 * - `mailto:` URLs
 * - same-document fragments (`#id`)
 * - scheme-less relative paths (`./page`, `/path`, `assets/img.png`)
 *
 * Rejected:
 * - `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `about:`
 * - protocol-relative URLs (`//example.com`)
 * - empty / whitespace-only values
 * - control characters or internal whitespace (CRLF / attribute injection)
 *
 * The engine never fetches, downloads, or executes URLs. It only serializes
 * validated href values as escaped HTML attributes.
 */
export const ALLOWED_URL_SCHEMES = ["http:", "https:", "mailto:"] as const;

const ALLOWED_SCHEME_SET: ReadonlySet<string> = new Set(ALLOWED_URL_SCHEMES);

const FORBIDDEN_SCHEMES = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
  "about:",
]);

function hasControlOrInternalWhitespace(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001F\u007F]/.test(value) || /\s/.test(value);
}

/**
 * Returns true when `href` is accepted by the HTML publishing URL policy.
 */
export function isSafeHref(href: string): boolean {
  try {
    sanitizeHref(href);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and returns a trimmed href, or throws UnsafeUrlError.
 * Does not rewrite, fetch, or execute the URL.
 */
export function sanitizeHref(href: string): string {
  if (typeof href !== "string") {
    throw new UnsafeUrlError("UNSAFE_URL", String(href), "URL href must be a string.");
  }

  const trimmed = href.trim();
  if (trimmed.length === 0) {
    throw new UnsafeUrlError("UNSAFE_URL", href, "URL href must be a non-empty string.");
  }

  if (hasControlOrInternalWhitespace(trimmed)) {
    throw new UnsafeUrlError(
      "UNSAFE_URL",
      href,
      "URL href must not contain control characters or internal whitespace.",
    );
  }

  if (trimmed.startsWith("//")) {
    throw new UnsafeUrlError(
      "UNSAFE_URL",
      href,
      "Protocol-relative URLs are not allowed.",
    );
  }

  if (trimmed.startsWith("#")) {
    return trimmed;
  }

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (schemeMatch?.[1]) {
    const scheme = `${schemeMatch[1].toLowerCase()}:`;
    if (FORBIDDEN_SCHEMES.has(scheme) || !ALLOWED_SCHEME_SET.has(scheme)) {
      throw new UnsafeUrlError(
        "UNSAFE_URL",
        href,
        `URL scheme "${scheme}" is not allowed in HTML publications.`,
      );
    }
    return trimmed;
  }

  if (trimmed.includes("\\")) {
    throw new UnsafeUrlError(
      "UNSAFE_URL",
      href,
      "Relative URLs must not contain backslashes.",
    );
  }

  return trimmed;
}
