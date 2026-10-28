// SPDX-License-Identifier: Apache-2.0
import type { DeterministicIdFactory } from "../ids.js";
import { assembleBook, finalizeBookResult } from "../markdown-import.js";
import { buildMetadata, emptyStats } from "../metadata.js";
import type { StructuralSection } from "@openbook/book-model";
import type {
  DocxImportSource,
  ImportedImagePayload,
  ImportIssue,
  ImportOptions,
  ImportResult,
} from "../types.js";
import { walkBody, type BodyCounts } from "./body.js";
import { DocxReadError, docxReadErrorToIssue } from "./errors.js";
import { openDocxPackage } from "./package.js";
import { readDocxParts } from "./parts.js";
import { structureDocx } from "./structure.js";

/** Security limits stay fatal even when reached while reading a picture (ADR-0040 §5). */
const FATAL_READ_ERRORS = new Set(["DOCX_TOTAL_TOO_LARGE", "DOCX_ENTRY_TOO_LARGE", "DOCX_COMPRESSION_RATIO"]);

/**
 * Word `.docx` → canonical Book (ADR-0040 Slices 2–3: text, structure, pictures).
 * Pictures come back as `ImportResult.images`; image blocks reference their placeholder ids
 * until the caller ingests the bytes (ADR-0040 §2.2).
 */
export function importDocx(
  source: DocxImportSource,
  options: ImportOptions | undefined,
  ids: DeterministicIdFactory,
): ImportResult {
  const opened = openDocxPackage(source.bytes);
  if (!opened.ok) {
    return { success: false, issues: [opened.issue], stats: emptyStats() };
  }

  try {
    const parts = readDocxParts(opened.docx);
    const body = walkBody(parts);
    if (body.paragraphs.length === 0) {
      return {
        success: false,
        issues: [{ code: "EMPTY_SOURCE", severity: "fatal", message: "This Word file has no text to import." }],
        stats: emptyStats(),
      };
    }

    const issues: ImportIssue[] = [];
    const language = declaredLanguage(parts.core.language, parts.styles.defaultLanguage);
    const structure = structureDocx({
      paragraphs: body.paragraphs,
      ...(parts.core.title !== undefined ? { coreTitle: parts.core.title } : {}),
      ...(parts.core.creator !== undefined ? { coreCreator: parts.core.creator } : {}),
      ...(language !== undefined ? { declaredLanguage: language } : {}),
      ...(options !== undefined ? { options } : {}),
      ids,
      issues,
    });

    reportDropped(body.counts, structure.tocRemoved, structure.listsFlattened, issues);

    // Read each distinct picture part once. A part that cannot be read loses its image blocks only.
    const images: ImportedImagePayload[] = [];
    const unreadable = new Set<string>();
    for (const picture of structure.pictures) {
      try {
        images.push({
          placeholderId: picture.placeholderId,
          bytes: opened.docx.readPart(picture.part),
          sourceName: decodePartName(picture.part.slice(picture.part.lastIndexOf("/") + 1)),
          altText: picture.altText,
        });
      } catch (err) {
        if (!(err instanceof DocxReadError) || FATAL_READ_ERRORS.has(err.code)) throw err;
        unreadable.add(picture.placeholderId);
      }
    }
    if (unreadable.size > 0) {
      for (const section of [...structure.frontMatter, ...structure.chapters]) {
        removeImageBlocks(section, unreadable, ids);
      }
      issues.push({
        code: "DOCX_PICTURES_UNREADABLE",
        severity: "warning",
        message: `${plural(unreadable.size, "picture")} could not be read from this file and ${unreadable.size === 1 ? "was" : "were"} left out. You can add ${unreadable.size === 1 ? "it" : "them"} again with the picture button in Write.`,
      });
    }

    // OpenBook's book check does not review picture descriptions yet (ADR-0018 keeps accessibility
    // checks for later), so the import itself says when pictures have none.
    const withoutAlt = picturesWithoutAltTextIssue(
      images.filter((image) => image.altText.trim() === "").length,
      body.counts.automaticAltText,
    );
    if (withoutAlt) issues.push(withoutAlt);

    if (structure.altTextConflicts > 0) {
      issues.push({
        code: "DOCX_PICTURE_ALT_TEXT_DIFFERS",
        severity: "warning",
        message: `${plural(structure.altTextConflicts, "picture")} appear${structure.altTextConflicts === 1 ? "s" : ""} more than once with different descriptions. OpenBook keeps one description per picture; please check the alt text in Write.`,
      });
    }

    const metadata = buildMetadata({ source, options, frontmatter: structure.metadata, issues });
    const book = assembleBook(metadata, structure.chapters, structure.frontMatter);
    const result = finalizeBookResult(book, issues);
    return result.success && images.length > 0 ? { ...result, images } : result;
  } catch (err) {
    if (err instanceof DocxReadError) {
      return { success: false, issues: [docxReadErrorToIssue(err)], stats: emptyStats() };
    }
    throw err;
  }
}

