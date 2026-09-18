// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  SAVE_AS_FILENAME_MAX_LENGTH,
  SaveAsFileSystemError,
  SaveAsHostAdapter,
  defaultSaveAsFileName,
  isSafeCompanionRelativePath,
  sanitizeSaveAsFileName,
  type OverwriteConfirmationPort,
  type SaveAsDialogPort,
  type SaveAsFileSystemPort,
  type SaveAsFileWrite,
  type SaveAsHostRequest,
} from "./saveAsHostAdapter.js";

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function fakeHost(options?: {
  destination?: string | null;
  overwrite?: boolean;
  existing?: string[];
  unwritable?: string[];
  failWrite?: boolean;
  failExists?: boolean;
}) {
  const writes: SaveAsFileWrite[][] = [];
  const files = new Map<string, Uint8Array>();
  for (const path of options?.existing ?? []) {
    files.set(path, bytes(0));
  }
  const unwritable = new Set(options?.unwritable ?? []);
  const dialogChoices: Array<{ defaultFileName: string; extension: string }> = [];
  const overwriteRequests: string[][] = [];

  const dialog: SaveAsDialogPort = {
    async chooseDestination(dialogOptions) {
      dialogChoices.push({
        defaultFileName: dialogOptions.defaultFileName,
        extension: dialogOptions.extension,
      });
      return options?.destination === undefined ? "Book.epub" : options.destination;
    },
  };

  const overwrite: OverwriteConfirmationPort = {
    async confirmOverwrite(paths) {
      overwriteRequests.push([...paths]);
      return options?.overwrite !== false;
    },
  };

  const fileSystem: SaveAsFileSystemPort = {
    async exists(path) {
      if (options?.failExists) {
        throw new SaveAsFileSystemError("UNWRITABLE", `Cannot inspect "${path}".`);
      }
      return files.has(path);
    },
    async writeAtomically(batch) {
      writes.push(batch.map((file) => ({ path: file.path, bytes: file.bytes })));
      if (options?.failWrite) {
        throw new SaveAsFileSystemError("WRITE_FAILED", "Atomic write failed.");
      }
      for (const file of batch) {
        if (unwritable.has(file.path)) {
          throw new SaveAsFileSystemError("UNWRITABLE", `Cannot write "${file.path}".`);
        }
      }
      for (const file of batch) {
        files.set(file.path, file.bytes);
      }
    },
  };

  const adapter = new SaveAsHostAdapter(dialog, overwrite, fileSystem);
  return { adapter, files, writes, dialogChoices, overwriteRequests };
}

function request(overrides?: Partial<SaveAsHostRequest>): SaveAsHostRequest {
  return {
    suggestedTitle: "Open Book",
    format: "epub",
    bytes: bytes(1, 2, 3),
    ...overrides,
  };
}

test("sanitizes titles for filesystem-safe deterministic filenames", () => {
  assert.equal(sanitizeSaveAsFileName("My Book: A Memoir"), "My Book_ A Memoir");
  assert.equal(sanitizeSaveAsFileName("a<b>c:d\"e/f\\g|h?i*j"), "a_b_c_d_e_f_g_h_i_j");
  assert.equal(sanitizeSaveAsFileName("  spaced  "), "spaced");
  assert.equal(sanitizeSaveAsFileName("trailing. "), "trailing");
  assert.equal(sanitizeSaveAsFileName(""), "untitled");
  assert.equal(sanitizeSaveAsFileName("..."), "untitled");
  assert.equal(sanitizeSaveAsFileName("CON"), "_CON");
  assert.equal(sanitizeSaveAsFileName("aux.notes"), "_aux.notes");
  assert.equal(sanitizeSaveAsFileName("ಕನ್ನಡ ಪುಸ್ತಕ"), "ಕನ್ನಡ ಪುಸ್ತಕ");
  assert.equal(
    sanitizeSaveAsFileName("a".repeat(SAVE_AS_FILENAME_MAX_LENGTH + 25)).length,
    SAVE_AS_FILENAME_MAX_LENGTH,
  );
  assert.equal(defaultSaveAsFileName("My Book", "pdf"), "My Book.pdf");
  assert.equal(defaultSaveAsFileName("My Book", "html"), "My Book.html");
});

test("rejects companion paths that could escape the destination directory", () => {
  assert.equal(isSafeCompanionRelativePath("assets/cover.png"), true);
  assert.equal(isSafeCompanionRelativePath("index.html"), true);
  assert.equal(isSafeCompanionRelativePath("../secret"), false);
  assert.equal(isSafeCompanionRelativePath("..\\secret"), false);
  assert.equal(isSafeCompanionRelativePath("/etc/passwd"), false);
  assert.equal(isSafeCompanionRelativePath("C:\\Windows\\x"), false);
  assert.equal(isSafeCompanionRelativePath("assets//cover.png"), false);
  assert.equal(isSafeCompanionRelativePath("assets/./cover.png"), false);
  assert.equal(isSafeCompanionRelativePath(""), false);
});

