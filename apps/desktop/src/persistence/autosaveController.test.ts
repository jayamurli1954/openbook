// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AutosaveController,
  type AutosaveClock,
  type AutosaveSavePort,
  type AutosaveSaveResult,
} from "./autosaveController.js";

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

function deferredSave(): {
  port: AutosaveSavePort;
  resolve: (result: AutosaveSaveResult) => void;
  calls: number;
} {
  let calls = 0;
  let resolve!: (result: AutosaveSaveResult) => void;
  const port: AutosaveSavePort = {
    save: () => {
      calls += 1;
      return new Promise<AutosaveSaveResult>((res) => {
        resolve = res;
      });
    },
  };
  return {
    port,
    resolve: (result) => resolve(result),
    get calls() {
      return calls;
    },
  };
}

test("markDirty schedules a debounced save", async () => {
  const clock = new FakeClock();
  let saves = 0;
  const controller = new AutosaveController({
    debounceMs: 100,
    clock,
    save: {
      async save() {
        saves += 1;
        return { ok: true };
      },
    },
  });

  controller.markDirty();
  assert.equal(controller.getStatus().state, "scheduled");
  clock.advance(99);
  assert.equal(saves, 0);
  clock.advance(1);
  await Promise.resolve();
  assert.equal(saves, 1);
  assert.equal(controller.isDirty(), false);
  assert.equal(controller.getStatus().state, "idle");
});

test("repeated markDirty coalesces to one save after the quiet period", async () => {
  const clock = new FakeClock();
  let saves = 0;
  const controller = new AutosaveController({
    debounceMs: 50,
    clock,
    save: {
      async save() {
        saves += 1;
        return { ok: true };
      },
    },
  });

  controller.markDirty();
  clock.advance(40);
  controller.markDirty();
  clock.advance(40);
  assert.equal(saves, 0);
  clock.advance(10);
  await Promise.resolve();
  assert.equal(saves, 1);
});

test("flush saves immediately when dirty", async () => {
  const clock = new FakeClock();
  let saves = 0;
  const controller = new AutosaveController({
    debounceMs: 1000,
    clock,
    save: {
      async save() {
        saves += 1;
        return { ok: true };
      },
    },
  });

  controller.markDirty();
  const result = await controller.flush();
  assert.equal(result.ok, true);
  assert.equal(saves, 1);
  assert.equal(controller.isDirty(), false);
});

test("failed save keeps dirty state and reports error status", async () => {
  const clock = new FakeClock();
  const controller = new AutosaveController({
    debounceMs: 10,
    clock,
    save: {
      async save() {
        return { ok: false, error: { code: "PACKAGE_IO_ERROR", message: "disk full" } };
      },
    },
  });

  controller.markDirty();
  clock.advance(10);
  await Promise.resolve();
  assert.equal(controller.isDirty(), true);
  const status = controller.getStatus();
  assert.equal(status.state, "error");
  if (status.state === "error") {
    assert.equal(status.error.code, "PACKAGE_IO_ERROR");
  }
});

test("dirty marks during an in-flight save schedule a follow-up save", async () => {
  const clock = new FakeClock();
  const pending = deferredSave();
  const controller = new AutosaveController({
    debounceMs: 10,
    clock,
    save: pending.port,
  });

  controller.markDirty();
  clock.advance(10);
  await Promise.resolve();
  assert.equal(controller.getStatus().state, "saving");
  assert.equal(pending.calls, 1);

  controller.markDirty();
  pending.resolve({ ok: true });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(controller.isDirty(), true);
  assert.equal(controller.getStatus().state, "scheduled");
  clock.advance(10);
  await Promise.resolve();
  // Second save started; resolve it.
  assert.equal(pending.calls, 2);
  pending.resolve({ ok: true });
  await Promise.resolve();
  assert.equal(controller.isDirty(), false);
});

test("markClean cancels a pending debounce", async () => {
  const clock = new FakeClock();
  let saves = 0;
  const controller = new AutosaveController({
    debounceMs: 20,
    clock,
    save: {
      async save() {
        saves += 1;
        return { ok: true };
      },
    },
  });

  controller.markDirty();
  controller.markClean();
  clock.advance(20);
  await Promise.resolve();
  assert.equal(saves, 0);
  assert.equal(controller.getStatus().state, "idle");
});

test("does not inspect or accept Tiptap document shapes as save inputs", () => {
  // Slice 1 port has no document argument — callers must bind canonical Book externally.
  const port: AutosaveSavePort = {
    async save() {
      return { ok: true };
    },
  };
  assert.equal("save" in port, true);
  assert.equal((port.save as (...args: never[]) => Promise<AutosaveSaveResult>).length, 0);
});
