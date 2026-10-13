// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 2 — source-shape guards for guided metadata fields.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("metadata chrome edits Book metadata and does not write OPF or ONIX", () => {
  const ui = readFileSync(join(repoSrc, "ui", "MetadataWizardFields.tsx"), "utf8");
  const port = readFileSync(
    join(repoSrc, "workflow", "domain", "metadataWizardFields.ts"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(ui, /metadata-wizard-fields/);
  for (const key of [
    "title",
    "subtitle",
    "authors",
    "contributors",
    "language",
    "identifier",
    "publisher",
    "publishedAt",
    "copyright",
    "rights",
    "description",
    "subjects",
  ]) {
    assert.match(ui, new RegExp(`key: "${key}"`), key);
  }
  assert.match(ui, /metadata-wizard-apply/);
  assert.match(ui, /fields\.apply/);
  assert.match(ui, /fields\.read/);
  assert.doesNotMatch(
    ui,
    /from ["']@tiptap|from ["']@tauri-apps|from ["']@openbook\/epub|plugin-fs|localStorage|DesktopStudioCoordinator|opf|onix/i,
  );

  assert.match(port, /executeMetadataCommand/);
  assert.match(port, /type: "set-metadata"/);
  assert.doesNotMatch(port, /from ["']@tiptap|from ["']@openbook\/epub|writeFile|opf|onix/i);

  assert.match(editor, /MetadataWizardFields/);
  assert.match(editor, /createMetadataWizardFields/);
  assert.match(editor, /updateMetadata/);
});
