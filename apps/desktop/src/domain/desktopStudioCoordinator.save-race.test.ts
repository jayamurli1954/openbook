// SPDX-License-Identifier: Apache-2.0
/**
 * Explicit Save and autosave must never write the same project package at
 * the same time (ADR-0029 / ADR-0031). Reproduces the race found during
 * ADR-0039 Slice 1 with a slow package save and a fake autosave clock.
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { ContentBlock } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "./desktopStudioCoordinator.js";
import type { AutosaveClock } from "../persistence/autosaveController.js";
import type { PackageAutosaveSaveFn } from "../persistence/packageAutosavePort.js";
import type { ProjectPackageSaveSummary } from "../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";

class FakeClock implements AutosaveClock {
  readonly #timers = new Map<number, { due: number; handler: () => void }>();
  #now = 0;
  #nextId = 1;

  setTimeout(handler: () => void, ms: number): unknown {
    const id = this.#nextId++;
    this.#timers.set(id, { due: this.#now + ms, handler });
    return id;
  }

  clearTimeout(id: unknown): void {
    this.#timers.delete(id as number);
  }

  advance(ms: number): void {
    this.#now += ms;
    for (const [id, timer] of [...this.#timers.entries()]) {
      if (timer.due <= this.#now) {
        this.#timers.delete(id);
        timer.handler();
      }
    }
  }
}

/** A package save that waits until the test releases it, and counts overlap. */
function slowPackageSave() {
  let inFlight = 0;
  let maxInFlight = 0;
  const titles: string[] = [];
  const pending: (() => void)[] = [];
  const save: PackageAutosaveSaveFn = async (input) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    titles.push(input.book.metadata.title);
    await new Promise<void>((resolve) => pending.push(resolve));
    inFlight -= 1;
    return { ok: true, value: {} as ProjectPackageSaveSummary };
  };
  return {
    save,
    titles,
    get inFlight() {
      return inFlight;
    },
    get maxInFlight() {
      return maxInFlight;
    },
    releaseNext(): boolean {
      const next = pending.shift();
      next?.();
      return next !== undefined;
    },
  };
}

async function until(condition: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (condition()) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function paragraph(text: string): ContentBlock {
  return { type: "paragraph", id: "race-p", inlines: [{ type: "text", text }] };
}

test("autosave firing during an explicit Save waits its turn", async () => {
  const clock = new FakeClock();
  const fake = slowPackageSave();
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "save-race",
    autosaveDebounceMs: 10,
    autosaveClock: clock,
    packageSave: fake.save,
  });

  // An unsaved edit, then binding a folder: autosave is scheduled.
  coordinator.updateActiveSectionBlocks([paragraph("first draft")]);
  coordinator.bindPackageRoot("/books/race.obproj");
  assert.equal(coordinator.getAutosaveStatus().state, "scheduled");

  // Explicit Save starts and is still writing...
  const explicit = coordinator.saveProject("Race Book");
  await until(() => fake.inFlight === 1, "explicit Save to start writing");

  // ...when the autosave timer fires and the author keeps editing.
  coordinator.getSession().updateMetadata({ title: "Edited during save" });
  clock.advance(10);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(fake.inFlight, 1, "autosave must not write while Save is writing");

  // Let the writes finish one by one.
  while (fake.releaseNext()) {
    await new Promise((resolve) => setImmediate(resolve));
  }
  await explicit;
  await until(() => fake.inFlight === 0 && !fake.releaseNext(), "all writes to finish");

  assert.equal(fake.maxInFlight, 1, "never two writers at once");
  assert.equal(fake.titles.at(-1), "Edited during save", "the last write holds the newest book");
  await coordinator.close();
});

test("a failed write does not block the next one", async () => {
  const clock = new FakeClock();
  let calls = 0;
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "save-race-fail",
    autosaveDebounceMs: 10,
    autosaveClock: clock,
    packageSave: async () => {
      calls += 1;
      if (calls === 1) throw new Error("disk full");
      return { ok: true, value: {} as ProjectPackageSaveSummary };
    },
  });
  coordinator.bindPackageRoot("/books/fail.obproj");
  await assert.rejects(() => coordinator.saveProject("Fail Book"));
  await coordinator.saveProject("Fail Book");
  assert.equal(calls, 2);
  await coordinator.close();
});
