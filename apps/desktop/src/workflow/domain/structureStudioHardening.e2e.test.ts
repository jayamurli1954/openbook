// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 5 — EN/KN structure titles through package Save/Open,
 * with a regression guard that no parallel outline is stored.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { PACKAGE_BOOK_FILE } from "../../persistence/projectPackageFs.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { projectBookNavigation } from "./structureStudioNavPreview.js";
import { findStoredOutlineLeak } from "./structureStudioUx.js";

function freshCoordinator(seed: string): DesktopStudioCoordinator {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: seed,
  });
}

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-ss-harden-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

test("EN and KN structure titles survive package Save → Open without a stored outline", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "structure.obproj");
    const coordinator = freshCoordinator("ss-harden-save");
    const session = coordinator.getSession();
    const chapterId = session.getBook().chapters[0]?.id;
    assert.ok(chapterId);
    session.updateSectionTitle(chapterId, "Opening");
    const front = session.addSection({ matter: "front", title: "ಮುನ್ನುಡಿ" });
    const back = session.addSection({
      matter: "back",
      title: "ಅನುಬಂಧ",
      role: "appendix",
    });

    coordinator.bindPackageRoot(projectRoot);
    await coordinator.saveProject("Structure Studio");

    const bookText = await readFile(
      path.join(projectRoot, PACKAGE_BOOK_FILE),
      "utf8",
    );
    const stored = JSON.parse(bookText) as unknown;
    assert.equal(findStoredOutlineLeak(stored), null);
    assert.doesNotMatch(bookText, /"outline"|"tableOfContents"|"toc"/);

    const reopened = freshCoordinator("ss-harden-open");
    const opened = await reopened.openFromProjectPackage(projectRoot);
    assert.equal(opened.projectRoot, projectRoot);

    const book = reopened.getBook();
    assert.equal(findStoredOutlineLeak(book), null);
    assert.equal(book.chapters.find((section) => section.id === chapterId)?.title, "Opening");
    assert.equal(book.frontMatter.find((section) => section.id === front.id)?.title, "ಮುನ್ನುಡಿ");
    const backTitle = book.backMatter.find((section) => section.id === back.id)?.title;
    assert.equal(backTitle, "ಅನುಬಂಧ");
    assert.deepEqual(Array.from(backTitle ?? ""), Array.from((backTitle ?? "").normalize("NFC")));

    assert.deepEqual(
      projectBookNavigation(book).map((entry) => entry.title),
      ["ಮುನ್ನುಡಿ", "Opening", "ಅನುಬಂಧ"],
    );

    await coordinator.close();
    await reopened.close();
  });
});
