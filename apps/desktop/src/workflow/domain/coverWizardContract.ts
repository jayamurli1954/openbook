// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 1 — Cover Wizard contract.
 *
 * Capability matrix + command port over Book.publishing.coverAssetId.
 * React chrome stays outside this module.
 * Slice 2 adds byte-level image checks (coverImageChecks.ts).
 * Chrome and engine projections arrive in later slices.
 */
import type { AssetRef, Book } from "@openbook/book-model";
import type { AssetResolver } from "@openbook/assets";
import {
  DomainValidationError,
  InvalidStructureOperationError,
} from "@openbook/authoring";
import {
  checkCoverImage,
  firstCoverImageError,
  type CoverImageErrorCode,
  type CoverImageReport,
} from "./coverImageChecks.js";

export type CoverWizardCapabilityId =
  | "import-image"
  | "use-illustration"
  | "preview-cover"
  | "epub-cover"
  | "html-pdf-cover"
  | "image-quality-warning"
  | "cover-alt-text"
  | "cover-direction"
  | "cover-text"
  | "cover-typography"
  | "contrast-warning"
  | "print-cover"
  | "ai-cover";

export type CoverWizardCapabilityStatus = "in-scope" | "deferred" | "out-of-scope";

export interface CoverWizardCapability {
  readonly id: CoverWizardCapabilityId;
  readonly status: CoverWizardCapabilityStatus;
  readonly note?: string;
}

/** ROADMAP §3.7 / PRD §13 capability matrix under ADR-0038 §2.2. */
export const COVER_WIZARD_CAPABILITIES: readonly CoverWizardCapability[] = [
  { id: "import-image", status: "in-scope", note: "JPEG or PNG through the asset store." },
  { id: "use-illustration", status: "in-scope", note: "An image the author supplies." },
  { id: "preview-cover", status: "in-scope", note: "Shows the stored asset." },
  { id: "epub-cover", status: "in-scope", note: "Projected at publish time." },
  { id: "html-pdf-cover", status: "in-scope", note: "Projected at publish time." },
  { id: "image-quality-warning", status: "in-scope", note: "Pixel size and aspect ratio." },
  { id: "cover-alt-text", status: "in-scope", note: "Required; blank alt text fails closed." },
  { id: "cover-direction", status: "deferred", note: "Later generated-cover ADR." },
  { id: "cover-text", status: "deferred", note: "Later generated-cover ADR." },
  { id: "cover-typography", status: "deferred", note: "Later generated-cover ADR." },
  { id: "contrast-warning", status: "deferred", note: "Only meaningful with generated text." },
  { id: "print-cover", status: "out-of-scope", note: "Phase 2 DTP / print." },
  { id: "ai-cover", status: "out-of-scope", note: "Phase 3." },
] as const;

/** Media types a cover may have (ADR-0038 §2.1). */
export const COVER_MEDIA_TYPES: readonly string[] = ["image/jpeg", "image/png"];

export type CoverWizardCommand =
  | { readonly type: "set-cover"; readonly assetId: string; readonly altText: string }
  | { readonly type: "clear-cover" };

export type CoverWizardErrorCode =
  | "UNKNOWN_ASSET"
  | "NOT_AN_IMAGE"
  | "UNSUPPORTED_IMAGE_TYPE"
  | "EMPTY_ALT_TEXT"
  | "NO_COVER"
  | "COVER_REJECTED"
  | CoverImageErrorCode;

export type CoverWizardResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: CoverWizardErrorCode;
      readonly message: string;
    };

export interface CoverSummary {
  readonly assetId: string;
  readonly fileName: string;
  readonly mediaType: string;
  readonly altText: string;
}

/** Narrow session surface. BookSession satisfies it. No React or TipTap. */
export interface CoverWizardSessionPort {
  getBook(): Book;
  setCover(assetId: string, altText: string): void;
  clearCover(): void;
}

export function readCover(book: Book): CoverSummary | null {
  const assetId = book.publishing.coverAssetId;
  if (assetId === undefined) return null;
  const asset = book.assets.find((candidate) => candidate.id === assetId);
  if (!asset) return null;
  return {
    assetId: asset.id,
    fileName: asset.fileName,
    mediaType: asset.mediaType,
    altText: asset.altText,
  };
}

