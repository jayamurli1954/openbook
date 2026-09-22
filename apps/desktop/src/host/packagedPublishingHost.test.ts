// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  PACKAGED_PDF_RUNTIME_DIR,
  PACKAGED_VALIDATOR_RUNTIME_DIR,
} from "./packagedRuntimeLocator.js";
import {
  isAssembledDesktopResourceRoot,
  missingRuntimeValidationReport,
  packagedMissingRuntimeMessage,
  resolveDesktopPublishingRuntimes,
  resolveDesktopResourceRootSync,
} from "./packagedPublishingHost.js";

const javaName = process.platform === "win32" ? "java.exe" : "java";
const typstName = process.platform === "win32" ? "typst.exe" : "typst";

async function withTempDir(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "openbook-gate10-slice3-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeAssembledResourceRoot(resourceRoot: string): Promise<void> {
  const validatorRoot = path.join(resourceRoot, PACKAGED_VALIDATOR_RUNTIME_DIR);
  const pdfRoot = path.join(resourceRoot, PACKAGED_PDF_RUNTIME_DIR);
  await mkdir(path.join(validatorRoot, "runtime", "bin"), { recursive: true });
  await mkdir(path.join(validatorRoot, "epubcheck-5.3.0"), { recursive: true });
  await writeFile(path.join(validatorRoot, "runtime", "bin", javaName), "");
  await writeFile(path.join(validatorRoot, "epubcheck-5.3.0", "epubcheck.jar"), "");
  await mkdir(path.join(pdfRoot, "typst"), { recursive: true });
  await mkdir(path.join(pdfRoot, "fonts"), { recursive: true });
  await writeFile(path.join(pdfRoot, "typst", typstName), "");
  await writeFile(path.join(pdfRoot, "fonts", "dummy.ttf"), "");
  await writeFile(path.join(resourceRoot, "assembly-evidence.json"), "{}\n");
}

function snapshotEnv(keys: readonly string[]): () => void {
  const previous = new Map<string, string | undefined>();
  for (const key of keys) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
  return () => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

test("empty placeholder resource root is not treated as assembled", async () => {
  await withTempDir(async (root) => {
    await mkdir(path.join(root, PACKAGED_VALIDATOR_RUNTIME_DIR), { recursive: true });
    await mkdir(path.join(root, PACKAGED_PDF_RUNTIME_DIR), { recursive: true });
    assert.equal(isAssembledDesktopResourceRoot(root), false);
  });
});

test("assembled resource root is detected via layout or evidence", async () => {
  await withTempDir(async (root) => {
    await writeAssembledResourceRoot(root);
    assert.equal(isAssembledDesktopResourceRoot(root), true);
  });
});

test("resolveDesktopResourceRootSync prefers options then env", async () => {
  await withTempDir(async (root) => {
    const restore = snapshotEnv(["OPENBOOK_DESKTOP_RESOURCE_ROOT"]);
    try {
      process.env.OPENBOOK_DESKTOP_RESOURCE_ROOT = path.join(root, "from-env");
      await mkdir(process.env.OPENBOOK_DESKTOP_RESOURCE_ROOT, { recursive: true });
      const fromEnv = resolveDesktopResourceRootSync();
      assert.equal(fromEnv, path.resolve(path.join(root, "from-env")));

      const fromOptions = resolveDesktopResourceRootSync({
        resourceRoot: path.join(root, "from-options"),
      });
      assert.equal(fromOptions, path.resolve(path.join(root, "from-options")));
    } finally {
      restore();
    }
  });
});

test("resolveDesktopPublishingRuntimes uses packaged resource root", async () => {
  await withTempDir(async (root) => {
    const restore = snapshotEnv([
      "OPENBOOK_DESKTOP_RESOURCE_ROOT",
      "OPENBOOK_VALIDATOR_RUNTIME_ROOT",
      "OPENBOOK_PDF_RUNTIME_ROOT",
    ]);
    try {
      await writeAssembledResourceRoot(root);
      const resolved = await resolveDesktopPublishingRuntimes({ resourceRoot: root });
      assert.equal(resolved.mode, "packaged");
      if (resolved.mode !== "packaged") return;
      assert.ok(resolved.validator.javaExecutablePath.includes(PACKAGED_VALIDATOR_RUNTIME_DIR));
      assert.ok(resolved.pdf.typstExecutablePath.includes(PACKAGED_PDF_RUNTIME_DIR));
    } finally {
      restore();
    }
  });
});

test("incomplete packaged resource root is missing_runtime without .cache fallback", async () => {
  await withTempDir(async (root) => {
    const restore = snapshotEnv([
      "OPENBOOK_DESKTOP_RESOURCE_ROOT",
      "OPENBOOK_VALIDATOR_RUNTIME_ROOT",
      "OPENBOOK_PDF_RUNTIME_ROOT",
    ]);
    try {
      await mkdir(path.join(root, PACKAGED_VALIDATOR_RUNTIME_DIR), { recursive: true });
      await mkdir(path.join(root, PACKAGED_PDF_RUNTIME_DIR), { recursive: true });
      const resolved = await resolveDesktopPublishingRuntimes({ resourceRoot: root });
      assert.equal(resolved.mode, "missing_runtime");
      if (resolved.mode !== "missing_runtime") return;
      assert.equal(resolved.error.failureKind, "missing_runtime");
      const message = packagedMissingRuntimeMessage(resolved.error);
      assert.match(message, /System Java and system Typst are not used/);
      assert.doesNotMatch(message, /install Java|JAVA_HOME|apt install|brew install/i);

      const report = missingRuntimeValidationReport("book.epub", resolved.error);
      assert.equal(report.failureKind, "missing_runtime");
      assert.equal(report.isValid, false);
      assert.match(report.messages[0]?.message ?? "", /System Java and system Typst/);
    } finally {
      restore();
    }
  });
});

test("without packaged root, host falls back to developer resolveProduction paths", async () => {
  const restore = snapshotEnv([
    "OPENBOOK_DESKTOP_RESOURCE_ROOT",
    "OPENBOOK_VALIDATOR_RUNTIME_ROOT",
    "OPENBOOK_PDF_RUNTIME_ROOT",
  ]);
  try {
    const resolved = await resolveDesktopPublishingRuntimes();
    assert.equal(resolved.mode, "developer");
    if (resolved.mode !== "developer") return;
    // May be null when .cache is empty on this machine — still developer mode.
    assert.ok(resolved.mode === "developer");
  } finally {
    restore();
  }
});
