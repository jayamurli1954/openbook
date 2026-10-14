// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 3 — EN/KN metadata through package Save/Open and autosave,
 * with a regression guard that no OPF or ONIX document is stored.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { BookMetadata } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import type { AutosaveClock } from "../../persistence/autosaveController.js";
import {
  PACKAGE_ASSETS_INDEX_FILE,
  PACKAGE_BOOK_FILE,
  PACKAGE_MANIFEST_FILE,
  openProjectPackage,
} from "../../persistence/projectPackageFs.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { readBookMetadata } from "./metadataWizardContract.js";
import { createMetadataWizardFields, toMetadataFieldValues } from "./metadataWizardFields.js";
import { findStoredMetadataDocumentLeak } from "./metadataWizardUx.js";

class FakeClock implements AutosaveClock {
  nowMs = 0;
  readonly #timers = new Map<number, { due: number; handler: () => void }>();
  #nextId = 1;

  setTimeout(handler: () => void, ms: number): unknown {
    const id = this.#nextId++;
    this.#timers.set(id, { due: this.nowMs + ms, handler });
    return id;
  }

  clearTimeout(id: unknown): void {
    this.#timers.delete(id as number);
  }

  advance(ms: number): void {
    this.nowMs += ms;
    const due = [...this.#timers.entries()]
      .filter(([, timer]) => timer.due <= this.nowMs)
      .sort((a, b) => a[1].due - b[1].due);
    for (const [id, timer] of due) {
      this.#timers.delete(id);
      timer.handler();
    }
  }
}

function freshCoordinator(
  seed: string,
  clock?: FakeClock,
): DesktopStudioCoordinator {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: seed,
    autosaveDebounceMs: 40,
    autosaveClock: clock,
  });
}

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-mw-harden-"));
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

