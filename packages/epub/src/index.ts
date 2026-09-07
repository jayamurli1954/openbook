// SPDX-License-Identifier: Apache-2.0

export type {
  EpubArchiveOptions,
  EpubBuildOptions,
  EpubManifestItem,
  EpubPackage,
  EpubPackageFile,
  EpubPackageMetadata,
} from "./types.js";

export { UnsupportedContentError } from "./types.js";
export { buildEpub, buildEpubPackage } from "./epub-builder.js";
export { buildEpubArchive } from "./archive/epub-archive.js";
export { orderArchiveFiles, normalizeZipPath } from "./archive/archive-order.js";
export { escapeXmlAttr, escapeXmlText } from "./xml-utils.js";
export { serializeSectionDocument } from "./xhtml-serializer.js";
export { serializeNavDocument } from "./nav-serializer.js";
export { serializeOpfDocument } from "./opf-serializer.js";
