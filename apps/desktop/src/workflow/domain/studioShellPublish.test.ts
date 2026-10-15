// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 4 — Publish step logic, design presets, and source guards
 * for the redesigned Structure, Design, Details, and Publish steps.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import type { BookValidationReport } from "@openbook/book-doctor";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { createDesignStudioChoices } from "./designStudioChoices.js";
import { readBookDesign } from "./designStudioContract.js";
import { BUNDLED_BOOK_FONTS, DESIGN_PRESETS, previewFontStack } from "./designStudioPresets.js";
import { findInternalTerms } from "./studioShellGuide.js";
import { stagesToReachBookCheck, summarizeBookCheck } from "./studioShellPublish.js";

function report(
  diagnostics: BookValidationReport["diagnostics"],
  counts: { fatal?: number; errors?: number; warnings?: number },
): BookValidationReport {
  const totalFatal = counts.fatal ?? 0;
  const totalErrors = counts.errors ?? 0;
  return {
    diagnostics,
    summary: {
      totalFatal,
      totalErrors,
      totalWarnings: counts.warnings ?? 0,
      totalInfos: 0,
      isClean: totalFatal === 0 && totalErrors === 0,
    },
  };
}

test("the book check walks forward only as far as needed", () => {
  assert.deepEqual(stagesToReachBookCheck("IMPORT"), [
    "STRUCTURE",
    "AUTHORING",
    "ASSETS",
    "VALIDATION",
  ]);
  assert.deepEqual(stagesToReachBookCheck("ASSETS"), ["VALIDATION"]);
  assert.deepEqual(stagesToReachBookCheck("VALIDATION"), []);
  assert.deepEqual(stagesToReachBookCheck("PREVIEW"), []);
  assert.deepEqual(stagesToReachBookCheck("PUBLISH"), []);
});

test("check summaries read plainly in every state", () => {
  assert.equal(summarizeBookCheck(null).state, "unchecked");
  assert.deepEqual(summarizeBookCheck(report([], {})), {
    state: "ready",
    headline: "Your book is ready to export.",
    items: [],
  });

  const warned = summarizeBookCheck(
    report(
      [{ source: "domain-model", severity: "warning", code: "missing-title", message: "Book title is empty." }],
      { warnings: 1 },
    ),
  );
  assert.equal(warned.state, "warnings");
  assert.equal(warned.headline, "Ready to export, with 1 suggestion.");
  assert.deepEqual(warned.items, [{ tone: "advice", text: "Book title is empty." }]);

  const blocked = summarizeBookCheck(
    report(
      [
        {
          source: "domain-model",
          severity: "error",
          code: "empty-section",
          message: "Chapter 2 has no text.",
          fixSuggestion: "Add some text or remove the chapter.",
          targetSectionId: "sec-2",
        },
        { source: "domain-model", severity: "fatal", code: "x", message: "The book could not be read." },
        { source: "domain-model", severity: "info", code: "y", message: "Not shown." },
      ],
      { fatal: 1, errors: 1 },
    ),
  );
  assert.equal(blocked.state, "blocked");
  assert.equal(blocked.headline, "2 things to fix before you can export.");
  assert.equal(blocked.items.length, 2);
  assert.deepEqual(blocked.items[0], {
    tone: "fix",
    text: "Chapter 2 has no text.",
    suggestion: "Add some text or remove the chapter.",
    sectionId: "sec-2",
  });
  for (const summary of [warned, blocked, summarizeBookCheck(null)]) {
    assert.deepEqual(findInternalTerms(summary.headline), [], summary.headline);
  }
});

