// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 2 — source-shape guards for guided design choices.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("design choices chrome sets theme and typography and does not edit a stylesheet", () => {
  const ui = readFileSync(join(repoSrc, "ui", "DesignStudioChoices.tsx"), "utf8");
  const port = readFileSync(
    join(repoSrc, "workflow", "domain", "designStudioChoices.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(ui, /design-studio-choices/);
  assert.match(ui, /design-studio-theme-name/);
  assert.match(ui, /design-studio-body-font/);
  assert.match(ui, /design-studio-heading-font/);
  assert.match(ui, /design-studio-body-size/);
  assert.match(ui, /design-studio-line-height/);
  assert.match(ui, /choices\.setTheme/);
  assert.match(ui, /choices\.setTypography/);
  assert.match(ui, /choices\.read/);
  assert.doesNotMatch(
    ui,
    /<textarea|from ["']@tiptap|from ["']@openbook\/epub|stylesheet|localStorage|plugin-fs|DesktopStudioCoordinator/,
  );

  assert.match(port, /executeDesignCommand/);
  assert.match(port, /type: "set-theme"/);
  assert.match(port, /type: "set-typography"/);
  assert.doesNotMatch(port, /from ["']@tiptap|from ["']@openbook\/epub|stylesheet|writeFile/);

  assert.match(editor, /DesignStudioChoices/);
  assert.match(editor, /createDesignStudioChoices/);
  assert.match(editor, /updateTheme/);
  assert.match(editor, /updateTypography/);
});
