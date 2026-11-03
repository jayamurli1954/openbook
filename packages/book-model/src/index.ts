// SPDX-License-Identifier: Apache-2.0
export type {
  AssetKind,
  AssetRef,
  Book,
  BookMetadata,
  BookModelSchemaVersion,
  ContentBlock,
  CreateBookInput,
  DomainIssue,
  InlineSpan,
  IssueSeverity,
  MatterKind,
  NamedStyle,
  PublishingOutput,
  PublishingSettings,
  SectionRole,
  StructuralSection,
  StyleSystem,
  ThemeRef,
  TypographySettings,
} from "./types.js";
export { BOOK_MODEL_SCHEMA_VERSION, SUPPORTED_OLDER_SCHEMA_VERSIONS } from "./types.js";
export { upgradeBook } from "./upgrade-book.js";
export type { UpgradedBook } from "./upgrade-book.js";
export { createId } from "./ids.js";
export { addChapter, createBook, createSection } from "./create-book.js";
export { parseBook, serializeBook } from "./serialize.js";
export { validateBook } from "./validate-book.js";
