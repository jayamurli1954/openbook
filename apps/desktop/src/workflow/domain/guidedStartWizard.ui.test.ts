// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 3 — source-shape guards for the React wizard shell.
 * Mirrors Gate 9 ExportPanel checks: UI must not call engines or FS directly.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("GuidedStartWizard stays free of coordinator, Tauri, and filesystem calls", () => {
  const wizard = readFileSync(join(repoSrc, "ui", "GuidedStartWizard.tsx"), "utf8");
  const factory = readFileSync(
    join(repoSrc, "host", "createGuidedStartHost.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(wizard, /IGuidedStartHostAdapter/);
  assert.match(wizard, /getGuidedStartFieldHelp/);
  assert.match(wizard, /guided-start-path-\$\{key\}/);
  assert.match(wizard, /"new-book"/);
  assert.match(wizard, /"open-recent"/);
  assert.match(wizard, /Continue Existing Project/);
  assert.doesNotMatch(wizard, /DesktopStudioCoordinator|newProject\(|writeFile|plugin-dialog|plugin-fs|child_process/);
  assert.doesNotMatch(wizard, /\bOllama\b/);

  assert.match(factory, /GuidedStartHostAdapter/);
  assert.match(factory, /createGuidedStartContinuePort|createGuidedStartRecentPort/);
  assert.doesNotMatch(factory, /plugin-dialog|plugin-fs|localStorage/);

  assert.match(editor, /GuidedStartWizard/);
  assert.match(editor, /createGuidedStartHost/);
});
