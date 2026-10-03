// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 3 — EN/KN theme and font names through package Save/Open,
 * with a regression guard that no stylesheet is stored.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { PACKAGE_BOOK_FILE } from "../../persistence/projectPackageFs.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { createDesignStudioChoices } from "./designStudioChoices.js";
import { readBookDesign } from "./designStudioContract.js";
import { findStoredStylesheetLeak } from "./designStudioUx.js";

function freshCoordinator(seed: string): DesktopStudioCoordinator {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: seed,
  });
}

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-ds-harden-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

async function assertNoStoredStylesheet(projectRoot: string): Promise<unknown> {
  const bookText = await readFile(path.join(projectRoot, PACKAGE_BOOK_FILE), "utf8");
  const stored = JSON.parse(bookText) as unknown;
  assert.equal(findStoredStylesheetLeak(stored), null);
  assert.doesNotMatch(bookText, /"(stylesheet|css|typstTheme|themeCss)"\s*:/);
  const files = await listFiles(projectRoot);
  const stylesheet = files.find((file) => /\.(css|typ)$/i.test(file));
  assert.equal(stylesheet, undefined);
  return stored;
}

test("EN and KN theme and font names survive package Save → Open without a stored stylesheet", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "design.obproj");
    const coordinator = freshCoordinator("ds-harden-save");
    const choices = createDesignStudioChoices(coordinator.getSession());

    assert.equal(choices.setTheme("classic", "Classic").ok, true);
    assert.equal(
      choices.setTypography({
        bodyFontFamily: "Noto Sans",
        headingFontFamily: "Noto Serif",
        bodySizePt: 12,
        lineHeight: 1.5,
      }).ok,
      true,
    );

    coordinator.bindPackageRoot(projectRoot);
    await coordinator.saveProject("Design Studio");
    await assertNoStoredStylesheet(projectRoot);

    const openedEnglish = freshCoordinator("ds-harden-open-en");
    const opened = await openedEnglish.openFromProjectPackage(projectRoot);
    assert.equal(opened.projectRoot, projectRoot);
    const english = readBookDesign(openedEnglish.getBook());
    assert.deepEqual(english.theme, { id: "classic", name: "Classic" });
    assert.equal(english.typography.bodyFontFamily, "Noto Sans");
    assert.equal(english.typography.headingFontFamily, "Noto Serif");
    assert.equal(english.typography.bodySizePt, 12);
    assert.equal(english.typography.lineHeight, 1.5);
    assert.equal(findStoredStylesheetLeak(openedEnglish.getBook()), null);

    const kannada = createDesignStudioChoices(openedEnglish.getSession());
    assert.equal(kannada.setTheme("kannada", "ಕನ್ನಡ ವಿನ್ಯಾಸ").ok, true);
    assert.equal(
      kannada.setTypography({
        bodyFontFamily: "Noto Sans Kannada",
        headingFontFamily: "ನೋಟೋ ಸೆರಿಫ್",
        bodySizePt: 13,
        lineHeight: 1.6,
      }).ok,
      true,
    );
    await openedEnglish.saveProject("Design Studio");

    const stored = (await assertNoStoredStylesheet(projectRoot)) as {
      book: {
        theme: { name: string };
        typography: { headingFontFamily: string };
      };
    };
    assert.equal(stored.book.theme.name, "ಕನ್ನಡ ವಿನ್ಯಾಸ");
    assert.equal(stored.book.typography.headingFontFamily, "ನೋಟೋ ಸೆರಿಫ್");

    const reopened = freshCoordinator("ds-harden-open-kn");
    const again = await reopened.openFromProjectPackage(projectRoot);
    assert.equal(again.projectRoot, projectRoot);
    const design = readBookDesign(reopened.getBook());
    assert.deepEqual(design.theme, { id: "kannada", name: "ಕನ್ನಡ ವಿನ್ಯಾಸ" });
    assert.equal(design.typography.bodyFontFamily, "Noto Sans Kannada");
    assert.equal(design.typography.headingFontFamily, "ನೋಟೋ ಸೆರಿಫ್");
    assert.equal(design.typography.bodySizePt, 13);
    assert.equal(design.typography.lineHeight, 1.6);
    assert.deepEqual(
      Array.from(design.theme.name),
      Array.from(design.theme.name.normalize("NFC")),
    );
    assert.deepEqual(
      Array.from(design.typography.headingFontFamily),
      Array.from(design.typography.headingFontFamily.normalize("NFC")),
    );
    assert.equal(findStoredStylesheetLeak(reopened.getBook()), null);

    await coordinator.close();
    await openedEnglish.close();
    await reopened.close();
  });
});
