// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { test } from "node:test";
import { createBook, type Book } from "@openbook/book-model";
import {
  mapAssetRefsToPackageEntries,
  packageEntriesToBindings,
  parsePackageAssetManifest,
  serializePackageAssetManifest,
  validatePackageAssetManifest,
  validatePackageAssetsAgainstBook,
  type PackageAssetManifest,
} from "./packageAssetMapping.js";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function bookWithAssets(): Book {
  const book = createBook({ title: "Asset package", language: "en" });
  book.assets = [
    {
      id: "asset-alpha",
      kind: "image",
      fileName: "ಕನ್ನಡ-cover.png",
      mediaType: "image/png",
      altText: "cover",
      licence: "",
    },
    {
      id: "asset-beta",
      kind: "image",
      fileName: "figure.png",
      mediaType: "image/png",
      altText: "figure",
      licence: "",
    },
  ];
  book.chapters[0]!.blocks.push({
    type: "image",
    id: "img-1",
    assetId: "asset-alpha",
    caption: [],
  });
  return book;
}

test("maps Book AssetRefs and bindings into a compatible package asset manifest", () => {
  const book = bookWithAssets();
  const result = mapAssetRefsToPackageEntries(book, [
    { assetId: "asset-alpha", sha256: SHA_A },
    { assetId: "asset-beta", sha256: SHA_B.toUpperCase() },
  ]);
  assert.equal(result.compatibility, "compatible");
  assert.deepEqual(result.manifest?.assets, [
    { assetId: "asset-alpha", sha256: SHA_A },
    { assetId: "asset-beta", sha256: SHA_B },
  ]);
});

test("serializes and parses package asset manifests deterministically", () => {
  const manifest: PackageAssetManifest = {
    assets: [
      { assetId: "asset-beta", sha256: SHA_B },
      { assetId: "asset-alpha", sha256: SHA_A },
    ],
  };
  const serialized = serializePackageAssetManifest(manifest);
  const parsed = parsePackageAssetManifest(serialized);
  assert.equal(parsed.compatibility, "compatible");
  assert.deepEqual(parsed.manifest?.assets, [
    { assetId: "asset-alpha", sha256: SHA_A },
    { assetId: "asset-beta", sha256: SHA_B },
  ]);
});

test("empty Book.assets yields an empty compatible manifest", () => {
  const book = createBook({ title: "Empty", language: "en" });
  const result = mapAssetRefsToPackageEntries(book, []);
  assert.equal(result.compatibility, "compatible");
  assert.deepEqual(result.manifest, { assets: [] });
});

test("rejects non-hex or path-like SHA-256 keys", () => {
  const result = validatePackageAssetManifest({
    assets: [{ assetId: "asset-alpha", sha256: "../not-a-hash" }],
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "INVALID_SHA256");
});

test("rejects duplicate asset ids and conflicting bindings", () => {
  const duplicate = validatePackageAssetManifest({
    assets: [
      { assetId: "asset-alpha", sha256: SHA_A },
      { assetId: "asset-alpha", sha256: SHA_A },
    ],
  });
  assert.equal(duplicate.compatibility, "malformed");
  assert.equal(duplicate.errors[0]?.code, "DUPLICATE_ASSET_ID");

  const conflict = validatePackageAssetManifest({
    assets: [
      { assetId: "asset-alpha", sha256: SHA_A },
      { assetId: "asset-alpha", sha256: SHA_B },
    ],
  });
  assert.equal(conflict.compatibility, "malformed");
  assert.equal(conflict.errors[0]?.code, "DUPLICATE_BINDING_CONFLICT");
});

test("rejects unsupported top-level package asset fields", () => {
  const result = validatePackageAssetManifest({
    assets: [],
    storeRoot: "assets/",
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "MALFORMED_PACKAGE_ASSETS");
});

test("fails closed when a Book AssetRef lacks a binding", () => {
  const book = bookWithAssets();
  const result = mapAssetRefsToPackageEntries(book, [
    { assetId: "asset-alpha", sha256: SHA_A },
  ]);
  assert.equal(result.compatibility, "malformed");
  assert.equal(
    result.errors.some((error) => error.code === "MISSING_PACKAGE_ASSET"),
    true,
  );
});

test("rejects dangling image references not present in Book.assets", () => {
  const book = bookWithAssets();
  book.chapters[0]!.blocks.push({
    type: "image",
    id: "img-missing",
    assetId: "asset-missing",
    caption: [],
  });
  const result = mapAssetRefsToPackageEntries(book, [
    { assetId: "asset-alpha", sha256: SHA_A },
    { assetId: "asset-beta", sha256: SHA_B },
  ]);
  assert.equal(result.compatibility, "malformed");
  assert.equal(
    result.errors.some((error) => error.code === "DANGLING_IMAGE_REFERENCE"),
    true,
  );
});

test("rejects orphan package entries not referenced by Book.assets", () => {
  const book = bookWithAssets();
  const result = validatePackageAssetsAgainstBook(book, {
    assets: [
      { assetId: "asset-alpha", sha256: SHA_A },
      { assetId: "asset-beta", sha256: SHA_B },
      { assetId: "asset-orphan", sha256: "c".repeat(64) },
    ],
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(
    result.errors.some((error) => error.code === "ORPHAN_PACKAGE_ASSET"),
    true,
  );
});

test("validatePackageAssetsAgainstBook accepts a coherent Book and manifest", () => {
  const book = bookWithAssets();
  const result = validatePackageAssetsAgainstBook(book, {
    assets: [
      { assetId: "asset-beta", sha256: SHA_B },
      { assetId: "asset-alpha", sha256: SHA_A },
    ],
  });
  assert.equal(result.compatibility, "compatible");
  assert.equal(result.manifest?.assets.length, 2);
});

test("packageEntriesToBindings rebuilds an id→sha256 map", () => {
  const bindings = packageEntriesToBindings({
    assets: [
      { assetId: "asset-alpha", sha256: SHA_A },
      { assetId: "asset-beta", sha256: SHA_B },
    ],
  });
  assert.equal(bindings.get("asset-alpha"), SHA_A);
  assert.equal(bindings.get("asset-beta"), SHA_B);
});

test("preserves Unicode file names only on Book AssetRefs (manifest is id+hash)", () => {
  const book = bookWithAssets();
  assert.equal(book.assets[0]?.fileName, "ಕನ್ನಡ-cover.png");
  const mapped = mapAssetRefsToPackageEntries(book, [
    { assetId: "asset-alpha", sha256: SHA_A },
    { assetId: "asset-beta", sha256: SHA_B },
  ]);
  assert.equal(mapped.compatibility, "compatible");
  assert.equal(
    mapped.manifest?.assets.every((entry) => Object.keys(entry).length === 2),
    true,
  );
});

test("classifies malformed JSON as malformed", () => {
  const result = parsePackageAssetManifest("{not-json");
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "MALFORMED_PACKAGE_ASSETS");
});
