// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateBook } from "@openbook/book-model";
import {
  ImportService,
  resolvePublishedAt,
  sanitizeImportHref,
} from "./index.js";
import type { ImportIssue } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("canImport accepts markdown and text only", () => {
  const service = new ImportService();
  assert.equal(service.canImport("markdown"), true);
  assert.equal(service.canImport("text"), true);
  assert.equal(service.canImport("docx"), false);
  assert.equal(service.canImport("pdf"), false);
});

test("unknown format fails fatally", async () => {
  const service = new ImportService();
  const result = await service.import({
    format: "docx" as "markdown",
    content: "hello",
  });
  assert.equal(result.success, false);
  assert.equal(result.issues[0]?.code, "UNKNOWN_FORMAT");
  assert.equal(result.book, undefined);
});

test("empty source fails fatally", async () => {
  const service = new ImportService();
  const result = await service.import({ format: "text", content: "  \n  " });
  assert.equal(result.success, false);
  assert.equal(result.issues[0]?.code, "EMPTY_SOURCE");
});

test("plain text import creates a single chapter with paragraphs", async () => {
  const service = new ImportService();
  const result = await service.import(
    {
      format: "text",
      content: "First paragraph.\n\nSecond paragraph.",
      filename: "notes.txt",
    },
    { idSeed: "text-fixture-1" },
  );
  assert.equal(result.success, true);
  assert.ok(result.book);
  assert.equal(result.book.metadata.title, "notes");
  assert.equal(result.book.metadata.language, "en");
  assert.equal(result.book.metadata.publishedAt, "");
  assert.equal(result.book.chapters.length, 1);
  assert.equal(result.book.chapters[0]?.blocks.length, 2);
  assert.equal(validateBook(result.book).filter((i) => i.severity === "error").length, 0);
});

test("markdown frontmatter and heading-1 chapter split", async () => {
  const service = new ImportService();
  const md = `---
title: ನದಿಯ ಬೆಳಗು
authors: [ಮಾಧವಿ ರಾವ್]
language: kn
publishedAt: 2026-09-04
---

# ಮುನ್ನುಡಿ

ಪರಿಚಯದ ಪ್ಯಾರಾ.

# ಅಧ್ಯಾಯ ೧

ದೇಹದ ಪ್ಯಾರಾ with *emphasis* and **strong**.

> A quote

- one
- two

[safe](https://example.com) and [bad](javascript:alert(1))
`;

  const result = await service.import(
    { format: "markdown", content: md, filename: "book.md" },
    { idSeed: "md-fixture-1" },
  );

  assert.equal(result.success, true);
  assert.ok(result.book);
  assert.equal(result.book.metadata.title, "ನದಿಯ ಬೆಳಗು");
  assert.equal(result.book.metadata.language, "kn");
  assert.equal(result.book.metadata.publishedAt, "2026-09-04");
  assert.deepEqual(result.book.metadata.authors, ["ಮಾಧವಿ ರಾವ್"]);
  assert.equal(result.book.chapters.length, 2);
  assert.equal(result.book.chapters[0]?.title, "ಮುನ್ನುಡಿ");
  assert.equal(result.book.chapters[1]?.title, "ಅಧ್ಯಾಯ ೧");

  const body = JSON.stringify(result.book);
  assert.match(body, /emphasis/);
  assert.match(body, /strong/);
  assert.match(body, /https:\/\/example\.com/);
  assert.doesNotMatch(body, /javascript:/);
  assert.ok(result.issues.some((i) => i.code === "UNSAFE_LINK_SCHEME"));
  assert.equal(validateBook(result.book).filter((i) => i.severity === "error").length, 0);
});

test("publishedAt stays empty when unstated (no silent manufacture)", async () => {
  assert.equal(resolvePublishedAt([undefined, undefined]), "");
  assert.equal(resolvePublishedAt(["2020-01-01", undefined]), "2020-01-01");

  const service = new ImportService();
  const result = await service.import(
    {
      format: "markdown",
      content: "# Title\n\nBody only.",
    },
    { idSeed: "pub-empty" },
  );
  assert.equal(result.success, true);
  assert.equal(result.book?.metadata.publishedAt, "");
});

test("deterministic IDs for identical inputs and seed", async () => {
  const service = new ImportService();
  const source = {
    format: "markdown" as const,
    content: "# A\n\nHello\n\n# B\n\nWorld",
  };
  const a = await service.import(source, { idSeed: "same-seed" });
  const b = await service.import(source, { idSeed: "same-seed" });
  assert.equal(a.success, true);
  assert.equal(b.success, true);
  assert.deepEqual(
    a.book?.chapters.map((c) => c.id),
    b.book?.chapters.map((c) => c.id),
  );
  assert.deepEqual(
    a.book?.chapters.flatMap((c) => c.blocks.map((block) => block.id)),
    b.book?.chapters.flatMap((c) => c.blocks.map((block) => block.id)),
  );

  const c = await service.import(source, { idSeed: "other-seed" });
  assert.notDeepEqual(
    a.book?.chapters.map((ch) => ch.id),
    c.book?.chapters.map((ch) => ch.id),
  );
});

test("metadataOverrides win and html is not executed", async () => {
  const service = new ImportService();
  const result = await service.import(
    {
      format: "markdown",
      content: '---\ntitle: From FM\n---\n\n# Ch\n\n<script>alert(1)</script>\n\nHello',
    },
    {
      idSeed: "html-off",
      metadataOverrides: { title: "Override Title", language: "en" },
    },
  );
  assert.equal(result.success, true);
  assert.equal(result.book?.metadata.title, "Override Title");
  // html:false keeps raw tags as plain text (not executed / not HTML blocks).
  const scriptBlock = result.book?.chapters[0]?.blocks.find(
    (b) =>
      b.type === "paragraph" &&
      b.inlines.some((s) => s.type === "text" && s.text.includes("<script>")),
  );
  assert.ok(scriptBlock);
  assert.equal(scriptBlock.type, "paragraph");
});

test("sanitizeImportHref strips dangerous schemes", () => {
  const issues: ImportIssue[] = [];
  assert.equal(sanitizeImportHref("https://ok.example", issues), "https://ok.example");
  assert.equal(sanitizeImportHref("javascript:alert(1)", issues), null);
  assert.ok(issues.some((i) => i.code === "UNSAFE_LINK_SCHEME"));
});

test("package does not depend on workflow or publishing engines", () => {
  const pkg = JSON.parse(
    readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; name: string };
  assert.equal(pkg.name, "@openbook/importer");
  assert.equal(pkg.dependencies?.["@openbook/book-model"], "*");
  assert.ok(pkg.dependencies?.["markdown-it"]);
  assert.equal(pkg.dependencies?.["@openbook/workflow"], undefined);
  assert.equal(pkg.dependencies?.["@openbook/epub"], undefined);
  assert.equal(pkg.dependencies?.["@openbook/pdf"], undefined);
  assert.equal(pkg.dependencies?.["@openbook/html"], undefined);
});