export const PICTURES_WITHOUT_ALT_TEXT = "DOCX_PICTURES_WITHOUT_ALT_TEXT";

/**
 * One warning for pictures without a description. `automatic` says how many had only Word's
 * machine-written description, which is not used. Callers that later drop pictures (the desktop
 * asset pipeline) rebuild it with the pictures that remain.
 */
export function picturesWithoutAltTextIssue(count: number, automatic = 0): ImportIssue | undefined {
  if (count <= 0) return undefined;
  const auto = Math.min(automatic, count);
  const automaticNote =
    auto === 0
      ? ""
      : auto === count
        ? ` Word had written ${count === 1 ? "a description" : "descriptions"} automatically; OpenBook did not use ${count === 1 ? "it" : "them"}.`
        : ` ${auto} of them had only a description written automatically by Word, which OpenBook did not use.`;
  return {
    code: PICTURES_WITHOUT_ALT_TEXT,
    severity: "warning",
    message: `${plural(count, "picture")} ${count === 1 ? "has" : "have"} no description (alt text) for readers who use screen readers.${automaticNote} Add descriptions in Word (right-click a picture › View Alt Text) and import again; ebook stores may ask for them.`,
  };
}

/** Removes image blocks for the given placeholders; a section left empty keeps one empty paragraph. */
function removeImageBlocks(section: StructuralSection, placeholders: ReadonlySet<string>, ids: DeterministicIdFactory): void {
  section.blocks = section.blocks.filter((block) => !(block.type === "image" && placeholders.has(block.assetId)));
  if (section.blocks.length === 0) {
    section.blocks.push({ type: "paragraph", id: ids.nextBlockId(), inlines: [{ type: "text", text: "" }] });
  }
}

/** OPC part names are percent-encoded; show the plain file name. */
function decodePartName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

function declaredLanguage(core: string | undefined, styleDefault: string | undefined): string | undefined {
  const value = (core ?? styleDefault)?.trim();
  return value ? value : undefined;
}

