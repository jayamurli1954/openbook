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
  lineHeight: 1.45,
} as const;