test("writes primary bytes to the selected destination", async () => {
  const { adapter, files, dialogChoices, overwriteRequests } = fakeHost({
    destination: "exports/Open Book.epub",
  });

  const outcome = await adapter.save(request());

  assert.equal(outcome.ok, true);
  if (!outcome.ok) {
    return;
  }
  assert.equal(outcome.path, "exports/Open Book.epub");
  assert.deepEqual(outcome.writtenPaths, ["exports/Open Book.epub"]);
  assert.deepEqual(files.get("exports/Open Book.epub"), bytes(1, 2, 3));
  assert.deepEqual(dialogChoices, [{ defaultFileName: "Open Book.epub", extension: "epub" }]);
  assert.equal(overwriteRequests.length, 0);
});

test("appends the requested extension when the destination has none", async () => {
  const { adapter, files } = fakeHost({ destination: "exports/Open Book" });

  const outcome = await adapter.save(request({ format: "pdf", bytes: bytes(9) }));

  assert.equal(outcome.ok, true);
  if (!outcome.ok) {
    return;
  }
  assert.equal(outcome.path, "exports/Open Book.pdf");
  assert.deepEqual(files.get("exports/Open Book.pdf"), bytes(9));
});

test("cancelled destination selection writes nothing", async () => {
  const { adapter, files, writes } = fakeHost({ destination: null });

  const outcome = await adapter.save(request());

  assert.deepEqual(outcome, {
    ok: false,
    code: "EXPORT_CANCELLED",
    message: "Save As destination selection was cancelled.",
  });
  assert.equal(files.size, 0);
  assert.equal(writes.length, 0);
});

test("declining overwrite writes nothing", async () => {
  const { adapter, files, writes, overwriteRequests } = fakeHost({
    destination: "Book.epub",
    existing: ["Book.epub"],
    overwrite: false,
  });

  const outcome = await adapter.save(request());

  assert.deepEqual(outcome, {
    ok: false,
    code: "EXPORT_OVERWRITE_DECLINED",
    message: "Existing destination was not overwritten.",
  });
  assert.deepEqual(files.get("Book.epub"), bytes(0));
  assert.equal(writes.length, 0);
  assert.deepEqual(overwriteRequests, [["Book.epub"]]);
});

test("accepted overwrite replaces the existing destination", async () => {
  const { adapter, files, overwriteRequests } = fakeHost({
    destination: "Book.epub",
    existing: ["Book.epub"],
    overwrite: true,
  });

  const outcome = await adapter.save(request({ bytes: bytes(7, 8) }));

  assert.equal(outcome.ok, true);
  assert.deepEqual(files.get("Book.epub"), bytes(7, 8));
  assert.deepEqual(overwriteRequests, [["Book.epub"]]);
});

test("never silently overwrites an existing destination", async () => {
  let confirmCalls = 0;
  const files = new Map<string, Uint8Array>([["Book.epub", bytes(1)]]);
  const adapter = new SaveAsHostAdapter(
    { async chooseDestination() { return "Book.epub"; } },
    {
      async confirmOverwrite() {
        confirmCalls += 1;
        return false;
      },
    },
    {
      async exists(path) {
        return files.has(path);
      },
      async writeAtomically() {
        throw new Error("writeAtomically must not run without overwrite confirmation");
      },
    },
  );

  const outcome = await adapter.save(request());

  assert.equal(outcome.ok, false);
  if (outcome.ok) {
    return;
  }
  assert.equal(outcome.code, "EXPORT_OVERWRITE_DECLINED");
  assert.equal(confirmCalls, 1);
  assert.deepEqual(files.get("Book.epub"), bytes(1));
});

test("rejects a destination whose extension would misrepresent the format", async () => {
  const { adapter, writes } = fakeHost({ destination: "Book.pdf" });

  const outcome = await adapter.save(request({ format: "epub" }));

  assert.equal(outcome.ok, false);
  if (outcome.ok) {
    return;
  }
  assert.equal(outcome.code, "EXPORT_DESTINATION_INVALID");
  assert.equal(writes.length, 0);
});

test("rejects empty, directory, and control-character destinations", async () => {
  for (const destination of ["", "  Book.epub", "exports/", "Book.epub\u0000", "."]) {
    const { adapter, writes } = fakeHost({ destination });
    const outcome = await adapter.save(request());
    assert.equal(outcome.ok, false);
    if (outcome.ok) {
      return;
    }
    assert.equal(outcome.code, "EXPORT_DESTINATION_INVALID");
    assert.equal(writes.length, 0);
  }
});

