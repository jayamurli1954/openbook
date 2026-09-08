// SPDX-License-Identifier: Apache-2.0

/**
 * Escapes text content for safe inclusion in HTML elements.
 * Preserves all valid Unicode code points (such as Kannada script \u0C80–\u0CFF)
 * directly in native UTF-8 form without converting them to numeric character entities.
 */
export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapes attribute values for safe inclusion in HTML attributes.
 */
export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
