// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 3 — Design Studio stylesheet firewall.
 * A CSS or Typst theme document is not part of the Book.
 * Publishing stylesheets stay in the engines.
 */
const STORED_STYLESHEET_KEYS = ["stylesheet", "css", "typstTheme", "themeCss"] as const;

/**
 * Walk a persisted Book / package payload. A stylesheet key means a second
 * design document was stored beside the Book.
 */
export function findStoredStylesheetLeak(value: unknown, path = "$"): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findStoredStylesheetLeak(value[index], `${path}[${index}]`);
      if (hit) return hit;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of STORED_STYLESHEET_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return `${path}.${key}`;
    }
  }
  for (const [key, child] of Object.entries(record)) {
    const hit = findStoredStylesheetLeak(child, `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}
