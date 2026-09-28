// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 1 — Design Studio contract.
 *
 * Capability matrix + command port over Book theme and typography.
 * React chrome stays outside this module.
 * Paragraph spacing, image treatment, and chapter opening stay deferred.
 */
import type { Book, ThemeRef, TypographySettings } from "@openbook/book-model";
import { InvalidStructureOperationError } from "@openbook/authoring";

export type DesignStudioCapabilityId =
  | "book-theme"
  | "typography"
  | "heading-style"
  | "paragraph-spacing"
  | "image-treatment"
  | "chapter-opening";

export type DesignStudioCapabilityStatus = "in-scope" | "deferred";

export interface DesignStudioCapability {
  readonly id: DesignStudioCapabilityId;
  readonly status: DesignStudioCapabilityStatus;
  readonly note?: string;
}

/**
 * ROADMAP §3.5 capability matrix under ADR-0036.
 * Only fields the Book Model already stores are in scope.
 */
export const DESIGN_STUDIO_CAPABILITIES: readonly DesignStudioCapability[] = [
  { id: "book-theme", status: "in-scope" },
  {
    id: "typography",
    status: "in-scope",
    note: "bodyFontFamily, headingFontFamily, bodySizePt, and lineHeight.",
  },
  {
    id: "heading-style",
    status: "in-scope",
    note: "Heading typeface uses headingFontFamily. Per-level heading styles need a Book Model ADR.",
  },
  {
    id: "paragraph-spacing",
    status: "deferred",
    note: "Line height is typography. Space before or after a paragraph needs a Book Model ADR.",
  },
  {
    id: "image-treatment",
    status: "deferred",
    note: "No Book field stores image treatment.",
  },
  {
    id: "chapter-opening",
    status: "deferred",
    note: "No Book field stores a chapter opening style.",
  },
] as const;

export type DesignStudioCommand =
  | { readonly type: "set-theme"; readonly id: string; readonly name: string }
  | {
      readonly type: "set-typography";
      readonly bodyFontFamily: string;
      readonly headingFontFamily: string;
      readonly bodySizePt: number;
      readonly lineHeight: number;
    };

export type DesignStudioErrorCode =
  | "EMPTY_THEME"
  | "INVALID_SIZE"
  | "INVALID_LINE_HEIGHT"
  | "DESIGN_REJECTED";

export type DesignStudioResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: DesignStudioErrorCode;
      readonly message: string;
    };

export interface BookDesign {
  readonly theme: ThemeRef;
  readonly typography: TypographySettings;
}

/** Narrow session surface. BookSession satisfies it. No React or TipTap. */
export interface DesignStudioSessionPort {
  getBook(): Book;
  updateTheme(theme: ThemeRef): void;
  updateTypography(typography: TypographySettings): void;
}

export function readBookDesign(book: Book): BookDesign {
  return {
    theme: { id: book.theme.id, name: book.theme.name },
    typography: {
      bodyFontFamily: book.typography.bodyFontFamily,
      headingFontFamily: book.typography.headingFontFamily,
      bodySizePt: book.typography.bodySizePt,
      lineHeight: book.typography.lineHeight,
    },
  };
}

export function getDesignStudioCapability(
  id: DesignStudioCapabilityId,
): DesignStudioCapability | undefined {
  return DESIGN_STUDIO_CAPABILITIES.find((capability) => capability.id === id);
}

export function isDesignStudioCommandType(value: string): boolean {
  return value === "set-theme" || value === "set-typography";
}

function fail(code: DesignStudioErrorCode, message: string): DesignStudioResult {
  return { ok: false, code, message };
}

function isPositiveMeasure(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Apply one design command. Fail-closed checks run before BookSession
 * mutation so a rejected command leaves the Book unchanged.
 */
export function executeDesignCommand(
  session: DesignStudioSessionPort,
  command: DesignStudioCommand,
): DesignStudioResult {
  try {
    switch (command.type) {
      case "set-theme": {
        const id = command.id.trim();
        const name = command.name.trim();
        if (id.length === 0 || name.length === 0) {
          return fail("EMPTY_THEME", "A theme id and name are required.");
        }
        session.updateTheme({ id, name });
        return { ok: true };
      }
      case "set-typography": {
        if (!isPositiveMeasure(command.bodySizePt)) {
          return fail(
            "INVALID_SIZE",
            "Body size must be a finite number greater than zero.",
          );
        }
        if (!isPositiveMeasure(command.lineHeight)) {
          return fail(
            "INVALID_LINE_HEIGHT",
            "Line height must be a finite number greater than zero.",
          );
        }
        session.updateTypography({
          bodyFontFamily: command.bodyFontFamily.trim(),
          headingFontFamily: command.headingFontFamily.trim(),
          bodySizePt: command.bodySizePt,
          lineHeight: command.lineHeight,
        });
        return { ok: true };
      }
      default: {
        const unexpected: never = command;
        return fail("DESIGN_REJECTED", `Unsupported design command: ${String(unexpected)}`);
      }
    }
  } catch (err) {
    if (err instanceof InvalidStructureOperationError) {
      return fail("DESIGN_REJECTED", err.message);
    }
    throw err;
  }
}
