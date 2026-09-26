// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  WRITING_STUDIO_TOOLBAR_COMMANDS,
  type WritingStudioToolbarCommand,
} from "./writingStudioContract.js";
import {
  createWritingStudioToolbarAdapter,
  executeWritingStudioToolbarCommand,
  type WritingStudioEditorCommandPort,
} from "./writingStudioToolbarAdapter.js";

function createRecordingEditor(): {
  readonly port: WritingStudioEditorCommandPort;
  readonly calls: string[];
} {
  const calls: string[] = [];
  const port: WritingStudioEditorCommandPort = {
    toggleBold: () => {
      calls.push("toggleBold");
    },
    toggleItalic: () => {
      calls.push("toggleItalic");
    },
    toggleHeading: (level) => {
      calls.push(`toggleHeading:${level}`);
    },
    toggleBulletList: () => {
      calls.push("toggleBulletList");
    },
    toggleOrderedList: () => {
      calls.push("toggleOrderedList");
    },
    toggleBlockquote: () => {
      calls.push("toggleBlockquote");
    },
    setLink: (href) => {
      calls.push(`setLink:${href}`);
    },
    unsetLink: () => {
      calls.push("unsetLink");
    },
    undo: () => {
      calls.push("undo");
    },
    redo: () => {
      calls.push("redo");
    },
  };
  return { port, calls };
}

test("maps every contract toolbar command onto the TipTap command port", () => {
  const { port, calls } = createRecordingEditor();
  const expected: Record<WritingStudioToolbarCommand, string> = {
    "toggle-bold": "toggleBold",
    "toggle-italic": "toggleItalic",
    "toggle-heading-1": "toggleHeading:1",
    "toggle-heading-2": "toggleHeading:2",
    "toggle-heading-3": "toggleHeading:3",
    "toggle-heading-4": "toggleHeading:4",
    "toggle-heading-5": "toggleHeading:5",
    "toggle-heading-6": "toggleHeading:6",
    "toggle-bullet-list": "toggleBulletList",
    "toggle-ordered-list": "toggleOrderedList",
    "toggle-blockquote": "toggleBlockquote",
    "set-link": "setLink:https://example.org",
    "unset-link": "unsetLink",
    undo: "undo",
    redo: "redo",
  };

  for (const command of WRITING_STUDIO_TOOLBAR_COMMANDS) {
    calls.length = 0;
    const args =
      command === "set-link" ? { href: "https://example.org" } : undefined;
    const result = executeWritingStudioToolbarCommand(port, command, args);
    assert.equal(result.ok, true);
    assert.deepEqual(calls, [expected[command]]);
  }
});

test("set-link fails closed without href and does not call the editor", () => {
  const { port, calls } = createRecordingEditor();
  const empty = executeWritingStudioToolbarCommand(port, "set-link", {
    href: "  ",
  });
  assert.equal(empty.ok, false);
  if (empty.ok) return;
  assert.equal(empty.code, "LINK_HREF_REQUIRED");
  assert.deepEqual(calls, []);

  const missing = executeWritingStudioToolbarCommand(port, "set-link");
  assert.equal(missing.ok, false);
  if (missing.ok) return;
  assert.equal(missing.code, "LINK_HREF_REQUIRED");
});

test("adapter reports EDITOR_UNAVAILABLE when TipTap is not ready", () => {
  const adapter = createWritingStudioToolbarAdapter({
    getEditor: () => null,
  });
  const result = adapter.executeCommand("toggle-bold");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "EDITOR_UNAVAILABLE");
});

test("adapter delegates to the TipTap command port when ready", () => {
  const { port, calls } = createRecordingEditor();
  const adapter = createWritingStudioToolbarAdapter({
    getEditor: () => port,
  });
  const result = adapter.executeCommand("toggle-heading-2");
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["toggleHeading:2"]);
});

test("adapter surface stays free of BookSession and TipTap persistence", () => {
  const adapter = createWritingStudioToolbarAdapter({
    getEditor: () => createRecordingEditor().port,
  });
  assert.equal(typeof adapter.executeCommand, "function");
  assert.equal(
    Object.prototype.hasOwnProperty.call(adapter, "applyActiveSectionTipTap"),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(adapter, "persistTipTap"),
    false,
  );
});
