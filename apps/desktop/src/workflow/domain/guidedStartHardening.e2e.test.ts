// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 5 — English + Kannada guided-start round-trips through the
 * live host/coordinator boundary (no React).
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { MemoryAssetStore } from "@openbook/assets";
import { createBook } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { saveProjectPackage } from "../../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { createGuidedStartHost } from "../../host/createGuidedStartHost.js";
import { createFileGuidedStartRecentTextStore } from "../../host/guidedStartRecentFileStore.js";
import { formatGuidedStartFailure } from "./guidedStartUx.js";

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-guided-harden-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function freshCoordinator(idSeed: string) {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed,
  });
}

test("EN and KN New Book round-trips preserve metadata on the Book Model", async () => {
  const coordinator = freshCoordinator("guided-harden-new");
  const host = createGuidedStartHost({ coordinator });

  const en = await host.startNewBook({
    title: "Open Book Guide",
    language: "en",
    authors: ["Ada"],
    writingGoal: "finish draft",
  });
  assert.equal(en.ok, true);
  assert.equal(coordinator.getBook().metadata.title, "Open Book Guide");
  assert.equal(coordinator.getBook().metadata.language, "en");

  const kn = await host.startNewBook({
    title: "ಕನ್ನಡ ಕಥೆ",
    language: "kn",
    authors: ["ಲೇಖಕ"],
  });
  assert.equal(kn.ok, true);
  if (!kn.ok) return;
  assert.equal(kn.projectName, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(coordinator.getBook().metadata.title, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(coordinator.getBook().metadata.language, "kn");
  assert.deepEqual(
    Array.from(coordinator.getBook().metadata.title),
    Array.from("ಕನ್ನಡ ಕಥೆ"),
  );
  await coordinator.close();
});

test("KN markdown import through guided-start host preserves Unicode body text", async () => {
  const coordinator = freshCoordinator("guided-harden-import");
  const host = createGuidedStartHost({ coordinator });

  const result = await host.importBook({
    source: {
      format: "markdown",
      filename: "ಕಥೆ.md",
      content: "# ಮೊದಲ ಅಧ್ಯಾಯ\n\nಇದು ಕನ್ನಡ ಪಠ್ಯ.\n",
    },
    options: { mode: "new-project" },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.ok(result.result.sectionCount >= 1);
  const bookJson = JSON.stringify(coordinator.getBook());
  assert.match(bookJson, /ಮೊದಲ ಅಧ್ಯಾಯ|ಕನ್ನಡ ಪಠ್ಯ/);
  await coordinator.close();
});

test("open recent + continue round-trip remembers KN package names and fails closed on empty", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "ಕನ್ನಡ.obproj");
    assert.equal(
      (
        await saveProjectPackage({
          projectRoot,
          book: createBook({
            title: "ಕನ್ನಡ ಕಥೆ",
            language: "kn",
            authors: ["ಲೇಖಕ"],
          }),
          project: { id: "proj-kn", name: "ಕನ್ನಡ ಕಥೆ" },
          assetBindings: [],
          assetStore: new MemoryAssetStore(),
        })
      ).ok,
      true,
    );

    const recentFile = path.join(parent, "guided-start-recent.json");
    const coordinator = freshCoordinator("guided-harden-open");
    const host = createGuidedStartHost({
      coordinator,
      recentTextStore: createFileGuidedStartRecentTextStore(recentFile),
    });

    const emptyContinue = await host.continueExisting();
    assert.equal(emptyContinue.ok, false);
    if (!emptyContinue.ok) {
      assert.equal(emptyContinue.code, "CONTINUE_UNAVAILABLE");
      assert.match(
        formatGuidedStartFailure(emptyContinue.code, emptyContinue.message),
        /Nothing to continue/,
      );
    }

    const opened = await host.openRecent({ projectRoot });
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(coordinator.getBook().metadata.title, "ಕನ್ನಡ ಕಥೆ");
    assert.equal(coordinator.getBook().metadata.language, "kn");

    const recent = await host.listRecent();
    assert.equal(recent.length, 1);
    assert.equal(recent[0]?.displayName, "ಕನ್ನಡ.obproj");
    assert.equal(recent[0]?.projectRoot, projectRoot);

    const continued = await host.continueExisting();
    assert.equal(continued.ok, true);
    if (!continued.ok) return;
    assert.equal(continued.result.projectRoot, projectRoot);
    assert.equal(coordinator.getBook().metadata.title, "ಕನ್ನಡ ಕಥೆ");

    await coordinator.close();
  });
});

test("validation failures stay fail-closed with UX copy", async () => {
  const coordinator = freshCoordinator("guided-harden-validate");
  const host = createGuidedStartHost({ coordinator });
  const bad = await host.startNewBook({ title: "  ", language: "en" });
  assert.equal(bad.ok, false);
  if (!bad.ok) {
    assert.equal(bad.code, "TITLE_REQUIRED");
    assert.equal(
      formatGuidedStartFailure(bad.code, bad.message),
      "Enter a book title to continue.",
    );
  }
  assert.equal(coordinator.getBook().metadata.title, "Untitled Project");
  await coordinator.close();
});