export function getCoverWizardCapability(
  id: CoverWizardCapabilityId,
): CoverWizardCapability | undefined {
  return COVER_WIZARD_CAPABILITIES.find((capability) => capability.id === id);
}

export function isCoverWizardCommandType(value: string): boolean {
  return value === "set-cover" || value === "clear-cover";
}

function fail(code: CoverWizardErrorCode, message: string): CoverWizardResult {
  return { ok: false, code, message };
}

function runSession(apply: () => void): CoverWizardResult {
  try {
    apply();
    return { ok: true };
  } catch (err) {
    if (
      err instanceof DomainValidationError ||
      err instanceof InvalidStructureOperationError
    ) {
      return fail("COVER_REJECTED", err.message);
    }
    throw err;
  }
}

/**
 * Apply one cover command. Fail-closed checks run before BookSession
 * mutation so a rejected command leaves the Book unchanged.
 */
export function executeCoverCommand(
  session: CoverWizardSessionPort,
  command: CoverWizardCommand,
): CoverWizardResult {
  const book = session.getBook();

  if (command.type === "clear-cover") {
    if (book.publishing.coverAssetId === undefined) {
      return fail("NO_COVER", "This book has no cover to remove.");
    }
    return runSession(() => session.clearCover());
  }

  if (command.type !== "set-cover") {
    return fail(
      "COVER_REJECTED",
      `Unsupported cover command: ${String((command as { type: unknown }).type)}`,
    );
  }

  const asset = book.assets.find((candidate) => candidate.id === command.assetId);
  if (!asset) {
    return fail("UNKNOWN_ASSET", "That image is not part of this book.");
  }
  if (asset.kind !== "image") {
    return fail("NOT_AN_IMAGE", "A cover must be an image.");
  }
  if (!COVER_MEDIA_TYPES.includes(asset.mediaType)) {
    return fail("UNSUPPORTED_IMAGE_TYPE", "A cover must be a JPEG or PNG image.");
  }
  const altText = command.altText.trim();
  if (altText.length === 0) {
    return fail("EMPTY_ALT_TEXT", "Describe the cover so screen readers can announce it.");
  }

  return runSession(() => session.setCover(asset.id, altText));
}

export type CheckedCoverResult = CoverWizardResult & {
  /** Image checks for set-cover, when the bytes were read. */
  readonly report?: CoverImageReport;
};

/** Read the stored bytes and check them as a cover (for the wizard preview). */
export async function inspectCover(
  asset: AssetRef,
  resolver: AssetResolver,
): Promise<CoverImageReport> {
  let bytes: Uint8Array;
  try {
    bytes = await resolver.resolve(asset);
  } catch {
    return unreadableReport(asset);
  }
  return checkCoverImage(asset, bytes);
}

/**
 * Like executeCoverCommand, but set-cover first checks the stored image bytes.
 * Errors refuse the command and leave the Book unchanged; warnings never block.
 */
export async function executeCheckedCoverCommand(
  session: CoverWizardSessionPort,
  resolver: AssetResolver,
  command: CoverWizardCommand,
): Promise<CheckedCoverResult> {
  if (command.type !== "set-cover") {
    return executeCoverCommand(session, command);
  }
  const asset = session.getBook().assets.find((candidate) => candidate.id === command.assetId);
  if (
    !asset ||
    asset.kind !== "image" ||
    !COVER_MEDIA_TYPES.includes(asset.mediaType) ||
    command.altText.trim().length === 0
  ) {
    // The Slice 1 checks name the problem without reading any bytes.
    return executeCoverCommand(session, command);
  }

  const report = await inspectCover(asset, resolver);
  const error = firstCoverImageError(report);
  if (error) {
    return { ok: false, code: error.code, message: error.message, report };
  }
  return { ...executeCoverCommand(session, command), report };
}

function unreadableReport(asset: AssetRef): CoverImageReport {
  return {
    assetId: asset.id,
    issues: [
      {
        code: "COVER_SIZE_UNREADABLE",
        severity: "error",
        message: "OpenBook could not open this picture. Try adding it to the book again.",
      },
    ],
  };
}
