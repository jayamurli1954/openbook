/**
 * SPDX-License-Identifier: Apache-2.0
 *
 * ADR-0039 Slice 6 — start screen.
 * The welcome, the Guided Start paths (passed in), "What are you writing?"
 * book types, and books saved inside OpenBook. Holds no book state.
 */
import type { ReactNode } from "react";
import type { StudioBookType } from "../workflow/domain/studioShellStart.js";

export interface StudioStartScreenProps {
  readonly currentBookTitle: string;
  readonly onContinue: () => void;
  readonly bookTypes: readonly StudioBookType[];
  readonly selectedBookTypeId: string | null;
  readonly onPickBookType: (type: StudioBookType) => void;
  /** The Guided Start wizard. */
  readonly start: ReactNode;
  /** Books saved inside OpenBook (open, new blank book, status). */
  readonly library: ReactNode;
  /** ADR-0040 Slice 4: bring in a Word (.docx) manuscript as a new book. */
  readonly onImportWord: () => void;
  readonly wordImportBusy: boolean;
  /** Result or problem from the last Word import, in plain language. */
  readonly wordImportMessage: string;
}

export default function StudioStartScreen({
  currentBookTitle,
  onContinue,
  bookTypes,
  selectedBookTypeId,
  onPickBookType,
  start,
  library,
  onImportWord,
  wordImportBusy,
  wordImportMessage,
}: StudioStartScreenProps) {
  return (
    <div className="studio-start" data-testid="studio-start">
      <header className="studio-start-bar">
        <span className="studio-brand">OpenBook Studio</span>
        <span className="studio-start-local">Your books stay on this computer</span>
      </header>

      <main className="studio-start-main">
        <section className="studio-start-hero" aria-labelledby="studio-start-title">
          <h1 id="studio-start-title">Tell us your story. We’ll guide you to a finished book.</h1>
          <p>Start a new book, bring in a manuscript, or pick up where you left off.</p>
          <button
            type="button"
            className="studio-btn studio-btn-primary"
            onClick={onContinue}
            data-testid="studio-start-continue"
          >
            Continue: {currentBookTitle}
          </button>
          <div className="studio-start-word">
            <button
              type="button"
              className="studio-btn"
              onClick={onImportWord}
              disabled={wordImportBusy}
              data-testid="studio-start-import-word"
            >
              {wordImportBusy ? "Importing your Word file…" : "Import a Word file"}
            </button>
            <p className="note">
              Bring in a finished manuscript saved as .docx, with its chapters and pictures.
            </p>
            {wordImportMessage ? (
              <p className="detail" role="status" data-testid="studio-start-import-word-status">
                {wordImportMessage}
              </p>
            ) : null}
          </div>
        </section>

        <section className="studio-start-section" aria-labelledby="studio-start-types">
          <div className="studio-start-section-head">
            <h2 id="studio-start-types">What are you writing?</h2>
            <p>Pick one to fill in the new book form and set a matching look. You can change everything later.</p>
          </div>
          <div className="studio-start-types" role="group" aria-label="Book types">
            {bookTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                className="studio-start-type"
                aria-pressed={selectedBookTypeId === type.id}
                onClick={() => onPickBookType(type)}
                data-testid={`studio-book-type-${type.id}`}
              >
                <span className="studio-start-type-sample" aria-hidden="true" lang={type.language}>
                  {type.sample}
                </span>
                <span className="studio-start-type-label">{type.label}</span>
                <span className="studio-start-type-description">{type.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="studio-start-section studio-start-paths" aria-label="Start a book">
          {start}
        </section>

        <section className="studio-start-section" aria-labelledby="studio-start-library">
          <h2 id="studio-start-library">Books saved in OpenBook</h2>
          {library}
        </section>
      </main>
    </div>
  );
}
