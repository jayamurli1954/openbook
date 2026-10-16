// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 7 — hardening: plain-language errors, colour contrast,
 * keyboard wiring, and a walk through all six steps in English and Kannada.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { DesktopStudioCoordinator, DesktopStudioError } from "../../domain/desktopStudioCoordinator.js";
import { createGuidedStartHost } from "../../host/createGuidedStartHost.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import { createDesignStudioChoices } from "./designStudioChoices.js";
import { formatGuidedStartFailure } from "./guidedStartUx.js";
import { createMetadataWizardFields } from "./metadataWizardFields.js";
import {
  deriveStudioProgress,
  deriveStudioStepStatuses,
  type StudioStepStatus,
} from "./studioShellContract.js";
import { isAuthorSafeText, toAuthorError, toAuthorMessage } from "./studioShellErrors.js";
import { evaluateStudioGuideChecklist, findInternalTerms } from "./studioShellGuide.js";
import { buildStudioOutline } from "./studioShellOutline.js";
import { stagesToReachBookCheck, summarizeBookCheck } from "./studioShellPublish.js";
import { STUDIO_BOOK_TYPES, findDesignPresetForBookType } from "./studioShellStart.js";
import { buildStudioShellSnapshot } from "./studioShellStatus.js";
import { createWritingStudioQueryAdapter } from "./writingStudioQueryAdapter.js";

const repoSrc = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "src");
const read = (...parts: string[]) => readFileSync(join(repoSrc, ...parts), "utf8");

// ---------------------------------------------------------------- errors ---

test("raw technical errors become plain language; the original is kept for Diagnostics", () => {
  const browserOnly = new Error(
    "Database error: Failed to initialize SQLite persistence schema: Cannot read properties of undefined (reading 'invoke')",
  );
  const saved = toAuthorError(browserOnly, "save");
  assert.equal(saved.message, "Saving needs the OpenBook desktop app. This preview window can’t save books.");
  assert.match(saved.detail, /reading 'invoke'/);
  assert.match(toAuthorMessage(browserOnly, "start"), /desktop app/);

  const coded = new DesktopStudioError("PREPUBLISH_VALIDATION_FAILED", "Cannot export: Book Doctor validation has not been run.");
  assert.equal(toAuthorMessage(coded, "export"), "Check your book before exporting. Press Check my book.");
  assert.equal(
    toAuthorMessage("EXPORT_DESTINATION_UNWRITABLE: EACCES /tmp/x", "export"),
    "OpenBook can’t write to that folder. Choose another one.",
  );
  assert.equal(
    toAuthorMessage(new TypeError("x is undefined"), "edit"),
    "That change didn’t go through. Your book is unchanged.",
  );

  for (const context of ["save", "open", "start", "import", "edit", "check", "export"] as const) {
    const { message } = toAuthorError(new Error("SESSION_REBUILD_FAILED: stack at foo()"), context);
    assert.deepEqual(findInternalTerms(message), [], message);
    assert.doesNotMatch(message, /[A-Z]+_[A-Z_]+|undefined|stack/);
  }
});

test("only plain text may pass through to authors", () => {
  assert.equal(isAuthorSafeText("disk full"), true);
  assert.equal(isAuthorSafeText("Cannot read properties of undefined (reading 'invoke')"), false);
  assert.equal(isAuthorSafeText("Database error: SQLite schema"), false);
  assert.equal(isAuthorSafeText("PACKAGE_SAVE_FAILED"), false);
  assert.equal(isAuthorSafeText(""), false);

  assert.match(formatGuidedStartFailure("COORDINATOR_FAILED", "disk full"), /disk full/);
  const browser = formatGuidedStartFailure(
    "COORDINATOR_FAILED",
    "Database error: Failed to initialize SQLite persistence schema: Cannot read properties of undefined (reading 'invoke')",
  );
  assert.doesNotMatch(browser, /Database|SQLite|invoke|undefined/);
  assert.match(browser, /desktop app/);
});

test("screens route failures through the plain-language layer", () => {
  const editor = read("EditorSurface.tsx");
  assert.doesNotMatch(editor, /err instanceof Error \? err\.message/);
  assert.doesNotMatch(editor, /Persistence: |Saved project “|\(\$\{binding\.projectId\}\)/);
  assert.match(editor, /data-testid="last-problem"/);
  assert.match(editor, /isAuthorSafeText\(detail\) \? detail : toAuthorMessage\(detail, "edit"\)/);
  const exportPanel = read("ui", "ExportPanel.tsx");
  assert.match(exportPanel, /toAuthorMessage\(status\.message, "export"\)/);
});

