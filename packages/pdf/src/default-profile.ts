// SPDX-License-Identifier: Apache-2.0

/** Initial Gate 6 flow-based publishing profile (not Book Model data). */
export const DEFAULT_PDF_PROFILE = {
  paper: "a5",
  margin: {
    x: "1.75cm",
    y: "2.25cm",
  },
  bodyFontSize: "11pt",
  bodyFont: ["Noto Serif Kannada", "Noto Serif"],
  headingFont: ["Noto Sans Kannada", "Noto Sans"],
  /** Last in every list, for emoji no other font has. */
  emojiFont: "Noto Emoji",
  lineHeight: 1.45,
} as const;

/**
 * Font lists for a book's language. The Kannada fonts also contain digits and punctuation, so
 * they come first only for Kannada books; other books take those from the Latin fonts, and
 * Kannada words in them still fall back to the Kannada fonts.
 */
export function pdfFontLists(lang: string): { body: readonly string[]; heading: readonly string[] } {
  const { bodyFont, headingFont, emojiFont } = DEFAULT_PDF_PROFILE;
  const latinFirst = lang !== "kn";
  const order = (fonts: readonly string[]) => [...(latinFirst ? [...fonts].reverse() : fonts), emojiFont];
  return { body: order(bodyFont), heading: order(headingFont) };
}
