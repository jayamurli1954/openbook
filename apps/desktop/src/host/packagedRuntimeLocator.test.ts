// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  locatePackagedRuntimes,
  PACKAGED_PDF_RUNTIME_DIR,
  PACKAGED_VALIDATOR_RUNTIME_DIR,
} from "./packagedRuntimeLocator.js";

const javaName = process.platform === "win32" ? "java.exe" : "java";
const typstName = process.platform === "win32" ? "typst.exe" : "typst";

async function withTempDir(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(path.join(os.tmpdir(), "openbook-packaged-runtime-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeValidatorLayout(runtimeRoot: string): Promise<void> {
  await mkdir(path.join(runtimeRoot, "runtime", "bin"), { recursive: true });
  await mkdir(path.join(runtimeRoot, "epubcheck-5.3.0"), { recursive: true });
  await writeFile(path.join(runtimeRoot, "runtime", "bin", javaName), "");
  await writeFile(path.join(runtimeRoot, "epubcheck-5.3.0", "epubcheck.jar"), "");
}

async function writePdfLayout(runtimeRoot: string): Promise<void> {
  await mkdir(path.join(runtimeRoot, "typst"), { recursive: true });
  await mkdir(path.join(runtimeRoot, "fonts"), { recursive: true });
  await writeFile(path.join(runtimeRoot, "typst", typstName), "");
  await writeFile(path.join(runtimeRoot, "fonts", "dummy.ttf"), "");
}

async function writePackagedResourceRoot(resourceRoot: string): Promise<{
  validatorRoot: string;
  pdfRoot: string;
}> {
  const validatorRoot = path.join(resourceRoot, PACKAGED_VALIDATOR_RUNTIME_DIR);
  const pdfRoot = path.join(resourceRoot, PACKAGED_PDF_RUNTIME_DIR);
  await writeValidatorLayout(validatorRoot);
  await writePdfLayout(pdfRoot);
  return { validatorRoot, pdfRoot };
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

test("missing resource root fails closed without repo or PATH fallback", () => {
  const restore = snapshotEnv([
    "OPENBOOK_VALIDATOR_RUNTIME_ROOT",
    "OPENBOOK_PDF_RUNTIME_ROOT",
  ]);
  try {
    const discovered = locatePackagedRuntimes();
    assert.equal(discovered.ok, false);
    if (discovered.ok) return;
    assert.equal(discovered.error.code, "MISSING_RESOURCE_ROOT");
    assert.equal(discovered.error.failureKind, "missing_runtime");
  } finally {
    restore();
  }
});

test("complete fake resource root locates both runtimes under that root", async () => {
  await withTempDir(async (resourceRoot) => {
    const { validatorRoot, pdfRoot } = await writePackagedResourceRoot(resourceRoot);
    const discovered = locatePackagedRuntimes({ resourceRoot });
    assert.equal(discovered.ok, true);
    if (!discovered.ok) return;
    assert.equal(discovered.resourceRoot, resourceRoot);
    assert.equal(discovered.validator.cacheRoot, validatorRoot);
    assert.equal(discovered.pdf.cacheRoot, pdfRoot);
    assert.ok(discovered.validator.javaExecutablePath.startsWith(validatorRoot));
    assert.ok(discovered.validator.epubcheckJarPath.startsWith(validatorRoot));
    assert.ok(discovered.pdf.typstExecutablePath.startsWith(pdfRoot));
    assert.ok(discovered.pdf.fontsDirectory.startsWith(pdfRoot));
    assert.equal(path.basename(discovered.validator.javaExecutablePath), javaName);
    assert.notEqual(discovered.validator.javaExecutablePath, "java");
    assert.notEqual(discovered.pdf.typstExecutablePath, "typst");
  });
});

test("incomplete validator layout is missing_runtime, not conformance", async () => {
  await withTempDir(async (resourceRoot) => {
    await writePdfLayout(path.join(resourceRoot, PACKAGED_PDF_RUNTIME_DIR));
    await mkdir(path.join(resourceRoot, PACKAGED_VALIDATOR_RUNTIME_DIR, "runtime", "bin"), {
      recursive: true,
    });
    const discovered = locatePackagedRuntimes({ resourceRoot });
    assert.equal(discovered.ok, false);
    if (discovered.ok) return;
    assert.equal(discovered.error.code, "MISSING_VALIDATOR_RUNTIME");
    assert.equal(discovered.error.failureKind, "missing_runtime");
  });
});

test("incomplete Typst layout is missing_runtime", async () => {
  await withTempDir(async (resourceRoot) => {
    await writeValidatorLayout(path.join(resourceRoot, PACKAGED_VALIDATOR_RUNTIME_DIR));
    const discovered = locatePackagedRuntimes({ resourceRoot });
    assert.equal(discovered.ok, false);
    if (discovered.ok) return;
    assert.equal(discovered.error.code, "MISSING_PDF_RUNTIME");
    assert.equal(discovered.error.failureKind, "missing_runtime");
  });
});

test("empty resource root with no runtimes reports both missing", async () => {
  await withTempDir(async (resourceRoot) => {
    const discovered = locatePackagedRuntimes({ resourceRoot });
    assert.equal(discovered.ok, false);
    if (discovered.ok) return;
    assert.equal(discovered.error.code, "MISSING_VALIDATOR_AND_PDF_RUNTIME");
    assert.equal(discovered.error.failureKind, "missing_runtime");
  });
});

test("explicit runtime roots win and do not use repository cache", async () => {
  await withTempDir(async (parent) => {
    const validatorRoot = path.join(parent, "explicit-validator");
    const pdfRoot = path.join(parent, "explicit-pdf");
    await writeValidatorLayout(validatorRoot);
    await writePdfLayout(pdfRoot);
    const discovered = locatePackagedRuntimes({
      resourceRoot: path.join(parent, "unused-app-resources"),
      validatorRuntimeRoot: validatorRoot,
      pdfRuntimeRoot: pdfRoot,
    });
    assert.equal(discovered.ok, true);
    if (!discovered.ok) return;
    assert.equal(discovered.validator.cacheRoot, validatorRoot);
    assert.equal(discovered.pdf.cacheRoot, pdfRoot);
  });
});

test("env overrides locate without an injected resource root", async () => {
  await withTempDir(async (parent) => {
    const validatorRoot = path.join(parent, "env-validator");
    const pdfRoot = path.join(parent, "env-pdf");
    await writeValidatorLayout(validatorRoot);
    await writePdfLayout(pdfRoot);
    const restore = snapshotEnv([
      "OPENBOOK_VALIDATOR_RUNTIME_ROOT",
      "OPENBOOK_PDF_RUNTIME_ROOT",
    ]);
    try {
      process.env.OPENBOOK_VALIDATOR_RUNTIME_ROOT = validatorRoot;
      process.env.OPENBOOK_PDF_RUNTIME_ROOT = pdfRoot;
      const discovered = locatePackagedRuntimes();
      assert.equal(discovered.ok, true);
      if (!discovered.ok) return;
      assert.equal(discovered.validator.cacheRoot, validatorRoot);
      assert.equal(discovered.pdf.cacheRoot, pdfRoot);
    } finally {
      restore();
    }
  });
});
