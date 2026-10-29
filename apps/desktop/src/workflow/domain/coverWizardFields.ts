// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0038 Slice 3 — Cover Wizard fields port.
 *
 * Chrome-free glue between the Cover step and the Slice 1/2 contracts.
 * A picked picture is checked before anything is added to the Book, so
 * cancelling or picking an unusable file leaves the Book unchanged.
 * Replacing or removing the cover also removes the old picture when no
 * chapter uses it (a separate undo step).
 */
import type { AssetRef, Book } from "@openbook/book-model";
import {
  sha256Hex,
  synthesizeAssetId,
  type AssetIngestInput,
  type AssetIngestResult,
  type AssetResolver,
} from "@openbook/assets";
import type { WorkflowStage } from "@openbook/workflow";
import {
  checkCoverImage,
  firstCoverImageError,
  type CoverImageReport,
} from "./coverImageChecks.js";
import {
  executeCheckedCoverCommand,
  executeCoverCommand,
  inspectCover,
  readCover,
  type CheckedCoverResult,
  type CoverSummary,
  type CoverWizardSessionPort,
} from "./coverWizardContract.js";

export type CoverPickedImage =
  | { readonly kind: "bytes"; readonly content: Uint8Array; readonly originalFilename: string }
  | { readonly kind: "cancelled" };

/** Host boundary: native dialog or browser file input. */
export interface CoverImagePickPort {
  pickImage(): Promise<CoverPickedImage>;
}

export interface CoverWizardCoordinatorPort {
  getBook(): Book;
  getStage(): WorkflowStage;
  advanceStage(): WorkflowStage | undefined;
  ingestAsset(input: AssetIngestInput): Promise<AssetIngestResult>;
  getAssetResolver(): AssetResolver;
  getSession(): CoverWizardSessionPort & { removeAsset(assetId: string): void };
}

/** The current cover, its stored bytes for the preview, and its checks. */
export interface CoverWizardView {
  readonly cover: CoverSummary | null;
  readonly bytes: Uint8Array | null;
  readonly report: CoverImageReport | null;
}

/** A picked picture that passed the error checks; nothing is on the Book yet. */
export interface CoverCandidate {
  readonly originalFilename: string;
  readonly content: Uint8Array;
  readonly report: CoverImageReport;
}

export type CoverChooseResult =
  | { readonly kind: "cancelled" }
  | { readonly kind: "rejected"; readonly message: string }
  | { readonly kind: "chosen"; readonly candidate: CoverCandidate };

export type CoverFieldsResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly message: string };

export interface CoverWizardFields {
  read(): Promise<CoverWizardView>;
  choose(): Promise<CoverChooseResult>;
  apply(candidate: CoverCandidate, altText: string): Promise<CoverFieldsResult>;
  updateDescription(altText: string): Promise<CoverFieldsResult>;
  remove(): Promise<CoverFieldsResult>;
}

export interface CoverWizardFieldsDeps {
  readonly pick: CoverImagePickPort;
  readonly coordinator: CoverWizardCoordinatorPort;
}

/** Fixed seed: the same picture always gets the same id, so re-picking it reuses it. */
const COVER_ID_SEED = "cover";
const GENERIC_FAILURE = "Couldn’t change the cover. Please try again.";

/** True when any chapter, front matter, or back matter section shows the picture. */
export function isAssetUsedInText(book: Book, assetId: string): boolean {
  return [...book.frontMatter, ...book.chapters, ...book.backMatter].some((section) =>
    section.blocks.some((block) => block.type === "image" && block.assetId === assetId),
  );
}

function ensureAssetsStage(coordinator: CoverWizardCoordinatorPort): boolean {
  for (let guard = 0; coordinator.getStage() !== "ASSETS"; guard += 1) {
    if (guard >= 16 || !coordinator.advanceStage()) return false;
  }
  return true;
}

