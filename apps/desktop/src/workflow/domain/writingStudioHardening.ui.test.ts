// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 5 — source-shape guards for hardening copy and TipTap firewall.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");

test("Writing Studio chrome uses UX copy and does not persist TipTap", () => {
  const ux = readFileSync(
    join(repoSrc, "workflow", "domain", "writingStudioUx.ts"),
    "utf8",
  );
  const panel = readFileSync(
    join(repoSrc, "ui", "WritingStudioFindPanel.tsx"),
    "utf8",
  );
  const button = readFileSync(
    join(repoSrc, "ui", "WritingStudioImageButton.tsx"),
    "utf8",
  );
  const editor = readFileSync(join(repoSrc, "EditorSurface.tsx"), "utf8");

  assert.match(ux, /findTipTapCanonicalLeak/);
  assert.match(ux, /WRITING_STUDIO_EMPTY_CHAPTERS/);
  assert.doesNotMatch(ux, /from ["']@tiptap|persistTipTap|localStorage|plugin-fs/);

  assert.match(panel, /formatWritingStudioSearchFailure/);
  assert.match(panel, /WRITING_STUDIO_SEARCH_NO_MATCHES/);
  assert.doesNotMatch(panel, /from ["']@tiptap|persistTipTap/);

  assert.match(button, /formatWritingStudioImageFailure/);
  assert.match(button, /formatWritingStudioImageInserted/);
  assert.doesNotMatch(button, /from ["']@tiptap|persistTipTap|plugin-fs/);

  assert.match(editor, /WRITING_STUDIO_EMPTY_CHAPTERS/);
  assert.match(editor, /writing-studio-empty-chapters/);
  assert.match(editor, /writing-studio-no-section/);
  assert.match(editor, /writing-studio-editor-unavailable/);
  assert.doesNotMatch(editor, /persistTipTap|localStorage\.setItem\(["']tiptap/);
});
