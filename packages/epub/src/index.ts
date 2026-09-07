// SPDX-License-Identifier: Apache-2.0

export type {
  EpubBuildOptions,
  EpubManifestItem,
  EpubPackage,
  EpubPackageFile,
  EpubPackageMetadata,
} from "./types.js";

export { buildEpubPackage } from "./epub-builder.js";
export { escapeXmlAttr, escapeXmlText } from "./xml-utils.js";
export { serializeSectionDocument } from "./xhtml-serializer.js";
export { serializeNavDocument } from "./nav-serializer.js";
export { serializeOpfDocument } from "./opf-serializer.js";