/** One plain-language line per kind of thing left out (ADR-0040 §4.7, §6, §7). */
function reportDropped(counts: BodyCounts, tocRemoved: boolean, listsFlattened: boolean, issues: ImportIssue[]): void {
  const add = (code: string, severity: ImportIssue["severity"], message: string): void => {
    issues.push({ code, severity, message });
  };
  add(
    "DOCX_FORMATTING_DROPPED",
    "info",
    "Word fonts, sizes, colours, spacing, and page size were not imported. Choose the look of your book in Design.",
  );
  if (tocRemoved || counts.tocFields > 0) {
    add("DOCX_TOC_REMOVED", "info", "Your table of contents was removed. OpenBook builds one for you from your chapters.");
  }
  if (counts.linkedPictures > 0) {
    add(
      "DOCX_LINKED_PICTURES_SKIPPED",
      "warning",
      `${plural(counts.linkedPictures, "picture")} ${counts.linkedPictures === 1 ? "is" : "are"} linked to a file outside this document rather than stored in it. OpenBook never fetches outside files, so ${counts.linkedPictures === 1 ? "it was" : "they were"} left out. In Word, use Insert > Pictures (not "Link to File") and import again.`,
    );
  }
  if (counts.trackedChanges) {
    add("DOCX_TRACKED_CHANGES", "warning", "This file had tracked changes. OpenBook imported it as if all changes were accepted.");
  }
  if (counts.comments) {
    add("DOCX_COMMENTS_SKIPPED", "info", "Comments in this file were not imported.");
  }
  if (counts.footnotes > 0) {
    add("DOCX_FOOTNOTES_SKIPPED", "warning", `${plural(counts.footnotes, "footnote or endnote", "footnotes or endnotes")} could not be imported yet and ${counts.footnotes === 1 ? "was" : "were"} left out.`);
  }
  if (counts.tables > 0) {
    add("DOCX_TABLES_FLATTENED", "warning", `${plural(counts.tables, "table")} became ordinary paragraphs, because OpenBook books do not have tables yet.`);
  }
  if (listsFlattened) {
    add("DOCX_LIST_FLATTENED", "warning", "Some nested lists were imported as single-level lists.");
  }
  if (counts.textBoxes > 0) {
    add("DOCX_TEXT_BOXES_SKIPPED", "warning", `Text inside ${plural(counts.textBoxes, "text box", "text boxes")} was not imported.`);
  }
  if (counts.shapes > 0) {
    add("DOCX_SHAPES_SKIPPED", "warning", `${plural(counts.shapes, "shape, chart, or SmartArt graphic", "shapes, charts, or SmartArt graphics")} could not be imported.`);
  }
  if (counts.equations > 0) {
    add("DOCX_EQUATIONS_SKIPPED", "warning", `${plural(counts.equations, "equation")} could not be imported.`);
  }
  if (counts.objects + counts.embeddedDocuments > 0) {
    add("DOCX_EMBEDDED_OBJECTS_SKIPPED", "warning", "Embedded objects (such as spreadsheets or other documents inside this file) were not imported.");
  }
  if (counts.externalFields > 0) {
    add("DOCX_EXTERNAL_CONTENT_IGNORED", "warning", "This file refers to pictures or text stored outside it. OpenBook never fetches outside content, so those were left out.");
  }
  if (counts.unsafeLinks > 0) {
    add("DOCX_LINKS_REMOVED", "warning", `${plural(counts.unsafeLinks, "link")} that did not point to a web page or email address ${counts.unsafeLinks === 1 ? "was" : "were"} kept as plain text.`);
  }
  if (counts.hiddenRuns > 0) {
    add("DOCX_HIDDEN_TEXT_SKIPPED", "info", "Text or pictures marked as Hidden in Word were not imported, because Word never shows or prints them.");
  }
  if (counts.brokenFields > 0) {
    add(
      "DOCX_FIELDS_REPAIRED",
      "warning",
      "Some of Word's automatic fields (such as links or a table of contents) were incomplete in this file. OpenBook kept the text around them; please check nearby text in Write.",
    );
  }
  if (counts.symbolsDropped > 0) {
    add("DOCX_SYMBOLS_SKIPPED", "warning", `${plural(counts.symbolsDropped, "picture-font symbol")} (such as Wingdings) had no text equivalent and ${counts.symbolsDropped === 1 ? "was" : "were"} left out.`);
  }
  if (counts.legacyFonts.size > 0) {
    add(
      "DOCX_LEGACY_KANNADA_FONT",
      "warning",
      `This file uses ${[...counts.legacyFonts].sort().join(", ")}, an older Kannada font that is not Unicode. That text may not display correctly; convert it to Unicode Kannada (for example with Nudi's converter) and import again.`,
    );
  }
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
