// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  createGuidedStartRecentPort,
  createMemoryGuidedStartRecentTextStore,
  displayNameFromProjectRoot,
  emptyGuidedStartRecentState,
  parseGuidedStartRecentState,
  GUIDED_START_RECENT_MAX_ENTRIES,
} from "./guidedStartRecentStore.js";

test("displayNameFromProjectRoot uses the final path segment", () => {
  assert.equal(displayNameFromProjectRoot("D:\\\\Books\\\\Demo.obproj"), "Demo.obproj");
  assert.equal(displayNameFromProjectRoot("/tmp/ಕನ್ನಡ.obproj/"), "ಕನ್ನಡ.obproj");
});

test("parseGuidedStartRecentState accepts empty and rejects bad schema", () => {
  assert.deepEqual(parseGuidedStartRecentState(null), emptyGuidedStartRecentState());
  assert.throws(() => parseGuidedStartRecentState("{"), /malformed JSON/);
  assert.throws(
    () => parseGuidedStartRecentState(JSON.stringify({ schemaVersion: 99, entries: [] })),
    /unsupported/,
  );
});

test("recent port remembers MRU order, continue root, and caps size", async () => {
  const textStore = createMemoryGuidedStartRecentTextStore();
  let tick = 0;
  const port = createGuidedStartRecentPort(textStore, {
    now: () => `2026-09-24T00:00:0${tick++}.000Z`,
  });

  await port.rememberOpened({
    projectRoot: "/a",
    displayName: "A",
    lastOpenedAt: "",
  });
  await port.rememberOpened({
    projectRoot: "/b",
    displayName: "B",
    lastOpenedAt: "",
  });
  await port.rememberOpened({
    projectRoot: "/a",
    displayName: "A again",
    lastOpenedAt: "",
  });

  const listed = await port.listRecent();
  assert.equal(listed[0]?.projectRoot, "/a");
  assert.equal(listed[0]?.displayName, "A again");
  assert.equal(listed[1]?.projectRoot, "/b");
  assert.equal(await port.getContinueRoot(), "/a");

  for (let i = 0; i < GUIDED_START_RECENT_MAX_ENTRIES + 3; i += 1) {
    await port.rememberOpened({
      projectRoot: `/p${i}`,
      displayName: `P${i}`,
      lastOpenedAt: "",
    });
  }
  assert.equal((await port.listRecent()).length, GUIDED_START_RECENT_MAX_ENTRIES);

  const reloaded = createGuidedStartRecentPort(
    createMemoryGuidedStartRecentTextStore(textStore.snapshot()),
  );
  assert.equal((await reloaded.listRecent()).length, GUIDED_START_RECENT_MAX_ENTRIES);
  assert.match(textStore.snapshot() ?? "", /schemaVersion/);
});
