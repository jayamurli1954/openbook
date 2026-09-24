// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { DesktopStudioCoordinator } from "../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";
import {
  createGuidedStartHost,
  createUnavailableContinuePort,
} from "./createGuidedStartHost.js";
import { createFileGuidedStartRecentTextStore } from "./guidedStartRecentFileStore.js";
import { createGuidedStartRecentPort } from "../workflow/domain/guidedStartRecentStore.js";

function freshCoordinator() {
  return new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "guided-start-host-factory",
  });
}

test("createGuidedStartHost starts a new book through the live coordinator", async () => {
  const coordinator = freshCoordinator();
  const host = createGuidedStartHost({ coordinator });

  const result = await host.startNewBook({
    title: "ಕನ್ನಡ ಕಥೆ",
    language: "kn",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.projectName, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(coordinator.getBook().metadata.title, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(coordinator.getBook().metadata.language, "kn");
  await coordinator.close();
});

test("createGuidedStartHost continue fails closed when override is unavailable", async () => {
  const coordinator = freshCoordinator();
  const host = createGuidedStartHost({
    coordinator,
    continuePort: createUnavailableContinuePort("stub"),
  });

  const result = await host.continueExisting();
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "CONTINUE_UNAVAILABLE");
  assert.equal(result.message, "stub");
  await coordinator.close();
});

test("file-backed recent store survives reload and feeds continue root", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ob-guided-recent-"));
  const filePath = path.join(dir, "guided-start-recent.json");
  try {
    const store = createFileGuidedStartRecentTextStore(filePath);
    const port = createGuidedStartRecentPort(store);
    await port.rememberOpened({
      projectRoot: path.join(dir, "Demo.obproj"),
      displayName: "Demo.obproj",
      lastOpenedAt: "2026-09-24T12:00:00.000Z",
    });

    const reloaded = createGuidedStartRecentPort(
      createFileGuidedStartRecentTextStore(filePath),
    );
    const listed = await reloaded.listRecent();
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.displayName, "Demo.obproj");
    assert.equal(await reloaded.getContinueRoot(), path.join(dir, "Demo.obproj"));

    const coordinator = freshCoordinator();
    const host = createGuidedStartHost({
      coordinator,
      recentTextStore: createFileGuidedStartRecentTextStore(filePath),
    });
    const recent = await host.listRecent();
    assert.equal(recent[0]?.projectRoot, path.join(dir, "Demo.obproj"));
    await coordinator.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
