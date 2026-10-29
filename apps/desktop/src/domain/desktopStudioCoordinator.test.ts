// SPDX-License-Identifier: Apache-2.0
/**
 * Gate 8 Slice 1: DesktopStudioCoordinator unit tests.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  DomainValidationError,
  InvalidStructureOperationError,
} from "@openbook/authoring";
import { FORBIDDEN_WORKFLOW_CONTENT_KEYS, InvalidWorkflowTransitionError } from "@openbook/workflow";
import type { ContentBlock } from "@openbook/book-model";
import { normalizeTipTapDoc, type TipTapDocJSON } from "./editorAdapter.js";
import {
  DesktopStudioCoordinator,
  DesktopStudioError,
} from "./desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(here, "..", "..", "..", "..", "tests", "fixtures", "editor");
const srcFile = join(here, "..", "..", "src", "domain", "desktopStudioCoordinator.ts");

function loadTipTap(name: string): TipTapDocJSON {
  return JSON.parse(readFileSync(join(fixturesDir, name), "utf8")) as TipTapDocJSON;
}

function collectText(blocks: ContentBlock[]): string {
  let out = "";
  const walk = (inlines: { type: string; text?: string; children?: unknown[] }[]) => {
    for (const inline of inlines) {
      if (inline.type === "text" && inline.text) out += inline.text;
      if (
        (inline.type === "emphasis" || inline.type === "strong" || inline.type === "link") &&
        Array.isArray(inline.children)
      ) {
        walk(inline.children as { type: string; text?: string; children?: unknown[] }[]);
      }
    }
  };
  for (const block of blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") {
      walk(block.inlines);
    }
    if (block.type === "list") for (const item of block.items) walk(item);
  }
  return out;
}

function freshCoordinator(idSeed = "studio") {
  const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
  return new DesktopStudioCoordinator({ persistence, idSeed });
}

test("constructor starts at IMPORT/idle with a canonical Book and no binding", () => {
  const coordinator = freshCoordinator("init");
  const state = coordinator.getState();
  assert.equal(state.stage, "IMPORT");
  assert.equal(state.jobStatus, "idle");
  assert.equal(state.binding, null);
  assert.equal(state.validationReport, null);
  assert.equal(state.selectedSectionId, coordinator.getBook().chapters[0]?.id);
  const book = coordinator.getBook();
  assert.equal(book.schemaVersion, 1);
  assert.ok(book.chapters.length >= 1);
  assert.ok(!("type" in book && (book as { type?: string }).type === "doc"));
});

test("workflow transitions are delegated to @openbook/workflow and skip invalid jumps", () => {
  const coordinator = freshCoordinator("wf");
  coordinator.transitionStage("STRUCTURE");
  coordinator.transitionStage("AUTHORING");
  assert.equal(coordinator.getState().stage, "AUTHORING");
  assert.equal(coordinator.canTransitionTo("IMPORT"), false);
  assert.throws(
    () => coordinator.transitionStage("PUBLISH"),
    (err: unknown) => err instanceof InvalidWorkflowTransitionError,
  );
  assert.equal(coordinator.getState().stage, "AUTHORING");
  assert.equal(coordinator.advanceStage(), "ASSETS");
  assert.equal(coordinator.getState().stage, "ASSETS");
});

test("studio state must not carry canonical Book content keys", () => {
  const coordinator = freshCoordinator("keys");
  const state = coordinator.getState() as unknown as Record<string, unknown>;
  for (const key of FORBIDDEN_WORKFLOW_CONTENT_KEYS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(state, key),
      false,
      `DesktopStudioState must not include "${key}"`,
    );
  }
});

test("mutating getBook() snapshot does not alter the session", () => {
  const coordinator = freshCoordinator("iso");
  const snap = coordinator.getBook();
  snap.metadata.title = "HACKED";
  snap.chapters[0]!.title = "HACKED CHAPTER";
  assert.notEqual(coordinator.getBook().metadata.title, "HACKED");
  assert.notEqual(coordinator.getBook().chapters[0]?.title, "HACKED CHAPTER");
});

test("selectSection and Tiptap apply go through EditorAdapter into BookSession", () => {
  const coordinator = freshCoordinator("tiptap");
  const en = loadTipTap("english-tiptap.json");
  const firstId = coordinator.getState().selectedSectionId!;
  coordinator.getSession().updateSectionTitle(firstId, "One");
  coordinator.applyActiveSectionTipTap(en);
  const two = coordinator.getSession().addSection({ matter: "main", title: "Two" });
  coordinator.selectSection(firstId);
  const restored = coordinator.activeSectionToTipTap();
  assert.deepEqual(normalizeTipTapDoc(restored.doc), normalizeTipTapDoc(en));

  coordinator.selectSection(two.id);
  coordinator.applyActiveSectionTipTap({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Second" }] }],
  });
  coordinator.selectSection(firstId);
  assert.deepEqual(
    normalizeTipTapDoc(coordinator.activeSectionToTipTap().doc),
    normalizeTipTapDoc(en),
  );
});

test("Kannada Unicode survives coordinator save/open on the canonical Book", async () => {
  const coordinator = freshCoordinator("kn");
  const kn = loadTipTap("kannada-tiptap.json");
  await coordinator.newProject("ಕನ್ನಡ ಯೋಜನೆ", "kn");
  coordinator.applyActiveSectionTipTap(kn);
  const sectionId = coordinator.getState().selectedSectionId!;

  const summary = await coordinator.saveProject();
  assert.ok(summary.projectId);
  assert.equal(coordinator.getState().isDirty, false);
  assert.equal(coordinator.getState().binding?.projectName, "ಕನ್ನಡ ಯೋಜನೆ");

  const listed = await coordinator.listProjects();
  assert.equal(listed.length, 1);

  await coordinator.newProject("Other", "en");
  await coordinator.openProject(summary.projectId, sectionId);
  assert.equal(coordinator.getState().selectedSectionId, sectionId);
  const text = collectText(coordinator.getBook().chapters[0]!.blocks);
  assert.ok(text.includes("ಕನ್ನಡ"));
  assert.ok(text.includes("ಗುರುತು"));
  assert.deepEqual(
    normalizeTipTapDoc(coordinator.activeSectionToTipTap().doc),
    normalizeTipTapDoc(kn),
  );
});

test("save persists Book not Tiptap JSON", async () => {
  const driver = new InMemorySqliteConnection();
  const persistence = new SqliteProjectPersistence(driver);
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "payload",
  });
  coordinator.applyActiveSectionTipTap({
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: "Persist me" }] }],
  });
  const saved = await coordinator.saveProject("Payload Project");
  const rows = await driver.select<{ book_payload: string }>(
    "SELECT book_payload FROM project_documents WHERE project_id = ?",
    [saved.projectId],
  );
  assert.equal(rows.length, 1);
  const payload = JSON.parse(rows[0]!.book_payload) as Record<string, unknown>;
  assert.equal(payload["schemaVersion"], 1);
  assert.ok(Array.isArray(payload["chapters"]));
  assert.notEqual(payload["type"], "doc");
  assert.ok(!("manifest" in payload));
});

test("open/save errors are deterministic", async () => {
  const coordinator = freshCoordinator("errs");
  await assert.rejects(
    () => coordinator.openProject("   "),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "NO_PROJECT_SELECTED",
  );
  await assert.rejects(
    () => coordinator.openProject("proj-missing-000"),
    (err: unknown) => err instanceof DesktopStudioError && err.code === "NOT_FOUND",
  );
  await assert.rejects(
    () => coordinator.saveProject("  "),
    (err: unknown) =>
      err instanceof DesktopStudioError &&
      (err.code === "NO_PROJECT_NAME" || err.code === "NO_PROJECT_SELECTED"),
  );
});

test("invalid authoring edits roll back via BookSession", () => {
  const coordinator = freshCoordinator("rollback");
  const before = JSON.stringify(coordinator.getBook());
  const revision = coordinator.getState().revision;
  assert.throws(
    () =>
      coordinator.updateActiveSectionBlocks([
        { type: "not-a-block", id: "x", inlines: [] } as unknown as ContentBlock,
      ]),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "INVALID_STRUCTURE",
  );
  assert.equal(JSON.stringify(coordinator.getBook()), before);
  assert.equal(coordinator.getState().revision, revision);
});

test("last main chapter cannot be removed", () => {
  const coordinator = freshCoordinator("last-ch");
  const only = coordinator.getState().selectedSectionId!;
  assert.throws(
    () => coordinator.getSession().removeSection(only),
    (err: unknown) => err instanceof InvalidStructureOperationError,
  );
});

test("getSession() is the canonical @openbook/authoring BookSession", () => {
  const coordinator = freshCoordinator("session-type");
  const session = coordinator.getSession();
  assert.equal(typeof session.getBook, "function");
  assert.equal(typeof session.setSectionBlocks, "function");
  assert.equal(typeof session.markSaved, "function");
  const snap = session.getBook();
  snap.metadata.title = "HACKED";
  assert.notEqual(session.getBook().metadata.title, "HACKED");
});

test("coordinator source stays headless and Slice 5 scoped", () => {
  const source = readFileSync(srcFile, "utf8");
  assert.match(source, /from "@openbook\/authoring"/);
  assert.match(source, /from "@openbook\/workflow"/);
  assert.match(source, /from "@openbook\/importer"/);
  assert.match(source, /from "@openbook\/assets"/);
  assert.match(source, /from "@openbook\/book-doctor"/);
  assert.match(source, /from "@openbook\/epub"/);
  assert.match(source, /from "@openbook\/html"/);
  assert.match(source, /from "@openbook\/pdf"/);
  assert.match(source, /from "@openbook\/validator"/);
  assert.doesNotMatch(source, /from ["']@tauri-apps\//);
  assert.doesNotMatch(source, /from ["']react["']/);
  assert.doesNotMatch(source, /from ["']react-dom["']/);
  assert.doesNotMatch(source, /from ["']markdown-it["']/);
  assert.doesNotMatch(source, /EditorBookSession/);
});

test("DomainValidationError remains the BookSession rollback diagnostic", () => {
  assert.equal(DomainValidationError.name, "DomainValidationError");
});

// --- Pictures must survive the Write step ---------------------------------------
// Showing a chapter in Write loads it into the editor and immediately writes the editor's
// content back (EditorSurface onUpdate). Pictures used to come back as "[image:…]" text.

function chapterWithPictures(coordinator: DesktopStudioCoordinator) {
  const session = coordinator.getSession();
  const chapterId = coordinator.getBook().chapters[0]!.id;
  session.addAsset({ id: "asset-pic", kind: "image", fileName: "p.png", mediaType: "image/png", altText: "A boy", licence: "" });
  session.addAsset({ id: "asset-kn", kind: "image", fileName: "k.png", mediaType: "image/png", altText: "ಕೃಷ್ಣ", licence: "" });
  const blocks: ContentBlock[] = [
    { type: "paragraph", id: "p1", inlines: [{ type: "text", text: "Before." }] },
    { type: "image", id: "i1", assetId: "asset-pic", caption: [] },
    {
      type: "image",
      id: "i2",
      assetId: "asset-kn",
      caption: [{ type: "text", text: "ಬೆಟ್ಟದ " }, { type: "emphasis", children: [{ type: "text", text: "ಮೇಲೆ" }] }],
    },
    { type: "paragraph", id: "p2", inlines: [{ type: "text", text: "After." }] },
  ];
  session.setSectionBlocks(chapterId, blocks);
  return blocks;
}

const withoutIds = (blocks: readonly ContentBlock[]) =>
  blocks.map((block) => {
    const { id: _id, ...rest } = block;
    return rest;
  });

test("showing a chapter in Write keeps its pictures, asset ids, and captions", () => {
  const coordinator = freshCoordinator("pictures-roundtrip");
  const before = chapterWithPictures(coordinator);

  const doc = coordinator.activeSectionToTipTap().doc;
  assert.deepEqual(
    doc.content?.map((node) => node.type),
    ["paragraph", "openbookImage", "openbookImage", "paragraph"],
  );
  assert.equal(JSON.stringify(doc).includes("[image:"), false);

  const warnings = coordinator.applyActiveSectionTipTap(doc);
  assert.deepEqual(warnings, []);
  const after = coordinator.getBook().chapters[0]!.blocks;
  assert.deepEqual(withoutIds(after), withoutIds(before));
});

test("pictures survive repeated Write round trips and a text edit beside them", () => {
  const coordinator = freshCoordinator("pictures-repeat");
  const before = chapterWithPictures(coordinator);
  for (let round = 0; round < 3; round += 1) {
    coordinator.applyActiveSectionTipTap(coordinator.activeSectionToTipTap().doc);
  }
  const doc = coordinator.activeSectionToTipTap().doc;
  doc.content![0] = { type: "paragraph", content: [{ type: "text", text: "Edited." }] };
  coordinator.applyActiveSectionTipTap(doc);
  const after = coordinator.getBook().chapters[0]!.blocks;
  assert.deepEqual(withoutIds(after.slice(1)), withoutIds(before.slice(1)));
  assert.equal(after.filter((block) => block.type === "image").length, 2);
});

test("an editor picture without an asset id is dropped with a warning, not turned into text", () => {
  const coordinator = freshCoordinator("pictures-bad");
  chapterWithPictures(coordinator);
  const warnings = coordinator.applyActiveSectionTipTap({
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "Text." }] },
      { type: "openbookImage", attrs: { assetId: "", caption: [] } },
    ],
  });
  assert.deepEqual(warnings.map((warning) => warning.code), ["image-without-asset"]);
  assert.deepEqual(coordinator.getBook().chapters[0]!.blocks.map((block) => block.type), ["paragraph"]);
});