// -------------------------------------------------------------- contrast ---

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

test("text colours meet WCAG AA contrast (4.5:1) on the backgrounds they sit on", () => {
  const css = read("App.css");
  const root = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
  const token = (name: string): string => {
    const match = new RegExp(`--ob-${name}:\\s*(#[0-9a-fA-F]{6})`).exec(root);
    assert.ok(match, `token --ob-${name}`);
    return match![1]!.toLowerCase();
  };
  const white = "#ffffff";
  const pairs: [string, string, string][] = [
    ["ink on surface", token("ink"), token("surface")],
    ["ink on ground", token("ink"), token("ground")],
    ["muted text on surface", token("ink-muted"), token("surface")],
    ["muted text on ground", token("ink-muted"), token("ground")],
    ["muted text on outline", token("ink-muted"), token("surface-soft")],
    ["muted text on soft accent", token("ink-muted"), token("accent-soft")],
    ["primary button text", white, token("accent")],
    ["primary button hover text", white, token("accent-strong")],
    ["brand and links", token("accent"), token("surface")],
    ["accent on soft accent", token("accent"), token("accent-soft")],
    ["saved / ready", token("success"), token("surface")],
    ["done mark", token("success"), token("success-soft")],
    ["warning text", token("warning"), token("warning-soft")],
    ["error text", token("danger"), token("surface")],
    ["step mark", "#3d3b37", "#ece9e2"],
  ];
  for (const [label, fg, bg] of pairs) {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= 4.5, `${label}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});

test("keyboard users can skip to the book and land on each step", () => {
  const frame = read("ui", "StudioShellFrame.tsx");
  assert.match(frame, /href="#studio-main"/);
  assert.match(frame, /Skip to your book/);
  assert.match(frame, /id="studio-main"/);
  assert.match(frame, /tabIndex=\{-1\}/);
  assert.match(frame, /mainRef\.current\?\.focus\(\)/);
  assert.match(frame, /\}, \[activeStep\]\);/);
  const css = read("App.css");
  assert.match(css, /\.studio-shell button:focus-visible/);
  assert.match(css, /\.studio-skip-link:focus/);
  // Every interactive element in the shell components is a real control.
  for (const file of ["StudioShellFrame.tsx", "StudioOutline.tsx", "StudioGuidePanel.tsx", "StudioStartScreen.tsx", "PublishStep.tsx"]) {
    assert.doesNotMatch(read("ui", file), /<(div|span)[^>]*onClick=/, file);
  }
});

// ---------------------------------------------------------- six-step walk ---

async function withTempRoot(run: (parent: string) => Promise<void>): Promise<void> {
  const parent = await mkdtemp(path.join(tmpdir(), "ob-shell-walk-"));
  try {
    await run(parent);
  } finally {
    await rm(parent, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
  }
}

function byId(statuses: readonly StudioStepStatus[]) {
  return Object.fromEntries(statuses.map((status) => [status.id, status]));
}

for (const language of ["en", "kn"] as const) {
  test(`${language === "en" ? "an English" : "a Kannada"} book walks through all six steps and survives Save/Open`, async () => {
    await withTempRoot(async (parent) => {
      const coordinator = new DesktopStudioCoordinator({
        persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
        idSeed: `walk-${language}`,
        autosaveDebounceMs: 600_000,
      });
      const words = createWritingStudioQueryAdapter({ bookSource: { getBook: () => coordinator.getBook() } });
      const snapshot = () =>
        buildStudioShellSnapshot({
          book: coordinator.getBook(),
          bookWordCount: words.getWordCounts().bookWordCount,
          validationReport: coordinator.getValidationReport(),
          cover: "unavailable",
        });

      // Start: a book type pre-fills New book; the look follows creation.
      const type = STUDIO_BOOK_TYPES.find((t) => (language === "kn" ? t.id === "kannada" : t.id === "novel"))!;
      const title = language === "kn" ? "ನದಿಯ ಪುಸ್ತಕ" : "The River Book";
      const started = await createGuidedStartHost({ coordinator }).startNewBook({
        title,
        language: type.language,
        authors: [language === "kn" ? "ಲೇಖಕ" : "Ada"],
        bookType: type.bookType,
      });
      assert.equal(started.ok, true);
      const design = createDesignStudioChoices(coordinator.getSession());
      assert.equal(design.applyPreset(findDesignPresetForBookType(type)).ok, true);

      // Write.
      const text = language === "kn" ? "ನದಿ ಒಂದು ವದಂತಿಯಾಗಿ ಆರಂಭವಾಗುತ್ತದೆ" : "The river begins as a rumour";
      coordinator.updateActiveSectionBlocks([
        { type: "paragraph", id: "walk-p1", inlines: [{ type: "text", text }] },
      ]);
      let steps = byId(deriveStudioStepStatuses(snapshot()));
      assert.equal(steps.write!.state, "in-progress");
      assert.equal(evaluateStudioGuideChecklist("write", snapshot())[0]!.done, true);

      // Structure.
      coordinator.getSession().addSection({ matter: "front", title: language === "kn" ? "ಮುನ್ನುಡಿ" : "Preface" });
      const outline = buildStudioOutline(coordinator.getBook(), (id) => words.getWordCounts(id).sectionWordCount);
      assert.equal(outline[0]!.items.length, 1);
      assert.ok(outline[1]!.items.length >= 1);

      // Design.
      steps = byId(deriveStudioStepStatuses(snapshot()));
      assert.equal(steps.design!.state, "done");
      assert.equal(steps.design!.text, findDesignPresetForBookType(type).theme.name);

      // Details.
      const fields = createMetadataWizardFields(coordinator.getSession());
      assert.equal(
        fields.apply({
          ...fields.read(),
          description: language === "kn" ? "ಸಮುದ್ರದ ಕಡೆಗೆ ಒಂದು ನಡಿಗೆ" : "A walk from the spring to the sea.",
          subjects: language === "kn" ? "ಪ್ರಕೃತಿ" : "Nature",
        }).ok,
        true,
      );
      steps = byId(deriveStudioStepStatuses(snapshot()));
      assert.equal(steps.details!.text, "Complete");
      assert.ok(evaluateStudioGuideChecklist("details", snapshot()).every((item) => item.done));

      // Cover is not available yet.
      assert.equal(steps.cover!.state, "coming-soon");

      // Publish: one check walks the stages and unlocks export.
      for (const stage of stagesToReachBookCheck(coordinator.getState().stage)) {
        coordinator.transitionStage(stage);
      }
      const report = await coordinator.runValidation();
      if (report.summary.isClean && coordinator.getState().stage === "VALIDATION") {
        coordinator.transitionStage("PREVIEW");
      }
      assert.notEqual(summarizeBookCheck(coordinator.getValidationReport()).state, "blocked");
      assert.equal(coordinator.getState().stage, "PREVIEW");
      steps = byId(deriveStudioStepStatuses(snapshot()));
      assert.ok(["done", "in-progress"].includes(steps.publish!.state));
      const progress = deriveStudioProgress(deriveStudioStepStatuses(snapshot()));
      assert.equal(progress.total, 5);
      assert.ok(progress.done >= 3);

      // Every status the author sees is plain language.
      for (const status of deriveStudioStepStatuses(snapshot())) {
        assert.deepEqual(findInternalTerms(`${status.label} ${status.text}`), []);
      }

      // Save to a book folder and open it again: the same steps and text.
      const root = path.join(parent, "book.obproj");
      coordinator.bindPackageRoot(root);
      await coordinator.saveProject(title);
      const reopened = new DesktopStudioCoordinator({
        persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
        idSeed: `walk-${language}-open`,
        autosaveDebounceMs: 600_000,
      });
      await reopened.openFromProjectPackage(root);
      const book = reopened.getBook();
      assert.equal(book.metadata.title, title);
      assert.equal(book.metadata.language, type.language);
      assert.equal(book.theme.id, findDesignPresetForBookType(type).theme.id);
      assert.equal(book.frontMatter.length, 1);
      const stored = await readFile(path.join(root, "book.json"), "utf8");
      assert.ok(stored.includes(text), "chapter text saved");
      assert.equal(stored.normalize("NFC"), stored);

      await coordinator.close();
      await reopened.close();
    });
  });
}
