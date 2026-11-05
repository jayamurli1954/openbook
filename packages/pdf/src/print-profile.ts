// SPDX-License-Identifier: Apache-2.0

/**
 * ADR-0042 — PDF profiles. "reading" is today's PDF (DEFAULT_PDF_PROFILE); "print" is a
 * paperback interior: a trim size, mirrored margins, page numbers, and no cover page.
 * Publishing-profile data per ADR-0013 §9, never Book Model data.
 */

export type PrintTrimId = "5x8" | "5.25x8" | "5.5x8.5" | "6x9" | "7x10" | "8x10" | "8.5x11" | "a5";

export interface PdfPrintProfile {
  readonly kind: "print";
  readonly trim: PrintTrimId;
}

export type PdfProfile = { readonly kind: "reading" } | PdfPrintProfile;

export interface PrintTrimSize {
  readonly id: PrintTrimId;
  /** What the Export step shows, e.g. "5.5 × 8.5 in". */
  readonly label: string;
  readonly widthIn: number;
  readonly heightIn: number;
}

export const PRINT_TRIM_SIZES: readonly PrintTrimSize[] = [
  { id: "5x8", label: "5 × 8 in", widthIn: 5, heightIn: 8 },
  { id: "5.25x8", label: "5.25 × 8 in", widthIn: 5.25, heightIn: 8 },
  { id: "5.5x8.5", label: "5.5 × 8.5 in", widthIn: 5.5, heightIn: 8.5 },
  { id: "6x9", label: "6 × 9 in", widthIn: 6, heightIn: 9 },
  { id: "7x10", label: "7 × 10 in", widthIn: 7, heightIn: 10 },
  { id: "8x10", label: "8 × 10 in", widthIn: 8, heightIn: 10 },
  { id: "8.5x11", label: "8.5 × 11 in", widthIn: 8.5, heightIn: 11 },
  { id: "a5", label: "A5 (5.83 × 8.27 in)", widthIn: 5.83, heightIn: 8.27 },
];

/** Print margins: wider on the binding side; safe for KDP no-bleed interiors up to 700 pages. */
export const PRINT_MARGINS = { inside: "0.75in", outside: "0.5in", y: "2.25cm" } as const;

export const PRINT_MAX_PAGES = 700;

/** Plain message for a book too long for the print margins (ADR-0042 §2.1). */
export const PRINT_PAGE_LIMIT_MESSAGE = `This book has more than ${PRINT_MAX_PAGES} pages; paperback margins are only set for up to ${PRINT_MAX_PAGES} pages.`;

export class InvalidPdfProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPdfProfileError";
  }
}

/** The trim size for a print profile; unknown ids fail closed. */
export function printTrimSize(trim: string): PrintTrimSize {
  const size = PRINT_TRIM_SIZES.find((candidate) => candidate.id === trim);
  if (!size) throw new InvalidPdfProfileError(`Unknown paperback trim size "${trim}".`);
  return size;
}
