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
export { BOOK_MODEL_SCHEMA_VERSION } from "./types.js";
export { createId } from "./ids.js";
export { addChapter, createBook, createSection } from "./create-book.js";
export { parseBook, serializeBook } from "./serialize.js";
export { validateBook } from "./validate-book.js";
