// SPDX-License-Identifier: Apache-2.0
import type { DeterministicIdFactory } from "../ids.js";
import { assembleBook, finalizeBookResult } from "../markdown-import.js";
import { buildMetadata, emptyStats } from "../metadata.js";
import type { DocxImportSource, ImportIssue, ImportOptions, ImportResult } from "../types.js";
import { walkBody, type BodyCounts } from "./body.js";
import { DocxReadError, docxReadErrorToIssue } from "./errors.js";
import { openDocxPackage } from "./package.js";
import { readDocxParts } from "./parts.js";
import { structureDocx } from "./structure.js";

/**
 * Word `.docx` → canonical Book (ADR-0040 Slice 2: text and structure).
 * Pictures are counted and reported here; Slice 3 imports them.
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
    const metadata = buildMetadata({ source, options, frontmatter: structure.metadata, issues });
    const book = assembleBook(metadata, structure.chapters, structure.frontMatter);
    return finalizeBookResult(book, issues);
  } catch (err) {
    if (err instanceof DocxReadError) {
      return { success: false, issues: [docxReadErrorToIssue(err)], stats: emptyStats() };
    }
    throw err;
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
  if (counts.pictures > 0) {
    add(
      "DOCX_PICTURES_NOT_YET_IMPORTED",
      "warning",
      `${plural(counts.pictures, "picture")} in this file ${counts.pictures === 1 ? "was" : "were"} not imported yet. Picture import is coming in a later OpenBook update.`,
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
    add("DOCX_HIDDEN_TEXT_SKIPPED", "info", "Text marked as Hidden in Word was not imported, because Word never shows or prints it.");
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
