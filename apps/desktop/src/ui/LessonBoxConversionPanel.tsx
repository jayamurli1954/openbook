/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0041 Slice 4 — Write-step panel that finds every paragraph starting with a label
 * ("What We Learned:") and turns them all into lesson boxes as one undoable change.
 * The matching rules live in lessonBoxConversion.ts; no TipTap JSON or Tauri calls here.
 */
import { useState } from "react";
import type { Book } from "@openbook/book-model";
import type { IBookSession } from "@openbook/authoring";
import {
  convertLabelledParagraphs,
  findLabelledParagraphs,
  type LabelledParagraph,
} from "../workflow/domain/lessonBoxConversion.js";
import { lastLessonBoxTitle } from "../workflow/domain/lessonBoxEditing.js";

const LISTED_MATCHES = 10;

export interface LessonBoxConversionPanelProps {
  readonly getBook: () => Book;
  readonly session: Pick<IBookSession, "replaceSectionsBlocks" | "undo" | "getState">;
  /** Moves unsaved typing in the open chapter into the Book; false when that failed. */
  readonly onBeforeChange: () => boolean;
  /** Reloads the open chapter so the editor shows the change. */
  readonly onChanged: () => void;
  readonly onStatus: (message: string, kind: "ok" | "error") => void;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export default function LessonBoxConversionPanel({
  getBook,
  session,
  onBeforeChange,
  onChanged,
  onStatus,
}: LessonBoxConversionPanelProps) {
  const [label, setLabel] = useState(() => `${lastLessonBoxTitle(getBook())}:`);
  const [found, setFound] = useState<{ label: string; matches: LabelledParagraph[] } | null>(null);
  const [done, setDone] = useState<{ count: number; revision: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Undo is offered only until the next edit: the editor's own Undo can't reach this change.
  const canUndo = done !== null && session.getState().revision === done.revision;

  const find = () => {
    if (!onBeforeChange()) return;
    setDone(null);
    setMessage(null);
    setFound({ label: label.trim(), matches: findLabelledParagraphs(getBook(), label) });
  };

  const convert = () => {
    if (!found || !onBeforeChange()) return;
    try {
      const { count, changes } = convertLabelledParagraphs(getBook(), found.label);
      setFound(null);
      if (count === 0) {
        setMessage(`No paragraphs start with “${found.label}”.`);
        return;
      }
      session.replaceSectionsBlocks(changes);
      setDone({ count, revision: session.getState().revision });
      setMessage(`Turned ${count} ${plural(count, "paragraph", "paragraphs")} into lesson boxes.`);
      onChanged();
    } catch {
      onStatus("Couldn't turn the paragraphs into lesson boxes. Nothing was changed.", "error");
    }
  };

  const undo = () => {
    if (!canUndo || !session.undo()) return;
    setDone(null);
    setMessage("The lesson boxes are paragraphs again.");
    onChanged();
  };

  const matches = found?.matches ?? [];
  return (
    <div className="lesson-box-conversion" data-testid="lesson-box-conversion-panel">
      <p className="lesson-box-conversion-heading">Lesson boxes from labelled paragraphs</p>
      <div className="lesson-box-conversion-row">
        <label htmlFor="lesson-box-conversion-label">Label</label>
        <input
          id="lesson-box-conversion-label"
          type="text"
          value={label}
          data-testid="lesson-box-conversion-label"
          onChange={(event) => {
            setLabel(event.target.value);
            setFound(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              find();
            }
          }}
        />
        <button type="button" data-testid="lesson-box-conversion-find" disabled={!label.trim()} onClick={find}>
          Find
        </button>
      </div>

      {found ? (
        matches.length === 0 ? (
          <p className="note" data-testid="lesson-box-conversion-none">
            {`No paragraphs start with “${found.label}”.`}
          </p>
        ) : (
          <div data-testid="lesson-box-conversion-found">
            <p className="detail">
              {`${matches.length} ${plural(matches.length, "paragraph starts", "paragraphs start")} with “${found.label}”`}
            </p>
            <ul className="writing-studio-search-hits">
              {matches.slice(0, LISTED_MATCHES).map((match) => (
                <li key={`${match.sectionId}:${match.blockId}`} className="writing-studio-search-hit">
                  <span className="writing-studio-hit-title">{match.sectionTitle || "Untitled"}</span>
                  <span className="writing-studio-hit-excerpt">{match.excerpt}</span>
                </li>
              ))}
            </ul>
            {matches.length > LISTED_MATCHES ? (
              <p className="detail">{`and ${matches.length - LISTED_MATCHES} more`}</p>
            ) : null}
            <button type="button" className="studio-btn lesson-box-conversion-convert" data-testid="lesson-box-conversion-convert" onClick={convert}>
              Turn into lesson boxes
            </button>
          </div>
        )
      ) : null}

      {message ? (
        <p className="note lesson-box-conversion-result" role="status" data-testid="lesson-box-conversion-result">
          {message}{" "}
          {canUndo ? (
            <button type="button" data-testid="lesson-box-conversion-undo" onClick={undo}>
              Undo
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
