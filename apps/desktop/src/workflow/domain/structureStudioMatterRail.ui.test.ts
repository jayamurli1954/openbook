// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 2 — source-shape guards for the matter rail.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("StructureStudioRail lists matters and does not move, remove, or set roles", () => {
  const railUi = readFileSync(join(repoSrc, "ui", "StructureStudioRail.tsx"), "utf8");
  const port = readFileSync(
    join(repoSrc, "workflow", "domain", "structureStudioMatterRail.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(railUi, /structure-studio-rail/);
  assert.match(railUi, /structure-studio-group-/);
  assert.match(railUi, /Front matter/);
  assert.match(railUi, /rail\.add/);
  assert.match(railUi, /rail\.rename/);
  assert.match(railUi, /rail\.reorder/);
  assert.doesNotMatch(
    railUi,
    /DesktopStudioCoordinator|moveSection|removeSection|updateSectionRole|type:\s*"move"|type:\s*"remove"|type:\s*"set-role"|from ["']@tiptap|plugin-fs|Ollama/,
  );

  assert.match(port, /executeStructureCommand/);
  assert.match(port, /type: "add"/);
  assert.match(port, /type: "rename"/);
  assert.match(port, /type: "reorder"/);
  assert.doesNotMatch(port, /type: "move"|type: "remove"|type: "set-role"/);

  assert.match(editor, /StructureStudioRail/);
  assert.match(editor, /createStructureStudioMatterRail/);
});
