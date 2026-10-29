// SPDX-License-Identifier: Apache-2.0
/**
 * Source-shape guards: the Write editor registers a picture node and the adapter
 * never turns a picture into "[image:…]" text.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const src = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(src, ...parts), "utf8");

test("the Write editor registers the picture node", () => {
  const editor = read("EditorSurface.tsx");
  assert.match(editor, /import \{ OpenbookImageNode \} from "\.\/ui\/openbookImageNode"/);
  assert.match(editor, /OpenbookImageNode\.configure\(/);
  assert.match(editor, /getAssetResolver\(\)\.resolve\(asset\)/);
});

test("the picture node is an atom that stores asset id and caption", () => {
  const node = read("ui", "openbookImageNode.ts");
  assert.match(node, /name: "openbookImage"/);
  assert.match(node, /atom: true/);
  assert.match(node, /assetId: \{/);
  assert.match(node, /caption: \{/);
  assert.match(node, /URL\.revokeObjectURL/);
  assert.doesNotMatch(node, /from "@tauri-apps|node:fs/);
});

test("the editor adapter no longer writes picture placeholders", () => {
  const adapter = read("domain", "editorAdapter.ts");
  assert.doesNotMatch(adapter, /\[image:\$\{/);
  assert.match(adapter, /case "openbookImage":/);
});
