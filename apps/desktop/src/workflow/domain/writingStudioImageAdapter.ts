// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 4 — Writing Studio image insertion adapter.
 *
 * Native/file pick → existing coordinator.insertImageBlock (asset ingest +
 * Book image block). Cancelled picks perform no mutation. No parallel asset model.
 */
import type { AssetIngestInput } from "@openbook/assets";
import type { AssetRef, Book, ContentBlock } from "@openbook/book-model";
import type { WorkflowStage } from "@openbook/workflow";

export type WritingStudioPickedImage =
  | {
      readonly kind: "bytes";
      readonly content: Uint8Array;
      readonly originalFilename: string;
      readonly altText?: string;
    }
  | { readonly kind: "cancelled" };

/** Host boundary: native dialog or browser file input. */
export interface WritingStudioImagePickPort {
  pickImage(): Promise<WritingStudioPickedImage>;
}

export interface WritingStudioImageCoordinatorPort {
  getBook(): Book;
  getStage(): WorkflowStage;
  advanceStage(): WorkflowStage | undefined;
  insertImageBlock(input: {
    sectionId: string;
    atIndex: number;
    ingest: AssetIngestInput;
  }): Promise<{ assetRef: AssetRef; block: ContentBlock }>;
}

export type WritingStudioImageErrorCode =
  | "CANCELLED"
  | "SECTION_REQUIRED"
  | "ASSETS_STAGE_REQUIRED"
  | "INSERT_FAILED";

export type WritingStudioImageResult =
  | {
      readonly ok: true;
      readonly assetRef: AssetRef;
      readonly block: ContentBlock;
      readonly sectionId: string;
    }
  | {
      readonly ok: false;
      readonly code: WritingStudioImageErrorCode;
      readonly message: string;
    };

export interface IWritingStudioImageAdapter {
  insertImage(options: {
    sectionId: string | null | undefined;
    /** Defaults to append at end of section. */
    atIndex?: number;
    altText?: string;
  }): Promise<WritingStudioImageResult>;
}

export interface WritingStudioImageAdapterDeps {
  readonly pick: WritingStudioImagePickPort;
  readonly coordinator: WritingStudioImageCoordinatorPort;
}

/**
 * Advance workflow until ASSETS when possible — insertImageBlock requires it.
 */
export function ensureAssetsStage(
  coordinator: Pick<
    WritingStudioImageCoordinatorPort,
    "getStage" | "advanceStage"
  >,
): WritingStudioImageResult | null {
  let guard = 0;
  while (coordinator.getStage() !== "ASSETS") {
    const advanced = coordinator.advanceStage();
    guard += 1;
    if (!advanced || guard > 16) {
      return {
        ok: false,
        code: "ASSETS_STAGE_REQUIRED",
        message: `Image insertion requires the ASSETS workflow stage (current: ${coordinator.getStage()}).`,
      };
    }
  }
  return null;
}

function resolveAtIndex(
  book: Book,
  sectionId: string,
  atIndex: number | undefined,
): number {
  if (typeof atIndex === "number" && atIndex >= 0) return atIndex;
  const section =
    book.frontMatter.find((s) => s.id === sectionId) ??
    book.chapters.find((s) => s.id === sectionId) ??
    book.backMatter.find((s) => s.id === sectionId);
  return section?.blocks.length ?? 0;
}

export class WritingStudioImageAdapter implements IWritingStudioImageAdapter {
  readonly #pick: WritingStudioImagePickPort;
  readonly #coordinator: WritingStudioImageCoordinatorPort;

  constructor(deps: WritingStudioImageAdapterDeps) {
    this.#pick = deps.pick;
    this.#coordinator = deps.coordinator;
  }

  async insertImage(options: {
    sectionId: string | null | undefined;
    atIndex?: number;
    altText?: string;
  }): Promise<WritingStudioImageResult> {
    const sectionId =
      typeof options.sectionId === "string" ? options.sectionId.trim() : "";
    if (sectionId.length === 0) {
      return {
        ok: false,
        code: "SECTION_REQUIRED",
        message: "A section must be selected before inserting an image.",
      };
    }

    const picked = await this.#pick.pickImage();
    if (picked.kind === "cancelled") {
      return {
        ok: false,
        code: "CANCELLED",
        message: "Image selection was cancelled.",
      };
    }

    const stageError = ensureAssetsStage(this.#coordinator);
    if (stageError) return stageError;

    const atIndex = resolveAtIndex(
      this.#coordinator.getBook(),
      sectionId,
      options.atIndex,
    );

    const altText =
      options.altText?.trim() ||
      picked.altText?.trim() ||
      undefined;

    try {
      const { assetRef, block } = await this.#coordinator.insertImageBlock({
        sectionId,
        atIndex,
        ingest: {
          content: picked.content,
          originalFilename: picked.originalFilename,
          kind: "image",
          ...(altText ? { altText } : {}),
        },
      });
      return { ok: true, assetRef, block, sectionId };
    } catch (err) {
      return {
        ok: false,
        code: "INSERT_FAILED",
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export function createWritingStudioImageAdapter(
  deps: WritingStudioImageAdapterDeps,
): IWritingStudioImageAdapter {
  return new WritingStudioImageAdapter(deps);
}
