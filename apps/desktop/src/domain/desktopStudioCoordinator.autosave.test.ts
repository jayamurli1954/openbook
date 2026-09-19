// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0031 Slice 3: DesktopStudioCoordinator package-root autosave wiring.
 */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContentBlock } from "@openbook/book-model";
import { DesktopStudioCoordinator, DesktopStudioError } from "./desktopStudioCoordinator.js";
import { openProjectPackage } from "../persistence/projectPackageFs.js";
import { InMemorySqliteConnection } from "../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../persistence/sqlitePersistence.js";
import type { AutosaveClock } from "../persistence/autosaveController.js";

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

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "openbook-coord-autosave-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
}

function freshCoordinator(options?: {
  idSeed?: string;
  clock?: FakeClock;
  debounceMs?: number;
}) {
  const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
  return new DesktopStudioCoordinator({
    persistence,
    idSeed: options?.idSeed ?? "autosave-slice-3",
    autosaveDebounceMs: options?.debounceMs ?? 50,
    autosaveClock: options?.clock,
  });
}

function paragraph(text: string, id = "p-edit"): ContentBlock {
  return {
    type: "paragraph",
    id,
    inlines: [{ type: "text", text }],
  };
}

test("unbound package root: mutations do not schedule autosave", async () => {
  const clock = new FakeClock();
  const coordinator = freshCoordinator({ clock });
  assert.equal(coordinator.getPackageRoot(), null);
  assert.equal(coordinator.getState().packageRoot, null);
  assert.equal(coordinator.getAutosaveStatus().state, "idle");

  coordinator.updateActiveSectionBlocks([paragraph("dirty unbound")]);
  clock.advance(100);
  await Promise.resolve();
  assert.equal(coordinator.getAutosaveStatus().state, "idle");
  assert.equal(coordinator.getState().isDirty, true);
});

test("bindPackageRoot rejects empty paths", () => {
  const coordinator = freshCoordinator();
  assert.throws(
    () => coordinator.bindPackageRoot("   "),
    (err: unknown) =>
      err instanceof DesktopStudioError && err.code === "PACKAGE_ROOT_INVALID",
  );
});

async function waitForAutosaveSettled(
  coordinator: DesktopStudioCoordinator,
): Promise<void> {
  for (let i = 0; i < 200; i++) {
    const state = coordinator.getAutosaveStatus().state;
    if (state === "idle" || state === "error") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Autosave did not settle: ${coordinator.getAutosaveStatus().state}`);
}

test("bound package root: mutation schedules autosave and flush persists package", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "bound.obproj");
    const clock = new FakeClock();
    const coordinator = freshCoordinator({ clock, debounceMs: 40 });
    coordinator.bindPackageRoot(projectRoot);
    assert.equal(coordinator.getPackageRoot(), projectRoot);
    assert.equal(coordinator.getState().packageRoot, projectRoot);

    coordinator.updateActiveSectionBlocks([paragraph("autosaved body")]);
    assert.equal(coordinator.getAutosaveStatus().state, "scheduled");

    clock.advance(40);
    await waitForAutosaveSettled(coordinator);

    assert.equal(coordinator.getAutosaveStatus().state, "idle");
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    if (!opened.ok) return;
    const blocks = opened.value.book.chapters[0]!.blocks;
    assert.equal(blocks[0]!.type, "paragraph");
    if (blocks[0]!.type === "paragraph") {
      assert.equal(blocks[0]!.inlines[0]!.type, "text");
      if (blocks[0]!.inlines[0]!.type === "text") {
        assert.equal(blocks[0]!.inlines[0]!.text, "autosaved body");
      }
    }
    await coordinator.close();
  });
});

test("flushAutosave persists immediately when bound and dirty", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "flush.obproj");
    const coordinator = freshCoordinator({ debounceMs: 60_000 });
    coordinator.bindPackageRoot(projectRoot);
    coordinator.updateActiveSectionBlocks([paragraph("flushed now")]);

    const result = await coordinator.flushAutosave();
    assert.equal(result.ok, true);
    assert.equal(coordinator.getAutosaveStatus().state, "idle");

    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, true);
    await coordinator.close();
  });
});

test("newProject and openProject clear package root binding", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "cleared.obproj");
    const coordinator = freshCoordinator();
    coordinator.bindPackageRoot(projectRoot);
    await coordinator.newProject("Fresh");
    assert.equal(coordinator.getPackageRoot(), null);

    await coordinator.saveProject("Saved");
    const id = coordinator.getState().binding!.projectId;
    coordinator.bindPackageRoot(projectRoot);
    await coordinator.openProject(id);
    assert.equal(coordinator.getPackageRoot(), null);
  });
});

test("bindPackageRoot with already-dirty session schedules autosave", async () => {
  const clock = new FakeClock();
  let saves = 0;
  const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "pre-dirty",
    autosaveDebounceMs: 20,
    autosaveClock: clock,
    packageSave: async () => {
      saves += 1;
      return { ok: true, value: { projectRoot: "/x", projectId: "p", assetCount: 0 } };
    },
  });

  coordinator.updateActiveSectionBlocks([paragraph("before bind")]);
  assert.equal(coordinator.getAutosaveStatus().state, "idle");
  coordinator.bindPackageRoot("/tmp/pre-dirty.obproj");
  assert.equal(coordinator.getAutosaveStatus().state, "scheduled");
  clock.advance(20);
  await Promise.resolve();
  assert.equal(saves, 1);
});

test("unbindPackageRoot cancels a pending autosave schedule", async () => {
  const clock = new FakeClock();
  let saves = 0;
  const persistence = new SqliteProjectPersistence(new InMemorySqliteConnection());
  const coordinator = new DesktopStudioCoordinator({
    persistence,
    idSeed: "unbind-cancel",
    autosaveDebounceMs: 40,
    autosaveClock: clock,
    packageSave: async () => {
      saves += 1;
      return { ok: true, value: { projectRoot: "/x", projectId: "p", assetCount: 0 } };
    },
  });

  coordinator.bindPackageRoot("/tmp/unbind-cancel.obproj");
  coordinator.updateActiveSectionBlocks([paragraph("pending")]);
  assert.equal(coordinator.getAutosaveStatus().state, "scheduled");
  coordinator.unbindPackageRoot();
  clock.advance(40);
  await Promise.resolve();
  assert.equal(saves, 0);
  assert.equal(coordinator.getAutosaveStatus().state, "idle");
});

test("SQLite saveProject does not dual-write a package when unbound", async () => {
  await withTempRoot(async (parent) => {
    const projectRoot = path.join(parent, "no-dual.obproj");
    const coordinator = freshCoordinator();
    coordinator.updateActiveSectionBlocks([paragraph("sqlite only")]);
    await coordinator.saveProject("SQLite Only");
    // Never bound — package must not appear.
    const opened = await openProjectPackage(projectRoot);
    assert.equal(opened.ok, false);
  });
});
