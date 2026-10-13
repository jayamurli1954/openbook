// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 3 — source-shape guards: the firewall stays pure and the
 * metadata chrome never writes a package document.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("metadata hardening guards a stored OPF or ONIX and the chrome does not write one", () => {
  const ux = readFileSync(join(repoSrc, "workflow", "domain", "metadataWizardUx.ts"), "utf8");
  const ui = readFileSync(join(repoSrc, "ui", "MetadataWizardFields.tsx"), "utf8");
  const port = readFileSync(
    join(repoSrc, "workflow", "domain", "metadataWizardFields.ts"),
    "utf8",
  );

  assert.match(ux, /findStoredMetadataDocumentLeak/);
  assert.doesNotMatch(
    ux,
    /from ["']@tiptap|from ["']react["']|from ["']@openbook\/epub|localStorage|writeFile|plugin-fs/,
  );

  for (const source of [ui, port]) {
    assert.doesNotMatch(
      source,
      /findStoredMetadataDocumentLeak|from ["']@openbook\/(epub|html|pdf)|writeFile|plugin-fs|localStorage|from ["']@tiptap/,
    );
  }
});