test("maps unwritable destinations without leaving a final artifact", async () => {
  const { adapter, files, writes } = fakeHost({
    destination: "locked/Book.epub",
    unwritable: ["locked/Book.epub"],
  });

  const outcome = await adapter.save(request());

  assert.equal(outcome.ok, false);
  if (outcome.ok) {
    return;
  }
  assert.equal(outcome.code, "EXPORT_DESTINATION_UNWRITABLE");
  assert.equal(files.has("locked/Book.epub"), false);
  assert.equal(writes.length, 1);
});

test("maps write failures without committing a final artifact", async () => {
  const { adapter, files } = fakeHost({
    destination: "Book.epub",
    failWrite: true,
  });

  const outcome = await adapter.save(request());

  assert.equal(outcome.ok, false);
  if (outcome.ok) {
    return;
  }
  assert.equal(outcome.code, "EXPORT_WRITE_FAILED");
  assert.equal(files.has("Book.epub"), false);
});

test("abort before the dialog writes nothing", async () => {
  const controller = new AbortController();
  controller.abort();
  const { adapter, writes } = fakeHost({ destination: "Book.epub" });

  const outcome = await adapter.save(request({ signal: controller.signal }));

  assert.equal(outcome.ok, false);
  if (outcome.ok) {
    return;
  }
  assert.equal(outcome.code, "EXPORT_CANCELLED");
  assert.equal(writes.length, 0);
});

test("abort after destination selection writes nothing", async () => {
  const controller = new AbortController();
  const adapter = new SaveAsHostAdapter(
    {
      async chooseDestination() {
        controller.abort();
        return "Book.epub";
      },
    },
    { async confirmOverwrite() { return true; } },
    {
      async exists() { return false; },
      async writeAtomically() {
        throw new Error("writeAtomically must not run after cancellation");
      },
    },
  );

  const outcome = await adapter.save(request({ signal: controller.signal }));

  assert.equal(outcome.ok, false);
  if (outcome.ok) {
    return;
  }
  assert.equal(outcome.code, "EXPORT_CANCELLED");
});

test("writes HTML companion resources beside the selected file", async () => {
  const { adapter, files, overwriteRequests } = fakeHost({
    destination: "out\\My Book.html",
  });

  const outcome = await adapter.save(
    request({
      format: "html",
      bytes: bytes(10),
      companionFiles: [
        { relativePath: "assets/cover.png", bytes: bytes(11, 12) },
        { relativePath: "assets/logo.png", bytes: bytes(13) },
      ],
    }),
  );

  assert.equal(outcome.ok, true);
  if (!outcome.ok) {
    return;
  }
  assert.equal(outcome.path, "out\\My Book.html");
  assert.deepEqual(outcome.writtenPaths, [
    "out\\My Book.html",
    "out\\assets\\cover.png",
    "out\\assets\\logo.png",
  ]);
  assert.deepEqual(files.get("out\\My Book.html"), bytes(10));
  assert.deepEqual(files.get("out\\assets\\cover.png"), bytes(11, 12));
  assert.deepEqual(files.get("out\\assets\\logo.png"), bytes(13));
  assert.equal(overwriteRequests.length, 0);
});

test("rejects companion path traversal before any write", async () => {
  const { adapter, writes } = fakeHost({ destination: "out/book.html" });

  const outcome = await adapter.save(
    request({
      format: "html",
      companionFiles: [{ relativePath: "../secret.txt", bytes: bytes(1) }],
    }),
  );

  assert.equal(outcome.ok, false);
  if (outcome.ok) {
    return;
  }
  assert.equal(outcome.code, "EXPORT_DESTINATION_INVALID");
  assert.equal(writes.length, 0);
});

test("asks once to overwrite when companion files already exist", async () => {
  const { adapter, files, overwriteRequests } = fakeHost({
    destination: "out/book.html",
    existing: ["out/book.html", "out/assets/cover.png"],
    overwrite: true,
  });

  const outcome = await adapter.save(
    request({
      format: "html",
      bytes: bytes(4),
      companionFiles: [{ relativePath: "assets/cover.png", bytes: bytes(5) }],
    }),
  );

  assert.equal(outcome.ok, true);
  assert.deepEqual(overwriteRequests, [["out/book.html", "out/assets/cover.png"]]);
  assert.deepEqual(files.get("out/book.html"), bytes(4));
  assert.deepEqual(files.get("out/assets/cover.png"), bytes(5));
});

test("does not expose export-engine, persistence, or native-host operations", () => {
  const { adapter } = fakeHost();

  assert.equal("exportEpub" in adapter, false);
  assert.equal("exportHtml" in adapter, false);
  assert.equal("exportPdf" in adapter, false);
  assert.equal("saveProject" in adapter, false);
  assert.equal("openProject" in adapter, false);
  assert.equal("writeFile" in adapter, false);
  assert.equal("showSaveDialog" in adapter, false);
});
