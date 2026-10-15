// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 4 — Design step presets.
 *
 * Ready-made looks that set the Book's existing theme and typography
 * fields through the ADR-0036 design port. Fonts are limited to the four
 * Noto families already bundled for PDF (Gate 6), so a preset never names
 * a font OpenBook cannot ship.
 */
import type { ThemeRef, TypographySettings } from "@openbook/book-model";

export interface DesignPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly theme: ThemeRef;
  readonly typography: TypographySettings;
}

export const BUNDLED_BOOK_FONTS = [
  "Noto Serif",
  "Noto Sans",
  "Noto Serif Kannada",
  "Noto Sans Kannada",
] as const;

export const DESIGN_PRESETS: readonly DesignPreset[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Serif type, for novels and memoir.",
    theme: { id: "classic", name: "Classic" },
    typography: {
      bodyFontFamily: "Noto Serif",
      headingFontFamily: "Noto Serif",
      bodySizePt: 11,
      lineHeight: 1.4,
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Clean sans-serif, for guides and non-fiction.",
    theme: { id: "modern", name: "Modern" },
    typography: {
      bodyFontFamily: "Noto Sans",
      headingFontFamily: "Noto Sans",
      bodySizePt: 11,
      lineHeight: 1.5,
    },
  },
  {
    id: "kannada",
    name: "Kannada",
    description: "Kannada type with a Latin fallback, for Kannada books.",
    theme: { id: "kannada", name: "Kannada" },
    typography: {
      bodyFontFamily: "Noto Serif Kannada",
      headingFontFamily: "Noto Sans Kannada",
      bodySizePt: 12,
      lineHeight: 1.6,
    },
  },
] as const;

/** CSS font stack for the live preview, falling back to installed fonts. */
export function previewFontStack(family: string, fallback: "serif" | "sans-serif"): string {
  const name = family.trim();
  const generic = fallback === "serif" ? "Georgia, serif" : "system-ui, sans-serif";
  return name ? `"${name.replace(/"/g, "")}", ${generic}` : generic;
}
