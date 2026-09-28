// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 5 — source-shape guards for empty-matter copy and the outline firewall.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("structure rail shows empty-matter copy and does not store an outline", () => {
  const ux = readFileSync(
    join(repoSrc, "workflow", "domain", "structureStudioUx.ts"),
    "utf8",
  );
  const rail = readFileSync(join(repoSrc, "ui", "StructureStudioRail.tsx"), "utf8");

  assert.match(ux, /findStoredOutlineLeak/);
  assert.match(ux, /STRUCTURE_STUDIO_EMPTY_FRONT/);
  assert.match(ux, /STRUCTURE_STUDIO_EMPTY_BACK/);
  assert.doesNotMatch(ux, /from ["']@tiptap|from ["']@openbook\/epub|localStorage|writeFile|plugin-fs/);

  assert.match(rail, /structureStudioEmptyMatterCopy/);
  assert.match(rail, /structure-studio-empty-/);
  assert.doesNotMatch(
    rail,
    /findStoredOutlineLeak|localStorage|writeFile|from ["']@tiptap|from ["']@openbook\/epub/,
  );
});
