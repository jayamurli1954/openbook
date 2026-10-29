// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0039 Slice 1 — studio shell step model.
 *
 * Six book steps and their status, derived from the Book and a few facts
 * the caller already has (word count, last Book Doctor summary, cover
 * availability). Status is advisory: every step is always reachable.
 * React chrome stays outside this module.
 */
import type { Book } from "@openbook/book-model";

export type StudioStepId =
  | "write"
  | "structure"
  | "design"
  | "details"
  | "cover"
  | "publish";

export interface StudioStep {
  readonly id: StudioStepId;
  readonly label: string;
}

/** Step order shown in the step bar. */
export const STUDIO_STEPS: readonly StudioStep[] = [
  { id: "write", label: "Write" },
  { id: "structure", label: "Structure" },
  { id: "design", label: "Design" },
  { id: "details", label: "Details" },
  { id: "cover", label: "Cover" },
  { id: "publish", label: "Publish" },
] as const;

export type StudioStepState =
  | "not-started"
  | "in-progress"
  | "done"
  | "attention"
  | "coming-soon";

export interface StudioStepStatus {
  readonly id: StudioStepId;
  readonly label: string;
  readonly state: StudioStepState;
  /** Short plain-language status shown under the step label. */
  readonly text: string;
}

/**
 * Whether the book has a cover (ADR-0038). The studio passes "none" or "set";
 * "unavailable" (shown as "coming soon") is kept for callers without cover support.
 */
export type StudioCoverState = "unavailable" | "none" | "set";

export interface StudioShellSnapshot {
  readonly book: Book;
  readonly bookWordCount: number;
  /** Last Book Doctor summary, or null when the book has not been checked. */
  readonly validation: { readonly errors: number; readonly warnings: number } | null;
  readonly cover: StudioCoverState;
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

function filled(value: string): boolean {
  return value.trim().length > 0;
}

function allSections(book: Book) {
  return [...book.frontMatter, ...book.chapters, ...book.backMatter];
}

export function isDetailsRequiredFilled(book: Book): boolean {
  return filled(book.metadata.title) && filled(book.metadata.language);
}

export function countDetailsRecommendedMissing(book: Book): number {
  let missing = 0;
  if (!book.metadata.authors.some(filled)) missing += 1;
  if (!filled(book.metadata.description)) missing += 1;
  return missing;
}

function writeStatus(snapshot: StudioShellSnapshot): Omit<StudioStepStatus, "id" | "label"> {
  if (snapshot.bookWordCount <= 0) return { state: "not-started", text: "Not started" };
  return { state: "in-progress", text: plural(snapshot.bookWordCount, "word", "words") };
}

function structureStatus(book: Book): Omit<StudioStepStatus, "id" | "label"> {
  const sections = allSections(book);
  const untitled = sections.filter((section) => !filled(section.title)).length;
  if (untitled > 0) return { state: "attention", text: `${untitled} untitled` };
  return { state: "done", text: plural(sections.length, "part", "parts") };
}

function designStatus(book: Book): Omit<StudioStepStatus, "id" | "label"> {
  if (book.theme.id === "default") return { state: "not-started", text: "Default look" };
  return { state: "done", text: book.theme.name.trim() || "Chosen" };
}

function detailsStatus(book: Book): Omit<StudioStepStatus, "id" | "label"> {
  if (!isDetailsRequiredFilled(book)) {
    return { state: "attention", text: "Title or language missing" };
  }
  const missing = countDetailsRecommendedMissing(book);
  if (missing > 0) return { state: "in-progress", text: `${missing} to fill` };
  return { state: "done", text: "Complete" };
}

function coverStatus(cover: StudioCoverState): Omit<StudioStepStatus, "id" | "label"> {
  if (cover === "unavailable") return { state: "coming-soon", text: "Coming soon" };
  if (cover === "none") return { state: "not-started", text: "Not added" };
  return { state: "done", text: "Added" };
}

function publishStatus(
  validation: StudioShellSnapshot["validation"],
): Omit<StudioStepStatus, "id" | "label"> {
  if (validation === null) return { state: "not-started", text: "Not checked" };
  if (validation.errors > 0) {
    return { state: "attention", text: `${plural(validation.errors, "thing", "things")} to fix` };
  }
  if (validation.warnings > 0) {
    return { state: "in-progress", text: plural(validation.warnings, "warning", "warnings") };
  }
  return { state: "done", text: "Ready" };
}

function statusFor(id: StudioStepId, snapshot: StudioShellSnapshot) {
  switch (id) {
    case "write":
      return writeStatus(snapshot);
    case "structure":
      return structureStatus(snapshot.book);
    case "design":
      return designStatus(snapshot.book);
    case "details":
      return detailsStatus(snapshot.book);
    case "cover":
      return coverStatus(snapshot.cover);
    case "publish":
      return publishStatus(snapshot.validation);
    default: {
      const unexpected: never = id;
      throw new Error(`Unknown studio step: ${String(unexpected)}`);
    }
  }
}

export function deriveStudioStepStatuses(snapshot: StudioShellSnapshot): StudioStepStatus[] {
  return STUDIO_STEPS.map((step) => ({ ...step, ...statusFor(step.id, snapshot) }));
}

/** Book progress for the step bar: done steps out of available steps. */
export function deriveStudioProgress(
  statuses: readonly StudioStepStatus[],
): { readonly done: number; readonly total: number } {
  const available = statuses.filter((status) => status.state !== "coming-soon");
  return {
    done: available.filter((status) => status.state === "done").length,
    total: available.length,
  };
}

export function isStudioStepId(value: string): value is StudioStepId {
  return STUDIO_STEPS.some((step) => step.id === value);
}

/** The step after `id`, or null after Publish. */
export function nextStudioStep(id: StudioStepId): StudioStep | null {
  const index = STUDIO_STEPS.findIndex((step) => step.id === id);
  return STUDIO_STEPS[index + 1] ?? null;
}
