// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 3 — source-shape guards for move and role on the matter rail.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("StructureStudioRail can move and set roles and does not remove sections", () => {
  const railUi = readFileSync(join(repoSrc, "ui", "StructureStudioRail.tsx"), "utf8");
  const port = readFileSync(
    join(repoSrc, "workflow", "domain", "structureStudioMatterRail.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(railUi, /structure-studio-rail/);
  assert.match(railUi, /structure-studio-move-/);
  assert.match(railUi, /structure-studio-set-role-/);
  assert.match(railUi, /rail\.move/);
  assert.match(railUi, /rail\.setRole/);
  assert.match(railUi, /rail\.rolesFor/);
  assert.doesNotMatch(
    railUi,
    /DesktopStudioCoordinator|removeSection|type:\s*"remove"|from ["']@tiptap|plugin-fs|Ollama/,
  );

  assert.match(port, /type: "move"/);
  assert.match(port, /type: "set-role"/);
  assert.match(port, /rolesForMatter/);
  assert.doesNotMatch(port, /type: "remove"/);

  assert.match(editor, /moveSection/);
  assert.match(editor, /updateSectionRole/);
  assert.match(editor, /createStructureStudioMatterRail/);
});
