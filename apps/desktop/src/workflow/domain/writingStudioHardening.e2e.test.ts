// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 5 — EN/KN authoring round-trip through coordinator package
 * Save/Open, with a regression guard that TipTap JSON is not the stored Book.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import type { ContentBlock, InlineSpan } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import type { TipTapDocJSON } from "../../domain/editorAdapter.js";
import { PACKAGE_BOOK_FILE } from "../../persistence/projectPackageFs.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { findTipTapCanonicalLeak } from "./writingStudioUx.js";

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

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-ws-harden-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

test("EN and KN authoring survive package Save → Open without persisting TipTap", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "studio.obproj");
    const coordinator = freshCoordinator("ws-harden-save");
    const english = loadTipTap("english-tiptap.json");
    const kannada = loadTipTap("kannada-tiptap.json");

    coordinator.applyActiveSectionTipTap(english);
    const englishId = coordinator.getState().selectedSectionId;
    assert.ok(englishId);

    const kannadaSection = coordinator.getSession().addSection({
      matter: "main",
      title: "ಕನ್ನಡ",
    });
    coordinator.selectSection(kannadaSection.id);
    coordinator.applyActiveSectionTipTap(kannada);

    coordinator.bindPackageRoot(projectRoot);
    await coordinator.saveProject("Bilingual Studio");

    const bookText = await readFile(
      path.join(projectRoot, PACKAGE_BOOK_FILE),
      "utf8",
    );
    const stored = JSON.parse(bookText) as unknown;
    assert.equal(findTipTapCanonicalLeak(stored), null);
    assert.doesNotMatch(bookText, /"type"\s*:\s*"doc"/);
    assert.doesNotMatch(bookText, /"editorState"|"prosemirror"/);

    const reopened = freshCoordinator("ws-harden-open");
    const opened = await reopened.openFromProjectPackage(projectRoot);
    assert.equal(opened.projectRoot, projectRoot);

    const book = reopened.getBook();
    assert.equal(findTipTapCanonicalLeak(book), null);
    const englishChapter = book.chapters.find((chapter) => chapter.id === englishId);
    const kannadaChapter = book.chapters.find(
      (chapter) => chapter.id === kannadaSection.id,
    );
    assert.ok(englishChapter);
    assert.ok(kannadaChapter);
    assert.match(collectBlockText(englishChapter.blocks), /strong/);
    assert.match(collectBlockText(englishChapter.blocks), /emphasized/);
    const knText = collectBlockText(kannadaChapter.blocks);
    assert.match(knText, /ಮೊದಲ ಅಧ್ಯಾಯ/);
    assert.match(knText, /ಗುರುತು/);
    assert.match(knText, /ದಪ್ಪ/);
    assert.deepEqual(Array.from(knText), Array.from(knText.normalize("NFC")));

    await coordinator.close();
    await reopened.close();
  });
});

test("reopened Kannada section stays selected when preferred on open", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "prefer.obproj");
    const coordinator = freshCoordinator("ws-harden-prefer");
    const section = coordinator.getSession().addSection({
      matter: "main",
      title: "ಕನ್ನಡ ಅಧ್ಯಾಯ",
    });
    coordinator.selectSection(section.id);
    coordinator.applyActiveSectionTipTap(loadTipTap("kannada-tiptap.json"));
    coordinator.bindPackageRoot(projectRoot);
    await coordinator.saveProject("Prefer KN");

    const reopened = freshCoordinator("ws-harden-prefer-open");
    await reopened.openFromProjectPackage(projectRoot);
    reopened.selectSection(section.id);
    assert.equal(reopened.getState().selectedSectionId, section.id);
    assert.match(
      collectBlockText(
        reopened.getBook().chapters.find((chapter) => chapter.id === section.id)!
          .blocks,
      ),
      /ಕನ್ನಡ/,
    );
    await coordinator.close();
    await reopened.close();
  });
});