async function waitForAutosaveSettled(coordinator: DesktopStudioCoordinator): Promise<void> {
  for (let i = 0; i < 200; i++) {
    const state = coordinator.getAutosaveStatus().state;
    if (state === "idle" || state === "error") return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Autosave did not settle: ${coordinator.getAutosaveStatus().state}`);
}

/** Every package JSON file is free of OPF/ONIX keys; no OPF/ONIX/XML file exists. */
async function assertNoStoredMetadataDocument(projectRoot: string): Promise<{
  book: { metadata: BookMetadata };
}> {
  let stored: unknown;
  for (const file of [PACKAGE_BOOK_FILE, PACKAGE_MANIFEST_FILE, PACKAGE_ASSETS_INDEX_FILE]) {
    const text = await readFile(path.join(projectRoot, file), "utf8");
    const parsed = JSON.parse(text) as unknown;
    assert.equal(findStoredMetadataDocumentLeak(parsed), null, file);
    assert.doesNotMatch(text, /"(opf|packageDocument|onix|onixRecord)"\s*:/, file);
    if (file === PACKAGE_BOOK_FILE) stored = parsed;
  }
  const files = await listFiles(projectRoot);
  assert.equal(
    files.find((file) => /\.(opf|onix|xml)$/i.test(file)),
    undefined,
  );
  return stored as { book: { metadata: BookMetadata } };
}

const ENGLISH: BookMetadata = {
  title: "The River Book",
  subtitle: "A Field Guide",
  authors: ["Rao, Muralidhar", "Ada Lovelace"],
  contributors: ["Grace Hopper"],
  language: "en",
  identifier: "978-0-00-000000-0",
  publisher: "SanMitra Tech Solutions",
  publishedAt: "2026-10-13",
  copyright: "© 2026 Muralidhar Rao",
  description: "First line.\nSecond line.",
  subjects: ["Nature", "Rivers", "Travel"],
  rights: "All rights reserved",
};

const KANNADA: BookMetadata = {
  title: "ನದಿಯ ಪುಸ್ತಕ",
  subtitle: "ಕ್ಷೇತ್ರ ಮಾರ್ಗದರ್ಶಿ",
  authors: ["ಮುರಳೀಧರ ರಾವ್", "ಲೇಖಕ"],
  contributors: ["ಸಂಪಾದಕ"],
  language: "kn",
  identifier: "978-0-00-000001-7",
  publisher: "ಸನ್‌ಮಿತ್ರ",
  publishedAt: "2026-10-14",
  copyright: "© 2026 ಮುರಳೀಧರ ರಾವ್",
  description: "ಮೊದಲ ಸಾಲು.\nಎರಡನೇ ಸಾಲು.",
  subjects: ["ಪ್ರಕೃತಿ", "ನದಿಗಳು"],
  rights: "ಎಲ್ಲ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ",
};

function assertNfc(metadata: BookMetadata): void {
  for (const text of [metadata.title, metadata.description, ...metadata.authors]) {
    assert.equal(text, text.normalize("NFC"));
  }
}

test("EN and KN metadata survive package Save → Open without a stored OPF or ONIX", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "metadata.obproj");
    // A fake clock keeps autosave from firing during the explicit Save
    // (binding a dirty book schedules one), so only one writer touches the package.
    const clock = new FakeClock();
    const coordinator = freshCoordinator("mw-harden-save", clock);
    const fields = createMetadataWizardFields(coordinator.getSession());

    assert.equal(fields.apply(toMetadataFieldValues(ENGLISH)).ok, true);
    coordinator.bindPackageRoot(projectRoot);
    await coordinator.saveProject("Metadata Wizard");
    const storedEnglish = await assertNoStoredMetadataDocument(projectRoot);
    assert.deepEqual(storedEnglish.book.metadata, ENGLISH);

    const openedEnglish = freshCoordinator("mw-harden-open-en", clock);
    const opened = await openedEnglish.openFromProjectPackage(projectRoot);
    assert.equal(opened.projectRoot, projectRoot);
    assert.deepEqual(readBookMetadata(openedEnglish.getBook()), ENGLISH);
    assert.equal(findStoredMetadataDocumentLeak(openedEnglish.getBook()), null);

    const kannada = createMetadataWizardFields(openedEnglish.getSession());
    assert.equal(kannada.apply(toMetadataFieldValues(KANNADA)).ok, true);
    await openedEnglish.saveProject("Metadata Wizard");
    const storedKannada = await assertNoStoredMetadataDocument(projectRoot);
    assert.deepEqual(storedKannada.book.metadata, KANNADA);

    const reopened = freshCoordinator("mw-harden-open-kn", clock);
    const again = await reopened.openFromProjectPackage(projectRoot);
    assert.equal(again.projectRoot, projectRoot);
    const metadata = readBookMetadata(reopened.getBook());
    assert.deepEqual(metadata, KANNADA);
    assertNfc(metadata);
    assert.deepEqual(kannada.read(), toMetadataFieldValues(KANNADA));
    assert.equal(findStoredMetadataDocumentLeak(reopened.getBook()), null);

    await coordinator.close();
    await openedEnglish.close();
    await reopened.close();
  });
});

test("a metadata edit on a bound package is written by autosave", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "autosave.obproj");
    const clock = new FakeClock();
    const coordinator = freshCoordinator("mw-harden-autosave", clock);
    coordinator.bindPackageRoot(projectRoot);
    const fields = createMetadataWizardFields(coordinator.getSession());

    const result = fields.apply({
      ...fields.read(),
      title: "ಸ್ವಯಂ ಉಳಿಕೆ",
      subjects: "ಕಥೆ\nFiction",
    });
    assert.equal(result.ok, true);
    assert.equal(coordinator.getAutosaveStatus().state, "scheduled");

    clock.advance(40);
    await waitForAutosaveSettled(coordinator);
    assert.equal(coordinator.getAutosaveStatus().state, "idle");

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    assert.equal(opened.value.book.metadata.title, "ಸ್ವಯಂ ಉಳಿಕೆ");
    assert.deepEqual(opened.value.book.metadata.subjects, ["ಕಥೆ", "Fiction"]);
    await assertNoStoredMetadataDocument(projectRoot);

    await coordinator.close();
  });
});
