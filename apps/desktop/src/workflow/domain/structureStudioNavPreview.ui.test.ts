// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 4 — source-shape guards for the read-only navigation preview.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("navigation preview renders Book order and does not mutate or publish nav", () => {
  const previewUi = readFileSync(
    join(repoSrc, "ui", "StructureStudioNavPreview.tsx"),
    "utf8",
  );
  const projection = readFileSync(
    join(repoSrc, "workflow", "domain", "structureStudioNavPreview.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(previewUi, /structure-studio-nav/);
  assert.match(previewUi, /structure-studio-nav-item-/);
  assert.match(previewUi, /entry\.title/);
  assert.match(previewUi, /entry\.matter/);
  assert.match(previewUi, /entry\.role/);
  assert.doesNotMatch(
    previewUi,
    /<button|<input|<select|onClick|executeStructureCommand|nav\.xhtml|writeFile|localStorage|from ["']@tiptap|plugin-fs|Ollama/,
  );

  assert.match(projection, /projectBookNavigation/);
  assert.match(projection, /listBookStructure/);
  assert.doesNotMatch(
    projection,
    /executeStructureCommand|nav\.xhtml|from ["']@openbook\/epub|from ["']@tiptap|writeFile/,
  );

  assert.match(editor, /StructureStudioNavPreview/);
  assert.match(editor, /projectBookNavigation/);
});
