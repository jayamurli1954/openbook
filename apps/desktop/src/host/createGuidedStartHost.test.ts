// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import { DesktopStudioCoordinator } from "../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";
import {
  createGuidedStartHost,
  createUnavailableContinuePort,
} from "./createGuidedStartHost.js";

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

test("createGuidedStartHost continue fails closed with Slice 4 stub", async () => {
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
