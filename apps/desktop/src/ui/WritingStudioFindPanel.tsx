/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0034 Slice 3 — Writing Studio word count + find-in-book chrome.
 * Delegates to WritingStudioQueryAdapter. No TipTap JSON, Tauri, or
 * filesystem calls live here.
 */
import { useState } from "react";
import type { WritingStudioSearchHit } from "../workflow/domain/writingStudioContract.js";
import type {
  IWritingStudioQueryAdapter,
  WritingStudioSearchOutcome,
} from "../workflow/domain/writingStudioQueryAdapter.js";

export interface WritingStudioFindPanelProps {
  readonly queryAdapter: IWritingStudioQueryAdapter;
  /** Active section id for section word count (Book Model). */
  readonly sectionId: string | null;
  /** Navigate editor to a hit's section. */
  readonly onSelectHit?: (hit: WritingStudioSearchHit) => void;
}

export default function WritingStudioFindPanel({
  queryAdapter,
  sectionId,
  onSelectHit,
}: WritingStudioFindPanelProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [outcome, setOutcome] = useState<WritingStudioSearchOutcome | null>(
    null,
  );

  const counts = queryAdapter.getWordCounts(sectionId ?? undefined);

  const runSearch = () => {
    setOutcome(queryAdapter.searchDocument(rawQuery));
  };

  return (
    <div
      className="writing-studio-find"
      data-testid="writing-studio-find-panel"
    >
      <p
        className="writing-studio-word-count detail"
        data-testid="writing-studio-word-count"
      >
        Book: {counts.bookWordCount} word
        {counts.bookWordCount === 1 ? "" : "s"}
        {counts.sectionId
          ? ` · Section: ${counts.sectionWordCount} word${
              counts.sectionWordCount === 1 ? "" : "s"
            }`
          : ""}
      </p>

      <div className="writing-studio-search-row" role="search">
        <label className="sr-only" htmlFor="writing-studio-search-input">
          Find in book
        </label>
        <input
          id="writing-studio-search-input"
          type="search"
          value={rawQuery}
          placeholder="Find in book…"
          data-testid="writing-studio-search-input"
          onChange={(event) => setRawQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              runSearch();
            }
          }}
        />
        <button
          type="button"
          data-testid="writing-studio-search-submit"
          onClick={runSearch}
        >
          Find
        </button>
      </div>

      {outcome && !outcome.ok ? (
        <p
          className="note writing-studio-search-error"
          data-testid="writing-studio-search-error"
          role="alert"
        >
          {outcome.message}
        </p>
      ) : null}

      {outcome && outcome.ok ? (
        <div data-testid="writing-studio-search-results">
          <p className="detail">
            {outcome.hits.length} hit{outcome.hits.length === 1 ? "" : "s"} for
            “{outcome.query}”
          </p>
          {outcome.hits.length === 0 ? (
            <p className="note" data-testid="writing-studio-search-empty">
              No matches in the Book.
            </p>
          ) : (
            <ul className="writing-studio-search-hits">
              {outcome.hits.map((hit) => (
                <li key={`${hit.sectionId}:${hit.blockId}:${hit.matchOffset}`}>
                  <button
                    type="button"
                    className="writing-studio-search-hit"
                    data-testid={`writing-studio-hit-${hit.blockId}`}
                    onClick={() => onSelectHit?.(hit)}
                  >
                    <span className="writing-studio-hit-title">
                      {hit.sectionTitle || hit.sectionId}
                    </span>
                    <span className="writing-studio-hit-excerpt">
                      {hit.excerpt}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
