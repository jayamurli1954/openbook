// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 3 — plain-language terminology stubs for Book Wizard fields.
 * Not a CMS; copy may be refined in later slices.
 */

export type GuidedStartFieldHelpKey =
  | "title"
  | "subtitle"
  | "authors"
  | "language"
  | "bookType"
  | "intendedAudience"
  | "approximateLength"
  | "writingGoal";

export const GUIDED_START_FIELD_HELP: Readonly<
  Record<GuidedStartFieldHelpKey, string>
> = {
  title: "The main name of your book as readers will see it.",
  subtitle: "An optional second line under the title (for example, a series name).",
  authors: "Who wrote the book. You can add more than one name, separated by commas.",
  language: "The primary language of the manuscript (for example, en or kn).",
  bookType: "A simple label for the kind of book (novel, guide, textbook, and so on).",
  intendedAudience: "Who you are writing for — beginners, specialists, children, etc.",
  approximateLength: "A rough size goal (pages, words, or chapters). Not a hard limit.",
  writingGoal: "What you want to finish first (a draft, a chapter outline, a proposal).",
};

export function getGuidedStartFieldHelp(
  key: GuidedStartFieldHelpKey,
): string {
  return GUIDED_START_FIELD_HELP[key];
}
