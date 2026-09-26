// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 2 — EN/KN formatting smoke through TipTap → EditorAdapter → BookSession.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { ContentBlock, InlineSpan } from "@openbook/book-model";
import {
  DesktopStudioCoordinator,
} from "../../domain/desktopStudioCoordinator.js";
import type { TipTapDocJSON } from "../../domain/editorAdapter.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { WRITING_STUDIO_TOOLBAR_COMMANDS } from "./writingStudioContract.js";

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
  "tests",
  "fixtures",
  "editor",
);

function loadTipTap(name: string): TipTapDocJSON {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as TipTapDocJSON;
}

function collectText(inlines: readonly InlineSpan[]): string {
  return inlines
    .map((span) => {
      if (span.type === "text") return span.text;
      if (
        span.type === "emphasis" ||
        span.type === "strong" ||
        span.type === "link"
      ) {
        return collectText(span.children);
      }
      return "";
    })
    .join("");
}

function collectBlockText(blocks: readonly ContentBlock[]): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
        case "quote":
          return collectText(block.inlines);
        case "list":
          return block.items.map((item) => collectText(item)).join(" ");
        case "image":
          return collectText(block.caption);
        default:
          return "";
      }
    })
    .join(" ");
}

function freshCoordinator(seed: string): DesktopStudioCoordinator {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: seed,
  });
}

/** Synthetic TipTap doc covering every Slice 2 formatting command shape. */
function fullFormattingDoc(languageLabel: string): TipTapDocJSON {
  return {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 1 },
        content: [{ type: "text", text: `${languageLabel} H1` }],
      },
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: `${languageLabel} H2` }],
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "plain " },
          { type: "text", marks: [{ type: "bold" }], text: "bold" },
          { type: "text", text: " " },
          { type: "text", marks: [{ type: "italic" }], text: "italic" },
          { type: "text", text: " " },
          {
            type: "text",
            marks: [
              { type: "link", attrs: { href: "https://openbook.example/doc" } },
            ],
            text: "linked",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "bullet one" }],
              },
            ],
          },
        ],
      },
      {
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "ordered one" }],
              },
            ],
          },
        ],
      },
      {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "quoted line" }],
          },
        ],
      },
    ],
  };
}

test("EN formatting chrome path lands in Book Model via EditorAdapter", () => {
  const coordinator = freshCoordinator("ws-fmt-en");
  const tipTap = fullFormattingDoc("English");
  coordinator.applyActiveSectionTipTap(tipTap);
  const blocks = coordinator.getBook().chapters[0]!.blocks;

  assert.ok(blocks.some((b) => b.type === "heading" && b.level === 1));
  assert.ok(blocks.some((b) => b.type === "heading" && b.level === 2));
  assert.ok(blocks.some((b) => b.type === "paragraph"));
  assert.ok(blocks.some((b) => b.type === "list" && b.ordered === false));
  assert.ok(blocks.some((b) => b.type === "list" && b.ordered === true));
  assert.ok(blocks.some((b) => b.type === "quote"));

  const para = blocks.find((b) => b.type === "paragraph");
  assert.ok(para && para.type === "paragraph");
  assert.ok(para.inlines.some((i) => i.type === "strong"));
  assert.ok(para.inlines.some((i) => i.type === "emphasis"));
  const link = para.inlines.find((i) => i.type === "link");
  assert.ok(link && link.type === "link");
  assert.equal(link.href, "https://openbook.example/doc");

  const text = collectBlockText(blocks);
  assert.ok(text.includes("English H1"));
  assert.ok(text.includes("bold"));
  assert.ok(text.includes("quoted line"));
});

test("KN formatting chrome path preserves Unicode in Book Model", () => {
  const coordinator = freshCoordinator("ws-fmt-kn");
  const fixture = loadTipTap("kannada-tiptap.json");
  coordinator.applyActiveSectionTipTap(fixture);
  const blocks = coordinator.getBook().chapters[0]!.blocks;
  const text = collectBlockText(blocks);
  assert.ok(text.includes("ಕನ್ನಡ"));
  assert.ok(
    blocks.some(
      (b) =>
        b.type === "paragraph" &&
        b.inlines.some((i) => i.type === "strong" || i.type === "emphasis"),
    ),
  );

  const synthetic = fullFormattingDoc("ಕನ್ನಡ");
  coordinator.applyActiveSectionTipTap(synthetic);
  const again = collectBlockText(coordinator.getBook().chapters[0]!.blocks);
  assert.ok(again.includes("ಕನ್ನಡ H1"));
  assert.ok(again.includes("bold"));
});

test("toolbar contract still excludes tables after formatting chrome", () => {
  assert.equal(
    (WRITING_STUDIO_TOOLBAR_COMMANDS as readonly string[]).includes(
      "insert-table",
    ),
    false,
  );
});