test("check → edit → check again keeps export reachable", async () => {
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "publish-slice-4",
  });
  // Mirrors EditorSurface.onCheckBook.
  const checkBook = async () => {
    for (const stage of stagesToReachBookCheck(coordinator.getState().stage)) {
      coordinator.transitionStage(stage);
    }
    const result = await coordinator.runValidation();
    if (result.summary.isClean && coordinator.getState().stage === "VALIDATION") {
      coordinator.transitionStage("PREVIEW");
    }
  };

  await checkBook();
  assert.equal(coordinator.getState().stage, "PREVIEW");
  assert.equal(summarizeBookCheck(coordinator.getValidationReport()).state !== "blocked", true);

  const chapter = coordinator.listChapters()[0]!;
  coordinator.getSession().updateSectionTitle(chapter.id, "Edited after the check");
  coordinator.transitionStage("PUBLISH");
  assert.equal(summarizeBookCheck(coordinator.getValidationReport()).state, "unchecked");

  await checkBook();
  assert.equal(coordinator.getState().stage, "PUBLISH");
  assert.notEqual(coordinator.getValidationReport(), null);
  await coordinator.close();
});

test("design presets use bundled fonts and apply through the design port", () => {
  for (const preset of DESIGN_PRESETS) {
    assert.ok(
      (BUNDLED_BOOK_FONTS as readonly string[]).includes(preset.typography.bodyFontFamily),
      preset.id,
    );
    assert.ok(
      (BUNDLED_BOOK_FONTS as readonly string[]).includes(preset.typography.headingFontFamily),
      preset.id,
    );
    const session = new BookSession({
      book: createBook({ title: "Presets", language: "kn" }),
      idSeed: `preset-${preset.id}`,
    });
    const result = createDesignStudioChoices(session).applyPreset(preset);
    assert.equal(result.ok, true, preset.id);
    const design = readBookDesign(session.getBook());
    assert.deepEqual(design.theme, preset.theme);
    assert.deepEqual(design.typography, preset.typography);
  }
  assert.equal(previewFontStack("Noto Serif", "serif"), '"Noto Serif", Georgia, serif');
  assert.equal(previewFontStack("  ", "sans-serif"), "system-ui, sans-serif");
});

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

test("Publish owns checking and export; stage chips live only in diagnostics", () => {
  const editor = read("EditorSurface.tsx");
  const publish = read("ui", "PublishStep.tsx");
  const exportPanel = read("ui", "ExportPanel.tsx");

  assert.match(publish, /<ExportPanel/);
  assert.match(publish, /data-testid="book-check-run"/);
  assert.match(publish, /onOpenSection/);
  assert.doesNotMatch(editor, /<ExportPanel/);

  const drawerStart = editor.indexOf("diagnostics={");
  const pageStart = editor.indexOf('{activeStep === "structure" ? (');
  const drawer = editor.slice(drawerStart, pageStart);
  const page = editor.slice(pageStart);
  assert.match(drawer, /aria-label="Workflow stage"/);
  assert.doesNotMatch(page, /aria-label="Workflow stage"|WORKFLOW_STAGES\.map/);

  for (const source of [publish, exportPanel]) {
    assert.doesNotMatch(source, /Gate 9|PREVIEW\/PUBLISH|Book Doctor|Save-As host|DesktopStudioCoordinator/);
  }
  assert.match(exportPanel, /DesktopExportController/);

  const frame = read("ui", "StudioShellFrame.tsx");
  assert.match(frame, /data-testid="studio-export"/);
  assert.match(editor, /onExport=\{\(\) => selectStep\("publish"\)\}/);
});

test("Details are grouped and Design offers ready-made looks with a live preview", () => {
  const details = read("ui", "MetadataWizardFields.tsx");
  for (const title of ["Essentials", "Publishing", "Help readers find it"]) {
    assert.ok(details.includes(`title: "${title}"`), title);
  }
  assert.match(details, /<fieldset/);
  assert.match(details, /Save details/);

  const design = read("ui", "DesignStudioChoices.tsx");
  assert.match(design, /DESIGN_PRESETS\.map/);
  assert.match(design, /choices\.applyPreset/);
  assert.match(design, /aria-pressed=\{themeId === preset\.theme\.id\}/);
  assert.match(design, /data-testid="design-live-preview"/);
});
