// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import type { AssetIngestInput } from "@openbook/assets";
import type { AssetRef } from "@openbook/book-model";
import { createBook } from "@openbook/book-model";
import type { WorkflowStage } from "@openbook/workflow";
import {
  createWritingStudioImageAdapter,
  ensureAssetsStage,
  type WritingStudioImagePickPort,
  type WritingStudioPickedImage,
} from "./writingStudioImageAdapter.js";

/** Minimal valid 1×1 PNG. */
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02,
  0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44,
  0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02,
  0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

function fakePick(
  result: WritingStudioPickedImage,
): WritingStudioImagePickPort {
  return {
    async pickImage() {
      return result;
    },
  };
}

test("cancelled pick performs no insert and no stage advance", async () => {
  let advances = 0;
  let inserts = 0;
  let stage: WorkflowStage = "AUTHORING";
  const book = createBook({ title: "Demo", language: "en" });
  const adapter = createWritingStudioImageAdapter({
    pick: fakePick({ kind: "cancelled" }),
    coordinator: {
      getBook: () => book,
      getStage: () => stage,
      advanceStage: () => {
        advances += 1;
        stage = "ASSETS";
        return stage;
      },
      insertImageBlock: async () => {
        inserts += 1;
        throw new Error("should not insert");
      },
    },
  });
  const result = await adapter.insertImage({
    sectionId: book.chapters[0]!.id,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "CANCELLED");
  assert.equal(advances, 0);
  assert.equal(inserts, 0);
});

test("insert advances to ASSETS then calls insertImageBlock with image bytes", async () => {
  let stage: WorkflowStage = "AUTHORING";
  const book = createBook({ title: "Demo", language: "kn", authors: ["ಲೇಖಕ"] });
  const sectionId = book.chapters[0]!.id;
  const inserts: AssetIngestInput[] = [];
  const adapter = createWritingStudioImageAdapter({
    pick: fakePick({
      kind: "bytes",
      content: PNG_1X1,
      originalFilename: "ಚಿತ್ರ.png",
      altText: "ಪಿಕ್ಸೆಲ್",
    }),
    coordinator: {
      getBook: () => book,
      getStage: () => stage,
      advanceStage: () => {
        if (stage === "AUTHORING") {
          stage = "ASSETS";
          return stage;
        }
        return undefined;
      },
      insertImageBlock: async (input) => {
        inserts.push(input.ingest);
        assert.equal(input.sectionId, sectionId);
        assert.equal(input.atIndex, book.chapters[0]!.blocks.length);
        const assetRef: AssetRef = {
          id: "a1",
          kind: "image",
          fileName: input.ingest.originalFilename,
          mediaType: "image/png",
          altText: input.ingest.altText ?? "",
          licence: "",
        };
        return {
          assetRef,
          block: {
            type: "image",
            id: "b1",
            assetId: assetRef.id,
            caption: [{ type: "text", text: "ಪಿಕ್ಸೆಲ್" }],
          },
        };
      },
    },
  });

  const result = await adapter.insertImage({ sectionId });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(stage, "ASSETS");
  assert.equal(inserts.length, 1);
  assert.equal(inserts[0]?.kind, "image");
  assert.equal(inserts[0]?.originalFilename, "ಚಿತ್ರ.png");
  assert.equal(inserts[0]?.altText, "ಪಿಕ್ಸೆಲ್");
  assert.deepEqual([...inserts[0]!.content], [...PNG_1X1]);
  assert.equal(result.block.type, "image");
});

test("missing section fails closed before pick", async () => {
  let picks = 0;
  const adapter = createWritingStudioImageAdapter({
    pick: {
      async pickImage() {
        picks += 1;
        return { kind: "cancelled" };
      },
    },
    coordinator: {
      getBook: () => createBook({ title: "X", language: "en" }),
      getStage: () => "ASSETS",
      advanceStage: () => undefined,
      insertImageBlock: async () => {
        throw new Error("no");
      },
    },
  });
  const result = await adapter.insertImage({ sectionId: null });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "SECTION_REQUIRED");
  assert.equal(picks, 0);
});

test("ensureAssetsStage fails closed when advance cannot reach ASSETS", () => {
  const result = ensureAssetsStage({
    getStage: () => "PUBLISH",
    advanceStage: () => undefined,
  });
  assert.ok(result);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "ASSETS_STAGE_REQUIRED");
});

test("adapter surface stays free of TipTap persistence", () => {
  const adapter = createWritingStudioImageAdapter({
    pick: fakePick({ kind: "cancelled" }),
    coordinator: {
      getBook: () => createBook({ title: "X", language: "en" }),
      getStage: () => "ASSETS",
      advanceStage: () => undefined,
      insertImageBlock: async () => {
        throw new Error("unused");
      },
    },
  });
  assert.equal(typeof adapter.insertImage, "function");
  assert.equal(
    Object.prototype.hasOwnProperty.call(adapter, "persistTipTap"),
    false,
  );
});
