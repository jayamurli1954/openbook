// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 4 — Publish step logic.
 *
 * "Check my book" moves the workflow forward to where the book check may
 * run, and the result is summarised in plain language. Pure; no React.
 */
import type { BookValidationReport } from "@openbook/book-doctor";
import type { WorkflowStage } from "@openbook/workflow";

const ORDER: readonly WorkflowStage[] = [
  "IMPORT",
  "STRUCTURE",
  "AUTHORING",
  "ASSETS",
  "VALIDATION",
  "PREVIEW",
  "PUBLISH",
];

/** Stages to pass through (in order) before the book check can run. */
export function stagesToReachBookCheck(stage: WorkflowStage): WorkflowStage[] {
  const from = ORDER.indexOf(stage);
  const target = ORDER.indexOf("VALIDATION");
  if (from >= target) return [];
  return ORDER.slice(from + 1, target + 1);
}

export type BookCheckState = "unchecked" | "ready" | "warnings" | "blocked";

export interface BookCheckItem {
  readonly tone: "fix" | "advice";
  readonly text: string;
  readonly suggestion?: string;
  readonly sectionId?: string;
}

export interface BookCheckSummary {
  readonly state: BookCheckState;
  readonly headline: string;
  readonly items: readonly BookCheckItem[];
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function summarizeBookCheck(report: BookValidationReport | null): BookCheckSummary {
  if (report === null) {
    return {
      state: "unchecked",
      headline: "Check your book before exporting. It only takes a moment.",
      items: [],
    };
  }
  const items: BookCheckItem[] = report.diagnostics
    .filter((d) => d.severity !== "info")
    .map((d) => ({
      tone: d.severity === "fatal" || d.severity === "error" ? "fix" : "advice",
      text: d.message,
      ...(d.fixSuggestion ? { suggestion: d.fixSuggestion } : {}),
      ...(d.targetSectionId ? { sectionId: d.targetSectionId } : {}),
    }));
  const toFix = report.summary.totalFatal + report.summary.totalErrors;
  if (toFix > 0) {
    return {
      state: "blocked",
      headline: `${plural(toFix, "thing", "things")} to fix before you can export.`,
      items,
    };
  }
  if (report.summary.totalWarnings > 0) {
    return {
      state: "warnings",
      headline: `Ready to export, with ${plural(report.summary.totalWarnings, "suggestion", "suggestions")}.`,
      items,
    };
  }
  return { state: "ready", headline: "Your book is ready to export.", items };
}