function toFieldsResult(result: CheckedCoverResult, okMessage: string): CoverFieldsResult {
  if (result.ok) return { ok: true, message: okMessage };
  return { ok: false, message: result.code === "COVER_REJECTED" ? GENERIC_FAILURE : result.message };
}

export function createCoverWizardFields(deps: CoverWizardFieldsDeps): CoverWizardFields {
  const { pick, coordinator } = deps;
  const session = () => coordinator.getSession();

  const removeIfUnused = (assetId: string | undefined) => {
    if (assetId === undefined) return;
    const book = coordinator.getBook();
    if (book.publishing.coverAssetId === assetId || isAssetUsedInText(book, assetId)) return;
    if (!book.assets.some((asset) => asset.id === assetId)) return;
    try {
      session().removeAsset(assetId);
    } catch {
      // Leaving an unused picture in place is harmless; the cover change already succeeded.
    }
  };

  return {
    async read() {
      const book = coordinator.getBook();
      const cover = readCover(book);
      if (!cover) return { cover: null, bytes: null, report: null };
      const asset = book.assets.find((candidate) => candidate.id === cover.assetId)!;
      try {
        const bytes = await coordinator.getAssetResolver().resolve(asset);
        return { cover, bytes, report: checkCoverImage(asset, bytes) };
      } catch {
        return { cover, bytes: null, report: await inspectCover(asset, coordinator.getAssetResolver()) };
      }
    },

    async choose() {
      const picked = await pick.pickImage();
      if (picked.kind === "cancelled") return { kind: "cancelled" };
      const probe: AssetRef = {
        id: "picked-cover",
        kind: "image",
        fileName: picked.originalFilename,
        mediaType: "",
        altText: "",
        licence: "",
      };
      const report = checkCoverImage(probe, picked.content);
      const error = firstCoverImageError(report);
      if (error) return { kind: "rejected", message: error.message };
      return {
        kind: "chosen",
        candidate: { originalFilename: picked.originalFilename, content: picked.content, report },
      };
    },

    async apply(candidate, altText) {
      if (altText.trim().length === 0) {
        return { ok: false, message: "Describe the cover so screen readers can announce it." };
      }
      const previous = coordinator.getBook().publishing.coverAssetId;
      const assetId = synthesizeAssetId(COVER_ID_SEED, sha256Hex(candidate.content));
      const added = !coordinator.getBook().assets.some((asset) => asset.id === assetId);
      if (added) {
        if (!ensureAssetsStage(coordinator)) return { ok: false, message: GENERIC_FAILURE };
        try {
          await coordinator.ingestAsset({
            content: candidate.content,
            originalFilename: candidate.originalFilename,
            kind: "image",
            idSeed: COVER_ID_SEED,
          });
        } catch {
          return { ok: false, message: "Couldn’t add this picture to the book. Please try another file." };
        }
      }
      const result = await executeCheckedCoverCommand(session(), coordinator.getAssetResolver(), {
        type: "set-cover",
        assetId,
        altText,
      });
      if (!result.ok) {
        // The picture was added only for this cover; take it back out.
        if (added) removeIfUnused(assetId);
        return toFieldsResult(result, "");
      }
      if (previous !== assetId) removeIfUnused(previous);
      return { ok: true, message: previous === undefined ? "Added the cover." : "Replaced the cover." };
    },

    async updateDescription(altText) {
      const assetId = coordinator.getBook().publishing.coverAssetId;
      if (assetId === undefined) return { ok: false, message: "This book has no cover yet." };
      const result = executeCoverCommand(session(), { type: "set-cover", assetId, altText });
      return toFieldsResult(result, "Updated the cover description.");
    },

    async remove() {
      const previous = coordinator.getBook().publishing.coverAssetId;
      const result = executeCoverCommand(session(), { type: "clear-cover" });
      if (result.ok) removeIfUnused(previous);
      return toFieldsResult(result, "Removed the cover.");
    },
  };
}
