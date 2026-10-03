// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0036 Slice 3 — source-shape guard for the stylesheet firewall.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("design hardening guards a stored stylesheet and the chrome does not write one", () => {
  const ux = readFileSync(join(repoSrc, "workflow", "domain", "designStudioUx.ts"), "utf8");
  const ui = readFileSync(join(repoSrc, "ui", "DesignStudioChoices.tsx"), "utf8");

  assert.match(ux, /findStoredStylesheetLeak/);
  assert.doesNotMatch(
    ux,
    /from ["']@tiptap|from ["']react["']|from ["']@openbook\/epub|localStorage|writeFile|plugin-fs/,
  );

  assert.doesNotMatch(
    ui,
    /findStoredStylesheetLeak|stylesheet|localStorage|writeFile|from ["']@tiptap|from ["']@openbook\/epub/,
  );
});
