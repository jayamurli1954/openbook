# ADR-0040 follow-up: Front-Matter Title Variants — Implementation Record

- **Status:** Implemented on main (PR #189)
- **Date:** 2026-10-29
- **Parent architecture:** ADR-0040 — Word (.docx) Import (§4.3 Untagged front matter)
- **Scope:** Recognise short front-matter titles that start with a known title, such as “Preface for Parents”. Importer only (`packages/importer/src/docx/structure.ts`); no Book Model, UI, or engine change.
- **Implementation authorization:** Granted for this change only (maintainer, 2026-10-29: “Authorize”, after reviewing the proposal)

## 1. Problem

ADR-0040 §4.3 recognises an untagged front-matter title only when its **whole text** matches a known title (`FRONT_MATTER_TITLES`, `frontMatterRole`). While cleaning up *Little Krishna's Wisdom Stories*, the maintainer's book was found to have this order:

> Foreword → **Preface for Parents** → Publisher's Note → Story 1

“Preface for Parents” is not an exact match, so:

- as bold Normal text, it is not a title, and its text is merged into the end of the Foreword section;
- as Heading 1, it is not front matter, so it starts the first chapter. “Publisher's Note” comes after a chapter has started, so it is no longer recognised either, and is swallowed into that chapter.

## 2. Proposed rule

A paragraph before the first chapter is also a front-matter title when **all** of these hold:

1. it has at most 6 words (the existing limit);
2. its text **starts with** a known title from the table in §4.3, followed by one of:
   - “ for ”, “ to ”, “ of ” — “Preface for Parents”, “Foreword to the Second Edition”;
   - “:” — “Introduction: How to Use This Book”;
   - “ - ” (also “ – ” and “ — ”, because Word turns a typed hyphen between spaces into a dash) — “Preface - A Note for Parents”;
3. something follows the connector;
4. it does not end with “.”, “!” or “?”, so a short sentence such as “Introduction to the stories is short.” is not a title.

The section gets the **role of the known title** (`preface` for “Preface for Parents”) and keeps the author's full text as its title. Matching is case- and punctuation-insensitive as today (“PREFACE FOR PARENTS” matches).

Unchanged:

- exact matches, including all Kannada titles, behave exactly as today;
- only paragraphs before the first chapter are checked; list items, table cells and quotes are never titles;
- a word that only begins like a title is not a match: “Prefaces”, “Introductory notes”, “Forewords” — the connector must follow the whole known title.

## 3. Heading 1 before the first chapter

ADR-0040 §4.3 already says a Heading 1 that matches the table becomes front matter while no chapter has started. The importer does this today for exact matches. With the new rule, a Heading 1 “Preface for Parents” before Story 1 becomes a `preface` section, so it no longer starts a chapter, and the following “Publisher's Note” is recognised again. Tests cover both the Normal-text and the Heading 1 shapes.

A known trade-off: in a textbook whose **first** Heading 1 is “Introduction to Algebra”, that heading now becomes an `introduction` front section instead of Chapter 1. The author can move it in Structure Studio. Later Heading 1s are not affected, because once a chapter has started nothing is matched.

## 4. Tests

In `packages/importer/src/docx/docx-import.test.ts`:

- a manuscript shaped like Foreword → Preface for Parents → Publisher's Note → Story 1 (bold Normal titles): four sections in order, Preface for Parents with role `preface` and its own text, the Foreword not containing the preface text;
- the same with “Preface for Parents” as Heading 1: still front matter, Publisher's Note still front matter, Story 1 is Chapter 1;
- each connector: “Foreword to the Second Edition”, “Introduction: How to Use This Book”, “Preface – A Note for Parents”;
- not titles: a sentence ending with “.”, “Prefaces”, a 7-word title, a prefixed title after the first chapter;
- Kannada exact titles still recognised.

Existing importer tests and the desktop Word-import tests (`apps/desktop/src/workflow/domain/wordImportHardening.e2e.test.ts`) must pass unchanged, and all 12 workspaces' `npm test`.

## 5. Documents

- ADR-0040 §4.3: the prefix rule is added under the table.
- This file was the proposal and is now the implementation record.

## 6. Result

`frontMatterRole` (`packages/importer/src/docx/structure.ts`) tries exact matches first, as before; then, unless the line ends like a sentence, a known title followed by a connector. No change was needed for Heading 1: the existing §4.3 path already makes a matching Heading 1 front matter while no chapter has started. Four tests were added (the two book shapes, the connectors including a Kannada title with a colon, and the non-matches); the importer runs 112 tests, all passing, with the existing tests unchanged.
- No new dependency (INV-D10), no AI (INV-D11); Markdown and text import unchanged (INV-D8).

**Local check with the maintainer's book (ADR-0040 §8).** Run on 2026-10-29 with the maintainer's local copy of the manuscript (28.8 MB) through the built importer; the file was only read and is not committed. Front matter is now: title page, Foreword (6 blocks), **Preface for Parents** (`preface`, 10 blocks), Publisher's Note (5 blocks); 25 chapters, as before. Earlier, the preface's text was inside the Foreword.
